# Backend Integration Guide

## Overview
The DilSe Matchify platform has been integrated with a modern backend architecture using:

### Tech Stack
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT tokens
- **Frontend**: Vanilla JavaScript ES6 Modules
- **Client Library**: @supabase/supabase-js v2

## Architecture

### Database Schema

#### Tables Created:
1. **profiles** - User profile information
2. **partner_preferences** - User's partner preferences
3. **matches** - Match relationships between users
4. **likes** - User likes/interests
5. **messages** - Chat messages between matched users

All tables have Row Level Security (RLS) enabled for secure data access.

### Authentication System

**Features:**
- Email/Password authentication
- JWT token-based session management
- Password reset functionality
- Automatic profile creation on signup
- Session persistence across pages

### API Modules

#### 1. `supabase-client.js`
Core Supabase client initialization and helper functions.

**Functions:**
- `supabase` - Initialized Supabase client
- `getCurrentUser()` - Get currently logged-in user
- `getSession()` - Get current session
- `onAuthStateChange(callback)` - Listen to auth state changes

#### 2. `auth.js`
Authentication and user management.

**Functions:**
- `signUp(email, password, userData)` - Register new user with profile
- `signIn(email, password)` - Login user
- `signOut()` - Logout user
- `resetPassword(email)` - Send password reset email
- `updatePassword(newPassword)` - Update user password
- `checkAuth()` - Verify authentication status
- `getUserProfile()` - Fetch user profile data

#### 3. `profile.js`
Profile management operations.

**Functions:**
- `updateProfile(profileData)` - Update user profile
- `updatePartnerPreferences(preferences)` - Update partner preferences
- `uploadProfilePhoto(file)` - Upload profile photo
- `getProfileStats()` - Get user statistics (matches, likes)

#### 4. `matching.js`
Matching algorithm and match management.

**Functions:**
- `findMatches(limit)` - Find compatible matches based on preferences
- `sendLike(toUserId)` - Send like to another user
- `createMatch(userId1, userId2)` - Create mutual match
- `getMyMatches()` - Get user's matches
- `calculateCompatibility(profile1, profile2)` - Calculate compatibility score

### Compatibility Algorithm

The matching algorithm calculates compatibility based on:
- **Religion** (20 points) - Same religion preference
- **Education** (15 points) - Similar education levels
- **Location** (15 points) - Same city/state
- **Common Interests** (20 points) - Shared hobbies
- **Dietary Preferences** (10 points) - Compatible food habits
- **Age Preference** (20 points) - Within preferred age range

Total compatibility score: 0-100%

## Pages Integrated

### 1. Login Page (`loginpage.html`)
- Email/password authentication
- Error handling with user-friendly messages
- Password reset functionality
- Redirects to homepage on success

### 2. Signup Page (`signuppage.html`)
- Comprehensive profile creation
- Password confirmation validation
- Automatic profile and preferences creation
- Progress tracking
- Data validation

### 3. Profile Page (`myprofile.html`)
- Loads user profile from database
- Real-time profile updates
- Displays match and like statistics
- Interest management
- Auto-save functionality

## Security Features

### Row Level Security (RLS)
All database tables have RLS policies ensuring:
- Users can only read/update their own profile
- Profile visibility respected (public/members-only)
- Users can only message matched users
- Likes and matches are properly scoped

### Authentication Security
- JWT tokens for session management
- Password minimum length: 6 characters
- Email verification support
- Secure password reset flow

## Database Migrations

Migration applied: `create_initial_schema`

This migration creates:
- All necessary tables with proper relationships
- Indexes for performance optimization
- RLS policies for security
- Triggers for automatic timestamp updates

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=https://jqrtenskuvbpbrhykqko.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Testing the Integration

### 1. Create Account
- Navigate to `signuppage.html`
- Fill in all required fields
- Create password (min 6 characters)
- Submit form

### 2. Login
- Navigate to `loginpage.html`
- Enter email and password
- Click "Sign In to Your Heart"

### 3. View Profile
- After login, navigate to `myprofile.html`
- Profile loads from database automatically
- Update profile fields and save

### 4. Test Matching
- Import matching functions in console
- Call `findMatches()` to get compatible profiles

## API Response Format

All API functions return:
```javascript
{
  data: {...},  // Response data
  error: null   // Error object if failed
}
```

## Error Handling

Errors are caught and returned in user-friendly format:
- Login failures show appropriate messages
- Validation errors displayed inline
- Database errors logged to console
- Network errors handled gracefully

## Future Enhancements

Recommended additions:
1. Real-time messaging with Supabase Realtime
2. Photo upload to Supabase Storage
3. Email verification workflow
4. Social login (Google, Facebook)
5. Advanced filtering and search
6. Video call integration
7. AI-powered match recommendations using LangChain
8. Multi-agent chat analysis using CrewAI

## Development Notes

- All JavaScript modules use ES6 imports
- Supabase client loaded from CDN for simplicity
- No build step required - static HTML/JS/CSS
- Compatible with modern browsers
- Mobile-responsive design maintained

## Support

For issues or questions:
- Check browser console for error logs
- Verify Supabase credentials in `.env`
- Ensure RLS policies are properly configured
- Test database connection in Supabase dashboard
