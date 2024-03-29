import { Prisma } from '@prisma/client';

import ArticleScraper from '../scraper/article-scrapers/article-scraper';
import { GoToPageError } from '../scraper/utils/errors';
import logger from '../src/logger';
import prisma from '../src/prisma-client';
import { ScrapedRestaurant } from '../src/types';
import { findOrCreateRestaurant } from './utils/db';

type Articles = Prisma.PromiseReturnType<typeof fetchAllArticles>;
type Article = Articles[number];

type RestaurantInDb = {
  id: number;
  reservationLinks: string[];
};

export default class ArticleRefresher {
  now;
  articleFilter;

  constructor(articleFilter?: string) {
    this.now = new Date();
    this.articleFilter = articleFilter;
  }

  async refreshAll() {
    const articles = await this.fetchStaleArticles();
    logger.info(`Found ${articles.length} articles to refresh.`);

    for (const article of articles) {
      if (article.url.includes('statesman')) {
        continue;
      }

      logger.info(`
      ========================================================
      `);

      try {
        await this.refreshArticle(article);
      } catch (error) {
        console.error(error);
        if (error instanceof GoToPageError) {
          logger.error(error.message);
        }

        continue;
      }

      await this.removeOutdatedArticleAssociationsWithRestaurants(article);
    }
  }

  private async fetchStaleArticles() {
    const articles = await fetchAllArticles();

    // If we pass in an articleFilter, we want to unpdate everything with that filter
    if (this.articleFilter) {
      return articles.filter((article) =>
        article.url.includes(this.articleFilter as string)
      );
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Otherwise, just get the stale articles
    return articles.filter((article) => {
      return article.updatedAt === null || article.updatedAt < oneMonthAgo;
    });
  }

  async refreshArticle(article: Article) {
    logger.info(`Refreshing article ${article.url}`);
    const scraper = new ArticleScraper(article.url);
    const scrapedRestaurants = await scraper.getRestaurants();
    for (const scrapedRestaurant of scrapedRestaurants) {
      logger.info('');
      // TODO remove this, name should always exist. Fix this in the scrapers
      if (!scrapedRestaurant.name) {
        continue;
      }

      const restaurantDB = await findOrCreateRestaurant(
        scrapedRestaurant.name,
        article.cityId
      );

      if (restaurantDB) {
        await this.upsertArticlesToRestauarnts(
          restaurantDB,
          scrapedRestaurant,
          article
        );

        await this.updateRestaurantMetadata(restaurantDB, scrapedRestaurant);
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

  private async upsertArticlesToRestauarnts(
    restaurantInDb: RestaurantInDb,
    scrapedRestaurant: ScrapedRestaurant,
    article: Article
  ) {
    const { description, url } = scrapedRestaurant;
    const existing = await prisma.articlesToRestaurants.findFirst({
      where: {
        restaurantId: restaurantInDb.id,
        articleId: article.id,
      },
    });

    if (!existing) {
      logger.info('Inserting into articlesToRestaurants');
      return await prisma.articlesToRestaurants.create({
        data: {
          restaurantId: restaurantInDb.id,
          articleId: article.id,
          description,
          ...(url ? { url } : {}),
          updatedAt: this.now,
        },
      });
    }

    if (existing.description && !description) {
      logger.info(
        'Description found, but no description scraped. just updating url and updatedAt on articlesToRestaurants'
      );
      return await prisma.articlesToRestaurants.update({
        where: {
          id: existing.id,
        },
        data: {
          deletedAt: null,
          updatedAt: this.now,
          ...(url ? { url } : {}),
        },
      });
    }

    logger.info(
      'Updating description, url, and updatedAt on articlesToRestaurants'
    );
    return await prisma.articlesToRestaurants.update({
      where: {
        id: existing.id,
      },
      data: {
        deletedAt: null,
        description,
        updatedAt: this.now,
        ...(url ? { url } : {}),
      },
    });
  }

  private async updateRestaurantMetadata(
    restaurantInDb: RestaurantInDb,
    scrapedRestaurant: ScrapedRestaurant
  ) {
    const {
      instagramLink,
      longAddress,
      phone,
      price,
      shortAddress,
      website,
      lat,
      long,
    } = scrapedRestaurant;
    const { id } = restaurantInDb;

    logger.info('Updating restaurant metadata');
    await prisma.restaurant.update({
      where: { id },
      data: {
        ...(instagramLink ? { instagramLink } : {}),
        ...(longAddress ? { longAddress } : {}),
        ...(phone ? { phone } : {}),
        ...(price ? { price } : {}),
        ...(shortAddress ? { shortAddress } : {}),
        ...(website ? { website } : {}),
        ...(lat ? { lat } : {}),
        ...(long ? { long } : {}),
        updatedAt: this.now,
      },
    });

    if (
      scrapedRestaurant.reservationUrls &&
      scrapedRestaurant.reservationUrls.length > 0
    ) {
      await this.updateReservationUrls(
        restaurantInDb,
        scrapedRestaurant.reservationUrls
      );
    }
  }

  async updateReservationUrls(
    restaurantInDb: RestaurantInDb,
    scrapedReservationUrls: string[]
  ) {
    // Only push links that aren't already in the db array
    const newReservationUrls = scrapedReservationUrls.filter(
      (link) => !restaurantInDb.reservationLinks.includes(link)
    );

    logger.info(`Pushing ${newReservationUrls.length} new reservation links`);
    for (const link of newReservationUrls) {
      await prisma.restaurant.update({
        where: {
          id: restaurantInDb.id,
        },
        data: {
          reservationLinks: {
            push: link,
          },
        },
      });
    }
  }

  private async removeOutdatedArticleAssociationsWithRestaurants(
    article: Article
  ) {
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
  const articleFilter =
    'https://www.thrillist.com/eat/paris/best-restaurants-paris';
  const refresher = new ArticleRefresher(articleFilter);
  await refresher.refreshAll();
})();
