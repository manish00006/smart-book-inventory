import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * POST /api/extract-book — Extract book info from a cover photo using AI Vision
 * Focused: just extract text, then do ONE fast lookup. Client handles fallbacks.
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

    // Step 2: Quick parallel lookups (only if we have something to search)
    const cleanISBN = aiResult.isbn.replace(/[^0-9X]/gi, '');
    let result = { title: aiResult.title, author: aiResult.author, isbn: cleanISBN, coverUrl: '' };

    // Run Google Books lookups in parallel to save time
    const lookupPromises: Promise<any>[] = [];

    if (cleanISBN.length >= 8) {
      // ISBN exact + fuzzy
      lookupPromises.push(
        fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}&maxResults=1`)
          .then(r => r.json()).catch(() => null)
      );
      lookupPromises.push(
        fetch(`https://www.googleapis.com/books/v1/volumes?q=${cleanISBN}&maxResults=1`)
          .then(r => r.json()).catch(() => null)
      );
    }

    if (aiResult.title) {
      const q = encodeURIComponent(`${aiResult.title} ${aiResult.author}`.trim());
      lookupPromises.push(
        fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`)
          .then(r => r.json()).catch(() => null)
      );
    }

    if (lookupPromises.length > 0) {
      const results = await Promise.all(lookupPromises);
      
      for (const data of results) {
        if (data?.totalItems > 0 && data?.items?.[0]?.volumeInfo) {
          const vol = data.items[0].volumeInfo;
          if (vol.title) {
            const isbn13 = vol.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || '';
            const isbn10 = vol.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier || '';
            result = {
              title: vol.title,
              author: vol.authors?.[0] || aiResult.author || '',
              isbn: isbn13 || isbn10 || cleanISBN,
              coverUrl: vol.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
            };
            console.log('✅ Found book:', result.title, 'by', result.author);
            break;
          }
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
