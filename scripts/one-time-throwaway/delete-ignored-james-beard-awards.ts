import prisma from '../../src/prisma-client';
import logger from '../../src/logger';

const IGNORE_AWARDS = new Set([
  'Humanitarian of the Year',
  'Lifetime Achievement',
  'Other Eating and Drinking Places',
  'Outstanding Restaurant Design (75 Seats and Under)',
  'Outstanding Restaurant Design (76 Seats and Over)',
  'Outstanding Restaurant Design',
  'Outstanding Restaurant Graphics',
  'Outstanding Restaurateur',
  'Outstanding Wine & Spirits Professional',
  "Who's Who of Food & Beverage in America",
]);

const main = async () => {
  const awards = await prisma.award.findMany({
    where: {
      source: 'james_beard',
      type: {
        in: [...IGNORE_AWARDS],
      },
    },
  });

  logger.info(`Found ${awards.length} awards to delete`);

  for (let i = 0; i < awards.length; i++) {
    const award = awards[i];
    logger.info(`Deleting award ${i + 1} of ${awards.length}`);
    logger.info({
      id: award.id,
      restaurantId: award.restaurantId,
      type: award.type,
      year: award.year,
      chef: award.chef,
    });

    // First, find restaurant record
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: award.restaurantId,
      },
    });

    if (!restaurant) {
      throw Error(`No restaurant found for award ${award.id}`);
    }

    // Second, delete award record
    await prisma.award.delete({
      where: {
        id: award.id,
      },
    });

    // Third, delete restaurant
    await prisma.restaurant.delete({
      where: {
        id: restaurant.id,
      },
    });

    const cachedRecords = await prisma.placeIdCache.findMany({
      where: {
        name: restaurant.name,
      },
    });

    logger.info(`Found ${cachedRecords.length} cached records`);

    // Fourth, clear placeIdCache based on name
    await prisma.placeIdCache.deleteMany({
      where: {
        name: restaurant.name,
      },
    });
  }
};

(async () => {
  await main();
})();
