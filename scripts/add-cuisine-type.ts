import { Configuration, OpenAIApi } from 'openai';
import prisma from '../src/prisma-client';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY as string,
});

const openai = new OpenAIApi(configuration);

const askGPT3 = async (prompt: string, restaurantName: string) => {
  if (!configuration.apiKey) {
    throw new Error(
      'OpenAI API key not configured, please follow instructions in README.md'
    );
  }

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const firstChoice = completion.data.choices[0].message?.content as string;
    const cuisine = formatCuisineResult(firstChoice);

    console.log(`RESTAURANT: ${restaurantName}`);
    console.log(`CUISINE: ${cuisine}`);
    // add a new line
    console.log();

    return cuisine;
  } catch (error: any) {
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
    }
  }
};

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
  return await askGPT3(prompt, restaurantName);
};

const main = async () => {
  const restaurantsNoCuisine = await prisma.restaurant.findMany({
    where: { cuisine: null },
    include: {
      cities: true,
    },
  });

  console.log(
    `Found ${restaurantsNoCuisine.length} restaurants without cuisine`
  );

  for (const restaurant of restaurantsNoCuisine) {
    const cuisine = await getCuisine(restaurant.name, restaurant.cities.city);
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { cuisine: cuisine ?? null },
    });
  }
};

main();
