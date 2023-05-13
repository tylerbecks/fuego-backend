import { Prisma } from '@prisma/client';

import { getRestaurantById } from './resolver';

export type Restaurant = Prisma.PromiseReturnType<typeof getRestaurantById>;

export type ScrapedRestaurant = {
  name: string | null;
  description: string | null;
  url?: string;
  price?: number | null;
};
