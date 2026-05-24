import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * Search OpenLibrary with flexible query
 */
async function searchOpenLibrary(query: string, type: 'isbn' | 'title' | 'q') {
  try {
    const encoded = encodeURIComponent(query.trim());
    let url: string;
    if (type === 'isbn') {
      url = `https://openlibrary.org/search.json?isbn=${encoded}&limit=1&fields=title,author_name,isbn,cover_i`;
    } else if (type === 'title') {
      url = `https://openlibrary.org/search.json?title=${encoded}&limit=1&fields=title,author_name,isbn,cover_i`;
    } else {
      url = `https://openlibrary.org/search.json?q=${encoded}&limit=1&fields=title,author_name,isbn,cover_i`;
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

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    if (!image) return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: 'AI not configured.' }, { status: 500 });

    // ============================================
    // Step 1: AI Vision — read EVERYTHING on cover
    // ============================================
    let aiResult = { title: '', author: '', isbn: '', subtitle: '', publisher: '', keywords: '' };

    const visionPrompt = `You are an expert at reading book covers. Look at this image VERY carefully.

Extract ALL text you can see. Return a JSON object:
{
  "title": "the main/biggest title text on the cover",
  "author": "the author name",
  "isbn": "any ISBN number (10-13 digits, usually near barcode)",
  "subtitle": "any subtitle or tagline text",
  "publisher": "publisher name if visible",
  "keywords": "list 3-5 key words from ALL visible text, separated by spaces"
}

IMPORTANT:
- The TITLE is always the LARGEST/BOLDEST text
- Read every word you can see, even small text
- For "keywords", pick the most unique/searchable words from the cover
- Return ONLY the JSON, no other text`;

    try {
      const { text } = await generateText({
        model: groq('llama-3.2-90b-vision-preview'),
        messages: [{ role: 'user', content: [{ type: 'image', image }, { type: 'text', text: visionPrompt }] }],
      });
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const p = JSON.parse(m[0]);
        aiResult = {
          title: String(p.title || '').trim(),
          author: String(p.author || '').trim(),
          isbn: String(p.isbn || '').replace(/[-\s]/g, '').trim(),
          subtitle: String(p.subtitle || '').trim(),
          publisher: String(p.publisher || '').trim(),
          keywords: String(p.keywords || '').trim(),
        };
      }
    } catch (e: any) {
      console.warn('90B vision failed, trying 11B:', e.message);
      try {
        const { text } = await generateText({
          model: groq('llama-3.2-11b-vision-preview'),
          messages: [{ role: 'user', content: [{ type: 'image', image }, { type: 'text', text: visionPrompt }] }],
        });
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          const p = JSON.parse(m[0]);
          aiResult = {
            title: String(p.title || '').trim(),
            author: String(p.author || '').trim(),
            isbn: String(p.isbn || '').replace(/[-\s]/g, '').trim(),
            subtitle: String(p.subtitle || '').trim(),
            publisher: String(p.publisher || '').trim(),
            keywords: String(p.keywords || '').trim(),
          };
        }
      } catch (e2) {
        console.error('Both vision models failed');
      }
    }

    console.log('AI Vision result:', JSON.stringify(aiResult));

    // ============================================
    // Step 2: Search OpenLibrary with MULTIPLE strategies in PARALLEL
    // ============================================
    const searches: Promise<any>[] = [];
    const cleanISBN = aiResult.isbn.replace(/[^0-9X]/gi, '');

    // S1: ISBN lookup
    if (cleanISBN.length >= 8) {
      searches.push(searchOpenLibrary(cleanISBN, 'isbn'));
    }

    // S2: Title search
    if (aiResult.title) {
      searches.push(searchOpenLibrary(aiResult.title, 'title'));
    }

    // S3: Title + Author combined search
    if (aiResult.title && aiResult.author) {
      searches.push(searchOpenLibrary(`${aiResult.title} ${aiResult.author}`, 'q'));
    }

    // S4: Subtitle search (often more unique than title)
    if (aiResult.subtitle && aiResult.subtitle.length > 5) {
      searches.push(searchOpenLibrary(aiResult.subtitle, 'q'));
    }

    // S5: Keywords search
    if (aiResult.keywords && aiResult.keywords.length > 5) {
      searches.push(searchOpenLibrary(aiResult.keywords, 'q'));
    }

    // S6: Title + subtitle combined
    if (aiResult.title && aiResult.subtitle) {
      searches.push(searchOpenLibrary(`${aiResult.title} ${aiResult.subtitle}`, 'q'));
    }

    let result = { title: aiResult.title, author: aiResult.author, isbn: cleanISBN, coverUrl: '' };

    if (searches.length > 0) {
      const results = await Promise.all(searches);
      for (const found of results) {
        if (found?.title) {
          result = {
            title: found.title,
            author: found.author || aiResult.author,
            isbn: found.isbn || cleanISBN,
            coverUrl: found.coverUrl || '',
          };
          console.log('✅ Found:', result.title, 'by', result.author);
          break;
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Extract book error:', err);
    return NextResponse.json({ error: err.message || 'Failed.' }, { status: 500 });
  }
}
