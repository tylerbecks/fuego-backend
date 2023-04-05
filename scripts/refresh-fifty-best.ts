import FiftyBestScraper from '../scraper/fifty-best';
import logger from '../src/logger';
import prisma from '../src/prisma-client';
import CityNameMatcher from './utils/city-matcher';
import { findOrCreateRestaurant } from './utils/db';

const SOURCE_ID = 'fifty_best';

class RefreshFiftyBest {
  now = new Date();

  async run() {
    const scraper = new FiftyBestScraper();
    const restaurants = await scraper.scrape();

    const cityMatcher = new CityNameMatcher();
    await cityMatcher.loadAllCities();

    for (let i = 0; i < restaurants.length; i++) {
      logger.info(`Award ${i + 1} of ${restaurants.length}`);
      const restaurant = restaurants[i];

      if (restaurant.name === null || restaurant.city === null) {
        throw new Error('Restaurant name is null');
      }

      const existingCity = await cityMatcher.matchCityFromDb(restaurant.city);

      if (existingCity) {
        logger.info(`Found city ${existingCity.city}`);
      }

      const restaurantDb = await findOrCreateRestaurant(
        restaurant.name,
        existingCity?.id,
        restaurant.city
      );

      const existingAward = await prisma.award.findFirst({
        where: {
          restaurantId: restaurantDb.id,
          source: SOURCE_ID,
          deletedAt: null,
        },
      });

      // If award already exists, update it
      if (existingAward) {
        logger.info(`Award already exists, updating`);
        await prisma.award.update({
          where: {
            id: existingAward.id,
          },
          data: {
            type: restaurant.rank.toString(),
            updatedAt: this.now,
            year: this.now.getFullYear(),
          },
        });
      } else {
        // Otherwise, create it
        logger.info(`Creating award`);
        await prisma.award.create({
          data: {
            restaurantId: restaurantDb.id,
            source: SOURCE_ID,
            type: restaurant.rank.toString(),
            year: this.now.getFullYear(),
            updatedAt: this.now,
            url: restaurant.url,
          },
        });
      }
    }

    // Delete awards that are no longer on the list
    await prisma.award.updateMany({
      where: {
        source: SOURCE_ID,
        updatedAt: {
          lt: this.now,
        },
        deletedAt: null,
      },
      data: {
        deletedAt: this.now,
      },
    });

    cityMatcher.saveCache();
  }
}

(async function () {
  const scraper = new RefreshFiftyBest();
  await scraper.run();
})();
