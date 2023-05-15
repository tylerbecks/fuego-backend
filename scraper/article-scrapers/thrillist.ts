import { Locator, Page } from 'playwright';

import logger from '../../src/logger';
import Browser from '../browser';
import { GoToPageError } from '../utils/errors';
import { ArticleScraperInterface } from './article-scraper';

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
  url;

  constructor(url: string) {
    super();
    this.url = url;
  }

  async chooseParser(page: Page) {
    const mapIconButtons = page.locator('button svg.map-icon');
    const countMapIconButtons = await mapIconButtons.count();

    const saveVenueLocators = page.locator('.page-element--save-venue');
    const countSaveVenueLocators = await saveVenueLocators.count();

    if (countMapIconButtons > 0) {
      return new Thrillist1(page);
    } else if (countSaveVenueLocators > 0) {
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
      throw new GoToPageError(this.url);
    }

    const parser = await this.chooseParser(page);

    const restaurants = await parser.getRestaurants();
    return restaurants;
  }
}

// Example: https://www.thrillist.com/eat/boston/best-restaurants-boston
class Thrillist1 implements ArticleScraperInterface {
  page;

  constructor(page: Page) {
    logger.info('Using Thrillist1 parser');
    this.page = page;
  }

  async getRestaurants() {
    const restaurants = await this.getRestaurantLocators();

    const scriptTagMetadata = await this.getScriptTagMetadata(this.page);

    return await Promise.all(
      restaurants.map(async (r) => {
        const name = await this.getName(r);
        const description = await this.getDescription(r);
        const price = await this.getPrice(r, name);
        const url = await this.getUrl(r, scriptTagMetadata, name);
        const { lat, long } = await this.getLatLong(r, scriptTagMetadata, name);
        const reservationUrls = await this.getReservationUrls(r, name);

        return { name, description, price, url, lat, long, reservationUrls };
      })
    );
  }

  private async getScriptTagMetadata(page: Page) {
    // The following script tag contains a payload of json for the page with metadata for each resaturant
    const scriptTag = page.locator('script[type="application/ld+json"]');
    const count = await scriptTag.count();
    if (count === 0) {
      throw new Error('No script tag found');
    }

    const scriptTagContent = await scriptTag.textContent();
    const pageMetadata = scriptTagContent
      ? (JSON.parse(scriptTagContent) as ScriptTagMetadata)
      : null;

    if (!pageMetadata) {
      throw new Error(`Issue parsing script tag content`);
    }

    return pageMetadata;
  }

  private async getRestaurantLocators() {
    // There are doubles of each restaurant on the page, one for the article, one for the map. So limit to the article.
    return await this.page
      .getByRole('article')
      .locator('div.location-list-item')
      .filter({ has: this.page.getByRole('heading', { level: 2 }) })
      .all();
  }

  private async getName(restaurantLocator: Locator) {
    const name = await restaurantLocator.getByRole('heading').textContent();
    if (!name) {
      throw new Error('Could not find name');
    }

    return name;
  }

  private async getDescription(restaurantLocator: Locator) {
    try {
      return await restaurantLocator.locator('p').textContent();
    } catch (error) {
      console.error(error);
      logger.warn('Could not find description for:', restaurantLocator);
      return null;
    }
  }

  private async getPrice(restaurantLocator: Locator, name: string) {
    const solidDollarSigns = restaurantLocator.locator('.jNYvDy');
    const count = await solidDollarSigns.count();
    if (count === 0) {
      return null;
    }

    if (count > 4) {
      throw new Error(`Unexpected number of dollar signs for: ${name}`);
    }

    return count;
  }

  private async getUrl(
    restaurantLocator: Locator,
    scriptTagMetadata: ScriptTagMetadata,
    restaurantName: string
  ) {
    const itemsList = scriptTagMetadata[1];
    const nameLocator = restaurantLocator.locator(
      'a[data-vars-ga-action="venue link"]'
    );
    // For some reason, the names in this list don't always matche the names on the page.
    // Example: "Bub & Grandma’s" is on the page, "Bub and Grandma’s Bread" is in the script tag data
    const nameInData = await nameLocator.getAttribute('data-vars-ga-label');
    const restaurantMetadata = itemsList.itemListElement.find(
      (item) => item.item.name === nameInData
    );

    if (!restaurantMetadata) {
      throw new Error(`Could not find metadata for: ${restaurantName}`);
    }

    const url = restaurantMetadata.item.url;

    if (url.startsWith('/')) {
      return `https://www.thrillist.com${url}`;
    }

    return url;
  }

  private async getLatLong(
    restaurantLocator: Locator,
    scriptTagMetadata: ScriptTagMetadata,
    restaurantName: string
  ) {
    const itemsList = scriptTagMetadata[1];
    const nameLocator = restaurantLocator.locator(
      'a[data-vars-ga-action="venue link"]'
    );
    const nameInData = await nameLocator.getAttribute('data-vars-ga-label');
    const restaurantMetadata = itemsList.itemListElement.find(
      (item) => item.item.name === nameInData
    );
    if (!restaurantMetadata) {
      throw new Error(`Could not find metadata for: ${restaurantName}`);
    }

    const latLong = restaurantMetadata.item.geo;
    if (!latLong) {
      throw new Error(`Could not find lat/long for: ${restaurantName}`);
    }

    return {
      lat: Number(latLong.latitude),
      long: Number(latLong.longitude),
    };
  }

  private async getReservationUrls(restaurantLocator: Locator, name: string) {
    const affiliateLinks = await this.getAffiliateLinks(
      restaurantLocator,
      name
    );

    const bookingLinks = await this.getBookingLinks(restaurantLocator, name);

    return [...affiliateLinks, ...bookingLinks];
  }

