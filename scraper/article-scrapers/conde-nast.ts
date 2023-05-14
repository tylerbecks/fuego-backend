import { Locator, Page } from 'playwright';

import logger from '../../src/logger';
import Browser from '../browser';
import { GoToPageError } from '../utils/errors';
import { ArticleScraperInterface } from './article-scraper';

export default class CondeNast
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
      console.error(error);
      throw new GoToPageError(this.url);
    }

    logger.info(`Scraping ${this.url}`);
    const restaurants = await this.getRestaurantLocators(page);

    return await Promise.all(
      restaurants.map(async (r) => {
        const name = await this.getName(r);
        const description = await this.getDescription(r);
        let price;
        let url;
        try {
          price = await this.getPrice(r, name as string);
        } catch (error) {
          logger.error(`Failed to get price for ${name as string}`);
          console.error(error);
          throw error;
        }

        try {
          url = await this.getUrl(r, name as string);
        } catch (error) {
          logger.error(`Failed to get url for ${name as string}`);
          console.error(error);
          throw error;
        }

        return { name, description, price, url };
      })
    );
  }

  private async getRestaurantLocators(page: Page) {
    return await page
      .locator('.gallery__slides__slide')
      .filter({ has: page.locator('.slide-venue') })
      .all();
  }

  private async getName(restaurantLocator: Locator) {
    const heading = await restaurantLocator.getByRole('heading').textContent();
    if (!heading) {
      console.warn('Failed to find name for restaurant:', restaurantLocator);
      return null;
    }
    return heading.replace(/Arrow$/, '');
  }

  private async getPrice(restaurantLocator: Locator, restaurantName: string) {
    const priceLocator = restaurantLocator.locator(
      '[class*="GallerySlideCaptionDetail"]'
    );

    if ((await priceLocator.count()) === 0) {
      logger.warn(
        `Failed to find price for ${restaurantName} in Codenast Scraper`
      );
      return null;
    }

    const price = await priceLocator.textContent();

    if (!price) {
      logger.warn(
        `Failed to find price for ${restaurantName} in Codenast Scraper`
      );
      return null;
    }

    // Count number of $
    const priceNum = price.split('$').length - 1;

    if (priceNum > 4) {
      logger.error(`Price is too high for ${restaurantName}: ${priceNum}`);
      throw new Error(`Price is too high for ${restaurantName}: ${priceNum}`);
    }

    return priceNum;
  }

  private async getUrl(restaurantLocator: Locator, restaurantName: string) {
    const url = await restaurantLocator
      .locator('figcaption')
      .locator('a')
      .first()
      .getAttribute('href');

    if (!url) {
      logger.error(
        `Failed to find url for ${restaurantName} in Codenast Scraper`
      );
      throw new Error(
        `Failed to find url for ${restaurantName} in Codenast Scraper`
      );
    }

    if (url.startsWith('/')) {
      logger.info(`https://www.cntraveler.com${url}`);
      return `https://www.cntraveler.com${url}`;
    }

    console.log('url', url);

    return url;
  }

  private async getDescription(restaurantLocator: Locator) {
    return await restaurantLocator.locator('p').textContent();
  }
}
