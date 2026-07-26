import { supabase } from './supabase';

export type WishlistItem = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  cover_url: string | null;
  target_price: number | null;
  current_price: number | null;
  created_at: string;
};

export type WishlistInsert = Omit<WishlistItem, 'id' | 'created_at'>;

const DEFAULT_WISHLIST: WishlistItem[] = [
  {
    id: "wish-1",
    title: "The Pragmatic Programmer",
    author: "David Thomas & Andrew Hunt",
    isbn: "9780135957059",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg",
    target_price: 35.00,
    current_price: 39.99,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "wish-2",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    isbn: "9781449373320",
    cover_url: "https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg",
    target_price: 40.00,
    current_price: 45.50,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

const STORAGE_KEY = "bookmind_wishlist_items";

function getLocalWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return DEFAULT_WISHLIST;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WISHLIST));
      return DEFAULT_WISHLIST;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_WISHLIST;
  }
}

function saveLocalWishlist(items: WishlistItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

/**
 * Fetch all items in the wishlist
 */
export async function getWishlist(): Promise<WishlistItem[]> {
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Error fetching wishlist from Supabase, serving local wishlist:', error?.message);
      return getLocalWishlist();
    }
    saveLocalWishlist(data);
    return data;
  } catch (err) {
    console.warn('Serving local wishlist due to offline/paused DB:', err);
    return getLocalWishlist();
  }
}

/**
 * Add a book to the wishlist
 */
export async function addToWishlist(item: WishlistInsert): Promise<WishlistItem | null> {
  const newItem: WishlistItem = {
    ...item,
    id: `local-wish-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .insert([item])
      .select()
      .single();

    if (error || !data) {
      console.warn('Adding to local wishlist due to Supabase error:', error?.message);
      const local = getLocalWishlist();
      saveLocalWishlist([newItem, ...local]);
      return newItem;
    }
    const local = getLocalWishlist();
    saveLocalWishlist([data, ...local]);
    return data;
  } catch (err) {
    console.warn('Adding to local wishlist due to offline/paused DB:', err);
    const local = getLocalWishlist();
    saveLocalWishlist([newItem, ...local]);
    return newItem;
  }
}

/**
 * Remove an item from the wishlist
 */
export async function removeFromWishlist(id: string): Promise<boolean> {
  try {
    const local = getLocalWishlist();
    saveLocalWishlist(local.filter(item => item.id !== id));

    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Removed locally, but Supabase delete failed:', error.message);
    }
    return true;
  } catch (err) {
    console.warn('Removed from local wishlist only:', err);
    return true;
  }
}
