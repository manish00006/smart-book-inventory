import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Server-side Supabase client (avoids client-side CORS/RLS issues)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/books — Add a new book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, author, isbn, cover_url, shelf, status } = body;

    if (!title || !author) {
      return NextResponse.json(
        { error: 'Title and author are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('books')
      .insert([{ title, author, isbn, cover_url, shelf, status }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to add book to database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ book: data }, { status: 201 });
  } catch (err: any) {
    console.error('API /books POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

// GET /api/books — Fetch books (with optional search/filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const isbn = searchParams.get('isbn') || '';

    // If isbn param is passed, check for duplicate
    if (isbn) {
      const { data, error } = await supabase
        .from('books')
        .select('id')
        .eq('isbn', isbn)
        .limit(1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ isDuplicate: data && data.length > 0 });
    }

    let q = supabase.from('books').select('*');

    if (query) {
      q = q.or(`title.ilike.%${query}%,author.ilike.%${query}%,isbn.ilike.%${query}%`);
    }

    if (status && status !== 'All') {
      q = q.eq('status', status);
    }

    const { data, error } = await q.order('added_at', { ascending: false }).limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ books: data || [] });
  } catch (err: any) {
    console.error('API /books GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
