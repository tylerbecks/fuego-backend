import fs from 'fs';
import path from 'path';

import logger from '../../src/logger';
import prisma from '../../src/prisma-client';
import cityCache from './city-match-cache.json';
import askGPT from './open-ai';

const CACHE_FILE = 'city-match-cache.json';

type City = { id: number; city: string };

export default class CityNameMatcher {
  citiesFromDB: City[] | undefined;

  // Any time we run this script, you must be skeptical of this cache.
  // If a city page was added since the last run, some of these neighborhoods might not be false
  openAIResponseCache = cityCache as Record<string, City | false>;

  async loadAllCities() {
    this.citiesFromDB = await prisma.city.findMany({
      select: {
        id: true,
        city: true,
      },
    });
  }

  async matchCityFromDb(cityState: string) {
    if (!this.citiesFromDB) {
      throw new Error('Must call loadAllCities before calling matchCityFromDb');
    }

    // Check if city previously cached as false, meaning no matches were found in the code below
    if (this.openAIResponseCache[cityState] === false) {
      logger.info(`${cityState} cached as false, returning null`);
      return null;
    }

    // Check if city previously cached as cityFromDB, meaning a match was found in the code below
    if (this.openAIResponseCache[cityState]) {
      logger.info(`${cityState} cached with value:`);
      logger.info(this.openAIResponseCache[cityState]);
      return this.openAIResponseCache[cityState] as City;
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
        this.openAIResponseCache[cityState] = city;
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
      this.openAIResponseCache[cityState] = existingCity;
      logger.info(this.openAIResponseCache);
      return existingCity;
    }

    // Try to use open AI to determine if city is a subburb of a city in the database
    for (const city of this.citiesFromDB) {
      // if you don't change new york to new york city, open ai will think you're asking if it's in new york state
      const cityNameFromDB = getCorrectCityName(city.city);
      const prompt = `Is ${cityState} in ${cityNameFromDB}? Just return yes or no.`;
      const response = await askGPT(prompt);
      if (response.match(/yes/i)) {
        logger.info(`✅ Found city match! Caching and returning ${city.city}`);
        this.openAIResponseCache[cityState] = city;
        logger.info(this.openAIResponseCache);
        return city;
      }
    }

    this.openAIResponseCache[cityState] = false;
    logger.info(this.openAIResponseCache);

    return null;
  }

  saveCache() {
    const filePath = path.join(__dirname, CACHE_FILE);
    const stringJson = JSON.stringify(this.openAIResponseCache, null, 2);

    fs.writeFileSync(filePath, stringJson);
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

(function () {
  const cityMatcher = new CityNameMatcher();
  cityMatcher.saveCache();
})();
