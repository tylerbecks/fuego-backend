import JamesBeardScraper from '../scraper/award-scrapers/james-beard';
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
      console.log(`Award ${i + 1} of ${jamesBeardAwards.length}`);

      const { cityState } = award;
      console.log(
        `James Beard: ${award.restaurant}, ${award.award}, ${award.year}, ${cityState}`
      );

      const existingCity = await cityMatcher.matchCityFromDb(cityState);

      if (existingCity) {
        console.log(`Found city ${existingCity.city}`);
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
        console.log(`Award already exists, continuing`);
        continue;
      }

      console.log(`Creating award`);
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
    Clayton: false,
    'Lummi Island': false,
    'Hudson, New York': false,
    'Tampa, Florida': false,
    'Chimayo, New Mexico': false,
    'Butte, Montana': false,
    'Jackson, Mississippi': false,
    'Oneonta, New York': false,
    'Birmingham, Alabama': false,
    'Santa Fe, New Mexico': false,
    'Philadelphia, PA': false,
    'Aurora, CO': false,
    'San Francisco, CA': { city: 'san francisco', id: 20 },
    'Chicago, IL': { city: 'chicago', id: 4 },
    'Milwaukee, WI': false,
    'New York, NY': { id: 15, city: 'new york' },
    'Austin, TX': { id: 2, city: 'austin' },
    'Durham, North Carolina': false,
    'Randolph, VT': false,
    'Berkeley, California': false,
    'Manchester, New Hampshire': false,
    'Frankenmuth, Michigan': false,
    'Seattle, Washington': { id: 21, city: 'seattle' },
    'Brownsville, Texas': false,
    'Denver, Colorado': { id: 5, city: 'denver' },
    'Little Rock, Arkansas': false,
    'Chicago, Illinois': { city: 'chicago', id: 4 },
    'Huntington, West Virginia': false,
    'New York, New York': { city: 'new york', id: 15 },
    'Boulder, Colorado': false,
    'Boston, Massachusetts': { id: 3, city: 'boston' },
    'Washington, District of Columbia': { city: 'washington', id: 23 },
    'Philadelphia, Pennsylvania': false,
    'San Francisco, California': { city: 'san francisco', id: 20 },
    'New Orleans, Louisiana': { id: 14, city: 'new orleans' },
    'Raleigh, North Carolina': false,
    'Oxford, Mississippi': false,
    'Minneapolis, Minnesota': false,
    'Savannah, Georgia': false,
    'Scottsdale, Arizona': false,
    'McCook, Nebraska': false,
    'Portland, Maine': false,
    'Portland, Oregon': false,
    'Brookyln, New York': { city: 'new york', id: 15 },
    'Garden Grove, California': false,
    'Los Angeles, California': { id: 9, city: 'los angeles' },
    Detroit: false,
    'Oklahoma City': false,
    Honolulu: false,
    Tucson: false,
    Camden: { city: 'london', id: 8 },
    'Charleston, South Carolina': false,
    'Houston, Texas': { id: 6, city: 'houston' },
    'Milton, Delaware': false,
    'St. Louis, Missouri': false,
    'Essex, Maryland': false,
    'Brooklyn, New York': { id: 15, city: 'new york' },
    Brooklyn: { id: 15, city: 'new york' },
    'Pocantico Hills, New York': { city: 'new york', id: 15 },
    'Atlanta, Georgia': false,
    'Dearborn, Michigan': false,
    'Nashville, Tennessee': { id: 13, city: 'nashville' },
    'Ranchos de Taos, New Mexico': false,
    'Sherman Oaks': { city: 'los angeles', id: 9 },
    Asheville: false,
    Atlanta: false,
    Minneapolis: false,
    Milwaukee: false,
    'Los Gatos, California': false,
    'New York': { id: 15, city: 'new york' },
    Savannah: false,
    Houston: { id: 6, city: 'houston' },
    'Le Mars, Iowa': false,
    'Harrodsburg, Kentucky': false,
    'Cambridge, Massachusetts': false,
    'Walland, Tennessee': false,
    'Cleveland, Ohio': false,
    'Richmond, Virginia': false,
    'Baltimore, Maryland': false,
    'Lummi Island, Washington': false,
    'Clayton, Missouri': false,
    'Austin, Texas': { id: 2, city: 'austin' },
    'Providence, Rhode Island': false,
    'Milwaukee, Wisconsin': false,
    'St. Helena, California': false,
    'McMinnville, Oregon': false,
    'Buffalo Gap, Texas': false,
    'Sebastopol, California': false,
    'Rockland, Maine': false,
    'Sacramento, California': false,
    'Kansas City, Missouri': false,
    'Wilson, Wyoming': false,
    'Phoenix, Arizona': false,
    'Madison, Wisconsin': false,
    'Indianapolis, Indiana': false,
    'Marianna, Arkansas': false,
    'Athens, Georgia': false,
    'Manchester, Connecticut': false,
    'Hoboken, New Jersey': false,
    'Chapel Hill, North Carolina': false,
    'Bakersfield, California': false,
    'Las Vegas, Nevada': { id: 7, city: 'las vegas' },
    'Ann Arbor, Michigan': false,
    'Atlantic City, New Jersey': false,
    'Yountville, California': false,
    'Albuquerque, New Mexico': false,
    'Ogunquit, Maine': false,
    'Albuquerque, NM': false,
    'Bessemer, Alabama': false,
    'South Burlington, VT': false,
    'South Burlington, Vermont': false,
    'Gustavus, Alaska': false,
    'Miami, Florida': { id: 11, city: 'miami' },
    'Healdsburg, California': false,
    'Sherrill, Iowa': false,
    'Barnegat Light, New Jersey': false,
    'Brooksville, Maine': false,
    'Kirkland, Washington': false,
    'Duluth, Minnesota': false,
    'Narragansett, Rhode Island': false,
    'Greenville, Mississippi': false,
    'Pittsburgh, Pennsylvania': false,
    'Decatur, Georgia': false,
    'Abilene, Kansas': false,
    'McLean, Virginia': false,
    'West Hollywood, California': { id: 9, city: 'los angeles' },
    'Greenwich, Connecticut': false,
    'Sugar Hill, New Hampshire': false,
    'Taylor, Texas': false,
    'Lihue, Kauai, Hawaii': false,
    'Beverly Hills, California': { id: 9, city: 'los angeles' },
    'Paradise Valley, Arizona': false,
    'Kailua Kona, Hawaii': false,
    'Pawleys Island, South Carolina': false,
    'Pescadero, California': false,
    'Evanston, Illinois': false,
    'Farmington Hills, Michigan': false,
    'Buffalo, New York': false,
    'Honolulu, Hawaii': false,
    'Lexington, North Carolina': false,
    'Ayden, North Carolina': false,
    'Wellesley, Massachusetts': false,
    'El Paso, Texas': false,
    'Washington, Virginia': { id: 23, city: 'washington' },
    'South Thomaston, Maine': false,
    'Cincinnati, Ohio': false,
    'Ithaca, New York': false,
    'Tucson, Arizona': false,
    'Issaquah, Washington': false,
    'Bronx, New York': { id: 15, city: 'new york' },
    'Burlingame, California': false,
    'Dallas, Texas': false,
    'Whitehouse, New Jersey': false,
    'Oahu, Hawaii': false,
    'Old Chatham, New York': false,
    'Oakland, California': false,
    'Williamsburg, Virginia': false,
    'New Haven, Connecticut': false,
    'Avondale, Louisiana': false,
    'Miami Beach, Florida': { id: 11, city: 'miami' },
    'Fort Worth, Texas': false,
    'Aspen, Colorado': false,
    'Highlands, New Jersey': false,
    'Wheeling, Illinois': false,
    'Coral Gables, Florida': { id: 11, city: 'miami' },
    'Santa Monica, California': false,
    'North Miami Beach, Florida': { id: 11, city: 'miami' },
    'Detroit, Michigan': false,
    'Larkspur, California': false,
    'N. Miami, Florida': false,
    'Elmsford, New York': false,
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
      console.log(`${cityState} cached as false, returning null`);
      return null;
    }

    // Check if city previously cached as cityFromDB, meaning a match was found in the code below
    if (this.openAIResponseCache[cityState]) {
      console.log(`${cityState} cached with value:`);
      console.log(this.openAIResponseCache[cityState]);
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

    console.log(`cachedCityId: ${JSON.stringify(cachedCityId)}`);

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
        console.log(`Found existing city. Caching and returning ${city.city}`);
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
      console.log(
        `Found exact city match in DB. Caching and returning ${existingCity.city}`
      );
      this.openAIResponseCache[cityState] = existingCity;
      console.log(this.openAIResponseCache);
      return existingCity;
    }

    // Try to use open AI to determine if city is a subburb of a city in the database
    for (const city of this.citiesFromDB) {
      // if you don't change new york to new york city, open ai will think you're asking if it's in new york state
      const cityNameFromDB = getCorrectCityName(city.city);
      const prompt = `Is ${cityState} in ${cityNameFromDB}? Just return yes or no.`;
      const response = await askGPT(prompt);
      if (response.match(/yes/i)) {
        console.log(`✅ Found city match! Caching and returning ${city.city}`);
        this.openAIResponseCache[cityState] = city;
        console.log(this.openAIResponseCache);
        return city;
      }
    }

    this.openAIResponseCache[cityState] = false;
    console.log(this.openAIResponseCache);

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
