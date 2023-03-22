import prisma from '../src/prisma-client';
import ArticleScraper from '../scraper/article-scrapers/article-scraper';
import Google from '../src/google-client';
import { GoToPageError } from '../scraper/utils/errors';

type Article = {
  id: number;
  cityId: number;
  url: string;
  title: string;
  updatedAt: Date | null;
};

type Restaurant = {
  id: number;
  name: string;
};

class ArticleRefresher {
  now: Date;

  constructor() {
    this.now = new Date();
  }

  async refreshAll() {
    const articles = await this.#fetchStaleArticles();
    console.log(`Found ${articles.length} stale articles to refresh.`);

    for (const article of articles) {
      if (article.url.includes('statesman')) {
        continue;
      }

      console.log(`
      ========================================================
      `);
      try {
        await this.#refreshArticle(article);
      } catch (error) {
        if (error instanceof GoToPageError) {
          console.warn(error.message);
          continue;
        }
      }
      await this.#removeOutdatedArticleAssociationsWithRestaurants(article);

      await prisma.articlesToRestaurants.findMany({
        where: {
          articleId: article.id,
        },
      });
    }
  }

  async #fetchStaleArticles() {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const articles = await fetchAllArticles();
    return articles.filter((article) => {
      return article.updatedAt === null || article.updatedAt < oneMonthAgo;
    });
  }

  async #refreshArticle(article: Article) {
    const scraper = new ArticleScraper(article.url);
    const scrapedRestaurants = await scraper.getRestaurants();
    for (const scrapedRestaurant of scrapedRestaurants) {
      console.log();
      if (!scrapedRestaurant.name) {
        continue;
      }

      const restaurantDB = await findOrCreateRestaurant(
        scrapedRestaurant.name,
        article.cityId
      );

      if (restaurantDB) {
        await this.#upsertArticlesToRestauarnts(
          restaurantDB,
          article,
          scrapedRestaurant.description
        );
      }
    }

    await prisma.article.update({
      where: {
        id: article.id,
      },
      data: {
        updatedAt: this.now,
      },
    });
  }

  async #upsertArticlesToRestauarnts(
    restaurant: Restaurant,
    article: Article,
    description: string | null
  ) {
    const existing = await prisma.articlesToRestaurants.findFirst({
      where: {
        restaurantId: restaurant.id,
        articleId: article.id,
      },
    });

    if (!existing) {
      console.log('Inserting into articlesToRestaurants');
      return await prisma.articlesToRestaurants.create({
        data: {
          restaurantId: restaurant.id,
          articleId: article.id,
          description,
          updatedAt: this.now,
        },
      });
    }

    if (existing.description && !description) {
      console.log('No description, just updating updatedAt...');
      return await prisma.articlesToRestaurants.update({
        where: {
          id: existing.id,
        },
        data: {
          updatedAt: this.now,
          deletedAt: null,
        },
      });
    }

    console.log('Updating description and updatedAt...');
    return await prisma.articlesToRestaurants.update({
      where: {
        id: existing.id,
      },
      data: {
        updatedAt: this.now,
        description,
        deletedAt: null,
      },
    });
  }

  async #removeOutdatedArticleAssociationsWithRestaurants(article: Article) {
    console.log(`Pruning outdated article associations`);
    return await prisma.articlesToRestaurants.updateMany({
      where: {
        articleId: article.id,
        OR: [
          {
            updatedAt: {
              lt: this.now,
            },
          },
          {
            updatedAt: null,
          },
        ],
        deletedAt: null,
      },
      data: {
        deletedAt: this.now,
      },
    });
  }
}

const fetchAllArticles = async () =>
  await prisma.article.findMany({
    select: {
      id: true,
      cityId: true,
      url: true,
      title: true,
      updatedAt: true,
    },
  });

// Always fetch restaurants by their cached restaurantId
const findOrCreateRestaurant = async (
  restaurantName: string,
  cityId: number
) => {
  const cachedPlaceId = await prisma.placeIdCache.findFirst({
    where: {
      name: {
        equals: restaurantName,
        mode: 'insensitive',
      },
      cityId,
    },
  });

  const restaurantPreviouslyCachedWithNullPlaceId =
    cachedPlaceId?.placeId === null;

  if (restaurantPreviouslyCachedWithNullPlaceId) {
    console.log(`Found null cached placeId for ${restaurantName}`);
    return findRestaurantWithNoPlaceId(restaurantName, cityId);
  }

  // placeId never been cached
  if (!cachedPlaceId) {
    console.log(`No cached placeId for ${restaurantName}. Creating entry...`);
    const google = new Google();
    const city = await prisma.city.findUnique({
      where: {
        id: cityId,
      },
    });

    const placeId = await google.findPlaceFromText(
      `${restaurantName} ${city?.city || ''}`
    );

    if (!placeId.place_id) {
      console.log(`No placeId found for ${restaurantName}`);
    }

    await cachePlaceIdForRestaurant(restaurantName, cityId, placeId.place_id);

    if (placeId.place_id !== undefined) {
      const restaurantWithSamePlaceId = await prisma.restaurant.findFirst({
        where: {
          gPlaceId: placeId.place_id ?? null,
        },
      });

      if (restaurantWithSamePlaceId) {
        console.log(
          `After caching id, found restaurant with same placeId ${placeId.place_id}`
        );
        return restaurantWithSamePlaceId;
      }
    }

    console.log(`Creating restaurant ${restaurantName}`);
    return await prisma.restaurant.create({
      data: {
        name: restaurantName,
        gPlaceId: placeId.place_id ?? null,
        cityId,
      },
    });
  }

  console.log(
    `Found cached placeId ${cachedPlaceId.placeId} for ${restaurantName}`
  );
  return await prisma.restaurant.findFirst({
    where: {
      gPlaceId: cachedPlaceId.placeId,
    },
  });
};

const cachePlaceIdForRestaurant = async (
  restaurantName: string,
  cityId: number,
  placeId: string | undefined
) =>
  await prisma.placeIdCache.create({
    data: {
      name: restaurantName,
      cityId,
      placeId: placeId ?? null,
    },
  });

const findRestaurantWithNoPlaceId = async (
  restaurantName: string,
  cityId: number
) =>
  await prisma.restaurant.findFirst({
    where: {
      name: {
        equals: restaurantName,
        mode: 'insensitive',
      },
      cityId,
    },
  });

(async () => {
  const refresher = new ArticleRefresher();
  await refresher.refreshAll();
})();
