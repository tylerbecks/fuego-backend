import logger from '../../src/logger';
import { ScrapedRestaurant } from '../../src/types';
import Browser from '../browser';
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

export default class ArticleScraper
  extends Browser
  implements ArticleScraperInterface
{
  url;
  scraper;

  constructor(url: string) {
    super();
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

  async getOgData() {
    logger.info(`Scraping og data for: ${this.url}`);
    await this.launch();
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    await page.goto(this.url);

    const title = await page
      .locator('meta[property="og:title"]')
      .first()
      .getAttribute('content');
    if (!title) {
      throw new Error('No title found');
    }
    const description = await page
      .locator('meta[property="og:description"]')
      .first()
      .getAttribute('content');
    if (!description) {
      throw new Error('No description found');
    }
    const image = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute('content');
    const siteName = await page
      .locator('meta[property="og:site_name"]')
      .first()
      .getAttribute('content');
    if (!siteName) {
      throw new Error('No site name found');
    }
    await this.scraper.close();
    const ogData = { title, description, image, siteName };
    console.log(ogData);

    return ogData;
  }
}

// (async () => {
//   const url =
//     'https://www.thrillist.com/eat/nation/best-restaurants-in-munich-the-eight-cool-places-to-eat-thrilist-munich';

//   const scraper = new ArticleScraper(url);
//   const ogdata = await scraper.getOgData();
//   console.log(ogdata);
// })();
