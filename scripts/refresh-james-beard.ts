import JamesBeardScraper from '../scraper/award-scrapers/james-beard';
import logger from '../src/logger';
import prisma from '../src/prisma-client';
import { findOrCreateRestaurant } from './utils/db';
import askGPT from './utils/open-ai';

const SOURCE_ID = 'james_beard';

class JamesBeardRefresher {
  async run() {
    const cityMatcher = new CityNameMatcher();
    await cityMatcher.loadAllCities();

    const scraper = new JamesBeardScraper();
    const jamesBeardAwards = await scraper.getWinners();

    for (let i = 0; i < jamesBeardAwards.length; i++) {
      const award = jamesBeardAwards[i];
      logger.verbose(`Award ${i + 1} of ${jamesBeardAwards.length}`);

      const { cityState } = award;
      logger.info(
        `James Beard: ${award.restaurant}, ${award.award}, ${award.year}, ${cityState}`
      );

      const existingCity = await cityMatcher.matchCityFromDb(cityState);

      if (existingCity) {
        logger.info(`Found city ${existingCity.city}`);
      }

      const restaurant = await findOrCreateRestaurant(
        award.restaurant,
        existingCity?.id,
        cityState
      );

      const existingAward = await prisma.award.findFirst({
        where: {
          restaurantId: restaurant.id,
          source: SOURCE_ID,
          type: award.award,
          year: award.year,
          chef: award.chef ?? null,
        },
      });

      if (existingAward) {
        logger.warn(`Award already exists, continuing`);
        continue;
      }

      logger.info(`Creating award`);
      await prisma.award.create({
        data: {
          restaurantId: restaurant.id,
          source: SOURCE_ID,
          type: award.award,
          year: award.year,
          chef: award.chef ?? null,
          url: `https://www.jamesbeard.org/awards/search?keyword=${encodeURIComponent(
            restaurant.name
          )}`,
        },
      });
    }
  }
}

type City = { id: number; city: string };

class CityNameMatcher {
  citiesFromDB: City[] | undefined;

