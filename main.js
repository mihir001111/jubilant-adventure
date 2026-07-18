document.addEventListener('DOMContentLoaded', () => {
  // 0. PRELOADER FADE OUT
  window.addEventListener('load', () => {
    const preloader = document.getElementById('global-preloader');
    if (preloader) {
      preloader.classList.add('loaded');
      setTimeout(() => preloader.remove(), 1200);
    }
  });

  console.log('After Trials landing page initialized.');

  // Capture referral code from URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  if (refCode) {
    localStorage.setItem('at_referral_code', refCode);
    console.log('Saved referral code:', refCode);
  }


  // ==========================================================================
  // 1. SCROLL REVEAL ANIMATIONS (INTERSECTION OBSERVER)
  // ==========================================================================
  const revealOptions = {
    root: null,
    threshold: 0.15,
    rootMargin: '0px'
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target);
      }
    });
  }, revealOptions);

  const revealElements = document.querySelectorAll('.reveal');
  revealElements.forEach(el => revealObserver.observe(el));


  // ==========================================================================
  // 2. DYNAMIC COMMUNITY COUNTERS
  // ==========================================================================
  const counters = document.querySelectorAll('.counter-num');
  let countersAnimated = false;

  const animateCounters = () => {
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'), 10);
      const duration = 2000; // 2 seconds animation
      const startTime = performance.now();

      const updateCount = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Easing out quadratic
        const easeProgress = progress * (2 - progress);
        const currentCount = Math.floor(easeProgress * target);

        // Format numbers > 1000 with a comma
        counter.textContent = currentCount.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          counter.textContent = target.toLocaleString();
        }
      };

      requestAnimationFrame(updateCount);
    });
  };

  const communitySection = document.getElementById('community');
  if (communitySection) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated) {
          animateCounters();
          countersAnimated = true;
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    counterObserver.observe(communitySection);
  }

  // ==========================================================================
  // 2B. EDITORIAL DYNAMIC BOX ANIMATION
  // ==========================================================================
  const initEditorialAnimation = () => {
    const box = document.getElementById('editorialDynamicBox');
    if (!box) return;

    const icon = document.getElementById('edIcon');
    const title = document.getElementById('edTitle');
    const li1 = document.getElementById('edLi1');
    const li2 = document.getElementById('edLi2');
    const li3 = document.getElementById('edLi3');

    let state = 0; // 0: negative, 1: positive
    let loopTimeout;

    const runLoop = () => {
      // 1. Initial Negative State (Price of Isolation) is set. Wait 2 seconds.
      loopTimeout = setTimeout(() => {
        // 2. Add 'cut' class (draws strikethrough lines)
        box.classList.add('ed-state-cut');

        loopTimeout = setTimeout(() => {
          // 3. Fade out
          box.classList.add('ed-state-fade');

          loopTimeout = setTimeout(() => {
            // 4. Swap to Positive State
            const trans = window.translations ? window.translations[window.currentLanguage] : null;
            if (trans) {
              title.textContent = trans.crisis_col2_header || "THE POWER OF UNITY";
              li1.textContent = trans.crisis_col2_li1 || "Sovereign Peer Support";
              li2.textContent = trans.crisis_col2_li2 || "Unified Bargaining";
              li3.textContent = trans.crisis_col2_li3 || "Safe Clinical Training";
            } else {
              title.textContent = "THE POWER OF UNITY";
              li1.textContent = "Sovereign Peer Support";
              li2.textContent = "Unified Bargaining";
              li3.textContent = "Safe Clinical Training";
            }
            icon.textContent = "✓";

            box.classList.remove('ed-state-cut');
            box.classList.add('ed-state-positive');
            box.classList.remove('ed-state-fade'); // Fade in

            loopTimeout = setTimeout(() => {
              // 5. Fade out
              box.classList.add('ed-state-fade');

              loopTimeout = setTimeout(() => {
                // 6. Swap to Negative State
                if (trans) {
                  title.textContent = trans.crisis_col1_header || "THE PRICE OF ISOLATION";
                  li1.textContent = trans.crisis_col1_li1 || "Academic Bullying";
                  li2.textContent = trans.crisis_col1_li2 || "Systemic Burnout";
                  li3.textContent = trans.crisis_col1_li3 || "Institutional Exploitation";
                } else {
                  title.textContent = "THE PRICE OF ISOLATION";
                  li1.textContent = "Academic Bullying";
                  li2.textContent = "Systemic Burnout";
                  li3.textContent = "Institutional Exploitation";
                }
                icon.textContent = "✕";

                box.classList.remove('ed-state-positive');
                box.classList.remove('ed-state-fade'); // Fade in

                // Restart Loop
                runLoop();
              }, 400); // Wait for fade out
            }, 3000); // Stay on positive for 3s
          }, 400); // Wait for fade out
        }, 1500); // Stay with cut lines for 1.5s
      }, 2500); // Stay on negative for 2.5s
    };

    // Start loop
    runLoop();
  };

  initEditorialAnimation();
  // ==========================================================================
  // 3. EDITORIAL PROSE ONBOARDING INTAKE + SUPABASE AUTH WIZARD LOGIC
  // ==========================================================================
  const onboardingForm = document.getElementById('onboardingForm');
  const petitionProse = document.getElementById('petitionProse');
  const petitionActions = document.getElementById('petitionActions');
  const successSlide = document.getElementById('successSlide');
  const inlineInputs = document.querySelectorAll('.inline-input, .inline-select');

  let otpTimerInterval = null;

  // Persist form data between phases
  let formData = {
    fullName: '',
    role: '',
    affiliation: '',
    course: '',
    specialty: '',
    email: '',
    phone: '',
  };

  // Course to Specialties Mapping
  const COURSE_SPECIALTIES = {
    'Medicine': [
      'General Practice',
      'Internal Medicine',
      'Pediatrics',
      'Cardiology',
      'Dermatology',
      'Psychiatry',
      'Radiology',
      'Anesthesiology',
      'Emergency Medicine',
      'Others'
    ],
    'Surgery': [
      'General Surgery',
      'Orthopedics',
      'Obstetrics & Gynecology',
      'Plastic Surgery',
      'Ophthalmology',
      'ENT',
      'Urology',
      'Others'
    ],
    'Dentistry': [
      'General Dentistry',
      'Orthodontics',
      'Oral & Maxillofacial Surgery',
      'Prosthodontics',
      'Periodontics',
      'Others'
    ],
    'Nursing': [
      'General Nursing',
      'Critical Care',
      'Pediatric Nursing',
      'Psychiatric Nursing',
      'Others'
    ],
    'Physiotherapy': [
      'General Physiotherapy',
      'Orthopedic & Sports',
      'Neurological',
      'Cardio-Respiratory',
      'Others'
    ],
    'Others': []
  };

  // Dynamically adjust inputs width to fit typed content
  const adjustInputWidth = (input) => {
    const computedStyle = window.getComputedStyle(input);
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'pre';
    
    // Explicitly copy font properties to avoid shorthand serialization bugs in browsers
    tempSpan.style.fontSize = computedStyle.fontSize;
    tempSpan.style.fontFamily = computedStyle.fontFamily;
    tempSpan.style.fontWeight = computedStyle.fontWeight;
    tempSpan.style.fontStyle = computedStyle.fontStyle;
    tempSpan.style.letterSpacing = computedStyle.letterSpacing;

    if (input.tagName === 'SELECT') {
      const selectedOption = input.options[input.selectedIndex];
      tempSpan.textContent = selectedOption ? selectedOption.text : "select";
      document.body.appendChild(tempSpan);
      input.style.width = `${Math.max(tempSpan.offsetWidth + 30, 160)}px`;
    } else {
      tempSpan.textContent = input.value || input.placeholder || "";
      document.body.appendChild(tempSpan);
      input.style.width = `${Math.max(tempSpan.offsetWidth + 20, 150)}px`;
    }
    document.body.removeChild(tempSpan);
  };

  // Bind input listeners for auto-resizing
  inlineInputs.forEach(input => {
    // Initial size
    adjustInputWidth(input);
    
    // Auto resize as user types
    input.addEventListener('input', () => adjustInputWidth(input));
    input.addEventListener('change', () => adjustInputWidth(input));
  });

  // Course selection change handler
  const courseSelect = document.getElementById('input-course');
  const specialtySelect = document.getElementById('input-specialty');
  const specialtySelectContainer = document.getElementById('specialty-select-container');
  const specialtyTextContainer = document.getElementById('specialty-text-container');
  const specialtyCustomInput = document.getElementById('input-specialty-custom');

  if (courseSelect) {
    courseSelect.addEventListener('change', () => {
      const selectedCourse = courseSelect.value;
      
      // Reset specialty select options
      specialtySelect.innerHTML = '<option value="" disabled selected>select specialty</option>';
      
      if (selectedCourse === 'Others') {
        // Hide select dropdown, show text input
        specialtySelectContainer.style.display = 'none';
        specialtyTextContainer.style.display = 'inline-block';
        
        specialtySelect.required = false;
        specialtyCustomInput.required = true;
        specialtyCustomInput.placeholder = 'type specialty';
      } else {
        // Show select dropdown, hide text input
        specialtySelectContainer.style.display = 'inline-block';
        specialtyTextContainer.style.display = 'none';
        
        specialtySelect.required = true;
        specialtyCustomInput.required = false;
        
        // Populate specialties
        const specialties = COURSE_SPECIALTIES[selectedCourse] || [];
        specialties.forEach(spec => {
          const opt = document.createElement('option');
          opt.value = spec;
          opt.textContent = spec;
          specialtySelect.appendChild(opt);
        });
      }
      
      adjustInputWidth(courseSelect);
      adjustInputWidth(specialtySelect);
      if (specialtyCustomInput.style.display !== 'none') {
        adjustInputWidth(specialtyCustomInput);
      }
    });
  }

  // Specialty selection change handler
  if (specialtySelect) {
    specialtySelect.addEventListener('change', () => {
      const selectedSpecialty = specialtySelect.value;
      if (selectedSpecialty === 'Others') {
        specialtyTextContainer.style.display = 'inline-block';
        specialtyCustomInput.required = true;
        specialtyCustomInput.placeholder = 'type specialty';
      } else {
        specialtyTextContainer.style.display = 'none';
        specialtyCustomInput.required = false;
      }
      
      adjustInputWidth(specialtySelect);
      if (specialtyCustomInput.style.display !== 'none') {
        adjustInputWidth(specialtyCustomInput);
      }
    });
  }

  // Helper to set button loading states
  const setButtonLoading = (btn, isLoading, originalText) => {
    if (!btn) return;
    if (isLoading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.innerHTML = '<span class="btn-spinner"></span> Processing…';
    } else {
      btn.disabled = false;
      btn.textContent = originalText || btn.dataset.originalText || 'Continue';
    }
  };

  // Intercept Form Submit for Prose step (Phase 1 -> Phase 2)
  if (onboardingForm) {
    onboardingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const phaseProse = document.getElementById('phase-prose');
      if (phaseProse && !phaseProse.classList.contains('hidden')) {
        // Collect prose data
        formData.fullName = document.getElementById('input-name').value.trim();
        formData.role = document.getElementById('input-role').value;
        formData.affiliation = document.getElementById('input-affiliation').value;
        formData.course = document.getElementById('input-course').value;
        formData.email = document.getElementById('input-email').value.trim();
        formData.phone = document.getElementById('input-phone').value.trim();

        // Determine specialization field
        if (formData.course === 'Others') {
          formData.specialty = specialtyCustomInput.value.trim();
        } else if (specialtySelect.value === 'Others') {
          formData.specialty = specialtyCustomInput.value.trim();
        } else {
          formData.specialty = specialtySelect.value;
        }

        // Transition out prose, transition in Password
        phaseProse.classList.add('hidden');
        
        const phasePassword = document.getElementById('phase-password');
        if (phasePassword) {
          phasePassword.classList.remove('hidden');
          setTimeout(() => {
            const passInput = document.getElementById('reg-password');
            if (passInput) passInput.focus();
          }, 300);
        }
      }
    });
  }

  // OTP Digits Navigation Handling
  const otpDigits = document.querySelectorAll('.otp-digit');
  otpDigits.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const value = e.target.value;
      if (value.length === 1 && index < 5) {
        otpDigits[index + 1].focus();
      }
      updateFullOTP();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        otpDigits[index - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      const data = e.clipboardData.getData('text');
      if (data.length === 6 && /^\d+$/.test(data)) {
        for (let i = 0; i < 6; i++) {
          otpDigits[i].value = data[i];
        }
        updateFullOTP();
        otpDigits[5].focus();
        e.preventDefault();
      }
    });
  });

  const updateFullOTP = () => {
    let full = '';
    otpDigits.forEach(input => {
      full += input.value;
    });
    document.getElementById('full-otp').value = full;
  };

  // OTP Verification (Phase 3 -> Phase 4 / Success)
  window.verifyOTPStep = async () => {
    updateFullOTP();
    const entered = document.getElementById('full-otp').value;
    const errorEl = document.getElementById('err-otp');
    errorEl.textContent = '';

    if (entered.length !== 6) {
      errorEl.textContent = 'Please enter all 6 digits';
      return;
    }

    const btn = document.getElementById('btn-verify-otp');
    setButtonLoading(btn, true, 'Verifying Code…');

    try {
      // 1. Verify with Supabase Auth
      await SupabaseAuth.verifySignupOTP(formData.email, entered);

      // 2. Create profile row in profiles table
      const mappedUserType = SupabaseAuth.mapRoleToUserType(formData.role);
      await SupabaseAuth.createProfile({
        fullName: formData.fullName,
        userType: mappedUserType,
        institution: formData.affiliation,
        course: formData.course,
        specialization: formData.specialty,
        phone: formData.phone
      });

      // 3. Stop timer and show success
      stopOTPTimer();
      const phaseOTP = document.getElementById('phase-otp');
      if (phaseOTP) phaseOTP.classList.add('hidden');
      
      if (successSlide) {
        successSlide.style.display = 'block';
        setTimeout(() => {
          successSlide.classList.add('active');
        }, 50);

        // Fetch referral code and populate the link
        try {
          const currentU = await window.SupabaseAuth.getCurrentUser();
          const targetId = currentU ? currentU.id : null;
          if (targetId) {
            const refCode = await window.SupabaseAuth.getReferralCode(targetId);
            if (refCode) {
              const link = `${window.location.origin}/campaign.html?ref=${refCode}`;
              const successLinkInp = document.getElementById('success-ref-link');
              if (successLinkInp) successLinkInp.value = link;
            }
          }
        } catch (e) {
          console.error('Error fetching referral link on success:', e);
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      const msg = err.message || 'Verification failed. Please try again.';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('token')) {
        errorEl.textContent = 'Invalid or expired code. Please try again.';
      } else {
        errorEl.textContent = msg;
      }
      
      // Shake OTP container
      const container = document.querySelector('.otp-inputs-container');
      if (container) {
        container.style.animation = 'none';
        setTimeout(() => {
          container.style.animation = 'shake 0.4s ease';
        }, 10);
      }
    } finally {
      setButtonLoading(btn, false, 'Verify Code →');
    }
  };

  // OTP Timer Logic
  const startOTPTimer = () => {
    let seconds = 60;
    const timerText = document.getElementById('otp-timer-text');
    const resendBtn = document.getElementById('btn-resend-otp');

    if (timerText && resendBtn) {
      timerText.classList.remove('hidden');
      resendBtn.classList.add('hidden');
      timerText.textContent = `Resend code in 00:${seconds}`;

      clearInterval(otpTimerInterval);
      otpTimerInterval = setInterval(() => {
        seconds--;
        if (seconds < 10) {
          timerText.textContent = `Resend code in 00:0${seconds}`;
        } else {
          timerText.textContent = `Resend code in 00:${seconds}`;
        }

        if (seconds <= 0) {
          clearInterval(otpTimerInterval);
          timerText.classList.add('hidden');
          resendBtn.classList.remove('hidden');
        }
      }, 1000);
    }
  };

  const stopOTPTimer = () => {
    clearInterval(otpTimerInterval);
  };

  window.resendOTP = async () => {
    const resendBtn = document.getElementById('btn-resend-otp');
    const errorEl = document.getElementById('err-otp');
    errorEl.textContent = '';
    
    try {
      await SupabaseAuth.resendSignupOTP(formData.email);
      
      const notif = document.getElementById('otp-notification');
      if (notif) {
        notif.innerHTML = `Verification code resent to <strong>${formData.email}</strong>. Check your inbox.`;
        notif.style.display = 'block';
      }
      
      // Clear OTP inputs
      otpDigits.forEach(input => input.value = '');
      document.getElementById('full-otp').value = '';
      
      startOTPTimer();
      otpDigits[0].focus();
    } catch (err) {
      console.error('Resend OTP error:', err);
      errorEl.textContent = err.message || 'Failed to resend code. Please try again.';
    }
  };

  // Password Visibility Toggle
  document.querySelectorAll('.toggle-password-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.getAttribute('data-target');
      const input = document.getElementById(inputId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = 'hide';
        } else {
          input.type = 'password';
          btn.textContent = 'show';
        }
      }
    });
  });

  // Submit Password Step (Phase 2 -> Phase 3 / SignUp Call)
  window.submitPasswordStep = async () => {
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    const passErr = document.getElementById('err-password');
    const confirmErr = document.getElementById('err-confirm-password');
    const signupErr = document.getElementById('err-signup');

    passErr.textContent = '';
    confirmErr.textContent = '';
    signupErr.textContent = '';

    let isValid = true;

    if (!password || password.length < 6) {
      passErr.textContent = 'Password must be at least 6 characters';
      isValid = false;
    }
    if (password !== confirmPassword) {
      confirmErr.textContent = 'Passwords do not match';
      isValid = false;
    }

    if (!isValid) return;

    const btn = document.getElementById('btn-create-account');
    setButtonLoading(btn, true, 'Creating Account…');

    try {
      // 1. SignUp via Supabase Auth (this triggers the real OTP email)
      const mappedUserType = SupabaseAuth.mapRoleToUserType(formData.role);
      await SupabaseAuth.signUpUser(formData.email, password, mappedUserType);

      // 2. Hydrate OTP phase view with email
      const otpTargetEmail = document.getElementById('otp-target-email');
      if (otpTargetEmail) {
        otpTargetEmail.textContent = formData.email;
      }

      // 3. Hide password phase, show OTP phase
      const phasePassword = document.getElementById('phase-password');
      if (phasePassword) phasePassword.classList.add('hidden');
      
      const phaseOTP = document.getElementById('phase-otp');
      if (phaseOTP) {
        phaseOTP.classList.remove('hidden');
        startOTPTimer();
        setTimeout(() => {
          const firstDigit = document.querySelector('.otp-digit');
          if (firstDigit) firstDigit.focus();
        }, 300);
      }
    } catch (err) {
      console.error('Signup error:', err);
      signupErr.textContent = err.message || 'Signup failed. Please try again.';
    } finally {
      setButtonLoading(btn, false, 'Create Account &rarr;');
    }
  };

  // Navigation back buttons
  window.backToProse = () => {
    const phaseProse = document.getElementById('phase-prose');
    const phasePassword = document.getElementById('phase-password');
    if (phasePassword) phasePassword.classList.add('hidden');
    if (phaseProse) phaseProse.classList.remove('hidden');
  };

  window.backToOTP = () => {
    // Note: The flow has been updated so that OTP comes after password.
    // So there is no backToOTP from password. Rather backToProse goes back from password.
  };

  // Start Onboarding Button (Hero CTA)
  const startOnboardingBtn = document.getElementById('startOnboardingBtn');
  if (startOnboardingBtn) {
    startOnboardingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = document.getElementById('onboarding');
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
        // Set focus to the first question input
        setTimeout(() => {
          const firstInput = document.getElementById('input-name');
          if (firstInput) firstInput.focus();
        }, 800);
      }
    });
  }

  // ==========================================================================
  // 6. CAMPAIGN DASHBOARD LOGIC (moved up since modal was removed)
  // ==========================================================================

  // Campaign Modal & Dashboard Logic
  const campaignModal = document.getElementById('campaign-modal');
  const closeCampaignModalBtn = document.getElementById('closeCampaignModalBtn');
  const openCampaignBtn = document.getElementById('open-campaign-btn');
  const copyReferralBtn = document.getElementById('copy-referral-btn');

  const renderCampaignDashboard = async () => {
    const linkInput = document.getElementById('referral-link-input');
    const copyBtn = document.getElementById('copy-referral-btn');
    const rankEl = document.getElementById('stat-rank');
    const invitedEl = document.getElementById('stat-invited');
    const gainedEl = document.getElementById('stat-gained');
    const tableBody = document.getElementById('referrals-table-body');
    const authBox = document.getElementById('campaign-auth-box');

    // Show initial loading
    if (linkInput) linkInput.value = 'Checking authorization...';
    if (rankEl) rankEl.textContent = '...';
    if (invitedEl) invitedEl.textContent = '...';
    if (gainedEl) gainedEl.textContent = '...';

    try {
      const user = await window.SupabaseAuth.getCurrentUser();
      if (!user) {
        // Not logged in
        if (linkInput) linkInput.value = window.location.origin;
        if (copyBtn) {
          copyBtn.disabled = true;
          copyBtn.style.opacity = '0.5';
          copyBtn.style.pointerEvents = 'none';
        }
        if (rankEl) rankEl.textContent = '—';
        if (invitedEl) invitedEl.textContent = '—';
        if (gainedEl) gainedEl.textContent = '—';
        if (tableBody) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                Authenticate to view your referred network.
              </td>
            </tr>
          `;
        }
        if (authBox) {
          authBox.innerHTML = `
            <div style="font-weight: 600; color: #b71c1c; margin-bottom: 0.5rem; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; font-family: var(--font-mono);">STATUS: UNIDENTIFIED GUEST</div>
            <p style="color: var(--text-secondary); margin-bottom: 0.75rem; font-size: 0.8rem;">Your account is not authenticated on this device. Sign up or log in to view your referral stats.</p>
            <button id="campaign-cta-btn" class="btn-primary" style="width: 100%; font-size: 0.75rem; padding: 0.6rem; text-align: center; justify-content: center; height: auto;">CLAIM ACCESS KEY &rarr;</button>
          `;
          
          document.getElementById('campaign-cta-btn').addEventListener('click', () => {
            closeCampaignModal();
            const targetSection = document.getElementById('onboarding');
            if (targetSection) {
              targetSection.scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => {
                const firstInput = document.getElementById('input-name');
                if (firstInput) firstInput.focus();
              }, 800);
            }
          });
        }
      } else {
        // Logged in!
        if (copyBtn) {
          copyBtn.disabled = false;
          copyBtn.style.opacity = '1';
          copyBtn.style.pointerEvents = 'auto';
        }
        
        // Fetch stats
        const stats = await window.SupabaseAuth.getWaitlistStats(user.id);
        const referrals = await window.SupabaseAuth.getReferrals(user.id);
        
        if (stats) {
          const referralCode = stats.referral_code || 'no-code';
          if (linkInput) {
            linkInput.value = `${window.location.origin}/?ref=${referralCode}`;
          }
          if (rankEl) rankEl.textContent = `#${stats.position || '—'}`;
          if (invitedEl) invitedEl.textContent = stats.referred_count ?? 0;
          if (gainedEl) {
            gainedEl.textContent = `+${stats.spots_gained ?? 0}`;
            gainedEl.style.color = '#2e7d32';
          }
        }
        
        if (tableBody) {
          if (!referrals || referrals.length === 0) {
            tableBody.innerHTML = `
              <tr>
                <td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                  No referred members yet. Share your link to grow your network!
                </td>
              </tr>
            `;
          } else {
            tableBody.innerHTML = referrals.map(ref => {
              const roleDisplay = ref.user_type ? ref.user_type.charAt(0).toUpperCase() + ref.user_type.slice(1) : 'User';
              const statusDisplay = ref.verification_status === 'verified' 
                ? '<span style="color: #2e7d32; font-weight: 600;">VERIFIED</span>' 
                : '<span style="color: #f57c00; font-weight: 600;">PENDING</span>';
              
              let displayName = ref.username || 'Anonymous';
              if (displayName.includes('@')) {
                const parts = displayName.split('@');
                displayName = parts[0].substring(0, 3) + '***@' + parts[1];
              } else if (displayName.length > 12) {
                displayName = displayName.substring(0, 10) + '...';
              }
              
              return `
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 0.75rem; font-family: var(--font-mono);">${displayName}</td>
                  <td style="padding: 0.75rem;">${roleDisplay}</td>
                  <td style="padding: 0.75rem; text-align: right; font-size: 0.75rem; font-family: var(--font-mono);">${statusDisplay}</td>
                </tr>
              `;
            }).join('');
          }
        }
        
        if (authBox) {
          authBox.innerHTML = `
            <div style="font-weight: 600; color: #2e7d32; margin-bottom: 0.5rem; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; font-family: var(--font-mono);">STATUS: AUTHENTICATED</div>
            <p style="color: var(--text-secondary); margin-bottom: 0.75rem; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Active user: <strong style="color: var(--text);">${user.email}</strong></p>
            <button id="campaign-logout-btn" class="btn-primary" style="width: 100%; font-size: 0.75rem; padding: 0.6rem; text-align: center; justify-content: center; height: auto; background-color: transparent; color: var(--text); border-color: var(--border);">SIGN OUT</button>
          `;
          
          document.getElementById('campaign-logout-btn').addEventListener('click', async () => {
            const logoutBtn = document.getElementById('campaign-logout-btn');
            logoutBtn.disabled = true;
            logoutBtn.textContent = 'SIGNING OUT...';
            try {
              await window.SupabaseAuth.signOut();
              await renderCampaignDashboard();
            } catch (err) {
              console.error('Logout error:', err);
              alert('Logout failed: ' + err.message);
              logoutBtn.disabled = false;
              logoutBtn.textContent = 'SIGN OUT';
            }
          });
        }
      }
    } catch (err) {
      console.error('Error rendering campaign dashboard:', err);
      if (linkInput) linkInput.value = 'Failed to load data';
    }
  };

  const openCampaignModal = () => {
    if (campaignModal) {
      campaignModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderCampaignDashboard();
    }
  };

  const closeCampaignModal = () => {
    if (campaignModal) {
      campaignModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  if (openCampaignBtn) {
    openCampaignBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCampaignModal();
    });
  }

  if (closeCampaignModalBtn) {
    closeCampaignModalBtn.addEventListener('click', closeCampaignModal);
  }

  if (campaignModal) {
    campaignModal.addEventListener('click', (e) => {
      if (e.target === campaignModal) {
        closeCampaignModal();
      }
    });
  }

  if (copyReferralBtn) {
    copyReferralBtn.addEventListener('click', () => {
      const linkInput = document.getElementById('referral-link-input');
      if (linkInput && linkInput.value && linkInput.value !== 'Loading...' && linkInput.value !== 'Checking authorization...') {
        navigator.clipboard.writeText(linkInput.value).then(() => {
          const originalText = copyReferralBtn.textContent;
          copyReferralBtn.textContent = 'Copied!';
          copyReferralBtn.style.backgroundColor = '#2e7d32';
          copyReferralBtn.style.borderColor = '#2e7d32';
          setTimeout(() => {
            copyReferralBtn.textContent = originalText;
            copyReferralBtn.style.backgroundColor = '';
            copyReferralBtn.style.borderColor = '';
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy text: ', err);
        });
      }
    });
  }

  // Keyboard escape key to close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDocument();
      closeCampaignModal();
    }
  });

  // ==========================================================================
  // 1.5 SVG CONNECTION STRINGS (DISABLED FOR EDITORIAL LAYOUT)
  // ==========================================================================
  const drawConnections = () => {
    // Disabled in favor of the structured editorial grid
  };

  // ==========================================================================
  // 5. SCROLLSPY FOR FLOATING DOCK
  // ==========================================================================
  const navDockLinks = document.querySelectorAll('.floating-nav-dock .nav-link-item');
  const sections = document.querySelectorAll('section');

  const scrollspy = () => {
    let currentActiveSectionId = '';
    // Offset slightly so sections trigger earlier
    const scrollPos = window.scrollY + window.innerHeight / 3;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        currentActiveSectionId = id;
      }
    });

    const navDock = document.querySelector('.floating-nav-dock');
    if (navDock) {
      if (!currentActiveSectionId || currentActiveSectionId === 'hero' || currentActiveSectionId === 'onboarding') {
        navDock.classList.add('hidden');
      } else {
        navDock.classList.remove('hidden');
      }
    }

    if (currentActiveSectionId) {
      navDockLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentActiveSectionId}`) {
          link.classList.add('active');
        }
      });
    }
  };

  let isScrollspyTicking = false;
  window.addEventListener('scroll', () => {
    if (!isScrollspyTicking) {
      window.requestAnimationFrame(() => {
        scrollspy();
        isScrollspyTicking = false;
      });
      isScrollspyTicking = true;
    }
  }, { passive: true });

  // ==========================================================================
  // AUTHENTICATION STATE & LOG IN / LOG OUT LOGIC FOR MAIN LANDING
  // ==========================================================================
  const checkSession = async () => {
    try {
      const user = await window.SupabaseAuth.getCurrentUser();
      const heroCta = document.getElementById('startOnboardingBtn');
      
      if (user) {
        // Authenticated user
        // 1. Hide registration phases, show Authenticated Vault
        document.getElementById('phase-prose')?.classList.add('hidden');
        document.getElementById('phase-password')?.classList.add('hidden');
        document.getElementById('phase-otp')?.classList.add('hidden');
        document.getElementById('phase-signin')?.classList.add('hidden');
        
        const vaultPanel = document.getElementById('phase-authenticated');
        if (vaultPanel) {
          vaultPanel.classList.remove('hidden');
          const emailDisp = document.getElementById('auth-email-display');
          if (emailDisp) emailDisp.textContent = user.email;
          
          // Get stats
          const stats = await window.SupabaseAuth.getWaitlistStats(user.id);
          if (stats) {
            const refDisp = document.getElementById('auth-referred-display');
            if (refDisp) refDisp.textContent = `${stats.referred_count || 0} peer${stats.referred_count === 1 ? '' : 's'}`;
          }

          // Get referral link for copy
          try {
            const refCode = await window.SupabaseAuth.getReferralCode(user.id);
            if (refCode) {
              const link = `${window.location.origin}/campaign.html?ref=${refCode}`;
              const authLinkInp = document.getElementById('auth-ref-link');
              if (authLinkInp) authLinkInp.value = link;
            }
          } catch (e) {
            console.error('Error fetching referral link for auth:', e);
          }
        }

        // 2. Hide Hero CTA entirely (replaced by inline vault) or adjust it
        if (heroCta) {
          heroCta.style.display = 'none';
        }
      } else {
        // Guest user
        document.getElementById('phase-authenticated')?.classList.add('hidden');
        document.getElementById('phase-prose')?.classList.remove('hidden');
        
        if (heroCta) {
          heroCta.style.display = 'inline-flex';
          heroCta.textContent = 'Unite With Us \u2192';
          heroCta.setAttribute('href', '#onboarding');
          // Re-bind scroll click behavior
          heroCta.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = document.getElementById('onboarding');
            if (targetSection) {
              targetSection.scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => {
                const firstInput = document.getElementById('input-name');
                if (firstInput) firstInput.focus();
              }, 800);
            }
          });
        }
      }
    } catch (err) {
      console.warn('Session check error:', err);
    }
  };

  window.showSigninPhase = () => {
    document.getElementById('phase-prose')?.classList.add('hidden');
    document.getElementById('phase-signin')?.classList.remove('hidden');
    const loginEmail = document.getElementById('login-email');
    if (loginEmail) {
      loginEmail.focus();
      // adjust input width to custom placeholder if any
      adjustInputWidth(loginEmail);
    }
  };

  window.showProsePhase = () => {
    document.getElementById('phase-signin')?.classList.add('hidden');
    document.getElementById('phase-prose')?.classList.remove('hidden');
  };

  window.submitLogin = async () => {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errEl = document.getElementById('err-login');
    const submitBtn = document.getElementById('btn-login-submit');

    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passwordInput ? passwordInput.value : '';

    if (!email || !pass) {
      if (errEl) errEl.textContent = 'Please enter email and passcode.';
      return;
    }

    if (errEl) errEl.textContent = '';
    setButtonLoading(submitBtn, true, 'Signing In…');

    try {
      await window.SupabaseAuth.signIn(email, pass);
      
      // Load authenticated state
      await checkSession();
      console.log('Login success');
    } catch (err) {
      console.error('Login error:', err);
      if (errEl) errEl.textContent = err.message || 'Login failed. Please verify credentials.';
    } finally {
      setButtonLoading(submitBtn, false, 'Sign In \u2192');
    }
  };

  window.signOutFromMain = async () => {
    try {
      await window.SupabaseAuth.signOut();
      console.log('Signed out from main');
      
      // Reset input fields
      const loginEmail = document.getElementById('login-email');
      const loginPassword = document.getElementById('login-password');
      const inputEmail = document.getElementById('input-email');
      const inputName = document.getElementById('input-name');
      
      if (loginEmail) loginEmail.value = '';
      if (loginPassword) loginPassword.value = '';
      if (inputEmail) inputEmail.value = '';
      if (inputName) inputName.value = '';
      
      // Refresh UI
      await checkSession();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Initial State Setup
  scrollspy();
  // Delay initial drawing slightly to let layout dimensions initialize
  setTimeout(drawConnections, 400);

  // Run session check on start
  checkSession();

  // Copy Referral Link logic
  const copyReferralLink = (inputId, btnId) => {
    const inputEl = document.getElementById(inputId);
    const btnEl = document.getElementById(btnId);
    if (!inputEl || !btnEl || !inputEl.value) return;

    navigator.clipboard.writeText(inputEl.value).then(() => {
      const originalText = btnEl.textContent;
      btnEl.textContent = 'Copied!';
      btnEl.style.backgroundColor = '#10b981';
      btnEl.style.borderColor = '#10b981';
      setTimeout(() => {
        btnEl.textContent = originalText;
        btnEl.style.backgroundColor = '';
        btnEl.style.borderColor = '';
      }, 2000);
    }).catch((err) => {
      console.error('Copy failed:', err);
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = inputEl.value; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      btnEl.textContent = 'Copied!';
      setTimeout(() => btnEl.textContent = 'Copy', 2000);
    });
  };

  document.getElementById('btn-auth-copy')?.addEventListener('click', () => {
    copyReferralLink('auth-ref-link', 'btn-auth-copy');
  });

  document.getElementById('btn-success-copy')?.addEventListener('click', () => {
    copyReferralLink('success-ref-link', 'btn-success-copy');
  });

  // ─── TEXT SCRAMBLE DECODER EFFECT ───
  const scrambleTextToWord = (el, targetWord) => {
    if (el.dataset.scrambling === 'true') return;
    el.dataset.scrambling = 'true';
    const chars = '[]/\\_{}#*+=?!@$%&';
    let iterations = 0;
    
    const interval = setInterval(() => {
      el.textContent = targetWord
        .split('')
        .map((char, index) => {
          if (index < iterations) {
            return targetWord[index] || '';
          }
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');
      
      if (iterations >= targetWord.length) {
        clearInterval(interval);
        el.textContent = targetWord;
        el.dataset.scrambling = 'false';
      }
      iterations += 1/3;
    }, 20);
  };

  const scrambleCurrentText = (el) => {
    const word = el.textContent.trim();
    scrambleTextToWord(el, word);
  };

  // Scramble on hover
  const outerCells = document.querySelectorAll('.poster-cell:not(.cell-cta)');
  outerCells.forEach(cell => {
    cell.addEventListener('mouseenter', () => {
      const textSpan = cell.querySelector('.cell-text');
      if (textSpan) {
        scrambleCurrentText(textSpan);
      }
    });
  });

  // ─── 3D PARALLAX TILT EFFECT ───
  const heroSection = document.getElementById('hero');
  const posterGrid = document.querySelector('.hero-grid-poster');
  if (heroSection && posterGrid) {
    heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      
      // Rotate grid by max +/- 6 degrees
      const rotateX = ((yc - y) / yc) * 6;
      const rotateY = ((x - xc) / xc) * 6;
      
      posterGrid.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    heroSection.addEventListener('mouseleave', () => {
      posterGrid.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  }

  // ==========================================================================
  // X. DYNAMIC RANDOM GRID HIGHLIGHTS
  // ==========================================================================
  const startGridRandomizer = () => {
    const cells = Array.from(document.querySelectorAll('.poster-cell'));
    if (cells.length < 9) return;
    
    const fullSentences = {
      en: [
        ["EVERY", "MEDICAL", "STUDENT", "& DOCTOR", "MUST", "STAND", "UNITED", "TOGETHER"],
        ["THE", "ONLY", "SECURE", "NETWORK", "FOR", "ALL", "MEDICAL", "DOCTORS"],
        ["WE", "ARE", "THE", "SOVEREIGN", "COLLECTIVE", "DEFENDING", "OUR", "PROFESSION"]
      ],
      it: [
        ["OGNI", "STUDENTE", "DI MEDICINA", "& MEDICO", "DEVE", "RESTARE", "UNITO", "AGLI ALTRI"],
        ["L'UNICA", "RETE", "SICURA", "PER", "TUTTI", "I", "MEDICI", "ITALIANI"],
        ["SIAMO", "IL", "COLLETTIVO", "SOVRANO", "A", "DIFESA", "DELLA", "PROFESSIONE"]
      ]
    };
    const colorClasses = ['bg-crayon-blue', 'bg-crayon-orange', 'bg-crayon-green', 'bg-crayon-pink', 'bg-crayon-yellow', 'bg-crayon-purple'];
    
    setInterval(() => {
      // 1. Reset color classes on all cells
      cells.forEach(cell => {
        colorClasses.forEach(cls => cell.classList.remove(cls));
      });

      // 2. Pick a random sentence based on current language
      const lang = window.currentLanguage || 'en';
      const sentences = fullSentences[lang] || fullSentences['en'];
      const currentSentence = sentences[Math.floor(Math.random() * sentences.length)];

      // 3. Update all outer texts to form the 9-word sentence with scramble
      const outerIndices = [0, 1, 2, 3, 5, 6, 7, 8];
      outerIndices.forEach((idx, i) => {
        const textSpan = cells[idx].querySelector('.cell-text');
        if (textSpan) {
          const newWord = currentSentence[i];
          textSpan.setAttribute('data-i18n', `hero_dynamic_${i}`);
          scrambleTextToWord(textSpan, newWord);
        }
      });

      // Only the center cell (index 4) changes color dynamically
      const activeColoredIndices = [4];
      
      // Assign random colors
      activeColoredIndices.forEach(idx => {
        const cell = cells[idx];
        const randomColor = colorClasses[Math.floor(Math.random() * colorClasses.length)];
        cell.classList.add(randomColor);
      });

    }, 4000); // Change every 4 seconds
  };
  
  startGridRandomizer();

});
