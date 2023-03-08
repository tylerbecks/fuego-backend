import Browser from '../browser';

export default class CondeNast extends Browser {
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }

  async getRestaurants() {
    if (!this.browser) {
      return;
    }
    console.log(`Scraping ${this.url}`);

    const page = await this.browser.newPage();
    await page.goto(this.url);

    return {};
  }
}
