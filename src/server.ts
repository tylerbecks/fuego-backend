import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { context, Context } from './context.js';
import typeDefs from './schema.js';
import { resolvers } from './schema.js';

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
});

const port = process.env.PORT ? Number.parseInt(process.env.PORT) : 4000;

const { url } = await startStandaloneServer(server, {
  listen: { port },
  context: async () => context,
});

console.log(`🚀  Server ready at: ${url}`);
