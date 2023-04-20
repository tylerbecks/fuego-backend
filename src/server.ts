/* eslint-disable @typescript-eslint/no-misused-promises */
// eslint does not like passing an async function as the second arg to app.get
// disabling for now because this seems to work
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { ParsedQs } from 'qs';

import Google from './google-client';
import prisma from './prisma-client';
import { getRestaurantById, getRestaurantsByCityId } from './resolver';
import { sortRestaurantsByScore } from './sort-restaurant';

const port = process.env.PORT || 3001;
const RESTAURANTS_PER_PAGE = 10;

const BASE_DETAILS_FIELDS = [
  'business_status',
  'geometry/location',
  'name',
  'formatted_address',
  'photos',
  'url',
];

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

    // call google api to get place details for first 2 restaurants
    const google = new Google();
    const decoratedRestaurants = await Promise.all(
      paginateRestaurants.map(async (restaurant, index) => {
        let placeDetails = null;

        if (index < 2 && restaurant.gPlaceId) {
          const fields = [...BASE_DETAILS_FIELDS];

          // Price is not part of the base data, it's considered atmosphere data, so it's billed additionally
          // Only include price_level if we don't already have price
          if (!restaurant.price) {
            fields.push('price_level');
          }

          placeDetails = await google.getPlaceDetails(
            restaurant.gPlaceId,
            fields
          );
        }

        return {
          placeDetails,
          ...restaurant,
        };
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

  try {
    const google = new Google();
    const placeDetails = await google.getPlaceDetails(
      placeId,
      BASE_DETAILS_FIELDS
    );
    res.json(placeDetails);
  } catch (error) {
    console.error(error);
    res.status(500).send(`Error retrieving place details for ${placeId}`);
  }
});

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

    res.json(restaurant);
  } catch (error) {
    next(error);
  }
});

app.listen(port, () =>
  console.log(`🚀 Server ready at: http://localhost:${port}`)
);
