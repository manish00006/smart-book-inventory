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

/**
 * Fetch all items in the wishlist
 */
export async function getWishlist(): Promise<WishlistItem[]> {
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wishlist:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error in getWishlist:', err);
    return [];
  }
}

/**
 * Add a book to the wishlist
 */
export async function addToWishlist(item: WishlistInsert): Promise<WishlistItem | null> {
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .insert([item])
      .select()
      .single();

    if (error) {
      console.error('Error adding to wishlist:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error in addToWishlist:', err);
    return null;
  }
}

/**
 * Remove an item from the wishlist
 */
export async function removeFromWishlist(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing from wishlist:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in removeFromWishlist:', err);
    return false;
  }
}
