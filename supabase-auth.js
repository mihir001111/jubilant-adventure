// ==========================================================================
// Supabase Auth Module for After Trials Web Landing Page
// ==========================================================================

const SUPABASE_URL = 'https://mzcydbxztotigdubrabb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16Y3lkYnh6dG90aWdkdWJyYWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTYxMDMsImV4cCI6MjEwNDg5MjEwM30.cd9nk2c7h1SZ6pSV72Xo_Wees5yICK6qbBLHObkFVs4';

// ==========================================================================
// Supabase Auth Module for After Trials — Minimal Landing Page
// ==========================================================================
//
// This module is intentionally limited to the auth/profile features used by
// the public index.html signup/login flow.
//
// IMPORTANT:
// - The Supabase anon/publishable key is safe to use in browser code.
// - Never put a Supabase service-role key, database password, or other secret
//   in this file.
//

// Initialize client (supabase global comes from the CDN script).
const _supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

window.supabaseClient = _supabaseClient;

// --------------------------------------------------------------------------
// Role mapping: Web form values → DB user_type
// Must match the CHECK constraint in the new minimal profiles table.
// --------------------------------------------------------------------------
const ROLE_MAP = {
  Student: 'medical_student',
  Doctor: 'doctor',
};

function mapRoleToUserType(formRole) {
  return ROLE_MAP[formRole] || 'doctor';
}

// --------------------------------------------------------------------------
// Map Course display string to DB degree string
// --------------------------------------------------------------------------
const COURSE_DEGREE_MAP = {
  Medicine: 'MD',
  Surgery: 'MS',
  Dentistry: 'BDS',
  Nursing: 'B.Sc Nursing',
  Physiotherapy: 'BPT',
};

function mapCourseToDegree(course) {
  return COURSE_DEGREE_MAP[course] || course || null;
}

// --------------------------------------------------------------------------
// Username generation
//
// The new minimal profiles table does NOT contain a username column, so this
// is retained only for compatibility with existing index.html code.
// --------------------------------------------------------------------------
function generateUsername(fullName) {
  let clean = String(fullName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!clean) clean = 'user';

  const parts = clean.split('_').filter(Boolean);
  const first = parts.length > 0 ? parts[0] : clean;

  if (parts.length > 1) {
    const candidate =
      `${parts[0]}_${parts[parts.length - 1]}`.substring(0, 12);

    if (candidate.length >= 3) {
      return candidate;
    }
  }

  if (first.length >= 3) {
    return first;
  }

  return `${first}1`;
}

