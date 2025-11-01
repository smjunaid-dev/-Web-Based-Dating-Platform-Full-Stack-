/**
 * Profile Management Module
 * Handles profile CRUD operations
 */

import { supabase, getCurrentUser } from './supabase-client.js';

export async function updateProfile(profileData) {
  try {
    const { user } = await getCurrentUser();

    if (!user) {
      throw new Error('No user logged in');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    if (data) {
      localStorage.setItem('userProfile', JSON.stringify(data));
    }

    return { data, error: null };
  } catch (error) {
    console.error('Update profile error:', error);
    return { data: null, error };
  }
}

export async function updatePartnerPreferences(preferences) {
  try {
    const { user } = await getCurrentUser();

    if (!user) {
      throw new Error('No user logged in');
    }

    const { data: existing } = await supabase
      .from('partner_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let result;

    if (existing) {
      result = await supabase
        .from('partner_preferences')
        .update(preferences)
        .eq('user_id', user.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('partner_preferences')
        .insert([{
          user_id: user.id,
          ...preferences
        }])
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return { data: result.data, error: null };
  } catch (error) {
    console.error('Update preferences error:', error);
    return { data: null, error };
  }
}

export async function uploadProfilePhoto(file) {
  try {
    const { user } = await getCurrentUser();

    if (!user) {
      throw new Error('No user logged in');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-photos/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_photo_url: publicUrl })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return { data: publicUrl, error: null };
  } catch (error) {
    console.error('Upload photo error:', error);
    return { data: null, error };
  }
}

export async function getProfileStats() {
  try {
    const { user } = await getCurrentUser();

    if (!user) {
      throw new Error('No user logged in');
    }

    const { count: matchesCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
      .eq('status', 'accepted');

    const { count: likesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('to_user_id', user.id);

    return {
      data: {
        matches: matchesCount || 0,
        likes: likesCount || 0
      },
      error: null
    };
  } catch (error) {
    console.error('Get profile stats error:', error);
    return { data: null, error };
  }
}
