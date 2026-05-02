import { supabase } from './supabase';

export type Profile = {
  id: string;
  display_name: string;
  reading_goal: number;
  theme: string;
  created_at: string;
};

/**
 * Fetch the user's profile
 */
export async function getProfile(): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching profile:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error in getProfile:', err);
    return null;
  }
}

/**
 * Update the user's profile
 */
export async function updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
  try {
    // For demo, we update the first profile found
    const { data: currentProfile } = await supabase.from('profiles').select('id').limit(1).single();
    
    if (!currentProfile) return null;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', currentProfile.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error in updateProfile:', err);
    return null;
  }
}
