import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * Search OpenLibrary (FREE, no API key, no rate limit)
 */
async function searchOpenLibrary(query: string, type: 'isbn' | 'text') {
  try {
    let url: string;
    if (type === 'isbn') {
      // Search by ISBN
      url = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(query)}&limit=1&fields=title,author_name,isbn,cover_i`;
    } else {
      // General text search
      url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1&fields=title,author_name,isbn,cover_i`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.numFound > 0 && data.docs?.[0]) {
      const doc = data.docs[0];
      const coverId = doc.cover_i;
      return {
        title: doc.title || '',
        author: doc.author_name?.[0] || '',
        isbn: doc.isbn?.[0] || '',
        coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '',
      };
    }
  } catch (e) {
    console.warn('OpenLibrary search failed:', e);
  }
  return null;
}

/**
 * Try Google Books as secondary (may hit rate limits without API key)
 */
async function searchGoogleBooks(query: string) {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`);
    const data = await res.json();
    if (data.totalItems > 0 && data.items?.[0]?.volumeInfo) {
      const vol = data.items[0].volumeInfo;
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
    console.warn('Google Books failed (likely rate limited):', e);
  }
  return null;
}

/**
 * POST /api/extract-book — Extract book info from a cover photo
 * Uses AI Vision + OpenLibrary (free, unlimited) + Google Books (backup)
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

    // Step 1: AI Vision — extract text from cover
    let aiResult = { title: '', author: '', isbn: '', allText: '' };

    try {
      const { text } = await generateText({
        model: groq('llama-3.2-90b-vision-preview'),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', image },
              {
                type: 'text',
                text: `Read this book cover. Return ONLY JSON: {"title":"BOOK TITLE","author":"AUTHOR NAME","isbn":"ISBN NUMBER","allText":"OTHER TEXT"}
The title is the BIGGEST text. The author is usually smaller. ISBN is 10-13 digits near barcode.
If a field is not visible, use "". Return ONLY the JSON object, nothing else.`,
              },
            ],
          },
        ],
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiResult = {
          title: String(parsed.title || '').trim(),
          author: String(parsed.author || '').trim(),
          isbn: String(parsed.isbn || '').replace(/[-\s]/g, '').trim(),
          allText: String(parsed.allText || '').trim(),
        };
      }
    } catch (visionErr: any) {
      console.error('90B vision failed, trying 11B:', visionErr.message);
      try {
        const { text } = await generateText({
          model: groq('llama-3.2-11b-vision-preview'),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', image },
                { type: 'text', text: `Read this book cover. Return JSON: {"title":"","author":"","isbn":"","allText":""}` },
              ],
            },
          ],
        });
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiResult = {
            title: String(parsed.title || '').trim(),
            author: String(parsed.author || '').trim(),
            isbn: String(parsed.isbn || '').replace(/[-\s]/g, '').trim(),
            allText: String(parsed.allText || '').trim(),
          };
        }
      } catch (e) {
        console.error('Both vision models failed');
      }
    }

    console.log('AI extracted:', JSON.stringify(aiResult));

    const cleanISBN = aiResult.isbn.replace(/[^0-9X]/gi, '');

    // Step 2: Run OpenLibrary lookups IN PARALLEL (free, no rate limit!)
    const lookupPromises: Promise<any>[] = [];

    // Search by ISBN on OpenLibrary
    if (cleanISBN.length >= 8) {
      lookupPromises.push(searchOpenLibrary(cleanISBN, 'isbn'));
    }
    // Search by title on OpenLibrary
    if (aiResult.title) {
      lookupPromises.push(searchOpenLibrary(`${aiResult.title} ${aiResult.author}`.trim(), 'text'));
    }
    // Search by allText on OpenLibrary
    if (aiResult.allText && aiResult.allText.length > 3) {
      lookupPromises.push(searchOpenLibrary(aiResult.allText, 'text'));
    }
    // Also try Google Books as backup (may fail due to rate limit)
    if (cleanISBN.length >= 8) {
      lookupPromises.push(searchGoogleBooks(cleanISBN));
    }

    let result = { title: aiResult.title, author: aiResult.author, isbn: cleanISBN, coverUrl: '' };

    if (lookupPromises.length > 0) {
      const results = await Promise.all(lookupPromises);

      for (const found of results) {
        if (found?.title) {
          result = {
            title: found.title,
            author: found.author || aiResult.author || '',
            isbn: found.isbn || cleanISBN,
            coverUrl: found.coverUrl || '',
          };
          console.log('✅ Found book:', result.title, 'by', result.author);
          break;
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Extract book API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to analyze image.' },
      { status: 500 }
    );
  }
}
