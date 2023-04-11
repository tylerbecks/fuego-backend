import path from 'path';
import { Database, verbose } from 'sqlite3';

import logger from '../../src/logger';
import prisma from '../../src/prisma-client';
import askGPT from './open-ai';

verbose();

const cacheFilePath = path.join(__dirname, 'city-cache.db');

type City = { id: number; city: string };

type CachedCity = {
  city: string;
  cityId: number | null;
  cityFromDb: string | null;
};

// Any time we run this script, you must be skeptical of this cache.
// If a city page was added since the last run, some of these neighborhoods might not be false
export default class CityNameMatcher {
  citiesFromDB: City[] | undefined;

  cache = new Database(cacheFilePath);

  async loadAllCities() {
    this.citiesFromDB = await prisma.city.findMany({
      select: {
        id: true,
        city: true,
      },
    });
  }

  async matchCityFromDb(cityState: string): Promise<City | null> {
    if (!this.citiesFromDB) {
      throw new Error('Must call loadAllCities before calling matchCityFromDb');
    }

    const cachedCity = await this.getCityFromCache(cityState);

    if (cachedCity) {
      // Check if city previously cached, but with no match in the DB
      if (cachedCity.cityId === null || cachedCity.cityFromDb === null) {
        logger.info(`${cityState} cached as false, returning null`);
        return null;
      }

      // Check if city previously cached as cityFromDB, meaning a match was found in the code below
      logger.info(`${cityState} cached with value:`);
      return { id: cachedCity.cityId, city: cachedCity.cityFromDb };
    }

    const cachedCityId = await prisma.placeIdCache.findFirst({
      where: {
        city: cityState,
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
        },
      });

      if (city) {
        logger.info(`Found existing city. Caching and returning ${city.city}`);

        // this.openAIResponseCache[cityState] = city;
        return city;
      }
    }

    // Sometimes cityState is "Los Angeles, California", sometimes it's "New York"
    // Treate the part before the comma as the city
    const cityName = cityState.split(',')[0];

    // Try to find exact name match with city table
    const existingCity = await prisma.city.findFirst({
      where: {
        city: { equals: cityName, mode: 'insensitive' },
      },
      select: {
        id: true,
        city: true,
      },
    });

    if (existingCity) {
      logger.info(
        `Found exact city match in DB. Caching and returning ${existingCity.city}`
      );
      this.saveToCache(cityState, existingCity.id, existingCity.city);
      return existingCity;
    }

    // Try to use open AI to determine if city is a subburb of a city in the database
    for (const city of this.citiesFromDB) {
      // if you don't change new york to new york city, open ai will think you're asking if it's in new york state
      const cityNameFromDB = getCorrectCityName(city.city);
      const prompt = `Is the city ${cityState} in ${cityNameFromDB}? Just return yes or no.`;
      const response = await askGPT(prompt);
      if (response.match(/yes/i)) {
        logger.info(`✅ Found city match! Caching and returning ${city.city}`);
        this.saveToCache(cityState, city.id, city.city);
        return city;
      }
    }

    this.saveToCache(cityState, null, null);

    return null;
  }

  private getCityFromCache(city: string): Promise<CachedCity> {
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

  private saveToCache(
    city: string,
    cityId: number | null,
    cityFromDb: string | null
  ) {
    const stmt = this.cache.prepare(
      `INSERT INTO cities (city, cityId, cityFromDb)
      VALUES (?, ?, ?)`
    );

    stmt.run(city, cityId, cityFromDb);
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
