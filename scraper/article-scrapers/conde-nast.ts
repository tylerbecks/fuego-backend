import { Locator, Page } from 'playwright';
import Browser from '../browser';
import { GoToPageError } from '../utils/errors';
import { ArticleScraperInterface } from './article-scraper';

export default class CondeNast
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
    return await page
      .locator('.gallery__slides__slide')
      .filter({ has: page.locator('.slide-venue') })
      .all();
  }

  async #getName(restaurantLocator: Locator) {
    const heading = await restaurantLocator.getByRole('heading').textContent();
    if (!heading) {
      console.warn(`Failed to find name for restaurant: ${restaurantLocator}`);
      return null;
    }
    return heading.replace(/Arrow$/, '');
  }

  async #getDescription(restaurantLocator: Locator) {
    return await restaurantLocator.locator('p').textContent();
  }
}
