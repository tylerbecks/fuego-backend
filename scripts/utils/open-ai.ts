import axios from 'axios';
import * as dotenv from 'dotenv';
import { backOff } from 'exponential-backoff';
import { Configuration, OpenAIApi } from 'openai';

import logger from '../../src/logger';

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY as string,
});

const openai = new OpenAIApi(configuration);

const OPEN_AI_MODEL = 'gpt-3.5-turbo';

const askGPT = async (prompt: string): Promise<string> => {
  if (!configuration.apiKey) {
    throw new Error(
      'OpenAI API key not configured, please follow instructions in README.md'
    );
  }

  try {
    logger.info(`💬 Open AI prompt: ${prompt}`);
    // https://www.npmjs.com/package/exponential-backoff
    const completion = await backOff(() => openAiAPICall(prompt), {
      retry: (e: unknown, attemptNumber: number) => {
        logger.warn(
          `Open AI call failed attempt #${attemptNumber}, retrying...`
        );

        // to continue retrying, must return true
        return true;
      },
    });

    const firstChoice = completion.data.choices[0].message?.content as string;
    logger.info(`🗣️ Response: ${firstChoice}`);
    return firstChoice;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(error.response?.status, error.response?.data);
    } else {
      console.error(
        `Error with OpenAI API request: ${(error as Error).message}`
      );
    }

    throw new Error('Error with OpenAI API request');
  }
};

const openAiAPICall = async (prompt: string) => {
  return await openai.createChatCompletion({
    model: OPEN_AI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });
};

export default askGPT;
