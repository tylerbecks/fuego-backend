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

type JamesBeardAward = {
  award: string;
  year: number;
  restaurant: string;
  cityState: string;
  chef: string | void | null;
};

export default class JamesBeardScraper extends Browser {
  async getWinners() {
    await this.launch();
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    let awards: JamesBeardAward[] = [];
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
          let cityState = await extractor.getCity(card);
          const chef = await extractor.getChef(card);

          if (cityState === '') {
            cityState = cityFillIn(restaurant, award, year);
          }

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
            cityState,
            chef,
          };
        })
      );

      const filteredAwards = awardMetadas.filter(
        (awardMetadata) => awardMetadata !== null
      ) as JamesBeardAward[];

      awards = [...awards, ...filteredAwards];

      currentPageNum++;
      morePagesExist = await this.doMorePagesExist(page);
    }

    void this.browser.close();

    return awards;
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

// For a small number of awards, the website ommitted the city. This function manually fills it back in.
const cityFillIn = (
  restaurant: string | null,
  award: string,
  year: number | null
) => {
  const CITY_STATE_MANUAL_EDITS = [
    {
      award: 'Best Chef: South',
      year: 2022,
      restaurant: 'Automatic Seafood and Oysters',
      cityState: 'Birmingham, Alabama',
      chef: 'Adam Evans',
    },
    {
      award: 'Best Chef: Southwest',
      year: 2022,
      restaurant: 'Sazón',
      cityState: 'Santa Fe, New Mexico',
      chef: 'Fernando Olea',
    },
    {
      award: 'Best Chef: Mid-Atlantic',
      year: 2022,
      restaurant: 'South Philly Barbacoa',
      cityState: 'Philadelphia, PA',
      chef: 'Cristina Martinez',
    },
    {
      award: 'Best Chef: Mountain',
      year: 2022,
      restaurant: 'Annette',
      cityState: 'Aurora, CO',
      chef: 'Caroline Glover',
    },
    {
      award: 'Best Chef: California',
      year: 2022,
      restaurant: "Mister Jiu's",
      cityState: 'San Francisco, CA',
      chef: 'Brandon Jew',
    },
    {
      award: 'Best Chef: Great Lakes',
      year: 2022,
      restaurant: 'Virtue Restaurant & Bar',
      cityState: 'Chicago, IL',
      chef: 'Erick Williams',
    },
    {
      award: 'Best Chef: Midwest',
      year: 2022,
      restaurant: 'The Diplomat',
      cityState: 'Milwaukee, WI',
      chef: 'Dane Baldwin',
    },
    {
      award: 'Best Chef: New York State',
      year: 2022,
      restaurant: 'Dhamaka',
      cityState: 'New York, NY',
      chef: 'Chintan Pandya',
    },
    {
      award: 'Best Chef: Texas',
      year: 2022,
      restaurant: 'El Naranjo',
      cityState: 'Austin, TX',
      chef: 'Iliana de la Vega',
    },
    {
      award: 'Best Chef: Southeast',
      year: 2022,
      restaurant: 'SALTBOX Seafood Joint',
      cityState: 'Durham, North Carolina',
      chef: 'Ricky Moore',
    },
    {
      award: 'Best Chef: Northeast',
      year: 2022,
      restaurant: 'Saap',
      cityState: 'Randolph, VT',
      chef: 'Nisachon Morgan',
    },
    {
      award: "America's Classics",
      year: 2010,
      restaurant: "Mary & Tito's Cafe",
      cityState: 'Albuquerque, NM',
      chef: undefined,
    },
    {
      award: "America's Classics",
      year: 2010,
      restaurant: "Al's French Frys",
      cityState: 'South Burlington, VT',
      chef: undefined,
    },
    {
      award: 'Outstanding Wine Service',
      year: 2000,
      restaurant: 'Rubicon',
      cityState: 'Burlingame, California',
      chef: undefined,
    },
  ];

  const found = CITY_STATE_MANUAL_EDITS.find((editedAward) => {
    if (
      award === editedAward.award &&
      year === editedAward.year &&
      restaurant === editedAward.restaurant
    ) {
      return true;
    }
  });

  return found ? found.cityState : null;
};

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
