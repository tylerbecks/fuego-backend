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
  const culturetripurls = [
    // 'https://theculturetrip.com/north-america/usa/massachusetts/articles/boston-s-10-must-try-restaurants-a-fusion-of-art-food/',
    // 'https://theculturetrip.com/north-america/usa/illinois/articles/chicago-s-10-best-restaurants-cultural-eats-fine-dining/',
    // 'https://theculturetrip.com/north-america/usa/california/articles/the-top-ten-san-francisco-restaurants/',
    // 'https://theculturetrip.com/europe/spain/articles/the-best-restaurants-in-barcelona/',
    // 'https://theculturetrip.com/north-america/usa/colorado/articles/where-to-eat-in-denver-colorado-the-10-best-restaurants/',
    // 'https://theculturetrip.com/north-america/usa/texas/articles/gourmet-guide-to-houston-s-10-best-restaurants-diners/',
    // 'https://theculturetrip.com/europe/united-kingdom/england/london/articles/the-best-restaurants-in-london/',
    // 'https://theculturetrip.com/north-america/usa/california/articles/the-best-restaurants-in-los-angeles/',
    'https://theculturetrip.com/north-america/mexico/articles/mexico-city-s-top-10-restaurants-taquer-as-you-should-try/',
    // 'https://theculturetrip.com/north-america/usa/florida/articles/insider-s-guide-to-miami-top-10-restaurants-you-will-love/',
    'https://theculturetrip.com/europe/germany/articles/9-best-restaurants-in-munich-s-old-town',
    // 'https://theculturetrip.com/north-america/usa/tennessee/articles/nashville-s-10-best-local-restaurants-music-city-dining/',
    // 'https://theculturetrip.com/north-america/usa/louisiana/new-orleans/articles/new-orleans-10-best-restaurants-reimagining-creole-cooking/',
    // 'https://theculturetrip.com/north-america/mexico/articles/top-10-restaurants-to-try-in-oaxaca-mexico-s-cultural-gem/',
    // 'https://theculturetrip.com/europe/france/paris/articles/the-10-best-restaurants-in-paris/',
    // 'https://theculturetrip.com/europe/italy/articles/romes-best-restaurants-according-to-the-citys-culinary-experts/',
    // 'https://theculturetrip.com/north-america/usa/california/articles/san-diego-s-top-10-restaurants-the-best-local-eats/',
    'https://theculturetrip.com/asia/japan/articles/tokyo-s-10-stunning-restaurants-a-galaxy-of-michelin-stars/',
    // 'https://theculturetrip.com/europe/switzerland/articles/the-10-best-restaurants-in-zurich-s-city-centre/',
  ];
  // const url = process.argv[2];

  for (const url of culturetripurls) {
    const scraper = new ArticleScraper(url);

    try {
      const restaurants = await scraper.getRestaurants();
      console.log(restaurants);
    } catch (error) {
      throw error;
    }
  }
})();
