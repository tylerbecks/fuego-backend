import Browser from '../browser';
import CondeNast from './conde-nast';
import CultureTrip from './culture-trip';
import Eater from './eater';
import Infatuation from './infatuation';
import Statesman from './statesman';
import Thrillist from './thrillist';
import Timeout from './timeout';

export interface ArticleScraperInterface extends Browser {
  getRestaurants(): Promise<any>;
}

const SCRAPERS = {
  cntraveler: CondeNast,
  theculturetrip: CultureTrip,
  eater: Eater,
  theinfatuation: Infatuation,
  statesman: Statesman,
  thrillist: Thrillist,
  timeout: Timeout,
};

const topLevelDomains = new RegExp(/\.(com|co)$/, 'g');

const getSecondLevelDomain = (url: string) =>
  url.replace(topLevelDomains, '').split('.').pop();

export default class ArticleScraper {
  url: string;
  scraper: ArticleScraperInterface;

  constructor(url: string) {
    this.url = url;
    const parsedUrl = new URL(url);
    const secondLevelDomain = getSecondLevelDomain(
      parsedUrl.hostname as string
    );
    if (!secondLevelDomain || !(secondLevelDomain in SCRAPERS)) {
      throw new Error(`No scraper found for ${secondLevelDomain}`);
    }

    const scraper = SCRAPERS[secondLevelDomain as keyof typeof SCRAPERS];

    this.scraper = new scraper(url);
  }

  async getRestaurants() {
    await this.scraper.launch();
    const restaurants = await this.scraper.getRestaurants();
    this.scraper.close();
    return restaurants;
  }

  // add function to refresh ogdata for title and site_name
}

(async function () {
  const url = process.argv[2];

  const scraper = new ArticleScraper(url);

  try {
    const restaurants = await scraper.getRestaurants();
    console.log(restaurants);
  } catch (error) {
    throw error;
  }
})();
