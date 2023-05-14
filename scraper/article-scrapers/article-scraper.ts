import logger from '../../src/logger';
import { ScrapedRestaurant } from '../../src/types';
import CondeNast from './conde-nast';
import CultureTrip from './culture-trip';
import Eater from './eater';
import Infatuation from './infatuation';
import Thrillist from './thrillist';
import Timeout from './timeout';

export interface ArticleScraperInterface {
  getRestaurants: () => Promise<ScrapedRestaurant[]>;
}

const SCRAPERS = {
  cntraveler: CondeNast,
  theculturetrip: CultureTrip,
  eater: Eater,
  theinfatuation: Infatuation,
  thrillist: Thrillist,
  timeout: Timeout,
};

const topLevelDomains = new RegExp(/\.(com|co)$/, 'g');

const getSecondLevelDomain = (url: string) =>
  url.replace(topLevelDomains, '').split('.').pop();

export default class ArticleScraper implements ArticleScraperInterface {
  url;
  scraper;

  constructor(url: string) {
    this.url = url;
    const parsedUrl = new URL(url);
    const secondLevelDomain = getSecondLevelDomain(parsedUrl.hostname);
    if (!secondLevelDomain || !(secondLevelDomain in SCRAPERS)) {
      throw new Error(`No scraper found for ${secondLevelDomain || 'unknown'}`);
    }

    const scraper = SCRAPERS[secondLevelDomain as keyof typeof SCRAPERS];

    this.scraper = new scraper(url);
  }

  async getRestaurants() {
    await this.scraper.launch();
    logger.info(`Scraping ${this.url}`);
    const restaurants = await this.scraper.getRestaurants();
    logger.info(`Found ${restaurants.length} restaurants`);
    await this.scraper.close();
    return restaurants;
  }

  // add function to refresh ogdata for title and site_name
}

// (async () => {
//   const url = 'https://austin.eater.com/maps/austin-best-restaurants-eater-38';

//   const scraper = new ArticleScraper(url);
//   const restaurants = await scraper.getRestaurants();
//   console.log(restaurants);
// })();
