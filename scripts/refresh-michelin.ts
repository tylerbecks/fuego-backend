import MichelinScraper from '../scraper/award-scrapers/michelin';
import logger from '../src/logger';
import prisma from '../src/prisma-client';
import CityNameMatcher from './utils/city-matcher';
import { findOrCreateRestaurant } from './utils/db';

const SOURCE_ID = 'michelin';

class MichelinRefresher {
  now = new Date();

  async run() {
    const cityMatcher = new CityNameMatcher();

    const scraper = new MichelinScraper();
    await scraper.scrape(async (restaurants) => {
      for (let i = 0; i < restaurants.length; i++) {
        const michelinRestaurant = restaurants[i];
        logger.info(
          `Award ${i + 1} of ${restaurants.length}: ${michelinRestaurant.name}`
        );

        const existingCity = await cityMatcher.matchCityFromDb(
          michelinRestaurant.city,
          michelinRestaurant.country
        );

        if (existingCity) {
          logger.info(`Found city ${existingCity.city}`);
        }

        const restaurant = await findOrCreateRestaurant(
          michelinRestaurant.name,
          existingCity?.id,
          michelinRestaurant.city
        );

        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: {
            updatedAt: this.now,
            lat: michelinRestaurant.lat,
            long: michelinRestaurant.lng,
            country: michelinRestaurant.country,
            chef: michelinRestaurant.chef,
            price: michelinRestaurant.price,
          },
        });

        console.log(michelinRestaurant.awards);
        for (const award of michelinRestaurant.awards) {
          const awardData = {
            chef: michelinRestaurant.chef,
            type: award,
            updatedAt: this.now,
            metadata: {
              region: michelinRestaurant.region,
              cuisine: michelinRestaurant.cuisine,
            },
            url: michelinRestaurant.url,
            year: new Date().getFullYear(),
          };

          const existingAward = await prisma.award.findFirst({
            where: {
              restaurantId: restaurant.id,
              source: SOURCE_ID,
              deletedAt: null,
              ...(award === 'GREEN_STAR'
                ? { type: 'GREEN_STAR' }
                : {
                    NOT: {
                      type: 'GREEN_STAR',
                    },
                  }),
            },
          });

          // If award already exists, update it
          if (existingAward) {
            logger.info(`Award already exists, updating`);
            await prisma.award.update({
              where: {
                id: existingAward.id,
              },
              data: awardData,
            });
          } else {
            logger.info(`Creating award`);
            await prisma.award.create({
              data: {
                ...awardData,
                restaurantId: restaurant.id,
                source: SOURCE_ID,
              },
            });
          }
        }
      }
    });
  }

  // TODO figure out how long it takes the run script to finish
  // this assumes the run method completed all 16k restaurants
  async softDeleteOldAwards() {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    await prisma.award.updateMany({
      where: {
        source: SOURCE_ID,
        OR: [
          {
            updatedAt: {
              lt: oneMonthAgo,
            },
          },
          {
            updatedAt: null,
          },
        ],
        deletedAt: null,
      },
      data: {
        deletedAt: this.now,
      },
    });
  }
}

(async () => {
  const refresher = new MichelinRefresher();
  await refresher.run();
})();
