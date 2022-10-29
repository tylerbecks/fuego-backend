// import { RESTDataSource, WillSendRequestOptions } from '@apollo/datasource-rest';
// import type { KeyValueCache } from '@apollo/utils.keyvaluecache';
// import { ApolloServer } from '@apollo/server';
// import { startStandaloneServer } from '@apollo/server/standalone';

// class MoviesAPI extends RESTDataSource {
//   override baseURL = 'https://movies-api.example.com/';
//   private token: string;

//   constructor(options: { token: string; cache: KeyValueCache }) {
//     super(options); // this sends our server's `cache` through
//     this.token = options.token;
//   }

//   override willSendRequest(request: WillSendRequestOptions) {
//     request.headers['authorization'] = this.token;
//   }

//   async getMovie(id: string): Promise<Movie> {
//     return this.get<Movie>(`movies/${encodeURIComponent(id)}`);
//   }
// }

// interface ContextValue {
//   token: string;
//   dataSources: {
//     moviesAPI: MoviesAPI;
//   };
// }

// const server = new ApolloServer<ContextValue>({
//   typeDefs,
//   resolvers,
// });

// const { url } = await startStandaloneServer(server, {
//   context: async ({ req }) => {
//     const token = getTokenFromRequest(req);
//     const { cache } = server;
//     return {
//       token,
//       //highlight-start
//       dataSources: {
//         moviesAPI: new MoviesAPI({ cache, token }),
//       },
//       //highlight-end
//     };
//   },
// });

// console.log(`🚀  Server ready at ${url}`);