// --------------------------------------------------------------------------
// Referral code generation
// --------------------------------------------------------------------------
function generateReferralCode() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === 'function'
  ) {
    return `AT-${window.crypto
      .randomUUID()
      .replace(/-/g, '')
      .substring(0, 10)
      .toUpperCase()}`;
  }

  return `AT-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}

// --------------------------------------------------------------------------
// 1. Sign Up — creates auth user and sends the real Supabase OTP email
// --------------------------------------------------------------------------
async function signUpUser(email, password, userType) {
  const { data, error } = await _supabaseClient.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        user_type: userType,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // Supabase can return a user with no identities when the email already
  // exists. Give the user a clear message instead of continuing the flow.
  if (
    data.user &&
    (!data.user.identities || data.user.identities.length === 0)
  ) {
    throw new Error(
      'This email is already in use. Please try logging in.'
    );
  }

  return data;
}

// --------------------------------------------------------------------------
// 2. Verify OTP — confirms signup with the 6-digit email code
// --------------------------------------------------------------------------
async function verifySignupOTP(email, token) {
  const { data, error } = await _supabaseClient.auth.verifyOtp({
    type: 'signup',
    email: email,
    token: token,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// --------------------------------------------------------------------------
// 3. Create Profile
//
// Matches the new minimal schema:
//
// profiles:
//   id
//   full_name
//   user_type
//   degree
//   specialization
//   referral_code
//   referred_by
//   verification_status
//   created_at
//   updated_at
//
// user_private_info:
//   id
//   phone_number
//   created_at
//   updated_at
// --------------------------------------------------------------------------
async function createProfile({
  fullName,
  userType,
  course,
  degree,
  specialization,
  phone,
}) {
  const {
    data: { user },
  } = await _supabaseClient.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated. Please try again.');
  }

  const resolvedDegree = degree || mapCourseToDegree(course);

  // A referral code is generated for every new profile.
  // If the profile already has one, keep it.
  let existingReferralCode = null;

  const {
    data: existingProfile,
    error: existingProfileError,
  } = await _supabaseClient
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .maybeSingle();

  if (!existingProfileError && existingProfile) {
    existingReferralCode = existingProfile.referral_code;
  }

  const referralCode =
    existingReferralCode || generateReferralCode();

  const profileData = {
    id: user.id,
    full_name: fullName,
    user_type: userType,
    degree: resolvedDegree,
    specialization: specialization || null,
    referral_code: referralCode,
    verification_status: 'pending',
    updated_at: new Date().toISOString(),
  };

  // ------------------------------------------------------------------------
  // Referral tracking
  //
  // The new minimal schema stores referred_by as TEXT.
  // Therefore we store the referral code itself instead of querying another
  // user's profile.
  // ------------------------------------------------------------------------
  const refCode = localStorage.getItem('at_referral_code');

  if (refCode && refCode.trim()) {
    const normalizedRefCode = refCode.trim();

    // Never mark a user as their own referrer.
    if (
      normalizedRefCode.toUpperCase() !==
      referralCode.toUpperCase()
    ) {
      profileData.referred_by = normalizedRefCode;
    }
  }

  // ------------------------------------------------------------------------
  // Create/update profile
  // ------------------------------------------------------------------------
  const { error: profileError } = await _supabaseClient
    .from('profiles')
    .upsert(profileData, {
      onConflict: 'id',
    });

  if (profileError) {
    throw new Error(profileError.message);
  }

  // ------------------------------------------------------------------------
  // Save private phone information
  // ------------------------------------------------------------------------
  if (phone && phone.trim()) {
    const { error: privateInfoError } =
      await _supabaseClient
        .from('user_private_info')
        .upsert(
          {
            id: user.id,
            phone_number: phone.trim(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'id',
          }
        );

    if (privateInfoError) {
      console.error(
        'Failed to save private info:',
        privateInfoError
      );

      throw new Error(
        'Profile created but failed to save secure contact details: ' +
          privateInfoError.message
      );
    }
  }

  // Referral has been consumed successfully.
  if (refCode) {
    localStorage.removeItem('at_referral_code');
  }

  return {
    userId: user.id,
    username: generateUsername(fullName),
    referralCode: referralCode,
  };
}

// --------------------------------------------------------------------------
// 4. Resend OTP
// --------------------------------------------------------------------------
async function resendSignupOTP(email) {
  const { error } = await _supabaseClient.auth.resend({
    type: 'signup',
    email: email,
  });

  if (error) {
    throw new Error(error.message);
  }
}

// --------------------------------------------------------------------------
// Get current authenticated user
// --------------------------------------------------------------------------
async function getCurrentUser() {
  const {
    data: { user },
  } = await _supabaseClient.auth.getUser();

  return user;
}

// --------------------------------------------------------------------------
// Get current user's referral code
// --------------------------------------------------------------------------
async function getReferralCode(userId) {
  const {
    data: { user },
  } = await _supabaseClient.auth.getUser();

  const targetUserId = userId || user?.id;

  if (!targetUserId) {
    throw new Error('Not authenticated.');
  }

  const { data, error } = await _supabaseClient
    .from('profiles')
    .select('referral_code')
    .eq('id', targetUserId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data ? data.referral_code : null;
}

// --------------------------------------------------------------------------
// Sign in with email and password
// --------------------------------------------------------------------------
async function signIn(email, password) {
  const { data, error } =
    await _supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// --------------------------------------------------------------------------
// Sign out
// --------------------------------------------------------------------------
async function signOut() {
  const { error } =
    await _supabaseClient.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

// --------------------------------------------------------------------------
// Compatibility stubs
//
// These belonged to the old larger Supabase setup and are not needed by
// the new landing-page-only database.
// --------------------------------------------------------------------------
async function getWaitlistStats() {
  return null;
}

async function getReferrals() {
  return [];
}

async function getPublishedBlogs() {
  return [];
}

async function getBlogBySlug() {
  return null;
}

// --------------------------------------------------------------------------
// Export to global scope for index.html / main.js
// --------------------------------------------------------------------------
window.SupabaseAuth = {
  signUpUser,
  verifySignupOTP,
  createProfile,
  resendSignupOTP,
  mapRoleToUserType,
  mapCourseToDegree,
  generateUsername,
  getCurrentUser,
  getWaitlistStats,
  getReferrals,
  getReferralCode,
  getPublishedBlogs,
  getBlogBySlug,
  signOut,
  signIn,
};