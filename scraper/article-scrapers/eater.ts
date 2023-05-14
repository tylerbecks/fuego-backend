import { Locator, Page } from 'playwright';

import logger from '../../src/logger';
import Browser from '../browser';
import { asyncFilter } from '../utils/async-helpers';
import { GoToPageError } from '../utils/errors';
import { ArticleScraperInterface } from './article-scraper';

export default class Eater extends Browser implements ArticleScraperInterface {
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

    const scriptTagMetadata = await this.getScriptTagMetadata(page);
    const restaurants = await this.getRestaurantLocators(page);

    return await Promise.all(
      restaurants.map(async (r) => {
        const name = await this.getName(r);
        const description = await this.getDescription(r);
        const instagramLink = await this.getInstagramLink(page, r, name);
        const longAddress = await this.getLongAddress(r, name);
        const phone = await this.getPhone(r, name);
        const reservationLink = await this.getReservationLink(r, name);
        const url = this.getUrl(name, scriptTagMetadata);
        const website = await this.getWebsite(r, name);

        return {
          name,
          description,
          instagramLink,
          longAddress,
          phone,
          reservationLink,
          url,
          website,
        };
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
    const name = await heading.textContent();
    if (!name) {
      throw new Error('No name found in eater scraper');
    }

    return name;
  }

  private async getDescription(restaurantLocator: Locator) {
    return await restaurantLocator.locator('p').first().textContent();
  }

  private async getWebsite(restaurantLocator: Locator, restaurantName: string) {
    const websiteLinkLocator = restaurantLocator.locator(
      'a[data-analytics-link="link-icon"]'
    );

    const count = await websiteLinkLocator.count();
    if (count === 0) {
      console.warn(`No website found for ${restaurantName}`);
      return null;
    }

    const website = await websiteLinkLocator.getAttribute('href');
    return website;
  }

  // e.g. 12233 Ranch Rd 620 N suite 105, Austin, TX 78750
  private async getLongAddress(
    restaurantLocator: Locator,
    restaurantName: string
  ) {
    const addressLocator = restaurantLocator.locator('.c-mapstack__address');
    const count = await addressLocator.count();
    if (count === 0) {
      console.warn(`No address found for ${restaurantName}`);
      return null;
    }

    const address = await addressLocator.textContent();
    return address;
  }

  private async getPhone(restaurantLocator: Locator, restaurantName: string) {
    const phoneLocator = restaurantLocator
      .locator('.c-mapstack__phone-url')
      .locator('.c-mapstack__phone')
      .first();
    const count = await phoneLocator.count();
    if (count === 0) {
      console.warn(`No phone found for ${restaurantName}`);
      return null;
    }

    const phone = await phoneLocator.textContent();
    return phone;
  }

  private getUrl(restaurantName: string, scriptTagMetadata: ScriptTagMetadata) {
    const restaurantItem = scriptTagMetadata.itemListElement.find(
      (item) => item.item.name === restaurantName
    );

    if (!restaurantItem) {
      throw new Error(
        `No item found for ${restaurantName} to get url from metadata`
      );
    }

    return restaurantItem.item.url;
  }

  // TODO get the instagram account link from from within the iframe
  // Right now, the contents inside the iframe are not loading. I haven't yet figured out how to get the contents to load.
  // So we're just getting the instagram embed link from the ifrmae.
  // e.g. https://www.instagram.com/p/CoNK4Neu81Q/embed/?cr=1&v=14&wp=1070&rd=https%3A%2F%2Faustin.eater.com&rp=%2Fmaps%2Faustin-best-restaurants-eater-38#%7B%22ci%22%3A0%2C%22os%22%3A1303%7D
  // But there's a button to link to the page, that link looks like this:
  // https://www.instagram.com/interstellarbbq/?utm_source=ig_embed&ig_rid=af06e667-74c4-4c92-b3aa-b8589f11e8f2
  private async getInstagramLink(
    page: Page,
    restaurantLocator: Locator,
    restaurantName: string
  ) {
    const iframe = restaurantLocator.locator('iframe');

    const count = await iframe.count();
    if (count === 0) {
      return null;
    }

    const instagramLink = await iframe.getAttribute('src');
    if (!instagramLink) {
      console.error(
        `a tag found, but no instagram href found for ${restaurantName}`
      );
      throw new Error(
        `a tag found, but no instagram href found for ${restaurantName}`
      );
    }

    // remove query params
    const linkWithoutQueryParams = instagramLink.split('?')[0];

    // The following query params come with instagram embeds
    return linkWithoutQueryParams;
  }

  // e.g. https://ny.eater.com/maps/best-new-york-restaurants-38-map
  private async getReservationLink(
    restaurantLocator: Locator,
    restaurantName: string
  ) {
    const reservationsLocator = restaurantLocator
      .locator('ul.services')
      .locator('li.primary')
      .locator('a');

    const count = await reservationsLocator.count();

    if (count === 0) {
      return null;
    }

    const reservationsLink = await reservationsLocator.getAttribute('href');
    if (!reservationsLink) {
      logger.error(
        `a tag found, but no reservations href found for ${restaurantName}`
      );
      throw new Error(
        `a tag found, but no reservations href found for ${restaurantName}`
      );
    }

    // Remove query params, but keep rid=110398
    const linkWithoutQueryParams = reservationsLink.split('?')[0];
    const rid = reservationsLink.split('rid=')[1];

    return `${linkWithoutQueryParams}?rid=${rid}`;
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
}

type ScriptTagMetadata = {
  headline: string; // The 38 Best Restaurants in Austin, Spring 2023
  description: string;
  datePublished: string;
  dateModified: string;
  author: {
    '@type': string;
    name: string;
  };
  itemListElement: Array<{
    '@type': string;
    position: string;
    item: {
      '@type': string;
      name: string;
      url: string;
    };
  }>;
};
