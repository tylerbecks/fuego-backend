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

type Award = {
  id: number;
  source: string;
  type: string;
  year: number;
  url: string;
  chef: string | null;
};

export const getRestaurantById = async (restaurantId: number) => {
  const restaurantRaw = await prisma.restaurant.findUnique({
    where: { id: Number(restaurantId) },
    select: {
      id: true,
      cuisine: true,
      chef: true,
      gPlaceId: true,
      lat: true,
      long: true,
      name: true,
      price: true,
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
  const restaurantsRaw = await prisma.restaurant.findMany({
    where: { cityId: Number(cityId) },
    select: {
      id: true,
      cuisine: true,
      chef: true,
      gPlaceId: true,
      lat: true,
      long: true,
      name: true,
      price: true,
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
      awards: filterAwards(restaurant.awards),
    };
  });

  return restaurants.filter(
    ({ articles, awards }) => articles.length || awards.length
  );
};

const filterAwards = (awards: Award[]) => {
  return awards.filter((award) => award.type !== 'GREEN_STAR');
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
