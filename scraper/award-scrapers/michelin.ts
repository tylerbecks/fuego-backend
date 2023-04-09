import { Locator, Page } from 'playwright';

import logger from '../../src/logger';
import Browser from '../browser';

const BASE_URL = 'https://guide.michelin.com/us/en/restaurants/page/';

// Michelin has over 16k restaurants, so we can't store them all in memory.
// Need to add a hook to update the database as we go.
export default class MichelinScraper extends Browser {
  async scrape() {
    logger.info('Launching browser...');
    await this.launch();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    logger.info('Navigating to michelin guide...');
    const page = await this.browser.newPage();

    let morePagesExist = true;
    let currentPage = 1;

    while (morePagesExist) {
      await page.goto(`${BASE_URL}${currentPage}`);
      const restaurants = await this.getRestaurants(page);
      logger.info(`Found ${restaurants.length} restaurants on this page.`);
      console.log(restaurants);

      currentPage++;
      morePagesExist = !(await this.isLastPage(page));
    }

    void this.browser?.close();
  }

  private async getRestaurants(page: Page) {
    const cards = await this.getCards(page);

    return await Promise.all(
      cards.map(async (c) => {
        // use Promise.all to run all async getters at once
        const [
          award,
          name,
          url,
          lat,
          lng,
          cuisine,
          country,
          region,
          price,
          chef,
        ] = await Promise.all([
          this.getAward(c),
          this.getRestaurantName(c),
          this.getRestaurantUrl(c),
          this.getLat(c),
          this.getLng(c),
          this.getCuisine(c),
          this.getCountry(c),
          this.getRegion(c),
          this.getPrice(c),
          this.getChef(c),
        ]);

        return {
          award,
          name,
          url,
          lat,
          lng,
          cuisine,
          country,
          region,
          price,
          chef,
        };
      })
    );
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

  private async getAward(card: Locator) {
    const awardIcons = await card
      .locator('div.card__menu-content--rating')
      .locator('img.michelin-award')
      .all();

    const imageUrls = await Promise.all(
      awardIcons.map(async (i) => await i.getAttribute('src'))
    );

    // There is no icon for the michelin guide, so assume no icon means guide
    if (imageUrls.length === 0) {
      return 'GUIDE';
    }

    if (imageUrls[0] === null) {
      throw new Error('No image url found');
    }

    if (imageUrls.some((i) => i?.includes('bib-gourmand'))) {
      return 'BIB_GOURMAND';
    }

    const numStars = imageUrls.filter((i) => i?.includes('1star'));

    switch (numStars.length) {
      case 1:
        return 'ONE_STAR';
      case 2:
        return 'TWO_STARS';
      case 3:
        return 'THREE_STARS';
      default:
        throw new Error(
          `Unknown michelin award for ${
            (await this.getRestaurantName(card)) ?? 'unknown'
          }`
        );
    }
  }

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

(async function () {
  const scraper = new MichelinScraper();
  await scraper.scrape();
})();
