import { Browser as BrowserType, chromium } from 'playwright';

export default class Browser {
  browser: BrowserType | undefined;

  async launch() {
    this.browser = await chromium.launch();
  }

  async close() {
    if (!this.browser) {
      console.warn('Attempted to close browser before it was initialized');
      return;
    }

    await this.browser.close();
  }
}
