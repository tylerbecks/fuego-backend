import { Prisma } from '@prisma/client';
import { getRestaurantById } from './resolver';

export type Restaurant = Prisma.PromiseReturnType<typeof getRestaurantById>;

export enum AwardSource {
  james_beard = 'james_beard',
  fifty_best = 'fifty_best',
  michelin = 'michelin',
}

const findAward = (restaurant: Restaurant, awardSource: string) =>
  restaurant.awards?.find((award) => award.source === awardSource);

const getFuegoScore = (restaurant: Restaurant) => {
  let score = 0;

  if (restaurant.articles) {
    score = restaurant.articles.length;
  }

  if (findAward(restaurant, AwardSource.james_beard)) {
    score += 1.2;
  }

  if (findAward(restaurant, AwardSource.fifty_best)) {
    score += 1.6;
  }

  const maybeMichelin = findAward(restaurant, AwardSource.michelin);

  if (maybeMichelin) {
    const MICHELIN_SCORE_MAP = {
      BIB_GOURMAND: 1.1,
      ONE_STAR: 1.3,
      TWO_STARS: 1.4,
      THREE_STARS: 1.5,
    };

    const michelinScore =
      MICHELIN_SCORE_MAP[maybeMichelin.type as keyof typeof MICHELIN_SCORE_MAP];

    score += michelinScore;
  }

  return score;
};

export const sortRestaurantsByScore = (restaurants: Restaurant[]) =>
  restaurants.sort((a, b) => (getFuegoScore(a) > getFuegoScore(b) ? -1 : 1));
