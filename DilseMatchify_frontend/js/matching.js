/**
 * Matching Algorithm Module
 * Handles match suggestions and compatibility scoring
 */

import { supabase, getCurrentUser } from './supabase-client.js';

export async function findMatches(limit = 10) {
  try {
    const { user } = await getCurrentUser();

    if (!user) {
      throw new Error('No user logged in');
    }

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('*, partner_preferences(*)')
      .eq('id', user.id)
      .single();

    if (!myProfile) {
      throw new Error('Profile not found');
    }

    const oppositeGender = myProfile.gender === 'male' ? 'female' : 'male';

    let query = supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .eq('gender', oppositeGender);

    if (myProfile.partner_preferences) {
      const prefs = myProfile.partner_preferences;

      if (prefs.preferred_location) {
        query = query.or(`city.ilike.%${prefs.preferred_location}%,state.ilike.%${prefs.preferred_location}%`);
      }

      if (prefs.preferred_religion && prefs.preferred_religion !== 'same' && prefs.preferred_religion !== '') {
        query = query.eq('religion', prefs.preferred_religion);
      } else if (prefs.preferred_religion === 'same') {
        query = query.eq('religion', myProfile.religion);
      }
    }

    const { data: potentialMatches, error } = await query.limit(limit);

    if (error) throw error;

    const matchesWithScores = potentialMatches.map(match => ({
      ...match,
      compatibility_score: calculateCompatibility(myProfile, match)
    }));

    matchesWithScores.sort((a, b) => b.compatibility_score - a.compatibility_score);

    return { data: matchesWithScores, error: null };
  } catch (error) {
    console.error('Find matches error:', error);
    return { data: null, error };
  }
}

export async function sendLike(toUserId) {
  try {
    const { user } = await getCurrentUser();

    if (!user) {
      throw new Error('No user logged in');
    }

    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('from_user_id', user.id)
      .eq('to_user_id', toUserId)
      .maybeSingle();

    if (existingLike) {
      return { data: existingLike, error: null, message: 'Already liked' };
    }

    const { data, error } = await supabase
      .from('likes')
      .insert([{
        from_user_id: user.id,
        to_user_id: toUserId
      }])
      .select()
      .single();

    if (error) throw error;

    const { data: reciprocalLike } = await supabase
      .from('likes')
      .select('id')
      .eq('from_user_id', toUserId)
      .eq('to_user_id', user.id)
      .maybeSingle();

    if (reciprocalLike) {
      await createMatch(user.id, toUserId);
      return { data, error: null, message: 'It\'s a match!' };
    }

    return { data, error: null, message: 'Like sent' };
  } catch (error) {
    console.error('Send like error:', error);
    return { data: null, error };
  }
}

export async function createMatch(userId1, userId2) {
  try {
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user_id.eq.${userId1},matched_user_id.eq.${userId2}),and(user_id.eq.${userId2},matched_user_id.eq.${userId1})`)
      .maybeSingle();

    if (existingMatch) {
      return { data: existingMatch, error: null };
    }

    const { data, error } = await supabase
      .from('matches')
      .insert([{
        user_id: userId1,
        matched_user_id: userId2,
        status: 'accepted',
        compatibility_score: 85
      }])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Create match error:', error);
    return { data: null, error };
  }
}

export async function getMyMatches() {
  try {
    const { user } = await getCurrentUser();

    if (!user) {
      throw new Error('No user logged in');
    }

    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        matched_profile:matched_user_id (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Get matches error:', error);
    return { data: null, error };
  }
}

function calculateCompatibility(profile1, profile2) {
  let score = 0;
  let maxScore = 0;

  if (profile1.religion && profile2.religion) {
    maxScore += 20;
    if (profile1.religion === profile2.religion) {
      score += 20;
    }
  }

  if (profile1.education && profile2.education) {
    maxScore += 15;
    const educationLevels = ['high-school', 'diploma', 'bachelors', 'masters', 'phd', 'professional'];
    const edu1Index = educationLevels.indexOf(profile1.education);
    const edu2Index = educationLevels.indexOf(profile2.education);

    if (edu1Index !== -1 && edu2Index !== -1) {
      const diff = Math.abs(edu1Index - edu2Index);
      score += Math.max(0, 15 - (diff * 3));
    }
  }

  if (profile1.city && profile2.city) {
    maxScore += 15;
    if (profile1.city.toLowerCase() === profile2.city.toLowerCase()) {
      score += 15;
    } else if (profile1.state && profile2.state && profile1.state.toLowerCase() === profile2.state.toLowerCase()) {
      score += 7;
    }
  }

  if (profile1.interests && profile2.interests && Array.isArray(profile1.interests) && Array.isArray(profile2.interests)) {
    maxScore += 20;
    const commonInterests = profile1.interests.filter(interest =>
      profile2.interests.includes(interest)
    );
    score += Math.min(20, commonInterests.length * 4);
  }

  if (profile1.dietary_preferences && profile2.dietary_preferences) {
    maxScore += 10;
    if (profile1.dietary_preferences === profile2.dietary_preferences) {
      score += 10;
    }
  }

  if (profile1.partner_preferences) {
    const prefs = profile1.partner_preferences;

    if (prefs.min_age && prefs.max_age && profile2.date_of_birth) {
      maxScore += 20;
      const age = calculateAge(profile2.date_of_birth);
      if (age >= prefs.min_age && age <= prefs.max_age) {
        score += 20;
      }
    }
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
}

function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
