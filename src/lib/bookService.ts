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
 * Fetch recently added books
 */
export async function getRecentBooks(limit = 10): Promise<Book[]> {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('added_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error fetching recent books:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching recent books:', err);
    return [];
  }
}

/**
 * Fetch library statistics
 */
export async function getLibraryStats() {
  try {
    // 1. Total Books
    const { count: totalBooks, error: totalError } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true });

    // 2. Books Read
    const { count: booksRead, error: readError } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Read');

    // Return safely even if it fails
    return {
      totalBooks: totalBooks || 0,
      booksRead: booksRead || 0,
      duplicateAlerts: 0, // This could be tracked if we add a table for scan logs
      readingTimeHours: Math.round((booksRead || 0) * 5.5), // Mock estimation for demo
    };
  } catch (err) {
    console.error('Error fetching stats:', err);
    return {
      totalBooks: 0,
      booksRead: 0,
      duplicateAlerts: 0,
      readingTimeHours: 0,
    };
  }
}

/**
 * Check if an ISBN already exists in the library
 */
export async function checkIfDuplicate(isbn: string): Promise<boolean> {
  if (!isbn) return false;
  
  try {
    const { data, error } = await supabase
      .from('books')
      .select('id')
      .eq('isbn', isbn)
      .limit(1);

    if (error) {
      console.error('Error checking duplicate:', error.message);
      return false;
    }
    
    return data && data.length > 0;
  } catch (err) {
    console.error('Error checking duplicate:', err);
    return false;
  }
}

/**
 * Add a new book to the library
 */
export async function addBook(book: BookInsert): Promise<Book | null> {
  try {
    const { data, error } = await supabase
      .from('books')
      .insert([book])
      .select()
      .single();

    if (error) {
      console.error('Error adding book:', error.message);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Error adding book:', err);
    throw err;
  }
}

/**
 * Search and filter books in the library
 */
export async function searchBooks(query: string, statusFilter?: string): Promise<Book[]> {
  try {
    let q = supabase
      .from('books')
      .select('*');

    if (query) {
      // Simple text search across title, author, and isbn
      q = q.or(`title.ilike.%${query}%,author.ilike.%${query}%,isbn.ilike.%${query}%`);
    }

    if (statusFilter && statusFilter !== 'All') {
      q = q.eq('status', statusFilter);
    }

    const { data, error } = await q.order('added_at', { ascending: false });

    if (error) {
      console.error('Error searching books:', error.message);
      return [];
    }
    return data || [];
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
