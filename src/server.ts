import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { context } from './context.js';
import typeDefs from './schema.js';
import { resolvers } from './schema.js';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context,
});

console.log(`🚀  Server ready at: ${url}`);
