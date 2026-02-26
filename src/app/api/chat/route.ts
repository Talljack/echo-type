import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

const SYSTEM_PROMPT = `You are a friendly and patient English tutor. Your role is to:
- Help students improve their English skills
- Correct grammar mistakes gently and explain why
- Suggest better word choices and expressions
- Answer questions about English grammar, vocabulary, and pronunciation
- Respond primarily in English, but use Chinese (中文) for complex explanations if the student seems to need it
- Keep responses concise and focused on learning
- Encourage the student and celebrate their progress`;

export async function POST(req: Request) {
  const { messages, provider = 'openai', context } = await req.json();

  let contextNote = '';
  if (context?.module && context.module !== 'general') {
    contextNote = `\n\nThe student is currently in the "${context.module}" module`;
    if (context.contentTitle) {
      contextNote += `, practicing: "${context.contentTitle}"`;
    }
    contextNote += '. Tailor your responses to help with their current practice.';
  }

  const systemPrompt = SYSTEM_PROMPT + contextNote;

  let model;
  switch (provider) {
    case 'claude':
      model = anthropic('claude-sonnet-4-20250514');
      break;
    case 'openai':
    default:
      model = openai('gpt-4o');
      break;
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
