import logger from '../../src/logger';
import prisma from '../../src/prisma-client';

const migrate = async () => {
  logger.info('Migrating cached city IDs to city names...');
  const placeIdCache = await prisma.placeIdCache.findMany({
    where: {
      city: null,
    },
  });

  const cityToCityIdMap = new Map<number, string>();

  for (const placeIdCacheItem of placeIdCache) {
    if (!placeIdCacheItem.cityId) {
      throw new Error('City ID is null');
    }

    const maybeCachedCity = cityToCityIdMap.get(placeIdCacheItem.cityId);

    if (maybeCachedCity) {
      logger.info(
        `Found cached city: ${maybeCachedCity} for city ID: ${placeIdCacheItem.cityId}`
      );
      logger.info(
        `Setting city: ${maybeCachedCity} for city ID: ${placeIdCacheItem.cityId}`
      );

      await prisma.placeIdCache.update({
        where: {
          id: placeIdCacheItem.id,
        },
        data: {
          city: maybeCachedCity,
        },
      });
      continue;
    }

    const city = await prisma.city.findFirst({
      where: {
        id: placeIdCacheItem.cityId,
      },
    });

    if (!city) {
      throw new Error('City is null');
    }

    logger.info(
      `Caching city: ${city.city} for city ID: ${placeIdCacheItem.cityId}`
    );
    cityToCityIdMap.set(placeIdCacheItem.cityId, city.city);

    logger.info(
      `Setting city: ${city.city} for city ID: ${placeIdCacheItem.cityId}`
    );
    await prisma.placeIdCache.update({
      where: {
        id: placeIdCacheItem.id,
      },
      data: {
        city: city.city,
      },
    });
  }
};

(async function () {
  await migrate();
})();
