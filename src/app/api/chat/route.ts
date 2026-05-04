import { groq } from '@ai-sdk/groq';
import { streamText, createUIMessageStreamResponse, convertToModelMessages } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!process.env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "Please add your Groq API Key to enable the AI Assistant." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Convert UIMessages (from useChat) to ModelMessages (for streamText)
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `You are BookMind AI, a premium personal library curator and intelligence assistant.
      Your goal is to help users maintain their physical book collections, detect duplicates, organize their shelves, and provide insightful recommendations.
      You have deep knowledge of literature across all genres. When asked for recommendations, try to suggest books that complement a sophisticated personal library and encourage the user to add them to their wishlist.
      Be concise, elegant, and professional in your responses. If a user asks about their collection, remind them they can scan barcodes or check their wishlist for tracked price drops.`,
      messages: modelMessages,
    });

    return createUIMessageStreamResponse({
      stream: result.toUIMessageStream(),
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to connect to AI service. Please check your API keys." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
