import Google from '../../src/google-client';
import logger from '../../src/logger';
import prisma from '../../src/prisma-client';

// Since I am basically using the city table as a wrapper for pages in the frontend, it doesn't
// accomodate when I'm scraping restaurants without existing cities. So it's better to
// store the string instead of the cityId
// TODO: change all cityIds in the placeid cache to city
export const findOrCreateRestaurant = async (
  restaurantName: string,
  cityId: number | undefined,
  city?: string
) => {
  if (!cityId && !city) {
    throw Error('Must provide either cityId or city');
  }

  const cachedPlaceId = await prisma.placeIdCache.findFirst({
    where: {
      name: {
        equals: restaurantName,
        mode: 'insensitive',
      },
      ...(cityId
        ? { cityId }
        : { city: { equals: city ?? null, mode: 'insensitive' } }),
    },
  });

  const restaurantPreviouslyCachedWithNullPlaceId =
    cachedPlaceId?.placeId === null;

  if (restaurantPreviouslyCachedWithNullPlaceId) {
    logger.info(`Found null cached placeId for ${restaurantName}`);
    const restaurant = await findRestaurantWithNoPlaceId(
      restaurantName,
      cityId
    );
    if (!restaurant) {
      throw Error(
        `gPlaceId was previously cached and no restaurant was found for it: ${
          cachedPlaceId.placeId as string
        }`
      );
    }

    return restaurant;
  }

  // optimistic case, cache id previously cached with value
  if (cachedPlaceId) {
    logger.info(
      `Found cached placeId ${
        cachedPlaceId.placeId as string
      } for ${restaurantName}`
    );

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        gPlaceId: cachedPlaceId.placeId,
      },
    });

    if (!restaurant) {
      throw Error(
        `gPlaceId was previously cached and no restaurant was found for it: ${
          cachedPlaceId.placeId as string
        }`
      );
    }

    return restaurant;
  }

  // placeId never been cached
  logger.info(`No cached placeId for ${restaurantName}. Creating entry...`);
  const google = new Google();
  const cityName = city ? city : await getCityName(cityId as number);

  const place = await google.findPlaceFromText(
    `restaurant ${restaurantName} ${cityName ?? ''}`
  );

  const placeId = place?.place_id ? place.place_id : null;

  if (!placeId) {
    logger.warn(`No placeId found for ${restaurantName}`);
  }

  await cachePlaceIdForRestaurant(restaurantName, cityId, placeId, city);

  if (placeId !== undefined) {
    const restaurantWithSamePlaceId = await prisma.restaurant.findFirst({
      where: {
        gPlaceId: placeId,
      },
    });

    if (restaurantWithSamePlaceId) {
      logger.info(
        `After caching id, found restaurant with same placeId ${
          placeId ?? 'null'
        }`
      );
      return restaurantWithSamePlaceId;
    }
  }

  logger.info(`⚙️ Creating restaurant ${restaurantName}`);
  return await prisma.restaurant.create({
    data: {
      name: restaurantName,
      gPlaceId: placeId,
      cityId: cityId ?? null,
      city: city ?? null,
    },
  });
};

const getCityName = async (cityId: number) => {
  const city = await prisma.city.findUnique({
    where: {
      id: cityId,
    },
  });

  return city ? city.city : null;
};

const cachePlaceIdForRestaurant = async (
  restaurantName: string,
  cityId: number | undefined,
  placeId: string | null,
  city: string | undefined
) =>
  await prisma.placeIdCache.create({
    data: {
      name: restaurantName,
      cityId: cityId ?? null,
      placeId: placeId,
      city: city ?? null,
    },
  });

const findRestaurantWithNoPlaceId = async (
  restaurantName: string,
  cityId: number | undefined
) =>
  await prisma.restaurant.findFirst({
    where: {
      name: {
        equals: restaurantName,
        mode: 'insensitive',
      },
      cityId: cityId ?? null,
    },
  });