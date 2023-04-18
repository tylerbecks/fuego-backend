import Google from '../../src/google-client';
import logger from '../../src/logger';
import prisma from '../../src/prisma-client';

export const findOrCreateRestaurant = async (
  restaurantName: string,
  cityId: number | undefined,
  city?: string
) => {
  if (!cityId && !city) {
    throw Error('Must provide either cityId or city');
  }

  const existingRestaurant = await findRestaurant(restaurantName, cityId, city);
  if (existingRestaurant) {
    return existingRestaurant;
  }

  // placeId never been cached
  logger.info(`No cached placeId for ${restaurantName}. Creating entry...`);

  const placeId = await getPlaceIdFromGoogle(restaurantName, cityId, city);
  await cachePlaceIdForRestaurant(restaurantName, cityId, placeId, city);

  if (placeId) {
    const restaurantWithSamePlaceId = await prisma.restaurant.findFirst({
      where: {
        gPlaceId: placeId,
      },
    });

    if (restaurantWithSamePlaceId) {
      logger.info(
        `After caching id, found restaurant with same placeId: ${placeId}`
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

const findRestaurant = async (
  restaurantName: string,
  cityId: number | undefined,
  city: string | undefined
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

  if (!cachedPlaceId) {
    return null;
  }

  const restaurantPreviouslyCachedWithNullPlaceId =
    cachedPlaceId.placeId === null;

  if (restaurantPreviouslyCachedWithNullPlaceId) {
    logger.info(`Found null cached placeId for ${restaurantName}`);
    const restaurant = await findRestaurantWithNoPlaceId(
      restaurantName,
      cityId,
      city
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
};

const getPlaceIdFromGoogle = async (
  restaurantName: string,
  cityId: number | undefined,
  city: string | undefined
) => {
  const google = new Google();
  let cityName;
  if (city) {
    cityName = city;
  } else {
    if (!cityId) {
      throw Error('If city does not exist, cityId must');
    }
    cityName = await getCityName(cityId);
  }

  const place = await google.findPlaceFromText(
    `restaurant ${restaurantName} ${cityName ?? ''}`
  );

  const placeId = place?.place_id ? place.place_id : null;

  if (!placeId) {
    logger.warn(`No placeId found for ${restaurantName}`);
  }

  return placeId;
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
  cityId: number | undefined,
  city: string | undefined
) =>
  await prisma.restaurant.findFirst({
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
