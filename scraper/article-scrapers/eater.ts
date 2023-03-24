import { Locator, Page } from 'playwright';

import Browser from '../browser';
import { asyncFilter } from '../utils/async-helpers';
import { GoToPageError } from '../utils/errors';
import { ArticleScraperInterface } from './article-scraper';

export default class Eater extends Browser implements ArticleScraperInterface {
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

    const restaurants = await this.getRestaurantLocators(page);

    return await Promise.all(
      restaurants.map(async (r) => {
        const name = await this.getName(r);
        const description = await this.getDescription(r);
        return { name, description };
      })
    );
  }

  private async getRestaurantLocators(page: Page) {
    const cards = await page.locator('main section.c-mapstack__card').all();

    return asyncFilter(cards, async (card) => {
      const slug = await card.getAttribute('data-slug');

      return (
        !!slug &&
        !['intro', 'newsletter', 'related-links', 'comments'].includes(slug)
      );
    });
  }

  private async getName(restaurantLocator: Locator) {
    const heading = restaurantLocator.getByRole('heading');
    return await heading.textContent();
  }

  private async getDescription(restaurantLocator: Locator) {
    return await restaurantLocator.locator('p').first().textContent();
  }
}
