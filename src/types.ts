import { Prisma } from '@prisma/client';

import { getRestaurantById } from './resolver';

export type Restaurant = Prisma.PromiseReturnType<typeof getRestaurantById>;

export type ScrapedRestaurant = {
  name: string | null;
  description: string | null;
  instagramLink?: string | null;
  phone?: string | null;
  price?: number | null;
  reservationLink?: string | null;
  shortAddress?: string | null;
  longAddress?: string | null;
  url?: string | null;
  website?: string | null;
};
