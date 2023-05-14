import { Locator, Page } from 'playwright';

import Browser from '../browser';
import { GoToPageError } from '../utils/errors';
import { ArticleScraperInterface } from './article-scraper';

const RESTAURANT_CARD_SELECTOR = '[data-testid="venue-venueCard"]';
const RESTAURANT_NAME_SELECTOR = '[data-testid="venue-venueLink"]';

export default class Infatuation
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
    const descriptions = await this.getDescriptions(page);

    return await Promise.all(
      restaurants.map(async (r, index) => {
        const name = await this.getName(r);
        const description = await descriptions[index].textContent();
        const price = await this.getPrice(r, name);
        const website = await this.getsWebsite(r, name);
        const url = await this.getUrl(r, name);
        const shortAddress = await this.getShortAddress(r, name);
        const reservationLink = await this.getReservationLink(r);

        return {
          name,
          description,
          price,
          website,
          url,
          shortAddress,
          reservationLink,
        };
      })
    );
  }

  private async getRestaurantLocators(page: Page) {
    return await page
      .locator(RESTAURANT_CARD_SELECTOR)
      .filter({
        has: page.locator(RESTAURANT_NAME_SELECTOR),
      })
      .all();
  }

  private async getName(restaurantLocator: Locator) {
    const headingSection = restaurantLocator.locator(RESTAURANT_NAME_SELECTOR);
    const name = await headingSection.getByRole('heading').textContent();
    if (!name) {
      throw new Error('No name found in infatuation scraper');
    }

    return name;
  }

  // the description is a sibling to the restaurant locator
  private async getDescriptions(page: Page) {
    return await page.locator(`${RESTAURANT_CARD_SELECTOR} + p`).all();
  }

  private async getPrice(restaurantLocator: Locator, name: string) {
    const priceSection = restaurantLocator.locator('h4');
    const count = await priceSection.count();
    if (count === 0) {
      throw new Error(`Failed to get price for ${name}`);
    }

    const className = (await priceSection.getAttribute('class')) as string;

    if (className.includes('styles_price1')) {
      return 1;
    } else if (className.includes('styles_price2')) {
      return 2;
    } else if (className.includes('styles_price3')) {
      return 3;
    } else if (className.includes('styles_price4')) {
      return 4;
    } else {
      throw new Error(`Failed to get price for ${name}`);
    }
  }

  private async getsWebsite(restaurantLocator: Locator, name: string) {
    const websiteSection = restaurantLocator.locator('a.chakra-button').first();
    const website = await websiteSection.getAttribute('href');
    if (!website) {
      throw new Error(`Failed to get website for ${name}`);
    }

    return website;
  }

  private async getUrl(restaurantLocator: Locator, name: string) {
    const headingSection = restaurantLocator.locator(RESTAURANT_NAME_SELECTOR);
    const url = await headingSection.getAttribute('href');
    if (!url) {
      throw new Error(`Failed to get url for ${name}`);
    }

    if (url.startsWith('/')) {
      return `https://www.theinfatuation.com${url}`;
    }

    return url;
  }

  private async getShortAddress(restaurantLocator: Locator, name: string) {
    const addressSection = restaurantLocator.locator('a.chakra-heading');
    const address = await addressSection.textContent();

    if (!address) {
      throw new Error(`Failed to get address for ${name}`);
    }

    return address;
  }

  private async getReservationLink(restaurantLocator: Locator) {
    const reservationTag = restaurantLocator
      .locator('[data-testid="venue-reserveTableButton"]')
      .first();
    const count = await reservationTag.count();
    if (count === 0) {
      return null;
    }

    const href = await reservationTag.getAttribute('href');
    if (!href) {
      return null;
    }

    // strip query params
    return href.split('?')[0];
  }
}
