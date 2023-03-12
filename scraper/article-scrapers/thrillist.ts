import { Locator, Page } from 'playwright';
import Browser from '../browser';
import { ArticleScraperInterface, GetRestaurants } from './article-scraper';

/*
Notes:
  1. https://www.thrillist.com/eat/denver/best-restaurants-denver
    - This article was throwing because the last restaurant card doesn't have a <p> tag surrounding
      the description. So I added a try/catch to ignore that error.
  2. https://www.thrillist.com/eat/nation/best-restaurants-in-munich-the-eight-cool-places-to-eat-thrilist-munich
    - This article isn't loading for some reason. It fails on page.goto(this.url), so I added a try/catch
*/
export default class Thrillist
  extends Browser
  implements ArticleScraperInterface
{
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }

  async chooseParser(page: Page) {
    if (page.locator('button svg.map-icon')) {
      return new Thrillist1(page);
    } else if (page.locator('page-element--save-venue')) {
      return new Thrillist2(page);
    }

    return new Thrillist3(page);
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
      console.warn(`page.goto failed for ${this.url}`);
      return [];
    }

    const parser = await this.chooseParser(page);

    const restaurants = await parser.getRestaurants();
    return restaurants;
  }
}

interface BrowserlessScraper {
  getRestaurants: GetRestaurants;
}

// Example: https://www.thrillist.com/eat/boston/best-restaurants-boston
class Thrillist1 implements BrowserlessScraper {
  page: Page;

  constructor(page: Page) {
    console.log('Using Thrillist1 parser');
    this.page = page;
  }

  async getRestaurants() {
    const restaurants = await this.#getRestaurantLocators();

    return await Promise.all(
      restaurants.map(async (r) => {
        const name = await this.#getName(r);
        const description = await this.#getDescription(r);
        return { name, description };
      })
    );
  }

  async #getRestaurantLocators() {
    // There are doubles of each restaurant on the page, one for the article, one for the map. So limit to the article.
    return await this.page
      .getByRole('article')
      .locator('div.location-list-item')
      .filter({ has: this.page.getByRole('heading', { level: 2 }) })
      .all();
  }

  async #getName(restaurantLocator: Locator) {
    return await restaurantLocator.getByRole('heading').textContent();
  }

  async #getDescription(restaurantLocator: Locator) {
    try {
      return await restaurantLocator.locator('p').textContent();
    } catch (error) {
      console.error(error);
      console.warn(`Could not find description for ${restaurantLocator}`);
      return null;
    }
  }
}

class Thrillist2 implements BrowserlessScraper {
  page: Page;

  constructor(page: Page) {
    console.log('Using Thrillist2 parser');
    this.page = page;
  }

  async getRestaurants() {
    const restaurants = await this.#getRestaurantLocators();

    return await Promise.all(
      restaurants.map(async (r) => {
        const name = await this.#getName(r);
        const description = await this.#getDescription(r);
        return { name, description };
      })
    );
  }

  async #getRestaurantLocators() {
    return await this.page.locator('div.page-element--save-venue').all();
  }

  async #getName(restaurantLocator: Locator) {
    return await restaurantLocator.getByRole('heading').textContent();
  }

  async #getDescription(restaurantLocator: Locator) {
    return await restaurantLocator.locator('p').textContent();
  }
}

// Example: https://www.thrillist.com/eat/nation/best-restaurants-in-munich-the-eight-cool-places-to-eat-thrilist-munich
class Thrillist3 implements BrowserlessScraper {
  page: Page;

  constructor(page: Page) {
    console.log('Using Thrillist3 parser');
    this.page = page;
  }

  async getRestaurants() {
    const restaurants = await this.#getRestaurantLocators();

    return await Promise.all(
      restaurants.map(async (r) => {
        const name = await this.#getName(r);
        const description = await this.#getDescription(r);
        return { name, description };
      })
    );
  }

  async #getRestaurantLocators() {
    return await this.page
      .locator('figure + div')
      .filter({ has: this.page.locator('p > strong') })
      .all();
  }

  async #getName(restaurantLocator: Locator) {
    const name = await restaurantLocator
      .locator('p')
      .first()
      .locator('strong')
      .first()
      .textContent();

    if (!name) {
      console.warn(`Could not find restaurant name for ${restaurantLocator}`);
      return null;
    }

    return this.#stripNumber(name);
  }

  // Removes numbers like "1) " from "1) Restaurant Name"
  #stripNumber(name: string) {
    return name.replace(/^\d+\) /, '');
  }

  async #getDescription(restaurantLocator: Locator) {
    return await restaurantLocator
      .locator('p > br  + ::target-text')
      .textContent();
  }
}
