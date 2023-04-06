import JamesBeardScraper from '../../scraper/award-scrapers/james-beard';
import logger from '../../src/logger';
import prisma from '../../src/prisma-client';

// When I first scraped james beard, I saved the city in the placeIdCache instead of the cityState
// That's a problem for cities that have the same name in different states
// So, just pass through once and update the city to the cityState from the James Beard Website
// Then, change the refresh james beard script to use cityState instead of city in findOrCreateRestaurant
const main = async () => {
  const scraper = new JamesBeardScraper();
  const jamesBeardAwards = await scraper.getWinners();

  for (let i = 0; i < jamesBeardAwards.length; i++) {
    const award = jamesBeardAwards[i];
    logger.info(`Award ${i + 1} of ${jamesBeardAwards.length}`);
    const cachedRecord = await prisma.placeIdCache.findFirst({
      where: {
        name: award.restaurant,
      },
    });

    if (cachedRecord) {
      logger.info(
        `Found cached record for ${award.restaurant}, city: ${
          cachedRecord.city ?? 'null'
        }`
      );

      await prisma.placeIdCache.update({
        where: {
          id: cachedRecord.id,
        },
        data: {
          city: award.cityState,
        },
      });

      if (cachedRecord.placeId) {
        logger.info(`Found placeId ${cachedRecord.placeId}`);
        await prisma.restaurant.update({
          where: {
            gPlaceId: cachedRecord.placeId,
          },
          data: {
            city: award.cityState,
          },
        });
      } else {
        await prisma.restaurant.updateMany({
          where: {
            name: award.restaurant,
          },
          data: {
            city: award.cityState,
          },
        });
      }
    } else {
      logger.info(`No cached record for ${award.restaurant}`);
      continue;
    }
  }
};

(async () => {
  await main();
})();
