/**
 * campaign-page.js v3
 * Full logic for the dedicated /campaign.html referral dashboard.
 *
 * Features:
 * - Auth: sign in / sign up / OTP verify
 * - Referee view: shows sponsor who referred you
 * - Referrer view: stats, link, custom code, invite tools, leaderboard
 * - Custom referral code: check availability + save
 * - Single invite: opens mailto: + logs to DB
 * - Bulk invite: bulk mailto: BCC + logs all to DB
 * - Invite log: shows all outbound invites with status
 * - QR code generation for referral link
 * - Social share: WhatsApp, Twitter, LinkedIn, Email
 * - Click tracking: every ?ref= visit is recorded
 * - Real-time hero counters from profiles table
 */

(function () {
  'use strict';

  /* ── Supabase client ──────────────────────────────────── */
  const SB_URL  = 'https://brcefnmohobhzizxfrfv.supabase.co';
  const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY2Vmbm1vaG9iaHppenhmcmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTg4NjEsImV4cCI6MjA3MjQ5NDg2MX0.4hT8Czdi2hqrHJgNsP6pgB11angcTnVwvdMHgYXiik0';
  const sb      = supabase.createClient(SB_URL, SB_KEY);

  /* ── URL ref capture ──────────────────────────────────── */
  const params     = new URLSearchParams(window.location.search);
  const incomingRef = params.get('ref');
  if (incomingRef) {
    localStorage.setItem('at_referral_code', incomingRef.trim().toLowerCase());
  }

  /* ── DOM helpers ──────────────────────────────────────── */
  const $  = id => document.getElementById(id);
  const el = id => document.getElementById(id);

  /* ── State ────────────────────────────────────────────── */
  let currentUser    = null;
  let currentRefCode = '';
  let currentRefLink = '';
  let pendingEmail   = '';

  /* ── Toast ────────────────────────────────────────────── */
  function toast(msg, duration = 2800) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  }

  /* ── Tab switching helpers ──────────────────────────────*/
  function showAuthForm(which) {
    ['signin-form', 'otp-form', 'signup-form'].forEach(id => $( id)?.classList.add('hidden'));
    ['tab-signin', 'tab-signup'].forEach(id => $(id)?.classList.remove('active'));
    if (which === 'signin') { $('signin-form')?.classList.remove('hidden'); $('tab-signin')?.classList.add('active'); }
    if (which === 'signup') { $('signup-form')?.classList.remove('hidden'); $('tab-signup')?.classList.add('active'); }
    if (which === 'otp')    { $('otp-form')?.classList.remove('hidden'); }
  }

  /* ── Auth tab events ─────────────────────────────────── */
  $('tab-signin')?.addEventListener('click', () => showAuthForm('signin'));
  $('tab-signup')?.addEventListener('click', () => showAuthForm('signup'));

  /* ── Password toggles ─────────────────────────────────── */
  function pwToggle(btnId, inputId) {
    $(btnId)?.addEventListener('click', () => {
      const inp = $(inputId);
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      $(btnId).textContent = show ? 'Hide' : 'Show';
    });
  }
  pwToggle('signin-pw-btn', 'signin-password');
  pwToggle('signup-pw-btn', 'signup-password');

  /* ── Sign In ──────────────────────────────────────────── */
  $('signin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('signin-msg'), btn = $('signin-btn');
    msg.textContent = ''; msg.className = 'auth-msg';
    btn.textContent = 'Signing in…'; btn.disabled = true;
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: $('signin-email').value.trim(),
        password: $('signin-password').value,
      });
      if (error) throw error;
      toast('Signed in successfully.');
      await loadDashboard(data.user);
    } catch (err) {
      msg.textContent = err.message || 'Sign in failed.';
    } finally {
      btn.textContent = 'Sign In →'; btn.disabled = false;
    }
  });

  /* ── Sign Up ──────────────────────────────────────────── */
  $('signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('signup-msg'), btn = $('signup-btn');
    msg.textContent = ''; msg.className = 'auth-msg';
    btn.textContent = 'Creating account…'; btn.disabled = true;
    try {
      pendingEmail = $('signup-email').value.trim();
      await SupabaseAuth.signUpUser(pendingEmail, $('signup-password').value, 'student');
      $('otp-email-lbl').textContent = pendingEmail;
      showAuthForm('otp');
      toast('Check your email for the verification code.');
    } catch (err) {
      msg.textContent = err.message || 'Registration failed.';
    } finally {
      btn.textContent = 'Create Account →'; btn.disabled = false;
    }
  });

  /* ── OTP verify ──────────────────────────────────────── */
  $('otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('otp-msg'), btn = $('otp-btn');
    msg.textContent = ''; msg.className = 'auth-msg';
    btn.textContent = 'Verifying…'; btn.disabled = true;
    try {
      const result = await SupabaseAuth.verifySignupOTP(pendingEmail, $('otp-code').value.trim());
      if (result.user) {
        try {
          await SupabaseAuth.createProfile({
            fullName: pendingEmail.split('@')[0],
            userType: 'student',
            institution: '', course: 'Medicine', specialization: '',
          });
        } catch (_) {}
        toast('Verified! Loading your dashboard…');
        await loadDashboard(result.user);
      }
    } catch (err) {
      msg.textContent = err.message || 'Verification failed.';
    } finally {
      btn.textContent = 'Verify & Enter →'; btn.disabled = false;
    }
  });

  $('resend-btn')?.addEventListener('click', async () => {
    try { await SupabaseAuth.resendSignupOTP(pendingEmail); toast('Code resent — check your email.'); }
    catch (err) { toast(err.message || 'Resend failed.'); }
  });

  /* ── Sign out ─────────────────────────────────────────── */
  $('signout-btn')?.addEventListener('click', async () => {
    await sb.auth.signOut();
    currentUser = null;
    showAuthGate();
    toast('Signed out.');
  });

  /* ══════════════════════════════════════
     REFERRAL LINK HELPERS
  ══════════════════════════════════════ */
  function buildLink(code) {
    return `${window.location.origin}/campaign.html?ref=${code}`;
  }

  function setLink(code) {
    currentRefCode = code;
    currentRefLink = buildLink(code);
    const inp = $('ref-link-inp');
    if (inp) inp.value = currentRefLink;
    // Update the prefix display
    const px = $('cc-prefix');
    if (px) px.textContent = `${window.location.origin}/campaign.html?ref=`;
  }

  /* ── Copy ─────────────────────────────────────────────── */
  function copyToClipboard(text, btnEl) {
    navigator.clipboard.writeText(text).then(() => {
      toast('Link copied to clipboard!');
      if (btnEl) { btnEl.textContent = 'Copied!'; btnEl.classList.add('copied');
        setTimeout(() => { btnEl.textContent = 'Copy'; btnEl.classList.remove('copied'); }, 2000); }
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      toast('Link copied!');
    });
  }

  $('copy-btn')?.addEventListener('click', () => copyToClipboard(currentRefLink, $('copy-btn')));
  $('hero-copy-btn')?.addEventListener('click', () => {
    if (currentRefLink) copyToClipboard(currentRefLink, null);
    else toast('Sign in to get your referral link.');
  });

  /* ══════════════════════════════════════
     CUSTOM CODE BUILDER
  ══════════════════════════════════════ */
  let ccAvailable = false;

  $('cc-input')?.addEventListener('input', () => {
    ccAvailable = false;
    $('cc-status').textContent = '';
    $('cc-status').className = 'cc-status';
    $('cc-save-btn')?.classList.add('hidden');
  });

  $('cc-check-btn')?.addEventListener('click', async () => {
    const raw = $('cc-input')?.value.trim();
    if (!raw) return;
    const btn = $('cc-check-btn');
    btn.textContent = 'Checking…'; btn.disabled = true;
    const statusEl = $('cc-status');

    try {
      const { data, error } = await sb.rpc('check_ref_code_available', { p_code: raw });
      if (error) throw error;
      const res = data || {};
      if (res.available) {
        statusEl.textContent = `✓ "${res.code}" is available!`;
        statusEl.className = 'cc-status ok';
        ccAvailable = true;
        $('cc-input').value = res.code;
        $('cc-save-btn')?.classList.remove('hidden');
      } else {
        const reason = res.reason === 'too_short' ? 'Code too short (min 3 chars).'
          : res.reason === 'too_long' ? 'Code too long (max 24 chars).'
          : `"${res.code || raw}" is already taken. Try another.`;
        statusEl.textContent = reason;
        statusEl.className = 'cc-status err';
        ccAvailable = false;
        $('cc-save-btn')?.classList.add('hidden');
      }
    } catch (err) {
      statusEl.textContent = 'Check failed. Try again.';
      statusEl.className = 'cc-status err';
    } finally {
      btn.textContent = 'Check'; btn.disabled = false;
    }
  });

  $('cc-save-btn')?.addEventListener('click', async () => {
    if (!ccAvailable || !currentUser) return;
    const newCode = $('cc-input')?.value.trim();
    const btn = $('cc-save-btn');
    btn.textContent = 'Saving…'; btn.disabled = true;

    try {
      const { data, error } = await sb.rpc('set_custom_ref_code', {
        p_user_id: currentUser.id, p_code: newCode
      });
      if (error) throw error;
      const res = data || {};
      if (res.ok) {
        setLink(res.code);
        $('cc-status').textContent = `✓ Saved! Your link is now: ...?ref=${res.code}`;
        $('cc-status').className = 'cc-status ok';
        $('cc-save-btn').classList.add('hidden');
        ccAvailable = false;
        toast('Custom code saved!');
      } else {
        $('cc-status').textContent = res.error || 'Save failed.';
        $('cc-status').className = 'cc-status err';
      }
    } catch (err) {
      $('cc-status').textContent = err.message || 'Save failed.';
      $('cc-status').className = 'cc-status err';
    } finally {
      btn.textContent = 'Save Custom Code'; btn.disabled = false;
    }
  });

  /* ══════════════════════════════════════
     SOCIAL SHARE
  ══════════════════════════════════════ */
  const MSG = 'Join After Trials — the collective front for medical professionals. Use my link:';

  $('share-whatsapp')?.addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(MSG + ' ' + currentRefLink)}`, '_blank');
    logInvite([], 'whatsapp');
  });
  $('share-twitter')?.addEventListener('click', () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(MSG)}&url=${encodeURIComponent(currentRefLink)}`, '_blank');
    logInvite([], 'twitter');
  });
  $('share-linkedin')?.addEventListener('click', () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentRefLink)}`, '_blank');
    logInvite([], 'linkedin');
  });
  $('share-email')?.addEventListener('click', () => {
    const subject = encodeURIComponent('Join After Trials — Medical Professional Network');
    const body    = encodeURIComponent(`${MSG}\n\n${currentRefLink}\n\nThis is an exclusive founding invite. See you inside.`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    logInvite([], 'email');
  });

  /* ══════════════════════════════════════
     QR CODE
  ══════════════════════════════════════ */
  $('qr-toggle-btn')?.addEventListener('click', () => {
    const panel = $('qr-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) generateQR();
  });

  function generateQR() {
    const canvas = $('qr-canvas');
    if (!canvas || !currentRefLink) return;
    if (typeof QRCode === 'undefined') return;
    QRCode.toCanvas(canvas, currentRefLink, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } }, (err) => {
      if (err) console.error('QR error:', err);
    });
  }

  $('qr-download-btn')?.addEventListener('click', () => {
    const canvas = $('qr-canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `after-trials-${currentRefCode}.png`;
    a.href = canvas.toDataURL();
    a.click();
  });

  /* ══════════════════════════════════════
     INVITE TOOLS
  ══════════════════════════════════════ */

  // Tab switching
  document.querySelectorAll('.inv-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.mode;
      ['single', 'bulk', 'log'].forEach(m => {
        const p = $(`inv-panel-${m}`);
        if (p) p.classList.toggle('hidden', m !== mode);
      });
      if (mode === 'log') loadInviteLog();
    });
  });

  // Single invite
  $('single-invite-btn')?.addEventListener('click', async () => {
    const email = $('single-email')?.value.trim();
    if (!email || !email.includes('@')) { toast('Enter a valid email address.'); return; }
    const subject = encodeURIComponent('Join After Trials — You\'re invited');
    const body = encodeURIComponent(
      `Hi,\n\nI'd like to invite you to join After Trials, an exclusive network for medical professionals.\n\nUse my personal invite link:\n${currentRefLink}\n\nSee you inside.`
    );
    window.open(`mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`, '_blank');
    await logInvite([email], 'email');
    $('single-email').value = '';
    toast(`Invite opened for ${email}`);
  });

  // Bulk email counter
  $('bulk-emails')?.addEventListener('input', () => {
    const emails = parseBulkEmails($('bulk-emails').value);
    $('bulk-count').textContent = `${emails.length} email${emails.length !== 1 ? 's' : ''} entered`;
  });

  function parseBulkEmails(text) {
    return text.split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@') && e.includes('.'));
  }

  $('bulk-invite-btn')?.addEventListener('click', async () => {
    const text = $('bulk-emails')?.value;
    const emails = parseBulkEmails(text);
    if (emails.length === 0) { toast('Enter at least one valid email.'); return; }

    const subject = encodeURIComponent('Join After Trials — You\'re invited to the medical collective');
    const body = encodeURIComponent(
      `Hi all,\n\nI'd like to invite you to After Trials, an exclusive peer network for medical professionals.\n\nMy invite link:\n${currentRefLink}\n\nEach of you who joins helps build our independent union. See you inside.`
    );
    // BCC all recipients
    const bcc = emails.map(encodeURIComponent).join(',');
    window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${body}`, '_blank');

    await logInvite(emails, 'email');
    toast(`${emails.length} invite${emails.length !== 1 ? 's' : ''} opened!`);
    $('bulk-emails').value = '';
    $('bulk-count').textContent = '0 emails entered';
  });

  /* ── Log invite to DB ─────────────────────────────────── */
  async function logInvite(emails, channel) {
    if (!currentUser) return;
    try {
      await sb.rpc('log_invite', {
        p_sender_id: currentUser.id,
        p_recipient_emails: emails.length > 0 ? emails : ['_social_share_'],
        p_channel: channel,
      });
      // Refresh stats tile
      loadInviteStats(currentUser.id);
    } catch (_) {}
  }

  /* ── Load invite log ──────────────────────────────────── */
  async function loadInviteLog() {
    try {
      const { data } = await sb.from('web_invite_log')
        .select('recipient_email, channel, sent_at, status')
        .eq('sender_id', currentUser.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      const tbody = $('inv-log-tbody');
      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="tbl-empty">No invites logged yet.</td></tr>';
        return;
      }
      tbody.innerHTML = data.map(r => `
        <tr>
          <td>${r.recipient_email === '_social_share_' ? '— social share —' : r.recipient_email}</td>
          <td><span style="font-family:var(--font-mono);font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;">${r.channel}</span></td>
          <td style="font-size:0.72rem;color:var(--text-secondary);">${new Date(r.sent_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</td>
          <td><span class="s-badge">${r.status}</span></td>
        </tr>
      `).join('');
    } catch (_) {}
  }

  /* ── Invite stats + channel chart ──────────────────────── */
  async function loadInviteStats(userId) {
    try {
      const { data } = await sb.rpc('get_invite_stats', { p_user_id: userId });
      if (!data) return;
      const total = data.total_invites || 0;
      $('s-logged').textContent = total;

      // Channel chart
      const channels = data.by_channel || {};
      const list = $('channel-list');
      if (!list) return;
      const entries = Object.entries(channels).filter(([k]) => k !== '_social_share_' || true);
      if (entries.length === 0) { list.innerHTML = '<div class="channel-empty">No invite data yet.</div>'; return; }
      const max = Math.max(...entries.map(([,v]) => v));
      list.innerHTML = entries.map(([ch, count]) => `
        <div class="channel-row">
          <span class="ch-name">${ch}</span>
          <div class="ch-bar-wrap"><div class="ch-bar" style="width:${max > 0 ? (count/max*100).toFixed(0) : 0}%"></div></div>
          <span class="ch-val">${count}</span>
        </div>
      `).join('');
    } catch (_) {}
  }

  /* ══════════════════════════════════════
     CLICK TRACKING
  ══════════════════════════════════════ */
  async function trackClick() {
    if (!incomingRef) return;
    try {
      await sb.from('web_referral_clicks').insert({ ref_code: incomingRef.trim().toLowerCase() });
    } catch (_) {}
  }

  /* ══════════════════════════════════════
     HERO COUNTERS
  ══════════════════════════════════════ */
  async function loadHeroCounters() {
    // Hero counters removed to simplify layout
  }

  /* ══════════════════════════════════════
     LEADERBOARD
  ══════════════════════════════════════ */
  async function loadLeaderboard(myUsername) {
    const list = $('lb-list');
    try {
      const { data, error } = await sb.rpc('get_referral_leaderboard');
      if (error || !data || data.length === 0) {
        list.innerHTML = '<div class="lb-loading">No entries yet.</div>'; return;
      }
      list.innerHTML = data.map(r => `
        <div class="lb-row">
          <span class="lb-rank ${r.rank <= 3 ? 'top3' : ''}">#${r.rank}</span>
          <span class="lb-name ${r.username === myUsername ? 'is-you' : ''}">${r.username}${r.username === myUsername ? ' ← you' : ''}</span>
          <span class="lb-type">${r.user_type}</span>
          <span class="lb-count">${r.referred_count}</span>
        </div>
      `).join('');
    } catch (_) {
      list.innerHTML = '<div class="lb-loading">Could not load leaderboard.</div>';
    }
  }

  /* ══════════════════════════════════════
     PROPAGATION LOG
  ══════════════════════════════════════ */
  async function loadReferralList(userId) {
    try {
      const { data } = await sb.rpc('get_my_referrals', { p_user_id: userId });
      const tbody = $('prop-tbody');
      const tag   = $('prop-count-tag');
      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="tbl-empty">No referrals yet — share your link to begin.</td></tr>';
        if (tag) tag.textContent = '0 MEMBERS';
        return;
      }
      if (tag) tag.textContent = `${data.length} MEMBER${data.length !== 1 ? 'S' : ''}`;
      tbody.innerHTML = data.map(r => `
        <tr>
          <td>@${r.username || '—'}</td>
          <td style="font-family:var(--font-mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-secondary);">${r.user_type || '—'}</td>
          <td style="font-size:0.72rem;color:var(--text-secondary);">${new Date(r.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</td>
          <td><span class="s-badge ${r.verification_status === 'verified' ? 'verified' : 'pending'}">${r.verification_status || 'pending'}</span></td>
        </tr>
      `).join('');
    } catch (_) {}
  }

  /* ══════════════════════════════════════
     MAIN DASHBOARD LOAD
  ══════════════════════════════════════ */
  async function loadDashboard(user) {
    currentUser = user;

    // Switch views
    $('auth-gate')?.classList.add('hidden');
    $('dash-body')?.classList.remove('hidden');

    // Update Hero CTA for authenticated user
    const ctaBtn = $('hero-copy-btn');
    if (ctaBtn) {
      ctaBtn.textContent = 'Copy Your Referral Link';
      const signupBtn = ctaBtn.previousElementSibling;
      if (signupBtn) signupBtn.style.display = 'none';
      const ctaRow = ctaBtn.parentElement;
      if (ctaRow) ctaRow.style.justifyContent = 'center';
    }

    // Header badge & Logout
    const hdrRight = $('header-auth-status');
    if (hdrRight) {
      hdrRight.innerHTML = `
        <div style="display:flex;align-items:center;gap:1rem;">
          <div class="hdr-badge"><span class="hdr-dot"></span><span>${user.email}</span></div>
          <button class="btn-cp-ghost btn-sm" id="hdr-signout-btn" style="padding:0.3rem 0.6rem;font-size:0.6rem;height:auto;line-height:1;">Sign Out</button>
        </div>
      `;
      $('hdr-signout-btn')?.addEventListener('click', async () => {
        await sb.auth.signOut();
        currentUser = null;
        showAuthGate();
        toast('Signed out.');
      });
    }

    if ($('dash-greeting')) $('dash-greeting').textContent = `AUTHENTICATED // ${user.email}`;

    try {
      // 1. Get profile (username + ref code)
      const { data: profile } = await sb.from('profiles')
        .select('username, user_type, referral_code')
        .eq('id', user.id)
        .maybeSingle();

      const username = profile?.username || user.email.split('@')[0];
      const refCode  = profile?.referral_code || '';
      setLink(refCode);

      // 2. Referee info (was this person referred by someone?)
      const { data: refInfo } = await sb.rpc('get_referee_info', { p_user_id: user.id });
      if (refInfo?.was_referred) {
        const sc = $('sponsor-card');
        if (sc) sc.classList.remove('hidden');
        if ($('sponsor-name')) $('sponsor-name').textContent = `@${refInfo.sponsor_username}`;
        if ($('sponsor-type')) $('sponsor-type').textContent = refInfo.sponsor_type || '';
        if ($('sponsor-avatar')) $('sponsor-avatar').textContent = refInfo.sponsor_type === 'doctor' ? '⚕' : '◈';
      }

      // 3. Campaign stats
      const { data: stats } = await sb.rpc('get_campaign_stats', { p_user_id: user.id });
      const s = stats || {};

      if ($('s-referrals')) $('s-referrals').textContent = s.referred_count ?? 0;
      if ($('s-verified'))  $('s-verified').textContent  = s.joined_count ?? 0;
      if ($('s-clicks'))    $('s-clicks').textContent    = s.clicks ?? 0;
      if ($('s-conv'))      $('s-conv').textContent      = `${s.conversion_rate ?? 0}% conv.`;

      // 4. Load lists in parallel
      await Promise.all([
        loadReferralList(user.id),
        loadLeaderboard(username),
        loadInviteStats(user.id),
      ]);

    } catch (err) {
      console.error('Dashboard load error:', err);
      toast('Could not load all dashboard data.');
    }
  }

  /* ══════════════════════════════════════
     SHOW AUTH GATE
  ══════════════════════════════════════ */
  function showAuthGate() {
    $('dash-body')?.classList.add('hidden');
    $('auth-gate')?.classList.remove('hidden');

    // Show Sign In / Register in header for guests
    const hdr = $('header-auth-status');
    if (hdr) {
      hdr.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <button class="btn-cp-ghost btn-sm" id="hdr-signin-btn" style="padding:0.3rem 0.75rem;font-size:0.6rem;height:auto;line-height:1;">Sign In</button>
          <button class="btn-cp btn-sm" id="hdr-register-btn" style="padding:0.3rem 0.75rem;font-size:0.6rem;height:auto;line-height:1;">Register</button>
        </div>
      `;
      $('hdr-signin-btn')?.addEventListener('click', () => {
        showAuthForm('signin');
        $('auth-gate')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      $('hdr-register-btn')?.addEventListener('click', () => {
        showAuthForm('signup');
        $('auth-gate')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    showAuthForm('signin');

    // Restore Hero CTA for guest user
    const ctaBtn = $('hero-copy-btn');
    if (ctaBtn) {
      ctaBtn.textContent = 'Copy Your Referral Link';
      const signupBtn = ctaBtn.previousElementSibling;
      if (signupBtn) signupBtn.style.display = '';
      const ctaRow = ctaBtn.parentElement;
      if (ctaRow) ctaRow.style.justifyContent = '';
    }

    const refCode = localStorage.getItem('at_referral_code');
    if (refCode) {
      const banner = $('ref-banner');
      if (banner) {
        banner.classList.remove('hidden');
        $('ref-banner-text').textContent = `You were invited via referral code: ${refCode}`;
      }
    }
  }

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  async function init() {
    trackClick();
    loadHeroCounters();

    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      await loadDashboard(session.user);
    } else {
      showAuthGate();
    }

    sb.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadDashboard(session.user);
      } else {
        currentUser = null;
        showAuthGate();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();
