// ==========================================================================
// Supabase Auth Module for After Trials Web Landing Page
// ==========================================================================

const SUPABASE_URL = 'https://brcefnmohobhzizxfrfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY2Vmbm1vaG9iaHppenhmcmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTg4NjEsImV4cCI6MjA3MjQ5NDg2MX0.4hT8Czdi2hqrHJgNsP6pgB11angcTnVwvdMHgYXiik0';

// Initialize client (supabase global comes from CDN script)
const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = _supabaseClient;

// --------------------------------------------------------------------------
// Role mapping: Web form values → DB user_type
// The mobile app only uses 'student' and 'doctor'.
// --------------------------------------------------------------------------
const ROLE_MAP = {
  'Student': 'student',
  'Doctor': 'doctor',
};

function mapRoleToUserType(formRole) {
  return ROLE_MAP[formRole] || 'doctor';
}

// Map Course display string to DB degree string
const COURSE_DEGREE_MAP = {
  'Medicine': 'MD',
  'Surgery': 'MS',
  'Dentistry': 'BDS',
  'Nursing': 'B.Sc Nursing',
  'Physiotherapy': 'BPT',
};

function mapCourseToDegree(course) {
  return COURSE_DEGREE_MAP[course] || course;
}

// --------------------------------------------------------------------------
// Username generation (mirrors mobile app logic)
// --------------------------------------------------------------------------
function generateUsername(fullName) {
  let clean = fullName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  clean = clean.replace(/^_+|_+$/g, '');
  if (!clean) clean = 'user';

  const parts = clean.split('_').filter(p => p.length > 0);
  const first = parts.length > 0 ? parts[0] : clean;

  if (parts.length > 1) {
    const candidate = `${parts[0]}_${parts[parts.length - 1]}`.substring(0, 12);
    if (candidate.length >= 3) return candidate;
  }

  if (first.length >= 3) return first;
  return `${first}1`;
}

// --------------------------------------------------------------------------
// 1. Sign Up — creates auth user, triggers real OTP email from Supabase
// --------------------------------------------------------------------------
async function signUpUser(email, password, userType) {
  const { data, error } = await _supabaseClient.auth.signUp({
    email: email,
    password: password,
    options: {
      data: { user_type: userType },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // Check if user already exists (Supabase returns a user with no identities)
  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    throw new Error('This email is already in use. Please try logging in.');
  }

  return data;
}

// --------------------------------------------------------------------------
// 2. Verify OTP — confirms the signup with the 6-digit code from email
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
// 3. Create Profile — upserts into the profiles table after OTP verification
// --------------------------------------------------------------------------
async function createProfile({ fullName, userType, institution, course, specialization, phone }) {
  const { data: { user } } = await _supabaseClient.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated. Please try again.');
  }

  const username = generateUsername(fullName);
  const degree = mapCourseToDegree(course);

  const profileData = {
    id: user.id,
    full_name: fullName,
    username: username,
    user_type: userType,
    institution: institution,
    degree: degree,
    specialization: specialization,
    verification_status: 'pending',
    updated_at: new Date().toISOString(),
  };

  // Resolve referral code from localStorage
  const refCode = localStorage.getItem('at_referral_code');
  if (refCode) {
    try {
      const { data: referrer, error: refError } = await _supabaseClient
        .from('profiles')
        .select('id')
        .eq('referral_code', refCode.trim().toLowerCase())
        .maybeSingle();

      if (referrer && !refError) {
        profileData.referred_by = referrer.id;
        console.log('Assigned referred_by:', referrer.id);
      }
    } catch (e) {
      console.warn('Failed to resolve referrer ID:', e);
    }
  }

  const { error: profileError } = await _supabaseClient
    .from('profiles')
    .upsert(profileData);

  if (profileError) {
    throw new Error(profileError.message);
  }

  // Save secure private info
  if (phone) {
    const { error: privateInfoError } = await _supabaseClient
      .from('user_private_info')
      .upsert({
        id: user.id,
        phone_number: phone
      });

    if (privateInfoError) {
      console.error('Failed to save private info:', privateInfoError);
      throw new Error('Profile created but failed to save secure contact details: ' + privateInfoError.message);
    }
  }

  // Clear referral code on successful profile creation
  if (refCode) {
    localStorage.removeItem('at_referral_code');
  }

  return { userId: user.id, username };
}

// --------------------------------------------------------------------------
// 4. Resend OTP — re-sends the signup OTP email
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

// Get current authenticated user
async function getCurrentUser() {
  const { data: { user } } = await _supabaseClient.auth.getUser();
  return user;
}

// Fetch waitlist stats using the RPC function
async function getWaitlistStats(userId) {
  const { data, error } = await _supabaseClient.rpc('get_waitlist_stats', {
    p_user_id: userId
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

// Fetch list of users referred by this user
async function getReferrals(userId) {
  const { data, error } = await _supabaseClient
    .from('profiles')
    .select('username, user_type, verification_status, created_at')
    .eq('referred_by', userId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

// Fetch user referral code
async function getReferralCode(userId) {
  const { data, error } = await _supabaseClient
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data ? data.referral_code : null;
}

// Sign in a user with email and password
async function signIn(email, password) {
  const { data, error } = await _supabaseClient.auth.signInWithPassword({
    email: email,
    password: password,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

// Fetch published blogs
async function getPublishedBlogs() {
  const { data, error } = await _supabaseClient
    .from('blogs')
    .select('title, slug, excerpt, cover_image, published_at, read_time_minutes')
    .eq('published', true)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching blogs:', error.message);
    return [];
  }
  return data;
}

// Fetch a single blog by slug
async function getBlogBySlug(slug) {
  const { data, error } = await _supabaseClient
    .from('blogs')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching blog:', error.message);
    return null;
  }
  return data;
}

// Sign out the current user
async function signOut() {
  const { error } = await _supabaseClient.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

// --------------------------------------------------------------------------
// Export to global scope for use in main.js
// --------------------------------------------------------------------------
window.SupabaseAuth = {
  signUpUser,
  verifySignupOTP,
  createProfile,
  resendSignupOTP,
  mapRoleToUserType,
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

