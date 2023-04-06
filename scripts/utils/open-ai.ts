import axios from 'axios';
import { Configuration, OpenAIApi } from 'openai';

import logger from '../../src/logger';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY as string,
});

const openai = new OpenAIApi(configuration);

const askGPT = async (prompt: string): Promise<string> => {
  if (!configuration.apiKey) {
    throw new Error(
      'OpenAI API key not configured, please follow instructions in README.md'
    );
  }

  try {
    logger.info(`💬 Open AI prompt: ${prompt}`);
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
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

export default askGPT;
