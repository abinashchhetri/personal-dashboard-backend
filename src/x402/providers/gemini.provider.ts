import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const geminiClientFactory = (configService: ConfigService) => {
  const apiKey = configService.get<string>('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY not configured. Set it in .env for plan generation.',
    );
  }
  return new GoogleGenerativeAI(apiKey);
};
