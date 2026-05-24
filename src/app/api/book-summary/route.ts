import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * POST /api/book-summary — Get an AI-generated brief summary of a book
 */
export async function POST(request: NextRequest) {
  try {
    const { title, author } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Book title is required.' },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured.' },
        { status: 500 }
      );
    }

    const prompt = `Give me a concise, engaging 3-4 sentence summary of the book "${title}"${author ? ` by ${author}` : ''}. 
Include what the book is about, its key themes, and why someone might want to read it. 
Keep it under 80 words. Do NOT include the title or author name in your response — just the summary itself. Do not use any markdown formatting.`;

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
    });

    return NextResponse.json({ summary: text.trim() });
  } catch (err: any) {
    console.error('Book summary API error:', err);
    
    // Fallback: try Google Books description
    try {
      const { title, author } = await request.clone().json();
      const query = encodeURIComponent(`${title} ${author || ''}`);
      const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
      const gbData = await gbRes.json();
      
      if (gbData.items?.[0]?.volumeInfo?.description) {
        const desc = gbData.items[0].volumeInfo.description;
        // Strip HTML tags and truncate
        const cleanDesc = desc.replace(/<[^>]*>/g, '').slice(0, 300);
        return NextResponse.json({ summary: cleanDesc + (desc.length > 300 ? '...' : '') });
      }
    } catch (fallbackErr) {
      console.error('Fallback summary also failed:', fallbackErr);
    }

    return NextResponse.json(
      { error: 'Unable to generate summary right now.' },
      { status: 500 }
    );
  }
}
