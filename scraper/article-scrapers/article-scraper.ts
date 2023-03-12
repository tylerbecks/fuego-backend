import Browser from '../browser';
import CondeNast from './conde-nast';
import CultureTrip from './culture-trip';
import Eater from './eater';
import Infatuation from './infatuation';
import Thrillist from './thrillist';
import Timeout from './timeout';

type Restaurant = {
  name: string | null;
  description: string | null;
};

export interface GetRestaurants {
  (): Promise<Restaurant[]>;
}

export interface ArticleScraperInterface extends Browser {
  getRestaurants: GetRestaurants;
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
    console.log(`Scraping ${this.url}`);
    const restaurants = await this.scraper.getRestaurants();
    console.log(`Found ${restaurants.length} restaurants`);
    this.scraper.close();
    return restaurants;
  }

  // add function to refresh ogdata for title and site_name
}

(async function () {
  const urls = [
    'https://www.thrillist.com/eat/boston/best-restaurants-boston',
    'https://www.thrillist.com/eat/denver/best-restaurants-denver',
    'https://www.thrillist.com/eat/las-vegas/best-restaurants-las-vegas',
    'https://www.thrillist.com/eat/los-angeles/best-restaurants-los-angeles',
    'https://www.thrillist.com/eat/miami/best-restaurants-miami',
    'https://www.thrillist.com/eat/nation/best-restaurants-in-munich-the-eight-cool-places-to-eat-thrilist-munich',
    'https://www.thrillist.com/eat/nashville/best-restaurants-nashville',
    'https://www.thrillist.com/eat/new-york/best-restaurants-nyc',
    'https://www.thrillist.com/travel/nation/best-restaurants-in-rome-places-to-eat',
    'https://www.thrillist.com/eat/san-diego/best-restaurants-san-diego',
    'https://www.thrillist.com/eat/san-francisco/best-restaurants-san-francisco',
    'https://www.thrillist.com/eat/seattle/best-restaurants-seattle',
    'https://www.thrillist.com/eat/washington-dc/best-restaurants-washington-dc',
    'https://www.thrillist.com/eat/chicago/best-restaurants-chicago',
    'https://www.thrillist.com/eat/houston/best-restaurants-houston',
    'https://www.thrillist.com/eat/paris/best-restaurants-paris',
  ];
  // const url = process.argv[2];

  for (const url of urls) {
    const scraper = new ArticleScraper(url);

    try {
      const restaurants = await scraper.getRestaurants();
    } catch (error) {
      throw error;
    }
  }
})();
