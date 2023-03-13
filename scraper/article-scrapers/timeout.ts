import { Locator, Page } from 'playwright';
import Browser from '../browser';
import { ArticleScraperInterface, GetRestaurants } from './article-scraper';

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
    await page.goto(this.url);

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
    // Timeout sometimes puts a section above the list of restaurants for the Timeout Market,
    // so skip over this if no cards are found
    const zones = await page.locator('.zone').all();
    const NUM_TILES_IN_MARKET_SECTION = 1;

    for (const zone of zones) {
      const tiles = await zone.locator('article.tile').all();
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
