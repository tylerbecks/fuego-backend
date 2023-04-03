import { Prisma } from '@prisma/client';
import axios from 'axios';

import Google from '../src/google-client';
import logger from '../src/logger';
import prisma from '../src/prisma-client';

const UNIQUE_VIOLATION = 'P2002';

class PlaceIdRefresher {
  private google;
  private now = new Date();

  constructor() {
    this.google = new Google();
  }

  async fetchRestaurants() {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    return await prisma.restaurant.findMany({
      where: {
        deletedAt: null,
        NOT: {
          gPlaceId: null,
        },
        OR: [
          {
            updatedAt: {
              lt: oneMonthAgo,
            },
          },
          {
            updatedAt: null,
          },
        ],
      },
      select: {
        id: true,
        name: true,
        gPlaceId: true,
        city: true,
        cities: {
          select: {
            city: true,
          },
        },
      },
    });
  }

  async refreshPlaceIds() {
    const restaurants = await this.fetchRestaurants();

    for (let i = 0; i < restaurants.length; i++) {
      const restaurant = restaurants[i];

      logger.info(
        `${i}/${restaurants.length} Refreshing placeId for ${restaurant.name}...`
      );
      if (!restaurant.gPlaceId) {
        throw new Error(`Restaurant ${restaurant.name} has no gPlaceId`);
      }

      const newPlaceId = await this.getNewPlaceId(restaurant);

      if (!newPlaceId) {
        logger.info('No new placeId found, skipping...');
        continue;
      }

      if (newPlaceId === restaurant.gPlaceId) {
        logger.info('place_id is the same, updating updatedAt and skipping...');
        await prisma.restaurant.update({
          where: {
            id: restaurant.id,
          },
          data: {
            updatedAt: this.now,
          },
        });
        continue;
      }

      logger.info(`🚨 New placeId: ${newPlaceId}`);

      await this.updateRestaurant(restaurant, newPlaceId);

      await prisma.placeIdCache.updateMany({
        where: {
          placeId: restaurant.gPlaceId,
        },
        data: {
          placeId: newPlaceId,
          updatedAt: this.now,
        },
      });
    }
  }

  async getNewPlaceId(restaurant: Restaurant) {
    if (!restaurant.gPlaceId) {
      throw new Error(`Restaurant ${restaurant.name} has no gPlaceId`);
    }

    try {
      const refreshedPlace = await this.google.refreshPlaceId(
        restaurant.gPlaceId
      );

      return refreshedPlace.place_id;
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error as AxiosError).response?.data?.error_message?.startsWith(
          'The provided Place ID is no longer valid'
        )
      ) {
        logger.info('place_id is no longer valid, querying google...');
        const newPlace = await this.google.findPlaceFromText(
          `${restaurant.name} ${
            (restaurant.city || restaurant.cities?.city) ?? ''
          }`
        );

        return newPlace.place_id;
      }
    }
  }

  async updateRestaurant(restaurant: Restaurant, newPlaceId: string) {
    try {
      await prisma.restaurant.update({
        where: {
          id: restaurant.id,
        },
        data: {
          gPlaceId: newPlaceId,
          updatedAt: this.now,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error('There was an error updating the restaurant!');

        if (error.code === UNIQUE_VIOLATION) {
          logger.warn(
            '👯‍♀️ Detected another restaurant with the new placeId, removing the current restaurant and updating existing articles and awards with this duplicate restaurant id'
          );

          const duplicateRestaurantWithValidPlaceId =
            await prisma.restaurant.findFirst({
              where: {
                gPlaceId: newPlaceId,
              },
            });

          if (!duplicateRestaurantWithValidPlaceId) {
            throw new Error('Should have found a duplicate restaurant');
          }

          logger.info('Updating all existing records with old restaurant id');

          await prisma.articlesToRestaurants.updateMany({
            where: {
              restaurantId: restaurant.id,
            },
            data: {
              restaurantId: duplicateRestaurantWithValidPlaceId.id,
            },
          });

          await prisma.award.updateMany({
            where: {
              restaurantId: restaurant.id,
            },
            data: {
              restaurantId: duplicateRestaurantWithValidPlaceId.id,
            },
          });

          await prisma.restaurant.delete({
            where: {
              id: restaurant.id,
            },
          });
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
}

type AxiosError = {
  response: {
    data: {
      error_message: string;
    };
  };
};

type Restaurant = {
  gPlaceId: string | null;
  id: number;
  name: string;
  city: string | null;
  cities: {
    city: string;
  } | null;
};

(async function () {
  const refresher = new PlaceIdRefresher();
  await refresher.refreshPlaceIds();
})();
