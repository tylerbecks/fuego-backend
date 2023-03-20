import prisma from '../src/prisma-client.js';

type JamesBeard = {
  award: string;
  chef: string | null;
  name: string;
  url: string;
  year: string;
};

type ArticleRaw = {
  domain: string;
  name: string;
  site_name: string;
  title: string;
  url: string;
};

type Michelin = {
  award: string;
  cuisine_type: string;
  name: string;
  url: string;
};

type FiftyBest = {
  article_title: string;
  domain: string;
  name: string;
  rank: string;
  url: string;
};

type RestaurantRaw = {
  article_reviews: ArticleRaw[] | null;
  fifty_best: FiftyBest;
  james_beard: JamesBeard;
  michelin: Michelin;
  name: string;
  place_id: string | null;
};

type Award = {
  chef: string | null;
  restaurantId: number;
  source: string;
  type: string;
  url: string;
  year: number;
};

type Article = {
  cityId: number;
  source: string;
  title: string;
  url: string;
};

const createCity = async ({
  city: cityName,
  state,
  country,
}: {
  city: string;
  state: string | null;
  country: string;
}) => {
  console.log(`createCity: ${cityName}`);
  // Check if city exists
  const maybeCity = await prisma.city.findFirst({
    where: { city: cityName },
  });
  if (maybeCity) {
    console.log(`${cityName} already existed, returning id: ${maybeCity.id}`);
    return maybeCity.id;
  } else {
    const city = await prisma.city.create({
      data: {
        city: cityName,
        state,
        country,
      },
    });

    console.log(`Created ${cityName}, returning id: ${city.id}`);

    return city.id;
  }
};

const createRestaurant = async (restaurant: RestaurantRaw, cityId: number) => {
  console.log(`createRestaurant: ${restaurant.name}`);

  const { id: restaurantId } = await prisma.restaurant.create({
    data: {
      name: restaurant.name,
      gPlaceId: restaurant.place_id,
      cityId,
    },
  });

  // create articles
  if (restaurant.article_reviews) {
    await prisma.article.createMany({
      data: mapArticles(restaurant.article_reviews, cityId),
      skipDuplicates: true,
    });

    const articleUrls = restaurant.article_reviews.map(({ url }) => url);

    const articles = await prisma.article.findMany({
      where: { url: { in: articleUrls } },
    });

    // map articles to restaurant
    await prisma.articlesToRestaurants.createMany({
      data: articles.map(({ id: articleId }) => ({
        articleId,
        restaurantId,
      })),
    });
  }

  // create awards
  await prisma.award.createMany({
    data: getAwards(restaurant, restaurantId),
  });
};

const getAwards = (
  restaurantRaw: RestaurantRaw,
  restaurantId: number
): Award[] => {
  const { michelin, james_beard, fifty_best } = restaurantRaw;
  const awards = [];

  if (michelin) {
    const michelinAward = {
      restaurantId,
      source: 'michelin',
      type: michelin.award,
      year: 2022,
      url: michelin.url,
      chef: null,
    };
    awards.push(michelinAward);
  }
  if (james_beard) {
    const jamesBeardAward = {
      restaurantId,
      source: 'james_beard',
      type: james_beard.award,
      year: Number(james_beard.year),
      url: james_beard.url,
      chef: james_beard.chef,
    };
    awards.push(jamesBeardAward);
  }
  if (fifty_best) {
    const fiftyBestAward = {
      restaurantId,
      source: 'fifty_best',
      type: fifty_best.rank,
      year: 2022,
      url: fifty_best.url,
      chef: null,
    };
    awards.push(fiftyBestAward);
  }

  return awards;
};

const mapArticles = (
  articleReviews: ArticleRaw[],
  cityId: number
): Article[] => {
  const articles = articleReviews.map((a) => ({
    url: a.url,
    title: a.title,
    source: a.site_name,
    cityId,
  }));

  return articles;
};

const CITIES = [
  { city: 'austin', state: 'tx', country: 'usa' },
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
  // { city: 'paris', state: null, country: 'france' },
  // { city: 'rome', state: null, country: 'italy' },
  // { city: 'san diego', state: 'ca', country: 'usa' },
  // { city: 'san francisco', state: 'ca', country: 'usa' },
  // { city: 'seattle', state: 'wa', country: 'usa' },
  // { city: 'tokyo', state: null, country: 'japan' },
  // { city: 'washington', state: 'dc', country: 'usa' },
  // { city: 'zurich', state: null, country: 'switzerland' },
];

const main = async () => {
  for (const cityMetadata of CITIES) {
    let { city } = cityMetadata;
    console.log('====================================================');
    console.log(`Starting city: ${city}`);
    city = city.replace(' ', '_');

    // const cityId = await createCity(cityMetadata);

    // const restaurantsJSON = fs.readFileSync(
    //   `static_data/cities/${city}.json`,
    //   'utf-8'
    // );

    // let restaurantsToMigrate = JSON.parse(restaurantsJSON);

    // for (const restaurant of restaurantsToMigrate) {
    //   await createRestaurant(restaurant, cityId);
    // }
  }
};

main();
