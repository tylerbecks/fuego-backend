import { Prisma } from '@prisma/client';

import ArticleScraper from '../scraper/article-scrapers/article-scraper';
import { GoToPageError } from '../scraper/utils/errors';
import logger from '../src/logger';
import prisma from '../src/prisma-client';
import { findOrCreateRestaurant } from './utils/db';

type Articles = Prisma.PromiseReturnType<typeof fetchAllArticles>;
type Article = Articles[number];

type Restaurant = {
  id: number;
  name: string;
};

class ArticleRefresher {
  now;

  constructor() {
    this.now = new Date();
  }

  async refreshAll() {
    const articles = await this.#fetchStaleArticles();
    logger.info(`Found ${articles.length} stale articles to refresh.`);

    for (const article of articles) {
      if (article.url.includes('statesman')) {
        continue;
      }

      logger.info(`
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
      logger.info('');
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
      logger.info('Inserting into articlesToRestaurants');
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
      logger.info('No description, just updating updatedAt...');
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

    logger.info('Updating description and updatedAt...');
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
    logger.info(`Pruning outdated article associations`);
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

(async () => {
  const refresher = new ArticleRefresher();
  await refresher.refreshAll();
})();
