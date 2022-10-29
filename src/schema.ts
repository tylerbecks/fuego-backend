const typeDefs = `#graphql
  type Query {
    restaurants(
      """
      The city to filter the restaurants by
      """
      city: String
    ): [Restaurant!]
    restaurant(id: ID!): Restaurant
  }

  type Restaurant {
    id: ID!
    articles: [Article]!
    awards: [Award]!
    g_place_id: String
    name: String!
  }

  type Award {
    id: ID!
    source: AwardSource!
    type: String!
    url: String!
  }

  type Article {
    id: ID!
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

export default typeDefs;
