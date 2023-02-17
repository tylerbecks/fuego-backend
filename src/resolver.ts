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

export const getRestaurantsByCityId = async (
  cityId: number,
  articleIdsToFilter: number[] | undefined
) => {
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

  return restaurantsRaw.map((restaurant) => {
    const articles = restaurant?.articles.map(({ articles }) => articles);
    const articleIdsForCity = articles?.map(({ id }) => id);

    // If the api has a bunch of articleIds for a different city, we don't want to filter
    const isArticleIdFilterListValid =
      articleIdsToFilter &&
      articleIdsToFilter.some((id) => articleIdsForCity?.includes(id));

    const filteredArticles = articles?.filter(({ id }) =>
      articleIdsToFilter?.includes(id)
    );

    return {
      ...restaurant,
      articles: isArticleIdFilterListValid ? filteredArticles : articles,
    };
  });
};
