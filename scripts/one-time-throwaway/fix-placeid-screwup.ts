import prisma from '../../src/prisma-client';

// I previosuly ran refresh-articles and forgot to put the city name in the google search String
// So it may have created the wrong placeIds. This script fixes that.
(async () => {
  const now = new Date();
  const placeIds = await prisma.placeIdCache.findMany({
    where: {
      createdAt: {
        gte: new Date('2023-03-21'),
      },
    },
  });

  for (const cachedPlaceId of placeIds) {
    const city = await prisma.city.findUnique({
      where: {
        id: cachedPlaceId.cityId,
      },
    });

    const google = new Google();
    const place = await google.findPlaceFromText(
      `${cachedPlaceId.name} ${city?.city || ''}`
    );
    if (!place.place_id) {
      console.log(
        `did not find placeId for ${cachedPlaceId.name} ${city?.city || ''}`
      );
      continue;
    }

    // The previous query worked, no need to do anything
    if (place.place_id === cachedPlaceId.placeId) {
      await prisma.placeIdCache.update({
        where: {
          id: cachedPlaceId.id,
        },
        data: {
          updatedAt: now,
        },
      });
      continue;
    }

    const existingRestaurantForNewPlaceId = await prisma.restaurant.findFirst({
      where: {
        gPlaceId: place.place_id,
        cityId: cachedPlaceId.cityId,
      },
    });

    if (cachedPlaceId.placeId === null) {
      console.log(`placeId was previously nulll for ${cachedPlaceId.name}`);
      continue;
    }

    // If new placeId found matches existing placeId
    if (existingRestaurantForNewPlaceId) {
      const wronlyCreatedRestaurantForCachedPlaceId =
        await prisma.restaurant.findFirst({
          where: {
            name: cachedPlaceId.name,
            gPlaceId: cachedPlaceId.placeId,
            cityId: cachedPlaceId.cityId,
          },
        });

      if (!wronlyCreatedRestaurantForCachedPlaceId) {
        console.log(
          `Something went wrong trying to find wronlyCreatedRestaurantForCachedPlaceId for ${cachedPlaceId.name}`
        );
        continue;
      }

      await prisma.restaurant.delete({
        where: {
          id: wronlyCreatedRestaurantForCachedPlaceId.id,
        },
      });
    } else {
      // If new placeId found does not match existing restaurant
      //   Update the placeId in the cache and the existinpg restaurant
      await prisma.restaurant.update({
        where: {
          gPlaceId: cachedPlaceId.placeId,
        },
        data: {
          gPlaceId: place.place_id,
        },
      });
    }

    await prisma.placeIdCache.update({
      where: {
        id: cachedPlaceId.id,
      },
      data: {
        placeId: place.place_id,
        updatedAt: now,
      },
    });
  }
})();
