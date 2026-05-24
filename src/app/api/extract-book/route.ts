import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * Look up book details from ISBN using OpenLibrary + Google Books
 */
async function lookupByISBN(isbn: string) {
  if (!isbn) return null;

  // Clean ISBN - remove dashes and spaces
  const cleanISBN = isbn.replace(/[-\s]/g, '');

  // Try OpenLibrary
  try {
    const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`);
    const olData = await olRes.json();
    const key = `ISBN:${cleanISBN}`;
    if (olData[key]) {
      const info = olData[key];
      return {
        title: info.title || '',
        author: info.authors?.[0]?.name || '',
        isbn: cleanISBN,
        coverUrl: info.cover?.large || info.cover?.medium || '',
      };
    }
  } catch (e) {
    console.warn('OpenLibrary lookup failed:', e);
  }

  // Try Google Books
  try {
    const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}`);
    const gbData = await gbRes.json();
    if (gbData.totalItems > 0 && gbData.items?.[0]?.volumeInfo) {
      const vol = gbData.items[0].volumeInfo;
      return {
        title: vol.title || '',
        author: vol.authors?.[0] || '',
        isbn: cleanISBN,
        coverUrl: vol.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      };
    }
  } catch (e) {
    console.warn('Google Books lookup failed:', e);
  }

  return null;
}

/**
 * Look up book by title + author using Google Books
 */
async function lookupByTitle(title: string, author: string) {
  if (!title) return null;

  try {
    const query = encodeURIComponent(`${title} ${author}`.trim());
    const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
    const gbData = await gbRes.json();
    if (gbData.totalItems > 0 && gbData.items?.[0]?.volumeInfo) {
      const vol = gbData.items[0].volumeInfo;
      const isbn13 = vol.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || '';
      const isbn10 = vol.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier || '';
      return {
        title: vol.title || title,
        author: vol.authors?.[0] || author,
        isbn: isbn13 || isbn10 || '',
        coverUrl: vol.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      };
    }
  } catch (e) {
    console.warn('Google Books title lookup failed:', e);
  }

  return null;
}

/**
 * POST /api/extract-book — Extract book info from a cover photo using AI Vision
 * Then enriches the data by looking up the book in online databases
 */
export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured.' }, { status: 500 });
    }

    // Step 1: AI Vision extracts what it can see
    const { text } = await generateText({
      model: groq('llama-3.2-11b-vision-preview'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image },
            {
              type: 'text',
              text: `Look at this book cover image carefully. Extract ALL visible text information.
Return ONLY a JSON object with these fields:
- "title": the main book title you can read on the cover
- "author": the author name visible on the cover
- "isbn": any ISBN/barcode number visible (usually on the back cover)

Read the largest/most prominent text for the title. The author is usually in smaller text above or below the title.
If you cannot read a field clearly, use empty string "".
Return ONLY valid JSON, no explanation.

Example: {"title": "Atomic Habits", "author": "James Clear", "isbn": "9780735211292"}`,
            },
          ],
        },
      ],
    });

    // Parse AI response
    let aiResult = { title: '', author: '', isbn: '' };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiResult = {
          title: (parsed.title || '').trim(),
          author: (parsed.author || '').trim(),
          isbn: (parsed.isbn || '').replace(/[-\s]/g, '').trim(),
        };
      }
    } catch (parseErr) {
      console.error('Failed to parse AI response:', text, parseErr);
    }

    console.log('AI Vision extracted:', aiResult);

    // Step 2: Enrich with database lookups
    let finalResult = { ...aiResult, coverUrl: '' };

    // If we got an ISBN, look it up for accurate title/author
    if (aiResult.isbn && aiResult.isbn.length >= 10) {
      const dbResult = await lookupByISBN(aiResult.isbn);
      if (dbResult) {
        finalResult = {
          title: dbResult.title || aiResult.title,
          author: dbResult.author || aiResult.author,
          isbn: dbResult.isbn || aiResult.isbn,
          coverUrl: dbResult.coverUrl || '',
        };
        console.log('Enriched via ISBN lookup:', finalResult);
        return NextResponse.json(finalResult);
      }
    }

    // If we got a title, look it up for ISBN and cover
    if (aiResult.title) {
      const dbResult = await lookupByTitle(aiResult.title, aiResult.author);
      if (dbResult) {
        finalResult = {
          title: dbResult.title || aiResult.title,
          author: dbResult.author || aiResult.author,
          isbn: dbResult.isbn || aiResult.isbn,
          coverUrl: dbResult.coverUrl || '',
        };
        console.log('Enriched via title lookup:', finalResult);
      }
    }

    return NextResponse.json(finalResult);
  } catch (err: any) {
    console.error('Extract book API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to analyze image.' },
      { status: 500 }
    );
  }
}
