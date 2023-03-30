import {
  Client as GoogleMapsClient,
  PlaceInputType,
} from '@googlemaps/google-maps-services-js';
import axios from 'axios';
import * as dotenv from 'dotenv';

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

    console.log(`Querying google for: ${searchString}`);

    try {
      const response = await this.client.findPlaceFromText({
        params: {
          input: searchString,
          inputtype: PlaceInputType.textQuery,
          key: process.env.GOOGLE_API_KEY,
        },
      });

      return response.data.candidates[0];
    } catch (error) {
      console.log('There was a google error!');
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
