import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // If OPENAI_API_KEY is missing, return a simulated stream (for demo purposes)
  if (!process.env.OPENAI_API_KEY) {
    // We can't actually stream text easily without the SDK, but we can return a normal response
    // For a real production app, we would throw an error here, but for demo we will just let it fail at the SDK level 
    // or return a mock response. The SDK will throw an error if the key is missing.
    // We will let the SDK handle it.
  }

  try {
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: `You are BookMind AI, a premium personal library curator and intelligence assistant.
      Your goal is to help users maintain their physical book collections, detect duplicates, organize their shelves, and provide insightful recommendations.
      You have deep knowledge of literature across all genres. When asked for recommendations, try to suggest books that complement a sophisticated personal library and encourage the user to add them to their wishlist.
      Be concise, elegant, and professional in your responses. If a user asks about their collection, remind them they can scan barcodes or check their wishlist for tracked price drops.`,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to connect to AI service. Please check your API keys." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
