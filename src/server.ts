import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import prisma from './prisma-client';
import { ParsedQs } from 'qs';
import { sortRestaurantsByScore } from './sort-restaurant';
import { getRestaurantById, getRestaurantsByCityId } from './resolver';

const port = process.env.PORT || 3001;

const RESTAURANTS_PER_PAGE = 10;

const app = express();
app.use(cors());
app.use(morgan('tiny'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const sliceList = (list: unknown[], page: number, limit: number) => {
  const start = (page - 1) * limit;
  const end = page * limit;
  return list.slice(start, end);
};

app.get('/city/:city/restaurants', async (req, res, next) => {
  let { city } = req.params;
  let { page, articleIds } = req.query;

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

    res.json({
      restaurants: paginateRestaurants,
      totalRestaurants: sortedRestaurants.length,
    });
  } catch (error) {
    next(error);
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
