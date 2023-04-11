import JamesBeardScraper from '../scraper/award-scrapers/james-beard';
import logger from '../src/logger';
import prisma from '../src/prisma-client';
import CityNameMatcher from './utils/city-matcher';
import { findOrCreateRestaurant } from './utils/db';

const SOURCE_ID = 'james_beard';

class JamesBeardRefresher {
  async run() {
    const cityMatcher = new CityNameMatcher();
    await cityMatcher.loadAllCities();

    const scraper = new JamesBeardScraper();
    const jamesBeardAwards = await scraper.getWinners();

    for (let i = 0; i < jamesBeardAwards.length; i++) {
      const award = jamesBeardAwards[i];
      logger.info(`Award ${i + 1} of ${jamesBeardAwards.length}`);

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

(async () => {
  const refresher = new JamesBeardRefresher();
  await refresher.run();
})();
