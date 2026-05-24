import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * Ask AI to identify a book by its ISBN number
 */
async function identifyBookByISBN(isbn: string) {
  if (!isbn || isbn.length < 8) return null;
  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `What book has the ISBN ${isbn}? Return ONLY a JSON object with "title" and "author" fields. If you don't know, return {"title":"","author":""}. No explanation, just JSON.`,
    });
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.title) return { title: parsed.title, author: parsed.author || '' };
    }
  } catch (e) {
    console.warn('AI ISBN identification failed:', e);
  }
  return null;
}

/**
 * Search Google Books (works with ISBN, title, author, or any text)
 */
async function searchGoogleBooks(query: string) {
  if (!query || query.trim().length < 3) return null;
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=1`);
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
    console.warn('Google Books search failed for:', query, e);
  }
  return null;
}

/**
 * Search OpenLibrary by ISBN
 */
async function searchOpenLibrary(isbn: string) {
  if (!isbn) return null;
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    const data = await res.json();
    const key = `ISBN:${isbn}`;
    if (data[key]) {
      const info = data[key];
      return {
        title: info.title || '',
        author: info.authors?.[0]?.name || '',
        isbn,
        coverUrl: info.cover?.large || info.cover?.medium || '',
      };
    }
  } catch (e) {
    console.warn('OpenLibrary lookup failed:', e);
  }
  return null;
}

/**
 * POST /api/extract-book — Extract book info from a cover photo
 * Uses AI Vision + multiple database lookups + AI knowledge
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

    // ============================================================
    // Step 1: AI Vision — extract ALL text from the book cover
    // ============================================================
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
                text: `READ all text on this book cover image. Return JSON with:
{"title":"BOOK TITLE HERE","author":"AUTHOR NAME HERE","isbn":"ISBN IF VISIBLE","allText":"ALL OTHER TEXT"}
Rules:
- title = the BIGGEST text on the cover
- author = the person's name (usually smaller, above or below title)
- isbn = 10 or 13 digit number (often near barcode)
- allText = everything else you can read
Return ONLY JSON.`,
              },
            ],
          },
        ],
      });

      try {
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
      } catch (parseErr) {
        console.error('Failed to parse AI vision response:', text);
      }
    } catch (visionErr) {
      console.error('Vision model failed, trying 11b fallback:', visionErr);
      // Fallback to smaller model
      try {
        const { text } = await generateText({
          model: groq('llama-3.2-11b-vision-preview'),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', image },
                {
                  type: 'text',
                  text: `Read this book cover. Return JSON: {"title":"","author":"","isbn":"","allText":""}`,
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
      } catch (fallbackErr) {
        console.error('Both vision models failed:', fallbackErr);
      }
    }

    console.log('AI Vision extracted:', JSON.stringify(aiResult));

    // ============================================================
    // Step 2: Database lookups — try every strategy to find the book
    // ============================================================
    let result = { title: '', author: '', isbn: '', coverUrl: '' };

    const cleanISBN = aiResult.isbn.replace(/[^0-9X]/gi, '');

    // Strategy A: OpenLibrary exact ISBN match
    if (cleanISBN.length >= 10) {
      const ol = await searchOpenLibrary(cleanISBN);
      if (ol?.title) {
        result = ol;
        console.log('✅ Found via OpenLibrary ISBN:', result.title);
        return NextResponse.json(result);
      }
    }

    // Strategy B: Google Books ISBN search (exact)
    if (cleanISBN.length >= 10) {
      const gb = await searchGoogleBooks(`isbn:${cleanISBN}`);
      if (gb?.title) {
        result = { ...gb, isbn: gb.isbn || cleanISBN };
        console.log('✅ Found via Google Books ISBN:', result.title);
        return NextResponse.json(result);
      }
    }

    // Strategy C: Google Books fuzzy search with ISBN number
    if (cleanISBN.length >= 8) {
      const gb = await searchGoogleBooks(cleanISBN);
      if (gb?.title) {
        result = { ...gb, isbn: gb.isbn || cleanISBN };
        console.log('✅ Found via Google Books fuzzy ISBN:', result.title);
        return NextResponse.json(result);
      }
    }

    // Strategy D: Ask AI "What book has this ISBN?"
    if (cleanISBN.length >= 10) {
      const aiBook = await identifyBookByISBN(cleanISBN);
      if (aiBook?.title) {
        // Verify with Google Books
        const gb = await searchGoogleBooks(`${aiBook.title} ${aiBook.author}`);
        result = {
          title: aiBook.title,
          author: aiBook.author,
          isbn: gb?.isbn || cleanISBN,
          coverUrl: gb?.coverUrl || '',
        };
        console.log('✅ Found via AI ISBN knowledge:', result.title);
        return NextResponse.json(result);
      }
    }

    // Strategy E: Google Books search with AI-extracted title
    if (aiResult.title && aiResult.title.length > 1) {
      const searchQ = `${aiResult.title} ${aiResult.author}`.trim();
      const gb = await searchGoogleBooks(searchQ);
      if (gb?.title) {
        result = { ...gb, isbn: gb.isbn || cleanISBN };
        console.log('✅ Found via title search:', result.title);
        return NextResponse.json(result);
      }
    }

    // Strategy F: Search using ALL visible text from cover
    if (aiResult.allText && aiResult.allText.length > 3) {
      const gb = await searchGoogleBooks(aiResult.allText);
      if (gb?.title) {
        result = { ...gb, isbn: gb.isbn || cleanISBN };
        console.log('✅ Found via allText search:', result.title);
        return NextResponse.json(result);
      }
    }

    // Strategy G: If we have ANY text at all, combine everything and search
    const allSearchText = [aiResult.title, aiResult.author, aiResult.allText]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (allSearchText.length > 3) {
      const gb = await searchGoogleBooks(allSearchText);
      if (gb?.title) {
        result = { ...gb, isbn: gb.isbn || cleanISBN };
        console.log('✅ Found via combined text search:', result.title);
        return NextResponse.json(result);
      }
    }

    // Return whatever we have (may be partial — client will show manual form)
    result = {
      title: aiResult.title,
      author: aiResult.author,
      isbn: cleanISBN,
      coverUrl: '',
    };
    console.log('⚠️ Returning partial result:', result);
    return NextResponse.json(result);

  } catch (err: any) {
    console.error('Extract book API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to analyze image.' },
      { status: 500 }
    );
  }
}
