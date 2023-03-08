import prisma from '../src/prisma-client';
import ArticleScraper from './article-scrapers/article-scraper';

type Restaurant = {
  articles: {
    articles: {
      id: number;
      title: string;
      source: string;
      url: string;
    };
  }[];
  id: number;
};

const getUniqueArticles = (restaurants: Restaurant[]) => {
  const allArticles = restaurants.flatMap(({ articles }) => articles);
  const flattenedAllArticles = allArticles.map(({ articles }) => articles);
  return getUniqueItemsByKey(flattenedAllArticles, 'id');
};

const kebabToLowerCase = (str: string) =>
  str.replaceAll('-', ' ').toLowerCase();

const getUniqueItemsByKey = <
  Obj extends Record<Key, unknown>,
  Key extends keyof Obj
>(
  arr: Obj[],
  key: Key
): Obj[] => [...new Map(arr.map((item) => [item[key], item])).values()];

(async () => {
  let param = process.argv[2];
  param = kebabToLowerCase(param);

  const city = await prisma.city.findFirst({
    select: {
      id: true,
    },
    where: {
      city: param,
    },
  });

  if (!city) {
    console.log(`No city found with name ${param}`);
    return;
  }

  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      articles: {
        select: {
          articles: {
            select: {
              id: true,
              title: true,
              source: true,
              url: true,
            },
          },
        },
      },
    },
    where: {
      cityId: city.id,
    },
  });

  console.log(`Refreshing ${restaurants.length} restaurants in ${param}`);

  const articles = getUniqueArticles(restaurants);
  console.log(`There are ${articles.length} unique articles`);

  for (const article of articles) {
    const articleScraper = new ArticleScraper(article.url);
    // const restaurantsForArticle = articleScraper.getRestaurants();
    // need to update the existing restaurants, "delete" the ones that fell off the list, and add the new ones
  }

  // await prisma.restaurant.update({
  //   where: {
  //     id: restuarant.id,
  //   },
  //   data: {
  //     description: ogContent?.description ?? null,
  //   },
  // });

  // scraper.close();
})();
