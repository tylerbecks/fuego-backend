import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import prisma from './prisma-client.js';
import { nextTick } from 'process';

const port = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(morgan('tiny'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const award = {
  id: true,
  source: true,
  type: true,
  year: true,
  url: true,
  chef: true,
};

const article = {
  id: true,
  title: true,
  source: true,
  url: true,
};

app.get('/city/:city/restaurants', async (req, res, next) => {
  let { city } = req.params;
  city = city.replace('-', ' ');

  try {
    const { id: cityId } = await prisma.city.findFirstOrThrow({
      where: { city },
      select: { id: true },
    });

    const restaurantsRaw = await prisma.restaurant.findMany({
      where: { cityId: Number(cityId) },
      select: {
        id: true,
        name: true,
        gPlaceId: true,
        awards: {
          select: award,
        },
        articles: {
          select: {
            articles: {
              select: article,
            },
          },
        },
      },
    });

    const restaurants = restaurantsRaw.map((restaurant) => ({
      ...restaurant,
      articles: restaurant?.articles.map(({ articles }) => articles),
    }));

    res.json(restaurants);
  } catch (error) {
    next(error);
  }
});

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
    const restaurantRaw = await prisma.restaurant.findUnique({
      where: { id: Number(restaurantId) },
      select: {
        id: true,
        name: true,
        gPlaceId: true,
        awards: {
          select: award,
        },
        articles: {
          select: {
            articles: {
              select: article,
            },
          },
        },
      },
    });

    const restaurant = {
      ...restaurantRaw,
      articles: restaurantRaw?.articles.map(({ articles }) => articles),
    };

    res.json(restaurant);
  } catch (error) {
    next(error);
  }
});

app.get('/restaurant/:restaurantId/articles', async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    const restaurantRaw = await prisma.restaurant.findUnique({
      where: { id: Number(restaurantId) },
      select: {
        articles: {
          select: {
            articles: {
              select: article,
            },
          },
        },
      },
    });

    const articles = restaurantRaw?.articles.map(({ articles }) => articles);

    res.json(articles);
  } catch (error) {
    next(error);
  }
});

app.get('/restaurant/:restaurantId/awards', async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    const awards = await prisma.award.findMany({
      where: { restaurantId: Number(restaurantId) },
      select: award,
    });

    res.json(awards);
  } catch (error) {
    next(error);
  }
});

app.listen(port, () =>
  console.log(`🚀 Server ready at: http://localhost:${port}`)
);
