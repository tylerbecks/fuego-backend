import {
  Client as GoogleMapsClient,
  PlaceInputType,
} from '@googlemaps/google-maps-services-js';
import axios from 'axios';
import * as dotenv from 'dotenv';

import logger from './logger';

dotenv.config();

// https://googlemaps.github.io/google-maps-services-js/index.html#new-googlemapsgoogle-maps-services-js
//  - findPlaceFromText ✅ (can just return the place_id)
//  - placeAutocomplete 🚫 the params to this query seem too geared towards searching near a user from an input on the frontend
//  - placeQueryAutocomplete 🚫 (returns too many results)
//  - textSearch 🚫 (this returns all the fields and bills accordingly)

export default class Google {
  client;

  constructor() {
    this.client = new GoogleMapsClient();
  }

  async findPlaceFromText(searchString: string) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY env variable not set');
    }

    logger.info(`Querying google for: ${searchString}`);

    try {
      const response = await this.client.findPlaceFromText({
        params: {
          input: searchString.replace('.', ''), // for some reason, periods were breaking the google client
          inputtype: PlaceInputType.textQuery,
          key: process.env.GOOGLE_API_KEY,
        },
      });

      return response.data.candidates[0];
    } catch (error) {
      logger.error('There was a google error!');
      if (axios.isAxiosError(error)) {
        console.log(error);
        console.error(error.response?.status, error.response?.data);
      }
      throw error;
    }
  }

  async refreshPlaceId(placeId: string): Promise<{ place_id: string | null }> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY env variable not set');
    }

    logger.info(`Refreshing placeId: ${placeId}`);

    try {
      const response = await this.client.placeDetails({
        params: {
          place_id: placeId,
          key: process.env.GOOGLE_API_KEY,
          fields: ['place_id'],
        },
      });

      return response.data.result as { place_id: string | null };
    } catch (error) {
      logger.error('There was a google error!');
      if (axios.isAxiosError(error)) {
        console.error(error.response?.status, error.response?.data);
      }
      throw error;
    }
  }
}

// (async function () {
//   const google = new Google();
//   const response = await google.findPlaceFromText(
//     'Rustic Canyon restaurant Santa Monica'
//   );
//   console.log(response);
// })();
