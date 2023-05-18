import {
  Client as GoogleMapsClient,
  PlaceInputType,
} from '@googlemaps/google-maps-services-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { Readable } from 'stream';

import logger from './logger';

dotenv.config();

// API:     https://googlemaps.github.io/google-maps-services-js/classes/Client.html
// Pricing: https://developers.google.com/maps/documentation/places/web-service/usage-and-billing#places-photo

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

  async refreshPlaceId(placeId: string) {
    return await this.getPlaceDetails(placeId, ['place_id']);
  }

  // https://developers.google.com/maps/documentation/javascript/place-data-fields
  async getPlaceDetails(placeId: string, fields: string[]) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY env variable not set');
    }

    logger.info(`Getting place details for: ${placeId}`);

    try {
      const response = await this.client.placeDetails({
        params: {
          place_id: placeId,
          key: process.env.GOOGLE_API_KEY,
          ...(fields ? { fields } : {}),
        },
      });

      return response.data.result;
    } catch (error) {
      logger.error(
        `There was a google error during getPlaceDetails! placeId: ${placeId}`
      );
      if (axios.isAxiosError(error)) {
        console.error(error.response?.status, error.response?.data);
      }
      throw error;
    }
  }

  async getPhoto(photoReference: string, maxwidth = 400): Promise<Readable> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY env variable not set');
    }

    logger.info(`Getting photo for: ${photoReference}`);

    try {
      const response = await this.client.placePhoto({
        params: {
          maxwidth,
          photoreference: photoReference,
          key: process.env.GOOGLE_API_KEY,
        },
        responseType: 'stream',
      });

      return response.data as Readable;
    } catch (error) {
      logger.error(
        `There was a google error during getPhoto! photoReference: ${photoReference}`
      );
      if (axios.isAxiosError(error)) {
        console.error(error.response?.status, error.response?.data);
      }
      throw error;
    }
  }
}

// (async function () {
//   const google = new Google();
//   const response = await google.getPlaceDetails('ChIJSRvZ1yHGwoARcLrfvc-APl4', [
//     'business_status',
//     'geometry/location',
//     'name',
//     'formatted_address',
//     'photos',
//     'url',
//   ]);
//   console.log(response);
// })();
