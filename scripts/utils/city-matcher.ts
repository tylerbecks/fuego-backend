import path from 'path';
import { Database, verbose } from 'sqlite3';

import logger from '../../src/logger';
import prisma from '../../src/prisma-client';
import askGPT from './open-ai';

verbose();

const cacheFilePath = path.join(__dirname, 'city-cache.db');

type City = { id: number; city: string; country: string | null };

type CachedCity = {
  city: string;
  country: string | null;
  cityId: number | null;
  cityFromDb: string | null;
};

// Any time we run this script, you must be skeptical of this cache.
// If a city page was added since the last run, some of these neighborhoods might not be false
export default class CityNameMatcher {
  citiesFromDB: City[] | undefined;
  cache = new Database(cacheFilePath);
  existingCountries = new Set(['ch', 'de', 'es', 'fr', 'gb', 'it', 'jp', 'us']);

  async loadAllCities() {
    return await prisma.city.findMany({
      select: {
        id: true,
        city: true,
        country: true,
      },
    });
  }

  async matchCityFromDb(
    citySearchStr: string,
    country: string | null
  ): Promise<City | null> {
    if (!this.citiesFromDB) {
      this.citiesFromDB = await this.loadAllCities();
    }

    const cachedCity = await this.getCityFromCache(citySearchStr, country);

    if (cachedCity) {
      // Check if city previously cached, but with no match in the DB
      if (cachedCity.cityId === null || cachedCity.cityFromDb === null) {
        logger.info(`${citySearchStr} cached with no db match, returning null`);
        return null;
      }

      // Check if city previously cached as cityFromDB, meaning a match was found in the code below
      logger.info(`${citySearchStr} cached with value:`);
      return {
        id: cachedCity.cityId,
        city: cachedCity.cityFromDb,
        country: cachedCity.country,
      };
    }

    const cachedCityId = await prisma.placeIdCache.findFirst({
      where: {
        city: citySearchStr,
      },
      select: {
        cityId: true,
      },
    });

    logger.info(`cachedCityId: ${JSON.stringify(cachedCityId)}`);

    if (cachedCityId && cachedCityId.cityId) {
      const city = await prisma.city.findFirst({
        where: {
          id: cachedCityId.cityId,
        },
        select: {
          id: true,
          city: true,
          country: true,
        },
      });

      if (city) {
        logger.info(`Found existing city. Caching and returning ${city.city}`);

        this.saveToCache(citySearchStr, country, city.id, city.city);
        return city;
      }
    }

    // Sometimes citySearchStr is "Los Angeles, California", sometimes it's "New York"
    // Treate the part before the comma as the city
    const cityName = citySearchStr.split(',')[0];

    // Try to find exact name match with city table
    const existingCity = await prisma.city.findFirst({
      where: {
        city: { equals: cityName, mode: 'insensitive' },
      },
      select: {
        id: true,
        city: true,
        country: true,
      },
    });

    if (existingCity) {
      logger.info(
        `Found exact city match in DB. Caching and returning ${existingCity.city}`
      );
      this.saveToCache(
        citySearchStr,
        country,
        existingCity.id,
        existingCity.city
      );
      return existingCity;
    }

    if (country?.length !== 2) {
      // https://www.nationsonline.org/oneworld/country_code_list.htm
      throw new Error('Exepcetd country to be an alpha 2 code');
    }

    if (country && !this.existingCountries.has(country)) {
      this.saveToCache(citySearchStr, country, null, null);
      return null;
    }

    const citiesInCountry = this.citiesFromDB.filter(
      (row) => row.country === country
    );
    // Try to use open AI to determine if city is a subburb of a city in the database
    for (const city of citiesInCountry) {
      // if you don't change new york to new york city, open ai will think you're asking if it's in new york state
      const cityNameFromDB = getCorrectCityName(city.city);
      const prompt = `Is the city ${citySearchStr} in ${cityNameFromDB}? Just return yes or no.`;
      const response = await askGPT(prompt);
      if (response.match(/yes/i)) {
        logger.info(`✅ Found city match! Caching and returning ${city.city}`);
        this.saveToCache(citySearchStr, country, city.id, city.city);
        return city;
      }
    }

    this.saveToCache(citySearchStr, country, null, null);

    return null;
  }

  private getCityByCity(city: string) {
    return new Promise((resolve, reject) => {
      this.cache.get(
        'select * from cities where city = ?',
        city,
        (err, row) => {
          if (err) {
            reject(err);
          }

          resolve(row as CachedCity);
        }
      );
    });
  }

  private getCityByCityAndCountry(city: string, country: string) {
    return new Promise((resolve, reject) => {
      this.cache.get(
        'select * from cities where city = ? and country = ?',
        [city, country],
        (err, row) => {
          if (err) {
            reject(err);
          }

          resolve(row as CachedCity);
        }
      );
    });
  }

  private async getCityFromCache(
    city: string,
    country: string | null
  ): Promise<CachedCity | null> {
    if (country) {
      // First, try to get city by city AND country
      const cachedCity = await this.getCityByCityAndCountry(city, country);
      if (cachedCity) {
        return cachedCity as CachedCity;
      }

      // Second, try to see if the city exists without the country
      const cachedCityWithoutCountry = await this.getCityByCity(city);
      if (!cachedCityWithoutCountry) {
        return null;
      }

      // if it exists, then add the country to the pre-existing city
      const stmt = this.cache.prepare(
        `UPDATE cities SET country = ? WHERE city = ?`
      );

      stmt.run(country, city);
      stmt.finalize();

      return cachedCityWithoutCountry as CachedCity;
    }

    const cachedCity = await this.getCityByCity(city);
    return cachedCity as CachedCity;
  }

  private saveToCache(
    city: string,
    country: string | null,
    cityId: number | null,
    cityFromDb: string | null
  ) {
    const stmt = this.cache.prepare(
      `INSERT INTO cities (city, country, cityId, cityFromDb)
      VALUES (?, ?, ?, ?)`
    );

    stmt.run(city, country, cityId, cityFromDb);
    stmt.finalize();
  }
}

const getCorrectCityName = (cityName: string) => {
  if (cityName === 'new york') {
    return 'new york City';
  }
  if (cityName === 'washington') {
    return 'washington DC';
  }

  return cityName;
};
