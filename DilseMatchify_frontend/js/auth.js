/**
 * Authentication Module
 * Handles user signup, login, logout, and session management
 */

import { supabase, getCurrentUser, getSession } from './supabase-client.js';

export async function signUp(email, password, userData) {
  try {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName
        }
      }
    });

    if (signUpError) throw signUpError;

    if (authData.user) {
      const profileData = {
        id: authData.user.id,
        email: email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        date_of_birth: userData.dateOfBirth,
        gender: userData.gender,
        city: userData.city,
        state: userData.state,
        country: userData.country || 'India',
        religion: userData.religion,
        caste: userData.caste,
        mother_tongue: userData.motherTongue,
        education: userData.education,
        occupation: userData.occupation,
        company: userData.company,
        income: userData.income,
        height: userData.height,
        body_type: userData.bodyType,
        complexion: userData.complexion,
        marital_status: userData.maritalStatus,
        smoking_habits: userData.smokingHabits,
        drinking_habits: userData.drinkingHabits,
        dietary_preferences: userData.dietaryPreferences,
        pet_preference: userData.petPreference,
        about_me: userData.aboutMe,
        looking_for: userData.lookingFor,
        family_values: userData.familyValues,
        interests: userData.interests || [],
        profile_visibility: userData.profileVisibility || 'public',
        contact_preference: userData.contactPreference || 'anyone',
        email_notifications: userData.emailNotifications !== false,
        profile_completion: calculateProfileCompletion(userData)
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profileData]);

      if (profileError) throw profileError;

      if (userData.partnerPreferences) {
        const { error: prefError } = await supabase
          .from('partner_preferences')
          .insert([{
            user_id: authData.user.id,
            ...userData.partnerPreferences
          }]);

        if (prefError) console.error('Error saving preferences:', prefError);
      }
    }

    return { data: authData, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: null, error };
  }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    localStorage.removeItem('userProfile');
    window.location.href = 'loginpage.html';

    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
}

export async function resetPassword(email) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Reset password error:', error);
    return { data: null, error };
  }
}

export async function updatePassword(newPassword) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Update password error:', error);
    return { data: null, error };
  }
}

export async function checkAuth() {
  const { session } = await getSession();

  if (!session) {
    const currentPage = window.location.pathname;
    const publicPages = ['loginpage.html', 'signuppage.html', 'blhp.html', 'blog.html'];
    const isPublicPage = publicPages.some(page => currentPage.includes(page));

    if (!isPublicPage) {
      window.location.href = 'loginpage.html';
    }
    return false;
  }

  return true;
}

export async function getUserProfile() {
  try {
    const { user } = await getCurrentUser();

    if (!user) {
      throw new Error('No user logged in');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        partner_preferences (*)
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      localStorage.setItem('userProfile', JSON.stringify(data));
    }

    return { data, error: null };
  } catch (error) {
    console.error('Get user profile error:', error);
    return { data: null, error };
  }
}

function calculateProfileCompletion(userData) {
  const fields = [
    'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender',
    'city', 'state', 'education', 'occupation', 'maritalStatus', 'aboutMe'
  ];

  const filledFields = fields.filter(field => userData[field] && userData[field].trim() !== '').length;
  return Math.round((filledFields / fields.length) * 100);
}
