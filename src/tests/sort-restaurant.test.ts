import { describe, expect, it } from 'vitest';
import {
  sortRestaurantsByScore,
  Restaurant,
  AwardSource,
} from '../sort-restaurant';

describe('test fuego score', () => {
  const gJelina: Restaurant = {
    name: 'Gjelina',
    gPlaceId: 'a123',
    articles: [
      {
        id: 1,
        source: 'Eater',
        title: '38 Best Restaurants in Los Angeles',
        url: 'www.eater.la.com',
      },
    ],
  };

  const bavel: Restaurant = {
    name: 'Bavel',
    gPlaceId: 'b456',
    articles: [],
    awards: [
      {
        type: 'Best Chef in the West',
        source: AwardSource.james_beard,
        id: 4,
        chef: 'Tyler Becks',
        year: 2022,
        url: 'www.jamesBeard.com',
      },
    ],
  };

  const alinea: Restaurant = {
    name: 'Alinea',
    gPlaceId: '0aarst',
    articles: [],
    awards: [
      {
        type: '1',
        source: AwardSource.fifty_best,
        id: 5,
        chef: null,
        year: 2022,
        url: 'https://www.theworlds50best.com/list/1-50',
      },
    ],
  };

  const langers: Restaurant = {
    name: 'Langers',
    gPlaceId: '8912meis',
    articles: [
      {
        id: 1,
        source: 'Eater',
        title: '38 Best Restaurants in Los Angeles',
        url: 'www.eater.la.com',
      },
      {
        id: 2,
        source: 'Timeout',
        title: '20 Best Restaurants in Los Angeles',
        url: 'www.timeout.la.com',
      },
    ],
    awards: [],
  };

  const nNaka: Restaurant = {
    name: 'n/naka',
    gPlaceId: '82mcy',
    articles: [],
    awards: [
      {
        type: 'TWO_STARS',
        source: 'michelin',
        id: 6,
        chef: null,
        year: 2022,
        url: 'https://guide.michelin.com/us/en/california/us-los-angeles/restaurant/n-naka',
      },
    ],
  };

  it('handles an empty list', async () => {
    const restaurants: Restaurant[] = [];
    const sortedRestaurants = sortRestaurantsByScore(restaurants);
    expect(sortedRestaurants).toStrictEqual([]);
  });

  it('sorts james beard before an article', async () => {
    const restaurants: Restaurant[] = [gJelina, bavel];
    const sortedRestaurants = sortRestaurantsByScore(restaurants);
    expect(sortedRestaurants).toStrictEqual([bavel, gJelina]);
  });

  it('sorts fifty best before james beard', async () => {
    const restaurants: Restaurant[] = [gJelina, alinea];
    const sortedRestaurants = sortRestaurantsByScore(restaurants);
    expect(sortedRestaurants).toStrictEqual([alinea, gJelina]);
  });

  it('sorts 2 articles before michelin', async () => {
    const restaurants: Restaurant[] = [nNaka, langers, gJelina, alinea];
    const sortedRestaurants = sortRestaurantsByScore(restaurants);
    expect(sortedRestaurants).toStrictEqual([langers, alinea, nNaka, gJelina]);
  });
});
