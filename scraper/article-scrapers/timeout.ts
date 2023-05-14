import { Locator, Page } from 'playwright';

import logger from '../../src/logger';
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
  url;

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
        const url = await this.getUrl(r, name);
        const website = await this.getWebsite(r, name);
        const price = await this.getPrice(r, name);
        const reservationLink = await this.getReservationLink(r, name);

        return { name, description, url, website, price, reservationLink };
      })
    );
  }

  private async getRestaurantLocators(page: Page) {
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

  private async getName(restaurantLocator: Locator) {
    const name = await restaurantLocator
      .getByRole('heading', { level: 3 })
      .first()
      .textContent();

    if (!name) {
      throw new Error('No name found in timeout scrapter');
    }

    return stripNum(name);
  }

  private async getDescription(restaurantLocator: Locator) {
    return await restaurantLocator
      .locator('div[class*="_summary_"]')
      .first()
      .textContent();
  }

  private async getUrl(restaurantLocator: Locator, name: string) {
    const url = restaurantLocator
      .locator('div.articleContent')
      .locator('a[data-testid="tile-link_testID"]')
      .first();

    const count = await url.count();
    if (count === 0) {
      logger.warn(`No url found for ${name}`);
      return null;
    }

    const href = await url.getAttribute('href');

    if (!href) {
      throw new Error(`No url found for ${name}`);
    }

    if (href.startsWith('/')) {
      return `https://www.timeout.com${href}`;
    }

    return href;
  }

  private async getWebsite(restaurantLocator: Locator, name: string) {
    const website = restaurantLocator
      .locator('a[data-testid="tile-link_testID"]')
      .first();

    const count = await website.count();
    if (count === 0) {
      console.warn(`No website found for ${name}`);
      return null;
    }

    return await website.getAttribute('href');
  }

  private async getPrice(restaurantLocator: Locator, name: string) {
    const priceLocator = restaurantLocator
      .locator('div[data-testid="price-rating_testID"]')
      .locator('.sr-only');

    const count = await priceLocator.count();
    if (count === 0) {
      return null;
    }

    const screenReaderText = await priceLocator.first().textContent();
    if (!screenReaderText) {
      throw new Error(
        `Screen reader text should exist if priceLocator is found for ${name}`
      );
    }

    logger.info(`Found price ${screenReaderText} for ${name}`);

    if (screenReaderText === 'price 1 of 4') {
      return 1;
    } else if (screenReaderText === 'price 2 of 4') {
      return 2;
    } else if (screenReaderText === 'price 3 of 4') {
      return 3;
    } else if (screenReaderText === 'price 4 of 4') {
      return 4;
    } else {
      throw new Error(`Invalid price found for ${name}`);
    }
  }

  private async getReservationLink(restaurantLocator: Locator, name: string) {
    const reservationLink = restaurantLocator
      .locator('a[data-testid="buy-now-button_testID"]')
      .first();

    const count = await reservationLink.count();
    if (count === 0) {
      return null;
    }

    const href = await reservationLink.getAttribute('href');
    if (!href) {
      return null;
    }

    // strip query params
    const url = href.split('?')[0];
    logger.info(`Found reservation link ${url} for ${name}`);
    return url;
  }
}

// Strips num from the front of the string
// Example Input: "1. Restaurant Name"
// Example Output: "Restaurant Name"
const stripNum = (str: string) => str.replace(/^\d+\.\s/, '');
