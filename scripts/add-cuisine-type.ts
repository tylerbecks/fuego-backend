import { Configuration, OpenAIApi } from 'openai';
import prisma from '../src/prisma-client.js';

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
    const completion = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      temperature: 0.3,
    });

    const firstChoice = completion.data.choices[0].text as string;
    const cuisine = formatCuisineResult(firstChoice);

    console.log(`RESTAURANT: ${restaurantName}`);
    console.log(`CUISINE: ${cuisine}`);
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
  const prompt = `Describe the primary cuisine type for ${restaurantName} in ${city} in 5 words or less. Examples: French seafood, gourmet donuts, Greek fast-casual street food. Don't use the word cuisine.`;
  return await askGPT3(prompt, restaurantName);
};

const getCityId = async (cityName: string) => {
  const city = await prisma.city.findFirst({
    where: { city: cityName },
  });

  if (!city) {
    throw new Error('City not found in database: ' + cityName);
  }

  return city.id;
};

const getCuisinesForRestaurantsInCity = async (cityName: string) => {
  const cityId = await getCityId(cityName);

  const restaurants = await prisma.restaurant.findMany({
    where: { cityId, cuisine: null },
  });

  console.log(
    `${restaurants.length} restaurants without cuisine remaining in ${cityName}`
  );

  for (const restaurant of restaurants) {
    const cuisine = await getCuisine(restaurant.name, cityName);
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { cuisine: cuisine ?? null },
    });

    // The openai API has a rate limit of 60 requests per minute
    await sleep(900);
  }
};

const sleep = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const CITIES = [
  // { city: 'austin', state: 'tx', country: 'usa' },
  // { city: 'barcelona', state: null, country: 'spain' },
  // { city: 'boston', state: 'ma', country: 'usa' },
  // { city: 'chicago', state: 'il', country: 'usa' },
  // { city: 'denver', state: 'co', country: 'usa' },
  // { city: 'houston', state: 'tx', country: 'usa' },
  // { city: 'las vegas', state: 'nv', country: 'usa' },
  // { city: 'london', state: null, country: 'united kingdom' },
  // { city: 'los angeles', state: 'ca', country: 'usa' },
  // { city: 'mexico city', state: null, country: 'mexico' },
  // { city: 'miami', state: 'fl', country: 'usa' },
  // { city: 'munich', state: null, country: 'germany' },
  // { city: 'nashville', state: 'tn', country: 'usa' },
  // { city: 'new orleans', state: 'la', country: 'usa' },
  // { city: 'new york', state: 'ny', country: 'usa' },
  // { city: 'oaxaca', state: null, country: 'mexico' },
  { city: 'paris', state: null, country: 'france' },
  { city: 'rome', state: null, country: 'italy' },
  { city: 'san diego', state: 'ca', country: 'usa' },
  { city: 'san francisco', state: 'ca', country: 'usa' },
  { city: 'seattle', state: 'wa', country: 'usa' },
  { city: 'tokyo', state: null, country: 'japan' },
  { city: 'washington', state: 'dc', country: 'usa' },
  { city: 'zurich', state: null, country: 'switzerland' },
];

const main = async () => {
  for (const cityMetadata of CITIES) {
    let { city } = cityMetadata;
    console.log('====================================================');
    console.log(`Starting city: ${city}`);
    await getCuisinesForRestaurantsInCity(city);
  }
};

main();
