import prisma from '../../src/prisma-client';
import logger from '../../src/logger';

// I created the placeIds cache after creating the restaurants table.
// Before running this script, I found all the duplicates placeIds in the restaurants table
// and merged them by deleting one.
// After doing that, I ran this script to populate the placeIds cache.
const cachePlaceId = async (
  restaurantName: string,
  placeId: string,
  cityId: number
) => {
  logger.info(`Caching place id for ${restaurantName}: ${placeId}`);
  await prisma.placeIdCache.create({
    data: {
      name: restaurantName,
      cityId,
      placeId,
    },
  });
};

// Cache place ids
async () => {
  const restaurants = await prisma.restaurant.findMany();
  const placeIdsCache = await prisma.placeIdCache.findMany();
  const uncachedRestaurants = restaurants.filter((restaurant) => {
    return !placeIdsCache.some((placeIdCache) => {
      return (
        placeIdCache.name === restaurant.name &&
        placeIdCache.cityId === restaurant.cityId
      );
    });
  });
  for (const restaurant of uncachedRestaurants) {
    if (!restaurant.gPlaceId) continue;
    await cachePlaceId(restaurant.name, restaurant.gPlaceId, restaurant.cityId);
  }
};
