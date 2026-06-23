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
 * Helper to handle non-ok fetch responses and throw structured error
 */
async function handleFetchError(res: Response, defaultMsg: string) {
  let errMsg = defaultMsg;
  let isPaused = false;
  try {
    const json = await res.json();
    errMsg = json.error || errMsg;
    isPaused = json.isPaused || false;
  } catch (_) {}
  const error: any = new Error(errMsg);
  error.isPaused = isPaused;
  throw error;
}

/**
 * Fetch recently added books via server API
 */
export async function getRecentBooks(limit = 10): Promise<Book[]> {
  try {
    const res = await fetch(`/api/books?limit=${limit}`);
    if (!res.ok) {
      await handleFetchError(res, 'Failed to fetch recent books');
    }
    const json = await res.json();
    return json.books || [];
  } catch (err) {
    console.error('Error fetching recent books:', err);
    throw err;
  }
}

/**
 * Fetch library statistics via server API
 */
export async function getLibraryStats() {
  try {
    const res = await fetch('/api/books?limit=500');
    if (!res.ok) {
      await handleFetchError(res, 'Failed to fetch library stats');
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
    throw err;
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
      await handleFetchError(res, 'Failed to search books');
    }
    const json = await res.json();
    return json.books || [];
  } catch (err) {
    console.error('Error in searchBooks:', err);
    throw err;
  }
}


/**
 * Update a book's metadata (e.g., status, shelf)
 */
export async function updateBook(id: string, updates: Partial<BookInsert>): Promise<Book | null> {
  try {
    const res = await fetch('/api/books', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!res.ok) {
      const json = await res.json();
      console.error('Error updating book:', json.error);
      return null;
    }
    const json = await res.json();
    return json.book;
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
    const res = await fetch(`/api/books?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const json = await res.json();
      console.error('Error deleting book:', json.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in deleteBook:', err);
    return false;
  }
}


