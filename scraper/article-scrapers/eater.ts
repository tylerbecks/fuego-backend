import { Locator, Page } from 'playwright';
import Browser from '../browser';
import { asyncFilter } from '../utils/async-helpers';

export default class Eater extends Browser {
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }

  async getRestaurants() {
    if (!this.browser) {
      console.warn('Browser not initialized');
      return;
    }
    console.log(`Scraping ${this.url}`);

    const page = await this.browser.newPage();
    await page.goto(this.url);

    const restaurants = await this.#getRestaurantLocators(page);
    console.log(`Found ${restaurants.length} restaurants`);

    return await Promise.all(
      restaurants.map(async (r) => {
        const name = await this.#getName(r);
        const description = await this.#getDescription(r);
        return { name, description };
      })
    );
  }

  async #getRestaurantLocators(page: Page) {
    const cards = await page.locator('main section.c-mapstack__card').all();

    return asyncFilter(cards, async (card) => {
      const slug = await card.getAttribute('data-slug');

      return (
        !!slug &&
        !['intro', 'newsletter', 'related-links', 'comments'].includes(slug)
      );
    });
  }

  async #getName(restaurantLocator: Locator) {
    const heading = restaurantLocator.getByRole('heading');
    return await heading.textContent();
  }

  async #getDescription(restaurantLocator: Locator) {
    return await restaurantLocator.locator('p').first().textContent();
  }
}
