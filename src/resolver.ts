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

type Article = {
  id: number;
  title: string;
  source: string;
  url: string;
};

export const getRestaurantById = async (restaurantId: number) => {
  const restaurantRaw = await prisma.restaurant.findUnique({
    where: { id: Number(restaurantId) },
    select: {
      id: true,
      name: true,
      gPlaceId: true,
      cuisine: true,
      awards: {
        where: {
          deletedAt: null,
        },
        select: award,
      },
      articles: {
        where: {
          deletedAt: null,
        },
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
  articleIds: number[] = []
) => {
  // Ideally we can only select restaurants if they have articles where deletedAt is null
  // For now, just select them all and filter with JS below
  const restaurantsRaw = await prisma.restaurant.findMany({
    where: { cityId: Number(cityId) },
    select: {
      id: true,
      name: true,
      gPlaceId: true,
      cuisine: true,
      awards: {
        where: {
          deletedAt: null,
        },
        select: award,
      },
      articles: {
        where: {
          deletedAt: null,
        },
        select: {
          articles: {
            select: article,
          },
        },
      },
    },
  });

  const restaurants = restaurantsRaw.map((restaurant) => {
    const articles = restaurant?.articles.map(({ articles }) => articles);

    return {
      ...restaurant,
      articles: filterArticles(articles, articleIds),
    };
  });

  return restaurants.filter(
    ({ articles, awards }) => articles.length || awards.length
  );
};

const filterArticles = (articles: Article[], articleIds: number[]) => {
  const validArticleIds = articleIds.filter((id) =>
    articles?.find((article) => article.id === id)
  );

  if (validArticleIds.length === 0) {
    return articles;
  }

  return articles?.filter(({ id }) => validArticleIds.includes(id));
};
