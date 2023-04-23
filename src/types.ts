import { Prisma } from '@prisma/client';

import { getRestaurantById } from './resolver';

export type Restaurant = Prisma.PromiseReturnType<typeof getRestaurantById>;
