import MichelinScraper from '../scraper/award-scrapers/michelin';
import logger from '../src/logger';
import prisma from '../src/prisma-client';
import CityNameMatcher from './utils/city-matcher';
import { findOrCreateRestaurant } from './utils/db';

const SOURCE_ID = 'michelin';

class MichelinRefresher {
  async run() {
    const cityMatcher = new CityNameMatcher();
    await cityMatcher.loadAllCities();

    const scraper = new MichelinScraper();
    const restaurants = await scraper.scrape();
  }
}

(async () => {
  const refresher = new MichelinRefresher();
  await refresher.run();
})();
