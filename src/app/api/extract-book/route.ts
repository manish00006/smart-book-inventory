import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * POST /api/extract-book — Extract book info from a cover photo using AI Vision
 * Accepts JSON with a base64 image data URL
 * Returns extracted title, author, and ISBN
 */
export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided.' },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured.' },
        { status: 500 }
      );
    }

    const { text } = await generateText({
      model: groq('llama-3.2-11b-vision-preview'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: image,
            },
            {
              type: 'text',
              text: `Analyze this book cover image and extract the following information.
Return ONLY a valid JSON object with these fields:
- "title": the book title (string)
- "author": the author name (string)  
- "isbn": the ISBN number if visible (string, or empty string if not visible)

If you cannot determine a field, use an empty string.
Do NOT include any explanation or markdown formatting. Return ONLY the JSON object.

Example response: {"title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "isbn": "9780743273565"}`,
            },
          ],
        },
      ],
    });

    // Parse the AI response
    let extracted = { title: '', author: '', isbn: '' };
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        extracted = {
          title: parsed.title || '',
          author: parsed.author || '',
          isbn: parsed.isbn || '',
        };
      }
    } catch (parseErr) {
      console.error('Failed to parse AI response:', text, parseErr);
    }

    return NextResponse.json(extracted);
  } catch (err: any) {
    console.error('Extract book API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to analyze image.' },
      { status: 500 }
    );
  }
}
