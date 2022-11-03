import { Context } from './context';

const typeDefs = `#graphql
  type Query {
    restaurantsByCity(
      """
      The city to filter the restaurants by
      """
      city: String
    ): [Restaurant]!
    restaurantById(id: Int!): Restaurant
    articlesByRestaurant(restaurantId: Int!): [Article]!
    awardsByRestaurant(restaurantId: Int!): [Award]!
  }

  type Restaurant {
    id: Int!
    articles: [Article]!
    awards: [Award]!
    g_place_id: String
    name: String!
  }

  type Award {
    id: Int!
    source: AwardSource!
    type: String!
    url: String!
  }

  type Article {
    id: Int!
    source: ArticleSource!
    title: String!
    url: String!
  }

  enum AwardSource {
    FIFTY_BEST
    JAMES_BEARD
    MICHELIN
  }

  enum ArticleSource {
    CONDE_NAST
    CULTURE_TRIP
    EATER
    INFATUATION
    STATESMAN
    THRILLIST
    TIMEOUT
  }
`;

export const resolvers = {
  Query: {
    restaurantById: (
      _parent: undefined,
      args: { id: number },
      context: Context
    ) => {
      return context.prisma.restaurants.findUnique({
        where: { id: args.id },
      });
    },
    restaurantsByCity: (
      _parent: undefined,
      args: { city: string },
      context: Context
    ) => {
      return context.prisma.restaurants.findMany({
        where: { city: args.city },
        include: {
          awards: true,
          articles: true,
        },
      });
    },
    // articlesByCity: (
    //   _parent: undefined,
    //   args: { city: string },
    //   context: Context
    // ) => {
    //   return context.prisma.articles.findUnique({
    //     where: { city: args.city },
    //   });
    // },
    articlesByRestaurant: (
      _parent: undefined,
      args: { restaurantId: number },
      context: Context
    ) => {
      return context.prisma.articlesRestaurants;
      return context.prisma.articles.findMany({
        where: { id: args.restaurantId },
      });
    },
    awardsByRestaurant: (
      _parent: undefined,
      args: { restaurantId: number },
      context: Context
    ) => {
      return context.prisma.awards.findMany({
        where: { restaurantId: args.restaurantId },
      });
    },
  },
};

export default typeDefs;
