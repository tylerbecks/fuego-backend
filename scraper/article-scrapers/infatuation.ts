import { Locator, Page } from 'playwright';
import Browser from '../browser';
import { ArticleScraperInterface } from './article-scraper';
import { GoToPageError } from '../utils/errors';

const RESTAURANT_CARD_SELECTOR = '[data-testid="venue-venueCard"]';
const RESTAURANT_NAME_SELECTOR = '[data-testid="venue-venueLink"]';

export default class Infatuation
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
    const descriptions = await this.#getDescriptions(page);

    return await Promise.all(
      restaurants.map(async (r, index) => {
        const name = await this.#getName(r);
        const description = await descriptions[index].textContent();
        return { name, description };
      })
    );
  }

  async #getRestaurantLocators(page: Page) {
    return await page
      .locator(RESTAURANT_CARD_SELECTOR)
      .filter({
        has: page.locator(RESTAURANT_NAME_SELECTOR),
      })
      .all();
  }

  async #getName(restaurantLocator: Locator) {
    const headingSection = await restaurantLocator.locator(
      RESTAURANT_NAME_SELECTOR
    );
    return await headingSection.getByRole('heading').textContent();
  }

  // the description is a sibling to the restaurant locator
  async #getDescriptions(page: Page) {
    return await page.locator(`${RESTAURANT_CARD_SELECTOR} + p`).all();
  }
}
