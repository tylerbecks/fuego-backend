import { Prisma } from '@prisma/client';

import { getRestaurantById } from './resolver';

export type Restaurant = Prisma.PromiseReturnType<typeof getRestaurantById>;

export type ScrapedRestaurant = {
  name: string | null;
  description: string | null;
  url?: string | null;
  price?: number | null;
  website?: string | null;
  shortAddress?: string | null;
  reservationLink?: string | null;
};