  private async getAffiliateLinks(restaurantLocator: Locator, name: string) {
    const reservationLinksLocator = restaurantLocator
      .locator('div.venue-affiliate-button-section')
      .locator('a');

    const count = await reservationLinksLocator.count();
    if (count === 0) {
      return [];
    }

    const reservationLinks = await reservationLinksLocator.all();

    const urls = await Promise.all(
      reservationLinks.map(async (link) => {
        const url = await link.getAttribute('href');
        if (!url) {
          throw new Error(`Could not find url for: ${name}`);
        }

        return url;
      })
    );

    return urls;
  }

  private async getBookingLinks(restaurantLocator: Locator, name: string) {
    // If strong exists, get all <a> tags that come after it
    const reservationLinks = await restaurantLocator
      .locator('p')
      .locator(':text("How to book") ~ a')
      .all();

    return await Promise.all(
      reservationLinks.map(async (link) => {
        const url = await link.getAttribute('href');
        if (!url) {
          throw new Error(`Could not find url for: ${name}`);
        }

        return url;
      })
    );
  }
}

// Example: https://www.thrillist.com/eat/paris/best-restaurants-paris
class Thrillist2 implements ArticleScraperInterface {
  page;

  constructor(page: Page) {
    logger.info('Using Thrillist2 parser');
    this.page = page;
  }

  async getRestaurants() {
    const restaurants = await this.getRestaurantLocators();

    return await Promise.all(
      restaurants.map(async (r) => {
        const name = await this.getName(r);
        const description = await this.getDescription(r);
        const website = await this.getWebsite(r);

        return { name, description, website };
      })
    );
  }

  private async getRestaurantLocators() {
    return await this.page.locator('div.page-element--save-venue').all();
  }

  private async getName(restaurantLocator: Locator) {
    return await restaurantLocator.getByRole('heading').textContent();
  }

  private async getDescription(restaurantLocator: Locator) {
    return await restaurantLocator.locator('p').textContent();
  }

  private async getWebsite(restaurantLocator: Locator) {
    const url = await restaurantLocator
      .getByRole('heading')
      .locator('a')
      .getAttribute('href');

    if (!url) {
      throw new Error('Could not find url');
    }

    return url;
  }
}

// Example: https://www.thrillist.com/eat/nation/best-restaurants-in-munich-the-eight-cool-places-to-eat-thrilist-munich
class Thrillist3 implements ArticleScraperInterface {
  page;

  constructor(page: Page) {
    logger.info('Using Thrillist3 parser');
    this.page = page;
  }

  async getRestaurants() {
    const restaurants = await this.getRestaurantLocators();

    return await Promise.all(
      restaurants.map(async (r) => {
        const name = await this.getName(r);
        const description = await this.getDescription(r);
        const url = await this.getUrl(r);

        return { name, description, url };
      })
    );
  }

  private async getRestaurantLocators() {
    return await this.page
      .locator('figure + div')
      .filter({ has: this.page.locator('p > strong') })
      .all();
  }

  private async getName(restaurantLocator: Locator) {
    const name = await restaurantLocator
      .locator('p')
      .first()
      .locator('strong')
      .first()
      .textContent();

    if (!name) {
      console.warn('Could not find description for:', restaurantLocator);
      return null;
    }

    return this.stripNumber(name);
  }

  // Removes numbers like "1) " from "1) Restaurant Name"
  private stripNumber(name: string) {
    return name.replace(/^\d+\) /, '');
  }

  private async getDescription(restaurantLocator: Locator) {
    const strongText = await restaurantLocator
      .locator('p strong')
      .textContent();

    if (!strongText) {
      throw new Error('Could not find strong text');
    }

    const allText = await restaurantLocator.locator('p').textContent();

    if (!allText) {
      throw new Error('Could not find all text');
    }

    // Remove the strong text from allText
    return allText.replace(strongText, '');
  }

  private async getUrl(restaurantLocator: Locator) {
    const url = await restaurantLocator
      .locator('p strong a')
      .getAttribute('href');

    if (!url) {
      throw new Error('Could not find url');
    }

    return url;
  }
}

type GeoCoordinates = {
  '@type': string;
  latitude: string;
  longitude: string;
};

type Restaurant = {
  '@type': string;
  geo: GeoCoordinates;
  image: string;
  name: string;
  url: string;
};

type ListItem = {
  '@type': string;
  item: Restaurant;
  name?: string;
  position: number;
};

type BreadcrumbListItem = {
  '@type': string;
  item: string;
  name?: string;
  position: number;
};

type BreadcrumbList = {
  '@type': string;
  '@context': string;
  itemListElement: BreadcrumbListItem[];
};

type ItemList = {
  '@type': string;
  '@context': string;
  numberOfItems: number;
  name: string;
  itemListOrder: string;
  itemListElement: ListItem[];
};

type ImageObject = {
  '@type': string;
  width: string;
  url: string;
  height: string;
};

type Person = {
  '@type': string;
  name: string;
};

type OrganizationLogo = {
  '@type': string;
  width: number;
  url: string;
  height: number;
};

type Organization = {
  '@type': string;
  name: string;
  logo: OrganizationLogo;
};

type WebPage = {
  '@type': string;
  '@id': string;
};

type NewsArticle = {
  '@type': string;
  '@context': string;
  datePublished: string;
  image: ImageObject;
  author: Person;
  publisher: Organization;
  dateModified: string;
  mainEntityOfPage: WebPage;
  headline: string;
};

type ScriptTagMetadata = [BreadcrumbList, ItemList, NewsArticle];
