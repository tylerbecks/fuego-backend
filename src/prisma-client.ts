import { PrismaClient } from '@prisma/client';

import logger from './logger';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
});

prisma.$on('query', (e) => {
  logger.verbose(`Query: ${e.query}`);
  logger.verbose(`Params: ${e.params}`);
  logger.verbose(`Duration: ${e.duration}ms`);
});

export default prisma;
