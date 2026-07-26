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

const DEFAULT_SAMPLE_BOOKS: Book[] = [
  {
    id: "sample-1",
    title: "Project Hail Mary",
    author: "Andy Weir",
    isbn: "9780593135204",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
    shelf: "Sci-Fi Favorites",
    status: "Reading",
    added_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "sample-2",
    title: "Dune",
    author: "Frank Herbert",
    isbn: "9780441172719",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg",
    shelf: "Sci-Fi Favorites",
    status: "Read",
    added_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "sample-3",
    title: "Atomic Habits",
    author: "James Clear",
    isbn: "9780735211292",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
    shelf: "Productivity",
    status: "Read",
    added_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: "sample-4",
    title: "The Midnight Library",
    author: "Matt Haig",
    isbn: "9780525559474",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg",
    shelf: "Fiction",
    status: "Read",
    added_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: "sample-5",
    title: "Clean Code: A Handbook of Agile Software Craftsmanship",
    author: "Robert C. Martin",
    isbn: "9780132350884",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg",
    shelf: "Software Dev",
    status: "Partial Read",
    added_at: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: "sample-6",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    isbn: "9780374533557",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg",
    shelf: "Psychology",
    status: "Not Read",
    added_at: new Date(Date.now() - 86400000 * 25).toISOString(),
  },
  {
    id: "sample-7",
    title: "Neuromancer",
    author: "William Gibson",
    isbn: "9780441569595",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780441569595-L.jpg",
    shelf: "Sci-Fi Favorites",
    status: "Read",
    added_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: "sample-8",
    title: "Deep Work: Rules for Focused Success in a Distracted World",
    author: "Cal Newport",
    isbn: "9781455586691",
    cover_url: "https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg",
    shelf: "Productivity",
    status: "Read",
    added_at: new Date(Date.now() - 86400000 * 35).toISOString(),
  },
];

const STORAGE_KEY = "bookmind_library_books";

function getLocalBooks(): Book[] {
  if (typeof window === "undefined") return DEFAULT_SAMPLE_BOOKS;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_BOOKS));
      return DEFAULT_SAMPLE_BOOKS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_SAMPLE_BOOKS;
  }
}

function saveLocalBooks(books: Book[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch {}
}

function filterLocalBooks(books: Book[], query: string, statusFilter?: string): Book[] {
  let filtered = [...books];
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.author.toLowerCase().includes(q) || 
      (b.isbn && b.isbn.toLowerCase().includes(q))
    );
  }
  if (statusFilter && statusFilter !== 'All') {
    const filterVal = statusFilter === 'Unread' ? 'Not Read' : statusFilter;
    filtered = filtered.filter(b => b.status === filterVal || (filterVal === 'Not Read' && b.status === 'Unread'));
  }
  return filtered.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
}

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
    if (json.books && json.books.length > 0) {
      saveLocalBooks(json.books);
      return json.books;
    }
    return getLocalBooks().slice(0, limit);
  } catch (err: any) {
    console.warn('Backend unavailable, serving recent local books.');
    const result = getLocalBooks().slice(0, limit);
    if (err.isPaused) (result as any).isPaused = true;
    return result;
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
    if (allBooks.length > 0) {
      saveLocalBooks(allBooks);
      const booksRead = allBooks.filter((b: Book) => b.status === 'Read').length;
      return {
        totalBooks: allBooks.length,
        booksRead,
        duplicateAlerts: 0,
        readingTimeHours: Math.round(booksRead * 5.5),
      };
    }
    const local = getLocalBooks();
    const booksRead = local.filter((b: Book) => b.status === 'Read').length;
    return {
      totalBooks: local.length,
      booksRead,
      duplicateAlerts: 0,
      readingTimeHours: Math.round(booksRead * 5.5),
    };
  } catch (err: any) {
    console.warn('Backend unavailable, calculating stats from local library.');
    const local = getLocalBooks();
    const booksRead = local.filter((b: Book) => b.status === 'Read').length;
    return {
      totalBooks: local.length,
      booksRead,
      duplicateAlerts: 0,
      readingTimeHours: Math.round(booksRead * 5.5),
    };
  }
}

/**
 * Check if an ISBN already exists in the library
 */
export async function checkIfDuplicate(isbn: string): Promise<boolean> {
  if (!isbn) return false;
  try {
    const res = await fetch(`/api/books?isbn=${encodeURIComponent(isbn)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.isDuplicate) return true;
    }
  } catch (err) {}
  const local = getLocalBooks();
  return local.some(b => b.isbn === isbn);
}

/**
 * Check if a book title already exists in the library (case-insensitive)
 */
export async function checkIfDuplicateByTitle(title: string): Promise<boolean> {
  if (!title) return false;
  try {
    const res = await fetch(`/api/books?dupTitle=${encodeURIComponent(title)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.isDuplicate) return true;
    }
  } catch (err) {}
  const local = getLocalBooks();
  return local.some(b => b.title.toLowerCase() === title.toLowerCase());
}

/**
 * Add a new book to the library
 */
export async function addBook(book: BookInsert): Promise<Book | null> {
  const newId = `local-${Date.now()}`;
  const newBook: Book = {
    ...book,
    id: newId,
    added_at: new Date().toISOString(),
  };
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
    const local = getLocalBooks();
    saveLocalBooks([json.book, ...local]);
    return json.book;
  } catch (err: any) {
    console.warn('Adding book locally due to offline/paused backend:', err.message);
    const local = getLocalBooks();
    saveLocalBooks([newBook, ...local]);
    return newBook;
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
    if (json.books && json.books.length > 0) {
      saveLocalBooks(json.books);
      return json.books;
    }
    const local = getLocalBooks();
    return filterLocalBooks(local, query, statusFilter);
  } catch (err: any) {
    console.warn('Backend unavailable or paused, serving local library:', err.message);
    const local = getLocalBooks();
    const result = filterLocalBooks(local, query, statusFilter);
    if (err.isPaused) {
      (result as any).isPaused = true;
    }
    return result;
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

    if (!res.ok) throw new Error('Update failed');
    const json = await res.json();
    const local = getLocalBooks();
    saveLocalBooks(local.map(b => b.id === id ? { ...b, ...json.book } : b));
    return json.book;
  } catch (err) {
    console.warn('Updating book locally.');
    const local = getLocalBooks();
    let updatedBook: Book | null = null;
    const newLocal = local.map(b => {
      if (b.id === id) {
        updatedBook = { ...b, ...updates };
        return updatedBook;
      }
      return b;
    });
    saveLocalBooks(newLocal);
    return updatedBook;
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
    const local = getLocalBooks();
    saveLocalBooks(local.filter(b => b.id !== id));
    if (!res.ok) throw new Error('Delete failed');
    return true;
  } catch (err) {
    console.warn('Deleting book locally.');
    const local = getLocalBooks();
    saveLocalBooks(local.filter(b => b.id !== id));
    return true;
  }
}


