import Browser from '../browser';
import { ArticleScraperInterface } from './article-scraper';

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
      return [];
    }

    const page = await this.browser.newPage();
    await page.goto(this.url);

    return [];
  }
}
