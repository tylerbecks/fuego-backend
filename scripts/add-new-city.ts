import path from 'path';
import { Database, verbose } from 'sqlite3';

import ArticleScraper from '../scraper/article-scrapers/article-scraper';
import logger from '../src/logger';
import prisma from '../src/prisma-client';
import ArticleRefresher from './refresh-articles';
import { CachedCity, matchCityWithAI } from './utils/city-matcher';

const cityCacheFilePath = path.join(__dirname, 'utils', 'city-cache.db');

const main = async (
  articleUrls: string[],
  cityStr: string,
  countryStr: string
) => {
  // Create new city in cities table
  logger.info('Creating new city in cities table');
  const newCity = await prisma.city.create({
    data: {
      city: cityStr,
      country: countryStr,
    },
  });
  // If there's an issue with the script, uncomment below and comment out the prisma.city.create() call above
  // const newCity = await prisma.city.findFirst({
  //   where: {
  //     city: cityStr,
  //     country: countryStr,
  //   },
  // });
  // if (!newCity) {
  //   throw new Error('Could not find city');
  // }

  // Then, iterate over the existing cities in city-cache.db to see if we need to update any existing entries
  const cityCache = new Database(cityCacheFilePath);
  const citiesInCountry = await getCitiesInCountry(cityCache, 'ar');
  await matchCityWithAI(
    `${newCity.city}, ${newCity.country}`,
    citiesInCountry,
    async (neighborhood) => {
      logger.info(`Updating ${neighborhood.city} in city-cache.db`);

      // Update cityCache
      cityCache.run(
        'UPDATE cities SET cityId = ?, cityFromDb = ? WHERE city = ? AND country = ?',
        [newCity.id, newCity.city, neighborhood.city, neighborhood.country]
      );

      // Find all restaurants in restaurants table that match the neighborhood
      await prisma.restaurant.updateMany({
        where: {
          city: neighborhood.city,
        },
        data: {
          cityId: newCity.id,
        },
      });
    }
  );

  // Then, insert new articles into articles table
  for (const url of articleUrls) {
    const scraper = new ArticleScraper(url);
    const ogData = await scraper.getOgData();

    // Create new article in articles table
    logger.info('Creating new article in articles table');
    const article = await prisma.article.create({
      data: {
        url,
        cityId: newCity.id,
        description: ogData.description,
        imageUrl: ogData.image,
        source: ogData.siteName,
        title: ogData.title,
      },
    });

    // Then, insert new restaurants into restaurants table
    const articleRefresher = new ArticleRefresher();
    await articleRefresher.refreshArticle(article);
  }
};

const getCitiesInCountry = (
  cache: Database,
  countryCode: string
): Promise<CachedCity[]> => {
  return new Promise((resolve, reject) => {
    cache.all(
      'SELECT * FROM cities WHERE country = ?',
      [countryCode],
      (err, rows) => {
        if (err) {
          reject(err);
        }

        resolve(rows as CachedCity[]);
      }
    );
  });
};

(async () => {
  const urls = [
    'https://www.cntraveler.com/gallery/best-restaurants-in-buenos-aires',
    'https://www.eater.com/maps/best-buenos-aires-restaurants-argentina',
    'https://www.theinfatuation.com/buenos-aires/guides/best-restaurants-buenos-aires',
    'https://www.timeout.com/buenos-aires/restaurants/best-restaurants-in-buenos-aires',
    'https://theculturetrip.com/south-america/argentina/articles/beyond-the-steakhouse-ten-of-the-best-restaurants-in-buenos-aires/',
  ];
  const city = 'buenos aires';
  const country = 'ar';
  await main(urls, city, country);
})();
