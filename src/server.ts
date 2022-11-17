import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import prisma from './prisma-client.js';

const PORT = 3001;

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
};

const article = {
  id: true,
  title: true,
  source: true,
  url: true,
};

app.get('/city/:cityId/restaurants', async (req, res) => {
  const { cityId } = req.params;

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
});

app.get('/city/:cityId/articles', async (req, res) => {
  const { cityId } = req.params;
  const articles = await prisma.article.findMany({
    where: { cityId: Number(cityId) },
  });

  res.json(articles);
});

app.get('/restaurant/:id', async (req, res) => {
  const { id } = req.params;

  const restaurantRaw = await prisma.restaurant.findUnique({
    where: { id: Number(id) },
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
});

app.get('/restaurant/:restaurantId/articles', async (req, res) => {
  const { restaurantId } = req.params;

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
});

app.get('/restaurant/:restaurantId/awards', async (req, res) => {
  const { restaurantId } = req.params;

  const awards = await prisma.award.findMany({
    where: { restaurantId: Number(restaurantId) },
    select: award,
  });

  res.json(awards);
});

app.listen(PORT, () =>
  console.log(`🚀 Server ready at: http://localhost:${PORT}`)
);
