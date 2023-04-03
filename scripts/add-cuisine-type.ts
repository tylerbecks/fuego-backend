import logger from '../src/logger';
import prisma from '../src/prisma-client';
import askGPT from './utils/open-ai';

const formatCuisineResult = (cuisine: string) => {
  cuisine = cuisine.replaceAll('\n', '');
  // strip last character if it's a period
  if (cuisine[cuisine.length - 1] === '.') {
    cuisine = cuisine.slice(0, -1);
  }

  // script cuisine from the end of the string
  if (cuisine.slice(-7) === 'cuisine' || cuisine.slice(-7) === 'Cuisine') {
    cuisine = cuisine.slice(0, -8);
  }

  return cuisine;
};

const getCuisine = async (restaurantName: string, city: string) => {
  const prompt = `Describe the primary cuisine type for the restaurant ${restaurantName} in ${city} in 4 words or less. Examples: French seafood, gourmet donuts, Greek fast-casual street food. Don't use the word cuisine.`;
  const openAiResponse = await askGPT(prompt);
  logger.info(`RESTAURANT: ${restaurantName}`);
  const cuisine = formatCuisineResult(openAiResponse);
  // add a new line
  logger.info('');

  return cuisine;
};

const main = async () => {
  const restaurantsNoCuisine = await prisma.restaurant.findMany({
    where: { cuisine: null },
    include: {
      cities: true,
    },
  });

  logger.info(
    `Found ${restaurantsNoCuisine.length} restaurants without cuisine`
  );

  for (const restaurant of restaurantsNoCuisine) {
    const cuisine = await getCuisine(
      restaurant.name,
      restaurant.cities?.city ?? ''
    );
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { cuisine: cuisine ?? null },
    });
  }
};

(async () => {
  await main();
})();
