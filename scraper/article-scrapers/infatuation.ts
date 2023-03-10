import { Locator, Page } from 'playwright';
import Browser from '../browser';

const RESTAURANT_CARD_SELECTOR = '[data-testid="venue-venueCard"]';

export default class Infatuation extends Browser {
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
    return await page.locator(RESTAURANT_CARD_SELECTOR).all();
  }

  async #getName(restaurantLocator: Locator) {
    const headingSection = await restaurantLocator.locator(
      '[data-testid="venue-venueCard"]'
    );
    const text = await headingSection.getByRole('heading').textContent();
    console.log(text);

    return await headingSection.getByRole('heading').textContent();
  }

  // the description is a sibling to the restaurant locator
  async #getDescription(restaurantLocator: Locator) {
    return null;
    // const p = await restaurantLocator.locator(`& + p`).first();
    // console.log(p);
    // const text = await p.textContent();
    // console.log(text);
    // return text;
    // return await restaurantLocator.locator(`& + p`).first().textContent();
  }
}
