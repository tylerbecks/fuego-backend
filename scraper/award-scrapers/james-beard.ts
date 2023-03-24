import { Locator, Page } from 'playwright';

import Browser from '../browser';

const IGNORE_AWARDS = new Set([
  'Humanitarian of the Year',
  'Lifetime Achievement',
  'Other Eating and Drinking Places',
  'Outstanding Restaurant Design (75 Seats and Under)',
  'Outstanding Restaurant Design (76 Seats and Over)',
  'Outstanding Restaurant Design',
  'Outstanding Restaurant Graphics',
  'Outstanding Restaurateur',
  'Outstanding Wine & Spirits Professional',
  "Who's Who of Food & Beverage in America",
]);

const DESIGN_ICON_IGNORES = new Set(['Debbie Gold', 'Alex Von Bidder']);

const BASE_URL =
  'https://www.jamesbeard.org/awards/search?ranks%5BWinner%5D=1&categories%5BRestaurant+%26+Chef%5D=1';

export default class JamesBeardScraper extends Browser {
  async getWinners() {
    await this.launch();
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    type uniqueAwardsType = {
      [award: string]: Set<string | null>;
    };
    const uniqueAwards: uniqueAwardsType = {
      bestChef: new Set(),
    };

    const uniqueDataTemplates = new Set();

    let morePagesExist = true;
    let currentPageNum = 1;
    while (morePagesExist) {
      const url = `${BASE_URL}&page=${currentPageNum}`;
      console.log(`Navigating to ${url}`);
      await page.goto(url);

      const cards = await this.getCards(page);

      const awardMetadas = await Promise.all(
        cards.map(async (card) => {
          const award = await this.getAward(card);

          if (IGNORE_AWARDS.has(award)) {
            return null;
          }

          const year = await this.getYear(card);
          const dataAwardTemplate = await this.getDataAwardTemplate(card);
          const extractor =
            dataAwardTemplate === 'components.search-results.award.rnc.person'
              ? new ChefExtractor()
              : new RestaurantExtractor();

          const restaurant = await extractor.getRestaurant(card);
          const city = await extractor.getCity(card);
          const chef = await extractor.getChef(card);

          // Design icon has some titles that are people with no restaurants, so ignore those
          // https://www.jamesbeard.org/awards/search?categories%5BRestaurant+%26+Chef%5D=1&ranks%5BWinner%5D=1&year=&keyword=Design+Icon
          if (
            award === 'Design Icon' &&
            restaurant &&
            DESIGN_ICON_IGNORES.has(restaurant)
          ) {
            return null;
          }

          return {
            award,
            year,
            restaurant,
            city,
            chef,
          };
        })
      );

      const filteredAwards = awardMetadas.filter(
        (awardMetadata) => awardMetadata !== null
      );

      console.log(filteredAwards);

      currentPageNum++;
      morePagesExist = await this.doMorePagesExist(page);
    }

    console.log(uniqueAwards);
    console.log(uniqueDataTemplates);

    await this.browser.close();
  }

  async getCards(page: Page) {
    return await page
      .locator('div.c-award-recipient')
      .filter({ has: page.locator('.c-award-recipient__text') })
      .all();
  }

  async getAward(card: Locator) {
    const firstLine = card.locator('.c-award-recipient__text').first();
    const text = await firstLine.textContent();
    if (!text) {
      throw new Error('No text found');
    }
    return text.trim();
  }

  async getYear(card: Locator) {
    const year = await card.getAttribute('data-award-recipient-year');
    return year ? Number(year) : null;
  }

  async getDataAwardTemplate(card: Locator) {
    return await card.getAttribute('data-award-template');
  }

  private async doMorePagesExist(page: Page) {
    const paginationElement = page.locator('ul.pagination');
    if (!paginationElement) {
      return false;
    }

    const nextButton = paginationElement.locator('.page-item').last();
    const nextButtonClass = await nextButton.getAttribute('class');
    if (!nextButtonClass) {
      return false;
    }

    return !nextButtonClass.includes('disabled');
  }
}

class ChefExtractor {
  async getRestaurant(card: Locator) {
    return await getNthLine(card, 1);
  }

  async getCity(card: Locator) {
    return await getNthLine(card, 2);
  }

  async getChef(card: Locator) {
    return await getTitle(card);
  }
}

class RestaurantExtractor {
  async getRestaurant(card: Locator) {
    return await getTitle(card);
  }

  async getCity(card: Locator) {
    return await getNthLine(card, 1);
  }

  getChef(card: Locator) {
    void card;
  }
}

const getTitle = async (card: Locator) => {
  const text = await card
    .locator('.c-award-recipient__name')
    .first()
    .textContent();

  return text ? text.trim() : null;
};

const getNthLine = async (card: Locator, index: number) => {
  const text = await card
    .locator('.c-award-recipient__text')
    .nth(index)
    .textContent();

  return text ? text.trim() : null;
};

(async function () {
  const scraper = new JamesBeardScraper();
  await scraper.getWinners();
})();
