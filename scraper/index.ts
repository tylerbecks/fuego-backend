import { Browser, chromium } from 'playwright';

import logger from '../src/logger';
import prisma from '../src/prisma-client';

class Scraper {
  browser: Browser | undefined;

  async launch() {
    this.browser = await chromium.launch();
  }

  async close() {
    await this.browser?.close();
  }

  async scrapeOgContent(url: string) {
    if (!this.browser) {
      return;
    }
    logger.info(`scrapeOgContent for ${url}`);

    const page = await this.browser.newPage();
    await page.goto(url);
    const description = await page
      .locator('meta[property="og:description"]')
      .getAttribute('content');
    const image = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    // const title = await page
    //   .locator('meta[property="og:title"]')
    //   .getAttribute('content');

    return { image, description };
  }
}

(async () => {
  const urls = await prisma.article.findMany({
    select: {
      id: true,
      url: true,
    },
    where: {
      description: null,
    },
  });
  logger.info(`There are ${urls.length} articles remaining`);
  const scraper = new Scraper();
  await scraper.launch();

  for (const url of urls) {
    logger.info(url);
    const ogContent = await scraper.scrapeOgContent(url.url);
    await prisma.article.update({
      where: {
        id: url.id,
      },
      data: {
        description: ogContent?.description ?? null,
        imageUrl: ogContent?.image ?? null,
      },
    });
  }

  await scraper.close();
})();
