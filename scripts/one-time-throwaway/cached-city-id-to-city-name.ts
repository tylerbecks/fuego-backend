import prisma from '../../src/prisma-client';

const migrate = async () => {
  console.log('Migrating cached city IDs to city names...');
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
      console.log(
        `Found cached city: ${maybeCachedCity} for city ID: ${placeIdCacheItem.cityId}`
      );
      console.log(
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

    console.log(
      `Caching city: ${city.city} for city ID: ${placeIdCacheItem.cityId}`
    );
    cityToCityIdMap.set(placeIdCacheItem.cityId, city.city);

    console.log(
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