  // Any time we run this script, you must be skeptical of this cache.
  // If a restaurant was added since the last run, some of these neighborhoods might not be false
  openAIResponseCache: Record<string, City | false> = {
    'Abilene, Kansas': false,
    'Albuquerque, New Mexico': false,
    'Albuquerque, NM': false,
    'Ann Arbor, Michigan': false,
    'Aspen, Colorado': false,
    'Athens, Georgia': false,
    'Atlanta, Georgia': false,
    'Atlantic City, New Jersey': false,
    'Aurora, CO': false,
    'Austin, Texas': { id: 2, city: 'austin' },
    'Austin, TX': { id: 2, city: 'austin' },
    'Avondale, Louisiana': false,
    'Ayden, North Carolina': false,
    'Bakersfield, California': false,
    'Baltimore, Maryland': false,
    'Barnegat Light, New Jersey': false,
    'Berkeley, California': false,
    'Bessemer, Alabama': false,
    'Beverly Hills, California': { id: 9, city: 'los angeles' },
    'Birmingham, Alabama': false,
    'Boston, Massachusetts': { id: 3, city: 'boston' },
    'Boulder, Colorado': false,
    'Bronx, New York': { id: 15, city: 'new york' },
    'Brooklyn, New York': { id: 15, city: 'new york' },
    'Brooksville, Maine': false,
    'Brookyln, New York': { city: 'new york', id: 15 },
    'Brownsville, Texas': false,
    'Buffalo Gap, Texas': false,
    'Buffalo, New York': false,
    'Burlingame, California': false,
    'Butte, Montana': false,
    'Cambridge, Massachusetts': false,
    'Chapel Hill, North Carolina': false,
    'Charleston, South Carolina': false,
    'Chicago, IL': { city: 'chicago', id: 4 },
    'Chicago, Illinois': { city: 'chicago', id: 4 },
    'Chimayo, New Mexico': false,
    'Cincinnati, Ohio': false,
    'Clayton, Missouri': false,
    'Cleveland, Ohio': false,
    'Coral Gables, Florida': { id: 11, city: 'miami' },
    'Dallas, Texas': false,
    'Dearborn, Michigan': false,
    'Decatur, Georgia': false,
    'Denver, Colorado': { id: 5, city: 'denver' },
    'Detroit, Michigan': false,
    'Duluth, Minnesota': false,
    'Durham, North Carolina': false,
    'El Paso, Texas': false,
    'Elmsford, New York': false,
    'Essex, Maryland': false,
    'Evanston, Illinois': false,
    'Farmington Hills, Michigan': false,
    'Fort Worth, Texas': false,
    'Frankenmuth, Michigan': false,
    'Garden Grove, California': false,
    'Greenville, Mississippi': false,
    'Greenwich, Connecticut': false,
    'Gustavus, Alaska': false,
    'Harrodsburg, Kentucky': false,
    'Healdsburg, California': false,
    'Highlands, New Jersey': false,
    'Hoboken, New Jersey': false,
    'Honolulu, Hawaii': false,
    'Houston, Texas': { id: 6, city: 'houston' },
    'Hudson, New York': false,
    'Huntington, West Virginia': false,
    'Indianapolis, Indiana': false,
    'Issaquah, Washington': false,
    'Ithaca, New York': false,
    'Jackson, Mississippi': false,
    'Kailua Kona, Hawaii': false,
    'Kansas City, Missouri': false,
    'Kirkland, Washington': false,
    'Larkspur, California': false,
    'Las Vegas, Nevada': { id: 7, city: 'las vegas' },
    'Le Mars, Iowa': false,
    'Lexington, North Carolina': false,
    'Lihue, Kauai, Hawaii': false,
    'Little Rock, Arkansas': false,
    'Los Angeles, California': { id: 9, city: 'los angeles' },
    'Los Gatos, California': false,
    'Lummi Island, Washington': false,
    'Lummi Island': false,
    'Madison, Wisconsin': false,
    'Manchester, Connecticut': false,
    'Manchester, New Hampshire': false,
    'Marianna, Arkansas': false,
    'McCook, Nebraska': false,
    'McLean, Virginia': false,
    'McMinnville, Oregon': false,
    'Miami Beach, Florida': { id: 11, city: 'miami' },
    'Miami, Florida': { id: 11, city: 'miami' },
    'Milton, Delaware': false,
    'Milwaukee, WI': false,
    'Milwaukee, Wisconsin': false,
    'Minneapolis, Minnesota': false,
    'N. Miami, Florida': false,
    'Narragansett, Rhode Island': false,
    'Nashville, Tennessee': { id: 13, city: 'nashville' },
    'New Haven, Connecticut': false,
    'New Orleans, Louisiana': { id: 14, city: 'new orleans' },
    'New York, New York': { city: 'new york', id: 15 },
    'New York, NY': { id: 15, city: 'new york' },
    'New York': { id: 15, city: 'new york' },
    'North Miami Beach, Florida': { id: 11, city: 'miami' },
    'Oahu, Hawaii': false,
    'Oakland, California': { city: 'san francisco', id: 20 },
    'Ogunquit, Maine': false,
    'Oklahoma City': false,
    'Old Chatham, New York': false,
    'Oneonta, New York': false,
    'Oxford, Mississippi': false,
    'Paradise Valley, Arizona': false,
    'Pawleys Island, South Carolina': false,
    'Pescadero, California': false,
    'Philadelphia, PA': false,
    'Philadelphia, Pennsylvania': false,
    'Phoenix, Arizona': false,
    'Pittsburgh, Pennsylvania': false,
    'Pocantico Hills, New York': { city: 'new york', id: 15 },
    'Portland, Maine': false,
    'Portland, Oregon': false,
    'Providence, Rhode Island': false,
    'Raleigh, North Carolina': false,
    'Ranchos de Taos, New Mexico': false,
    'Randolph, VT': false,
    'Richmond, Virginia': false,
    'Rockland, Maine': false,
    'Sacramento, California': false,
    'San Francisco, CA': { city: 'san francisco', id: 20 },
    'San Francisco, California': { city: 'san francisco', id: 20 },
    'Santa Fe, New Mexico': false,
    'Santa Monica, California': { id: 9, city: 'los angeles' },
    'Savannah, Georgia': false,
    'Scottsdale, Arizona': false,
    'Seattle, Washington': { id: 21, city: 'seattle' },
    'Sebastopol, California': false,
    'Sherman Oaks': { city: 'los angeles', id: 9 },
    'Sherrill, Iowa': false,
    'South Burlington, Vermont': false,
    'South Burlington, VT': false,
    'South Thomaston, Maine': false,
    'St. Helena, California': false,
    'St. Louis, Missouri': false,
    'Sugar Hill, New Hampshire': false,
    'Tampa, Florida': false,
    'Taylor, Texas': false,
    'Tucson, Arizona': false,
    'Walland, Tennessee': false,
    'Washington, District of Columbia': { city: 'washington', id: 23 },
    'Washington, Virginia': { id: 23, city: 'washington' },
    'Wellesley, Massachusetts': false,
    'West Hollywood, California': { id: 9, city: 'los angeles' },
    'Wheeling, Illinois': false,
    'Whitehouse, New Jersey': false,
    'Williamsburg, Virginia': false,
    'Wilson, Wyoming': false,
    'Yountville, California': false,
    Asheville: false,
    Atlanta: false,
    Brooklyn: { id: 15, city: 'new york' },
    Camden: { city: 'london', id: 8 },
    Clayton: false,
    Detroit: false,
    Honolulu: false,
    Houston: { id: 6, city: 'houston' },
    Milwaukee: false,
    Minneapolis: false,
    Savannah: false,
    Tucson: false,
  };

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

(async () => {
  const refresher = new JamesBeardRefresher();
  await refresher.run();
})();
