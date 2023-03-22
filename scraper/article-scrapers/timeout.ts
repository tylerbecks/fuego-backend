import { Locator, Page } from 'playwright';

import Browser from '../browser';
import { GoToPageError } from '../utils/errors';
import { ArticleScraperInterface } from './article-scraper';

// NOTES
// https://www.timeout.com/tokyo/restaurants/best-restaurants-tokyo
// The tokyo article does this weird thing where it splits the list into multiple zones.
// It's the only article that does this, so I'm just letting the bug exist and scraping the first secion.
export default class Timeout
  extends Browser
  implements ArticleScraperInterface
{
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }

  async getRestaurants() {
    if (!this.browser) {
      console.warn('Browser not initialized');
      return [];
    }

    const page = await this.browser.newPage();
    try {
      await page.goto(this.url);
    } catch (error) {
      throw new GoToPageError(this.url);
    }

    const restaurants = await this.#getRestaurantLocators(page);

    return await Promise.all(
      restaurants.map(async (r) => {
        const name = await this.#getName(r);
        const description = await this.#getDescription(r);
        return { name, description };
      })
    );
  }

  async #getRestaurantLocators(page: Page) {
    const zones = await page.locator('.zone').all();
    const NUM_TILES_IN_MARKET_SECTION = 1;

    for (const zone of zones) {
      const tiles = await zone.locator('article.tile').all();
      // Timeout sometimes puts a section above the list of restaurants for the Timeout Market,
      // so skip over this if no cards are found
      if (tiles.length > NUM_TILES_IN_MARKET_SECTION) {
        return tiles;
      }
    }

    console.warn(`No restaurant cards found for ${this.url}`);

    return [];
  }

  async #getName(restaurantLocator: Locator) {
    const name = await restaurantLocator
      .getByRole('heading', { level: 3 })
      .first()
      .textContent();

    return name ? stripNum(name) : null;
  }

  async #getDescription(restaurantLocator: Locator) {
    return await restaurantLocator
      .locator('div[class*="_summary_"]')
      .first()
      .textContent();
  }
}

// Strips num from the front of the string
// Example Input: "1. Restaurant Name"
// Example Output: "Restaurant Name"
const stripNum = (str: string) => str.replace(/^\d+\.\s/, '');
