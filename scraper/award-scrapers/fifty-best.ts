import { Locator, Page } from 'playwright';

import logger from '../../src/logger';
import Browser from '../browser';

const FIFTY_BEST_URL = 'https://www.theworlds50best.com/list/1-50';
const HUNDRED_BEST_URL = 'https://www.theworlds50best.com/list/51-100';
const BEST_OF_BEST_URL = 'https://www.theworlds50best.com/Best-of-the-best';

const PREVIOUSLY_FIRST_PLACE_RANK = -1;

export default class FiftyBestScraper extends Browser {
  async scrape() {
    const fiftyBest = await this.scrapeFiftyBest(FIFTY_BEST_URL);
    const bestOfBest = await this.getBestOfBestCards(BEST_OF_BEST_URL);
    void this.browser?.close();

    return [...fiftyBest, ...bestOfBest];
  }

  async scrapeFiftyBest(url: string) {
    logger.info(`Scraping ${url}...`);
    await this.launch();
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    logger.info('page.goto(url)...');
    await page.goto(url, { timeout: 0 });
    const cards = await this.getFiftyBestCards(page);
    logger.info(`Found ${cards.length} cards.`);

    return await this.getCardMetadata(cards);
  }

  async getBestOfBestCards(url: string) {
    logger.info(`Scraping ${url}...`);
    await this.launch();
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    logger.info('page.goto(url)...');
    await page.goto(url, { timeout: 0 });
    const cards = await this.getCards(page);
    logger.info(`Found ${cards.length} cards.`);

    return await this.getCardMetadata(cards);
  }

  private async getCardMetadata(cards: Locator[]) {
    return await Promise.all(
      cards.map(async (card) => {
        const rank = await this.getRank(card);
        const name = await this.getName(card);
        const city = await this.getCity(card);
        const url = this.getUrlFor(rank);

        return { rank, name, city, url };
      })
    );
  }

  private getUrlFor(rank: number) {
    if (rank === PREVIOUSLY_FIRST_PLACE_RANK) {
      return BEST_OF_BEST_URL;
    }

    if (rank <= 50) {
      return FIFTY_BEST_URL;
    }

    return HUNDRED_BEST_URL;
  }

  private async getFiftyBestCards(page: Page) {
    const fiftyBestContainer = page.locator('div[data-list="1-50"]');
    const fiftyBest = await this.getCards(fiftyBestContainer);

    const hundredBestContainer = page.locator('div[data-list="51-100"]');
    const hundredBest = await this.getCards(hundredBestContainer);

    return [...fiftyBest, ...hundredBest];
  }

  private async getCards(container: Locator | Page) {
    return await container.locator('.item').all();
  }

  private async getRank(card: Locator) {
    const nodes = await card.locator('p.position').all();
    // Rank not found, so we're scraping the Best of the Best list
    if (nodes.length === 0) {
      return PREVIOUSLY_FIRST_PLACE_RANK;
    }

    const rank = await nodes[0].textContent();
    return Number(rank);
  }

  private async getName(card: Locator) {
    return await card.locator('h2').first().textContent();
  }

  private async getCity(card: Locator) {
    return await card.locator('p').last().textContent();
  }
}
