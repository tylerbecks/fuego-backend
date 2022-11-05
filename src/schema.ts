import { Context } from './context';

const typeDefs = `#graphql
  type Query {
    restaurantsByCity(
      """
      The city to filter the restaurants by
      """
      cityId: Int!
    ): [Restaurant]!
    restaurantById(id: Int!): Restaurant
    articlesByCity(cityId: Int!): [Article]!
    articlesByRestaurant(restaurantId: Int!): [Article]!
    awardsByRestaurant(restaurantId: Int!): [Award]!
  }

  type Restaurant {
    id: Int!
    articles: [Article]!
    awards: [Award]!
    gPlaceId: String
    name: String!
  }

  type Award {
    id: Int!
    source: String!
    type: String!
    url: String!
  }

  type Article {
    id: Int!
    source: String!
    title: String!
    url: String!
  }
`;

export const resolvers = {
  Query: {
    restaurantById: async (
      _parent: undefined,
      args: { id: number },
      context: Context
    ) => {
      const restaurant = await context.prisma.restaurant.findUnique({
        where: { id: args.id },
        include: {
          awards: true,
          articles: {
            select: {
              articles: true,
            },
          },
        },
      });

      return {
        ...restaurant,
        articles: restaurant?.articles.map(({ articles }) => articles),
      };
    },
    restaurantsByCity: async (
      _parent: undefined,
      args: { cityId: number },
      context: Context
    ) => {
      const restaurants = await context.prisma.restaurant.findMany({
        where: { cityId: args.cityId },
        include: {
          awards: true,
          articles: {
            select: {
              articles: true,
            },
          },
        },
      });

      return restaurants.map((restaurant) => ({
        ...restaurant,
        articles: restaurant?.articles.map(({ articles }) => articles),
      }));
    },
    articlesByCity: async (
      _parent: undefined,
      args: { cityId: number },
      context: Context
    ) => {
      return await context.prisma.article.findMany({
        where: { cityId: args.cityId },
      });
    },
    articlesByRestaurant: async (
      _parent: undefined,
      args: { restaurantId: number },
      context: Context
    ) => {
      const articlesRestaurantsRows =
        await context.prisma.articlesToRestaurants.findMany({
          where: { restaurantId: args.restaurantId },
          select: {
            articleId: true,
          },
        });

      const articleIds = articlesRestaurantsRows.map(
        ({ articleId }) => articleId
      );

      return await context.prisma.article.findMany({
        where: { id: { in: articleIds } },
      });
    },
    awardsByRestaurant: async (
      _parent: undefined,
      args: { restaurantId: number },
      context: Context
    ) => {
      return await context.prisma.award.findMany({
        where: { restaurantId: args.restaurantId },
      });
    },
  },
};

export default typeDefs;
