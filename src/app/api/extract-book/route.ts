import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * Look up book by ISBN (tries exact + fuzzy Google Books search)
 */
async function lookupByISBN(isbn: string) {
  if (!isbn) return null;
  const cleanISBN = isbn.replace(/[-\s]/g, '');

  // Try OpenLibrary with exact ISBN
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

  // Try Google Books with exact ISBN
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
    console.warn('Google Books ISBN lookup failed:', e);
  }

  // Try Google Books with ISBN as general search (handles partial ISBNs)
  try {
    const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${cleanISBN}`);
    const gbData = await gbRes.json();
    if (gbData.totalItems > 0 && gbData.items?.[0]?.volumeInfo) {
      const vol = gbData.items[0].volumeInfo;
      const isbn13 = vol.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || '';
      const isbn10 = vol.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier || '';
      return {
        title: vol.title || '',
        author: vol.authors?.[0] || '',
        isbn: isbn13 || isbn10 || cleanISBN,
        coverUrl: vol.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      };
    }
  } catch (e) {
    console.warn('Google Books fuzzy ISBN search failed:', e);
  }

  return null;
}

/**
 * Look up book by title/author/any text using Google Books
 */
async function lookupByText(searchText: string) {
  if (!searchText || searchText.trim().length < 2) return null;

  try {
    const query = encodeURIComponent(searchText.trim());
    const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
    const gbData = await gbRes.json();
    if (gbData.totalItems > 0 && gbData.items?.[0]?.volumeInfo) {
      const vol = gbData.items[0].volumeInfo;
      const isbn13 = vol.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || '';
      const isbn10 = vol.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier || '';
      return {
        title: vol.title || '',
        author: vol.authors?.[0] || '',
        isbn: isbn13 || isbn10 || '',
        coverUrl: vol.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      };
    }
  } catch (e) {
    console.warn('Google Books text search failed:', e);
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

    // Step 1: AI Vision extracts ALL visible text
    const { text } = await generateText({
      model: groq('llama-3.2-11b-vision-preview'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image },
            {
              type: 'text',
              text: `You are a book cover reader. Analyze this book cover image very carefully.

IMPORTANT: The book may be in ANY language (Hindi, Marathi, English, etc). Read ALL visible text.

Extract:
1. "title" — the MAIN title of the book (the largest/most prominent text). If in Hindi/Devanagari, also provide the English transliteration.
2. "author" — the author name (usually smaller text, above or below the title)
3. "isbn" — any ISBN number (13 digits starting with 978 or 979, or 10 digits). Usually on the back cover near barcode.
4. "allText" — ALL other text you can read on the cover (subtitle, publisher, etc)

Return ONLY a valid JSON object. Example:
{"title": "Choices", "author": "Ankur Gokhale", "isbn": "9788174348722", "allText": "A novel about life decisions"}

If text is in Hindi/regional language, STILL extract it. For title, give BOTH the original and English translation if possible:
{"title": "चोईस (Choices)", "author": "अंकुर गोखले", "isbn": "9788174348722", "allText": ""}`,
            },
          ],
        },
      ],
    });

    // Parse AI response
    let aiResult = { title: '', author: '', isbn: '', allText: '' };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiResult = {
          title: (parsed.title || '').trim(),
          author: (parsed.author || '').trim(),
          isbn: (parsed.isbn || '').replace(/[-\s]/g, '').trim(),
          allText: (parsed.allText || '').trim(),
        };
      }
    } catch (parseErr) {
      console.error('Failed to parse AI response:', text, parseErr);
    }

    console.log('AI Vision extracted:', aiResult);

    // Step 2: Enrich with database lookups (try multiple strategies)
    let finalResult = { title: aiResult.title, author: aiResult.author, isbn: aiResult.isbn, coverUrl: '' };
    let enriched = false;

    // Strategy 1: Look up by ISBN (handles partial ISBNs too)
    if (aiResult.isbn && aiResult.isbn.length >= 8) {
      const dbResult = await lookupByISBN(aiResult.isbn);
      if (dbResult && dbResult.title) {
        finalResult = {
          title: dbResult.title,
          author: dbResult.author || aiResult.author,
          isbn: dbResult.isbn || aiResult.isbn,
          coverUrl: dbResult.coverUrl || '',
        };
        enriched = true;
        console.log('Enriched via ISBN lookup:', finalResult);
      }
    }

    // Strategy 2: Look up by title (if we have one from AI but no ISBN match)
    if (!enriched && aiResult.title) {
      const searchQuery = `${aiResult.title} ${aiResult.author}`.trim();
      const dbResult = await lookupByText(searchQuery);
      if (dbResult && dbResult.title) {
        finalResult = {
          title: dbResult.title || aiResult.title,
          author: dbResult.author || aiResult.author,
          isbn: dbResult.isbn || aiResult.isbn,
          coverUrl: dbResult.coverUrl || '',
        };
        enriched = true;
        console.log('Enriched via title search:', finalResult);
      }
    }

    // Strategy 3: Search using ALL visible text from the cover
    if (!enriched && aiResult.allText) {
      const dbResult = await lookupByText(aiResult.allText);
      if (dbResult && dbResult.title) {
        finalResult = {
          title: dbResult.title || aiResult.title,
          author: dbResult.author || aiResult.author,
          isbn: dbResult.isbn || aiResult.isbn,
          coverUrl: dbResult.coverUrl || '',
        };
        enriched = true;
        console.log('Enriched via allText search:', finalResult);
      }
    }

    // Strategy 4: If we have author but no title match yet, search by author name
    if (!enriched && aiResult.author && aiResult.author.length > 2) {
      const dbResult = await lookupByText(aiResult.author);
      if (dbResult && dbResult.title) {
        finalResult = {
          title: dbResult.title,
          author: dbResult.author || aiResult.author,
          isbn: dbResult.isbn || aiResult.isbn,
          coverUrl: dbResult.coverUrl || '',
        };
        console.log('Enriched via author search:', finalResult);
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
