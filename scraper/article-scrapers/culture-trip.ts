import { Page } from 'playwright';
import Browser from '../browser';
import { GoToPageError } from '../utils/errors';
import { ArticleScraperInterface } from './article-scraper';

// The Culture Trip articles often don't have the same number of restaurants as they say in the url or title
export default class CultureTrip
  extends Browser
  implements ArticleScraperInterface
{
  url: string;

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

    const nextData = await this.#getNextData(page);
    if (!nextData) {
      console.warn(`No data found for ${this.url}`);
      return [];
    }

    const { articleContent } = nextData.props.pageProps.pageData;
    const restaurantNameHeaders =
      this.#getRestaurantNameHeaders(articleContent);

    const itemCards = this.#getItemCards(nextData);
    const itemCardRestaurants = itemCards.map((c) => ({
      name: c.title ?? null,
      description: c.content ?? null,
    }));

    const restaurantNameHeadersRestaurants = restaurantNameHeaders.map((c) => ({
      name: c.content ?? null,
      description: this.#getDescription(articleContent, c) ?? null,
    }));

    return [...itemCardRestaurants, ...restaurantNameHeadersRestaurants];
  }

  #getRestaurantNameHeaders(articleContent: ArticleContentItem[]) {
    return articleContent.filter(
      // in rare cases, such as https://theculturetrip.com/north-america/mexico/articles/mexico-city-s-top-10-restaurants-taquer-as-you-should-try/
      // There are articleContentItems with type 'header' that serve as intros for the articles. Filter these out based on their length.
      (c) => c.type === 'header' && (c.content?.length ?? 100) < 100
    );
  }

  // The description objects are siblings to the articleHeader, sometimes seperated by an image.
  // So, given an articleHeader, find the next paragraph and return it as the description.
  #getDescription(
    articleContent: ArticleContentItem[],
    articleHeader: ArticleContentItem
  ) {
    const headerIndex = articleContent.indexOf(articleHeader);
    const nextParagraph = articleContent.find(
      (c, i) => (c.tag === 'p' || c.type === 'paragraph') && i > headerIndex
    );

    return nextParagraph?.content ?? null;
  }

  async #getNextData(page: Page): Promise<NextData | null> {
    const nextDataScriptTag = page.locator('#__NEXT_DATA__');
    const content = await nextDataScriptTag.textContent();
    return content ? (JSON.parse(content) as NextData) : null;
  }

  #getItemCards(nextData: NextData) {
    const { articleContent } = nextData.props.pageProps.pageData;
    return articleContent.filter((c) => c.type === 'item-card');
  }
}

type NextData = {
  props: {
    pageProps: {
      pageData: {
        articleContent: ArticleContentItem[];
      };
    };
  };
};

type ArticleContentItem = {
  type: string;
  tag?: string;
  title?: string;
  content?: string;
  itemDetails?: {
    image?: {
      imageSizes: {
        fullSize: {
          links: {
            href: string;
          }[];
        };
      };
    };
    image_mobile?: {
      imageSizes: {
        fullSize: {
          links: {
            href: string;
          }[];
        };
      };
    };
    link?: string;
    id?: string;
    cardId?: string;
    title?: string;
    ID?: number;
    post_status?: string;
    domain?: string;
    lat?: number;
    lng?: number;
    published?: string;
    updated?: string;
    is_legacy?: boolean;
    status?: number;
    slug?: string;
    path?: string;
    alt?: string;
    width?: number;
    attribution?: string;
    caption?: string;
    is_default?: boolean;
    url?: string;
    height?: number;
    description?: string;
    contact_info?: {
      city_name?: string;
      website_url?: string;
      country_name?: string;
      house_number?: string;
      phone_number?: number;
      neighborhood?: string;
      street_name?: string;
      zip_code?: string;
      state?: string;
      google_maps_url?: string;
    };
    about_food_and_drinks?: {
      price_bracket?: string;
      cuisine_type?: string[];
      meal_service?: string[];
    };
    google_places_rating?: number;
    'tct-is_bookable'?: boolean;
    'tct-affiliation_type'?: string;
  };
};
