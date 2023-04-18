import { Locator, Page } from 'playwright';

import logger from '../../src/logger';
import Browser from '../browser';

const BASE_URL = 'https://guide.michelin.com/us/en/restaurants/page/';

type MichelinRestaurant = {
  awards: string[];
  name: string;
  url: string;
  lat: number;
  lng: number;
  cuisine: string;
  city: string;
  country: string;
  region: string;
  price: number;
  chef: string | null;
};

// Michelin has over 16k restaurants, so we can't store them all in memory.
// Need to add a hook to update the database as we go.
export default class MichelinScraper extends Browser {
  async scrape(
    onScrapePage: (restaurants: MichelinRestaurant[]) => Promise<void>
  ) {
    logger.info('Launching browser...');
    await this.launch();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    logger.info('Navigating to michelin guide...');
    const page = await this.browser.newPage();

    let morePagesExist = true;
    let currentPage = 485; // out of 811

    while (morePagesExist) {
      logger.info(
        '===================================================================='
      );
      logger.info(`Scraping page ${BASE_URL}${currentPage}`);
      logger.info(
        '===================================================================='
      );
      await page.goto(`${BASE_URL}${currentPage}`);
      let restaurants;
      try {
        restaurants = await this.getRestaurants(page);
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
        continue;
      }

      logger.info(`Found ${restaurants.length} restaurants on this page.`);
      await onScrapePage(restaurants);

      currentPage++;
      morePagesExist = !(await this.isLastPage(page));
    }

    void this.browser?.close();
  }

  private async getRestaurants(page: Page): Promise<MichelinRestaurant[]> {
    const cards = await this.getCards(page);

    return await Promise.all(
      cards.map(async (c) => await this.getRestaurantData(c))
    );
  }

  private async getRestaurantData(card: Locator): Promise<MichelinRestaurant> {
    // use Promise.all to run all async getters at once
    const [
      awards,
      name,
      url,
      lat,
      lng,
      cuisine,
      city,
      country,
      region,
      price,
      chef,
    ] = await Promise.all([
      this.getAwards(card),
      this.getRestaurantName(card),
      this.getRestaurantUrl(card),
      this.getLat(card),
      this.getLng(card),
      this.getCuisine(card),
      this.getCity(card),
      this.getCountry(card),
      this.getRegion(card),
      this.getPrice(card),
      this.getChef(card),
    ]);

    if (!name) {
      throw new Error('Restaurant name is required');
    }
    if (!url) {
      throw new Error(`No url found for ${name}`);
    }
    if (!lat) {
      throw new Error(`No lat found for ${name}`);
    }
    if (!lng) {
      throw new Error(`No lng found for ${name}`);
    }
    if (!cuisine) {
      throw new Error(`No cuisine found for ${name}`);
    }
    if (!city) {
      throw new Error(`No city found for ${name}`);
    }
    if (!country) {
      throw new Error(`No country found for ${name}`);
    }
    if (!region) {
      throw new Error(`No region found for ${name}`);
    }
    if (!price) {
      throw new Error(`No price found for ${name}`);
    }

    return {
      awards,
      name,
      url,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      cuisine,
      city,
      country,
      region,
      price,
      chef,
    };
  }

  private async getCards(page: Page) {
    return await page.locator('div.card__menu').all();
  }

  private async getRestaurantUrl(card: Locator) {
    const title = card.locator('h3.card__menu-content--title');
    const link = title.locator('a');
    const relativeSrc = await link.getAttribute('href');

    return `https://guide.michelin.com${relativeSrc}`;
  }

  private async getAwards(card: Locator) {
    const awardIcons = await card
      .locator('div.card__menu-content--rating')
      .locator('img.michelin-award')
      .all();

    const imageUrls = await Promise.all(
      awardIcons.map(async (i) => await i.getAttribute('src'))
    );

    const greenStar = imageUrls.find((i) => i?.includes('gastronomie-durable'));
    const bibGourmand = imageUrls.find((i) => i?.includes('bib-gourmand'));
    const guide = imageUrls.length === 0;
    const numStars = this.getMichelinStars(imageUrls);

    const awards = [
      greenStar && 'GREEN_STAR',
      bibGourmand && 'BIB_GOURMAND',
      guide && 'GUIDE',
      numStars,
    ];

    return awards.filter((a) => a) as string[];
  }

  getMichelinStars = (imageUrls: Array<string | null>) => {
    const numStars = imageUrls.filter((i) => i?.includes('1star'));

    switch (numStars.length) {
      case 1:
        return 'ONE_STAR';
      case 2:
        return 'TWO_STARS';
      case 3:
        return 'THREE_STARS';
      default:
        return undefined;
    }
  };

  private async getLat(card: Locator) {
    return await card.getAttribute('data-lat');
  }

  private async getLng(card: Locator) {
    return await card.getAttribute('data-lng');
  }

  private async getRestaurantName(card: Locator) {
    return await card
      .locator('div.card__menu-like')
      .getAttribute('data-restaurant-name');
  }

  private async getCuisine(card: Locator) {
    return await card
      .locator('div.card__menu-like')
      .getAttribute('data-cooking-type');
  }

  private async getCity(card: Locator) {
    return await card
      .locator('div.card__menu-like')
      .getAttribute('data-dtm-city');
  }

  private async getCountry(card: Locator) {
    return await card
      .locator('div.card__menu-like')
      .getAttribute('data-restaurant-country');
  }

  private async getPrice(card: Locator) {
    const cardFooter = card.locator('div.card__menu-footer--price');
    let cardFooterText = await cardFooter.textContent();
    if (cardFooterText === null) {
      throw new Error('No card footer text found');
    }
    cardFooterText = cardFooterText.replace('\n', '');

    // Example footer text: €€€€ · Modern Cuisine, Creative
    // The footer looks like this, so remove everythign before the dot
    return cardFooterText.split('·')[0].trim().length;
  }

  private async getRegion(card: Locator) {
    return await card
      .locator('div.card__menu-like')
      .getAttribute('data-dtm-region');
  }

  private async getChef(card: Locator) {
    const chef = await card
      .locator('div.card__menu-like')
      .getAttribute('data-dtm-chef');

    return chef === '' ? null : chef;
  }

  private async isLastPage(page: Page) {
    const pagination = page.locator('ul.pagination');
    const buttons = await pagination.locator('li').all();
    if (buttons.length === 0) {
      throw new Error('No pagination buttons found');
    }

    const lastButtonClass = await buttons.at(-1)?.getAttribute('class');
    return !!lastButtonClass && !lastButtonClass.includes('arrow');
  }
}
