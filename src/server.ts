/* eslint-disable @typescript-eslint/no-misused-promises */
// eslint does not like passing an async function as the second arg to app.get
// disabling for now because this seems to work
import { PlaceData } from '@googlemaps/google-maps-services-js';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { ParsedQs } from 'qs';

import Google from './google-client';
import prisma from './prisma-client';
import { getRestaurantById, getRestaurantsByCityId } from './resolver';
import { sortRestaurantsByScore } from './sort-restaurant';
import { Restaurant } from './types';

const port = process.env.PORT || 3001;
const RESTAURANTS_PER_PAGE = 25;

const app = express();
app.use(cors());
app.use(morgan('tiny'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const sliceList = <T>(list: T[], page: number, limit: number) => {
  const start = (page - 1) * limit;
  const end = page * limit;
  return list.slice(start, end);
};

app.get('/city/:city/restaurants', async (req, res, next) => {
  let { city } = req.params;
  // TODO remove articleIds
  const { page, articleIds } = req.query;

  if (!page) {
    res
      .status(400)
      .send(
        'Page number required to fetch restaurants. Please provide a query param like ?page=1'
      );
    return;
  }

  city = city.replace('-', ' ');

  try {
    const { id: cityId } = await prisma.city.findFirstOrThrow({
      where: { city },
      select: { id: true },
    });

    const articleIdsArr = formatArticleIdsExclude(articleIds);
    const restaurants = await getRestaurantsByCityId(cityId, articleIdsArr);
    const sortedRestaurants = sortRestaurantsByScore(restaurants);
    const paginateRestaurants = sliceList(
      sortedRestaurants,
      Number(page),
      RESTAURANTS_PER_PAGE
    );

    let decoratedRestaurants = await Promise.all(
      paginateRestaurants.map(async (restaurant, index) => {
        // call google api to get place details for first 2 restaurants
        if (index >= 2 || !restaurant.gPlaceId) {
          return {
            ...restaurant,
            placeDetails: null,
          };
        }

        return await decorateRestaurantWithPlaceDetails(restaurant);
      })
    );

    // Next, fetch google details for every restaurant that doesn't have lat/long
    // This is needed to show all the restaurants on the map on render
    // TODO: If on mobile, we don't need to do this until the user hits the map button, but that's an optimization for the future
    decoratedRestaurants = await Promise.all(
      decoratedRestaurants.map(async (restaurant) => {
        if (restaurant.placeDetails) {
          return restaurant;
        }
        if (restaurant.lat && restaurant.long) {
          return restaurant;
        }

        return await decorateRestaurantWithPlaceDetails(restaurant);
      })
    );

    res.json({
      restaurants: decoratedRestaurants,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/photo/:photoReference', async (req, res) => {
  const { photoReference } = req.params;

  try {
    const google = new Google();
    const photoStream = await google.getPhoto(photoReference);
    res.setHeader('Content-Type', 'image/jpeg');
    photoStream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving photo');
  }
});

app.get('/place-details/:placeId', async (req, res) => {
  const { placeId } = req.params;
  const fields = req.query.fields as string[];

  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    res
      .status(400)
      .send(
        'Fields required to fetch place details. Please provide a query param like ?fields=formatted_address,geometry/location'
      );
    return;
  }

  try {
    const google = new Google();

    const placeDetails = await google.getPlaceDetails(placeId, fields);
    res.json(placeDetails);
  } catch (error) {
    console.error(error);
    res.status(500).send(`Error retrieving place details for ${placeId}`);
  }
});

// TODO remove
const formatArticleIdsExclude = (
  articleIdsParam: undefined | string | string[] | ParsedQs | ParsedQs[]
) => {
  if (!articleIdsParam) {
    return [];
  }

  // articleIds is a string if there is only one articleId, an array if there are multiple
  const articleIdsArray = Array.isArray(articleIdsParam)
    ? articleIdsParam
    : [articleIdsParam];

  return articleIdsArray.map((id) => Number(id));
};

app.get('/city/:cityId/articles', async (req, res, next) => {
  const { cityId } = req.params;

  try {
    const articles = await prisma.article.findMany({
      where: { cityId: Number(cityId) },
    });

    res.json(articles);
  } catch (error) {
    next(error);
  }
});

app.get('/city/:city/metadata', async (req, res, next) => {
  let { city } = req.params;

  city = city.replace('-', ' ');

  try {
    const { id: cityId } = await prisma.city.findFirstOrThrow({
      where: { city },
      select: { id: true },
    });

    const restaurants = await getRestaurantsByCityId(Number(cityId));
    const jamesBeardAwards = restaurants.filter(
      (r) => r.awards.filter((a) => a.source === 'james_beard').length > 0
    ).length;
    const fiftyBestAwards = restaurants.filter(
      (r) => r.awards.filter((a) => a.source === 'fifty_best').length > 0
    ).length;
    const michelinOneStars = restaurants.filter(
      (r) => r.awards.filter((a) => a.type === 'ONE_STAR').length > 0
    ).length;
    const michelinTwoStars = restaurants.filter(
      (r) => r.awards.filter((a) => a.type === 'TWO_STARS').length > 0
    ).length;
    const michelinThreeStars = restaurants.filter(
      (r) => r.awards.filter((a) => a.type === 'THREE_STARS').length > 0
    ).length;
    const michelinBibGourmands = restaurants.filter(
      (r) => r.awards.filter((a) => a.type === 'BIB_GOURMAND').length > 0
    ).length;

    res.json({
      restaurants: restaurants.length,
      jamesBeardAwards,
      fiftyBestAwards,
      michelinOneStars,
      michelinTwoStars,
      michelinThreeStars,
      michelinBibGourmands,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/restaurant/:restaurantId', async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    const restaurant = await getRestaurantById(Number(restaurantId));
    const decoratedRestaurant = await decorateRestaurantWithPlaceDetails(
      restaurant,
      ['international_phone_number', 'website', 'opening_hours', 'adr_address']
    );

    res.json(decoratedRestaurant);
  } catch (error) {
    next(error);
  }
});

type RestaurantWithDetails = Restaurant & {
  placeDetails: Partial<PlaceData> | null;
};

const decorateRestaurantWithPlaceDetails = async (
  restaurant: Restaurant,
  extraFields: string[] = []
): Promise<RestaurantWithDetails> => {
  if (!restaurant.gPlaceId) {
    return {
      ...restaurant,
      placeDetails: null,
    };
  }

  const fields = [
    'business_status',
    'geometry/location',
    'name',
    'formatted_address',
    'photos',
    'url',
    ...extraFields,
  ];

  // Price is not part of the base data, it's considered atmosphere data, so it's billed additionally
  // Only include price_level if we don't already have price
  if (!restaurant.price) {
    fields.push('price_level');
  }

  const google = new Google();

  const placeDetails = await google.getPlaceDetails(
    restaurant.gPlaceId,
    fields
  );

  return { ...restaurant, placeDetails };
};

app.listen(port, () =>
  console.log(`🚀 Server ready at: http://localhost:${port}`)
);
