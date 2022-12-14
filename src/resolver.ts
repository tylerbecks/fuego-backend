import prisma from './prisma-client';

const award = {
  id: true,
  source: true,
  type: true,
  year: true,
  url: true,
  chef: true,
};

const article = {
  id: true,
  title: true,
  source: true,
  url: true,
};

export const getRestaurantById = async (restaurantId: number) => {
  const restaurantRaw = await prisma.restaurant.findUnique({
    where: { id: Number(restaurantId) },
    select: {
      id: true,
      name: true,
      gPlaceId: true,
      awards: {
        select: award,
      },
      articles: {
        select: {
          articles: {
            select: article,
          },
        },
      },
    },
  });

  return {
    ...restaurantRaw,
    articles: restaurantRaw?.articles.map(({ articles }) => articles),
  };
};

export const getRestaurantsByCityId = async (cityId: number) => {
  const restaurantsRaw = await prisma.restaurant.findMany({
    where: { cityId: Number(cityId) },
    select: {
      id: true,
      name: true,
      gPlaceId: true,
      awards: {
        select: award,
      },
      articles: {
        select: {
          articles: {
            select: article,
          },
        },
      },
    },
  });

  const restaurants = restaurantsRaw.map((restaurant) => ({
    ...restaurant,
    articles: restaurant?.articles.map(({ articles }) => articles),
  }));

  return restaurants;
};
