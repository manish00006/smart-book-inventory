import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(JSON.stringify({ error: "Please add your Google Gemini API Key in the Vercel Dashboard to enable the AI Assistant." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const result = streamText({
      model: google('gemini-1.5-flash'),
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
