import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { context, Context } from './context.js';
import typeDefs from './schema.js';
import { resolvers } from './schema.js';

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async () => context,
});

console.log(`🚀  Server ready at: ${url}`);
