import { supabase } from './supabase';

export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  cover_url: string | null;
  shelf: string;
  status: string;
  added_at: string;
};

export type BookInsert = Omit<Book, 'id' | 'added_at'>;

/**
 * Fetch recently added books via server API
 */
export async function getRecentBooks(limit = 10): Promise<Book[]> {
  try {
    const res = await fetch(`/api/books?limit=${limit}`);
    if (!res.ok) {
      console.error('API error fetching recent books:', res.statusText);
      return [];
    }
    const json = await res.json();
    return json.books || [];
  } catch (err) {
    console.error('Error fetching recent books:', err);
    return [];
  }
}

/**
 * Fetch library statistics via server API
 */
export async function getLibraryStats() {
  try {
    const res = await fetch('/api/books?limit=500');
    if (!res.ok) {
      return { totalBooks: 0, booksRead: 0, duplicateAlerts: 0, readingTimeHours: 0 };
    }
    const json = await res.json();
    const allBooks = json.books || [];
    const booksRead = allBooks.filter((b: Book) => b.status === 'Read').length;
    return {
      totalBooks: allBooks.length,
      booksRead,
      duplicateAlerts: 0,
      readingTimeHours: Math.round(booksRead * 5.5),
    };
  } catch (err) {
    console.error('Error fetching stats:', err);
    return { totalBooks: 0, booksRead: 0, duplicateAlerts: 0, readingTimeHours: 0 };
  }
}

/**
 * Check if an ISBN already exists in the library
 */
export async function checkIfDuplicate(isbn: string): Promise<boolean> {
  if (!isbn) return false;
  
  try {
    const res = await fetch(`/api/books?isbn=${encodeURIComponent(isbn)}`);
    if (!res.ok) return false;
    const json = await res.json();
    return json.isDuplicate === true;
  } catch (err) {
    console.error('Error checking duplicate by ISBN:', err);
    return false;
  }
}

/**
 * Check if a book title already exists in the library (case-insensitive)
 */
export async function checkIfDuplicateByTitle(title: string): Promise<boolean> {
  if (!title) return false;
  
  try {
    const res = await fetch(`/api/books?dupTitle=${encodeURIComponent(title)}`);
    if (!res.ok) return false;
    const json = await res.json();
    return json.isDuplicate === true;
  } catch (err) {
    console.error('Error checking duplicate by title:', err);
    return false;
  }
}

/**
 * Add a new book to the library
 * Uses server-side API to avoid client-side CORS/RLS "Failed to fetch" errors
 */
export async function addBook(book: BookInsert): Promise<Book | null> {
  try {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || `Server error (${res.status})`);
    }
    
    return json.book;
  } catch (err: any) {
    // If it's a network error, provide a clearer message
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Network error – please check your internet connection and try again.');
    }
    console.error('Error adding book:', err);
    throw err;
  }
}

/**
 * Search and filter books in the library
 */
export async function searchBooks(query: string, statusFilter?: string): Promise<Book[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter);
    params.set('limit', '500');

    const res = await fetch(`/api/books?${params.toString()}`);
    if (!res.ok) {
      console.error('API error searching books:', res.statusText);
      return [];
    }
    const json = await res.json();
    return json.books || [];
  } catch (err) {
    console.error('Error in searchBooks:', err);
    return [];
  }
}

/**
 * Update a book's metadata (e.g., status, shelf)
 */
export async function updateBook(id: string, updates: Partial<BookInsert>): Promise<Book | null> {
  try {
    const { data, error } = await supabase
      .from('books')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating book:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error in updateBook:', err);
    return null;
  }
}

/**
 * Delete a book from the library
 */
export async function deleteBook(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting book:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in deleteBook:', err);
    return false;
  }
}

