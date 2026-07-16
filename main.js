document.addEventListener('DOMContentLoaded', () => {
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
        specialization: formData.specialty
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
          const targetId = user ? user.id : (currentU ? currentU.id : null);
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
  // 6. DYNAMIC ENTERPRISE MODAL LOGIC
  // ==========================================================================
  const documentData = {
    privacy: {
      category: "COMPLIANCE // PRIVACY",
      title: "Privacy & Identity Charter",
      meta: {
        effective: "July 2026",
        version: "v2.4.1",
        jurisdiction: "EU (Rome/Lisbon/Brussels)",
        classification: "Highly Confidential (Restricted)"
      },
      content: `
        <h4>1. Scope and Commitments</h4>
        <p>After Trials is built to ensure absolute anonymity and security for physicians, residents, and medical students. We process credentials and telemetry with zero-knowledge encryption models.</p>
        
        <h4>2. Practitioner Identity Protection</h4>
        <p>Your license credentials and ID verification materials are hashed immediately upon checks and stored under local client-side vaults. We do not store plain-text copies of National Registry IDs or hospital access cards on centralised relay nodes.</p>
        
        <h4>3. Zero hospital database links</h4>
        <p>We maintain no data agreements, API hooks, or background directory syncs with public or private hospital employer databases. Your presence on this platform is shielded from institutional authorities.</p>
      `
    },
    terms: {
      category: "REGULATORY // CONDUCT",
      title: "Terms of Membership Agreement",
      meta: {
        effective: "July 2026",
        version: "v2.0.2",
        compliance: "Medical Code of Conduct",
        scope: "Founding Registrants"
      },
      content: `
        <h4>1. Admission Criteria</h4>
        <p>Membership is limited strictly to active healthcare practitioners, medical students, and residents. Sponsoring organizations do not receive account credentials for sponsored individuals.</p>
        
        <h4>2. Absolute Confidentiality</h4>
        <p>Practitioners must not take screenshots, extract chat logs, or disclose statements made inside peer channels. Violating peer confidentiality results in immediate revocation of access keys and permanent IP blocking.</p>
        
        <h4>3. Liability Exemptions</h4>
        <p>After Trials provides secure channels for venting and collaboration. Clinical guidelines discussed inside channels do not replace formal consultations or hospital policy guidelines.</p>
      `
    },
    gdpr: {
      category: "COMPLIANCE // GDPR",
      title: "General Data Protection Compliance",
      meta: {
        authority: "EU GDPR Regulation 2016/679",
        dataHost: "Rome, IT / Milan, IT",
        retention: "Zero log policy",
        encryption: "AES-GCM 256-bit"
      },
      content: `
        <h4>1. Right to Permanent Erasure</h4>
        <p>Every member holds an absolute right to wipe their entire data presence instantly. Deleting an account executes a cryptographic shredding routine that wipes messaging indices across all peer nodes.</p>
        
        <h4>2. Local Data Processing</h4>
        <p>In accordance with GDPR requirements, all medical telemetry and chat messages are hosted exclusively on European soil (Rome and Milan database clusters).</p>
        
        <h4>3. Cookie-Free Architecture</h4>
        <p>Our platform does not use tracking cookies, analytics pixels, or advertisement tokens. We use session-only local vaults to preserve onboarding states.</p>
      `
    },
    cookies: {
      category: "PREFERENCES // CACHE",
      title: "Cookie & Session Preferences",
      meta: {
        cookiesUsed: "0 (Zero Tracking Cookies)",
        storageType: "SessionStorage / LocalStorage",
        dataShared: "None",
        audit: "Verified July 2026"
      },
      content: `
        <h4>1. Zero-Tracking Architecture</h4>
        <p>After Trials has intentionally removed all cookies from its network code. We reject tracking pixels, analytical scripts, and marketing integrations.</p>
        
        <h4>2. What We Store Locally</h4>
        <p>To enable the onboarding wizard, we use the browser's <code>localStorage</code> to cache progress states. Sessional data is wiped instantly once onboarding verification is concluded.</p>
      `
    },
    dpa: {
      category: "DATA PROTECTION // DPA",
      title: "Data Processing Addendum",
      meta: {
        standard: "EU Standard Contractual Clauses (SCC)",
        processor: "After Trials Inc.",
        auditCycle: "Semi-Annual",
        securityLevel: "Tier 4 Military Grade"
      },
      content: `
        <h4>1. Purpose of Processing</h4>
        <p>Data processing is confined strictly to securing physician validation credentials and routing encrypted peer communication packets.</p>
        
        <h4>2. Cryptographic Security Standards</h4>
        <p>Data is encrypted in-transit using TLS 1.3 and at-rest using AES-GCM 256-bit keys. Keys are rotated dynamically every 24 hours.</p>
        
        <h4>3. Third-Party Sub-Processors</h4>
        <p>We do not delegate database tasks to third-party sub-processors. Sessional database relays are owned and managed by After Trials directly.</p>
      `
    },
    sla: {
      category: "SERVICE LEVEL // SLA",
      title: "Service Level Agreement Commitment",
      meta: {
        uptimeCommitment: "99.9% Network Availability",
        backupInterval: "Hourly Cryptographic Backups",
        supportResponse: "< 2 Hours Response",
        classification: "Enterprise Standards"
      },
      content: `
        <h4>1. Availability Objectives</h4>
        <p>We commit to maintaining a secure, low-latency messaging network. In case of localized infrastructure failures, network traffic redirects dynamically to backup clusters.</p>
        
        <h4>2. Maintenance Windows</h4>
        <p>System updates are rolled out in hot-swap intervals. No scheduled downtime will impact peer communications during hospital peak shift hours.</p>
      `
    },
    hospitals: {
      category: "ENTERPRISE // HOSPITALS",
      title: "Hospital Systems & Institutional Access",
      meta: {
        audience: "Clinical Admins, Health Boards",
        securitySponsor: "Double-Blind Verification",
        readAccess: "Strictly Restricted (Zero Read Access)",
        deployment: "Cloud Hybrid Gateway"
      },
      content: `
        <h4>1. Institutional Sponsorship</h4>
        <p>Hospital networks can purchase bulk license credits to sponsor their residents and physicians. However, sponsored members retain absolute private credentials that are completely decoupled from administrative oversight.</p>
        
        <h4>2. Zero-Trust Admin Dashboards</h4>
        <p>Administrators receive telemetry reporting on registration volumes and active usage metrics. However, they receive <strong>zero read access</strong> to actual peer chats, message contents, or practitioner identities.</p>
      `
    },
    academic: {
      category: "ENTERPRISE // ACADEMIC",
      title: "Academic & Residency Programs",
      meta: {
        target: "Medical Students, Residency Directors",
        discountRate: "100% Free for verified trainees",
        verification: "Academic Domain Check",
        partners: "European Medical Faculties"
      },
      content: `
        <h4>1. Residency Support Gateways</h4>
        <p>Resident burnout is at an all-time high. Sponsoring university directors can provision private venting nodes to help residents coordinate safely without fearing academic or professional repercussions.</p>
        
        <h4>2. Student Integration</h4>
        <p>Medical students receive access to mentor channels. Trainee credentials are verified via institutional university domains to ensure safe learning buffers.</p>
      `
    },
    security: {
      category: "SECURITY // PROTOCOLS",
      title: "Cryptographic Security Protocol Charter",
      meta: {
        encryptionMode: "Zero-Knowledge Proofs",
        authFactor: "Biometric WebAuthn Keys",
        databaseType: "Decentralised Peer Relays",
        auditRating: "A+ Certified Class"
      },
      content: `
        <h4>1. Message Isolation</h4>
        <p>Our messaging architecture runs in sandboxed virtual layers. Once a message is fetched by a peer device, it is wiped from intermediate routing servers immediately.</p>
        
        <h4>2. Hardware Cryptography</h4>
        <p>Practitioners can bind their access keys to local secure enclaves (TouchID, FaceID, or physical YubiKeys) to protect against device theft.</p>
      `
    },
    architecture: {
      category: "NETWORK // ARCHITECTURE",
      title: "Local-First Network Architecture",
      meta: {
        protocol: "P2P Secure WebSocket Relays",
        latencyTarget: "< 35ms within EU",
        nodes: "Milan / Lisbon / Rome / Amsterdam",
        classification: "Enterprise Mesh Network"
      },
      content: `
        <h4>1. Low Latency Shift Support</h4>
        <p>Hospitals have poor connectivity layers. Our network uses local-first protocols to queue message sends, syncing instantly when connection becomes active.</p>
        
        <h4>2. Multi-Region Failover</h4>
        <p>The network spans multiple edge database nodes, guaranteeing message delivery even during severe fiber-optic cuts or server failures.</p>
      `
    },
    support: {
      category: "HELP // DISPATCH",
      title: "Support Portal & Resolution Centers",
      meta: {
        channel: "verification@after-trials.community",
        responseWindow: "< 2 Hours Response",
        activeHours: "24/7 Clinical Emergency Support",
        priority: "Physician Access Recovery"
      },
      content: `
        <h4>1. Credential Verification Help</h4>
        <p>If you face difficulty uploading your practitioner credentials or validating your license registry number, contact our direct dispatch at <code>verification@after-trials.community</code>.</p>
        
        <h4>2. Account Recoveries</h4>
        <p>Because accounts are encrypted with double-blind local key rings, losing your secure enclave configuration requires manual key reset approval from three verified peers.</p>
      `
    }
  };

  const docModal = document.getElementById('enterprise-modal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalCategory = document.getElementById('modal-category');
  const modalTitle = document.getElementById('modal-title');
  const modalBodyLeft = document.getElementById('modal-body-left');
  const modalBodyRight = document.getElementById('modal-body-right');

  const openDocument = (docKey) => {
    const doc = documentData[docKey];
    if (!doc) return;

    modalCategory.textContent = doc.category;
    modalTitle.textContent = doc.title;
    modalBodyLeft.innerHTML = doc.content;

    // Generate right sidebar metadata
    let metaHTML = '';
    for (const [key, value] of Object.entries(doc.meta)) {
      // camelCase to spaced uppercase
      const label = key.replace(/([A-Z])/g, ' $1').toUpperCase();
      metaHTML += `
        <span class="meta-title">${label}</span>
        <span class="meta-value">${value}</span>
      `;
    }
    modalBodyRight.innerHTML = metaHTML;

    // Show modal
    docModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent backdrop scrolling
  };

  const closeDocument = () => {
    if (docModal) {
      docModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // Click triggers
  document.querySelectorAll('.document-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const docKey = trigger.getAttribute('data-doc');
      openDocument(docKey);
    });
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeDocument);
  }

  // Close modal when clicking backdrop
  if (docModal) {
    docModal.addEventListener('click', (e) => {
      if (e.target === docModal) {
        closeDocument();
      }
    });
  }

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

  window.addEventListener('scroll', scrollspy);

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

  // ==========================================================================
  // X. DYNAMIC RANDOM GRID HIGHLIGHTS
  // ==========================================================================
  const startGridRandomizer = () => {
    const cells = Array.from(document.querySelectorAll('.poster-cell'));
    if (cells.length < 9) return;
    
    const statementPairs = [
      ["THE", "COLLECTIVE"],
      ["JOIN", "TODAY"],
      ["UNITE", "NOW"],
      ["OUR", "FRONT"],
      ["STAND", "TOGETHER"],
      ["SECURE", "NETWORK"]
    ];
    const colorClasses = ['bg-crayon-blue', 'bg-crayon-orange', 'bg-crayon-green', 'bg-crayon-pink', 'bg-crayon-yellow', 'bg-crayon-purple'];
    
    // Store original text
    const originalTexts = cells.map(cell => {
      const textSpan = cell.querySelector('.cell-text');
      return textSpan ? textSpan.innerHTML : '';
    });

    setInterval(() => {
      // 1. Reset all cells
      cells.forEach((cell, idx) => {
        // Reset color classes
        colorClasses.forEach(cls => cell.classList.remove(cls));
        // Reset text
        const textSpan = cell.querySelector('.cell-text');
        if (textSpan && idx !== 4) { // idx 4 is cell 5
          textSpan.innerHTML = originalTexts[idx];
        }
      });

      // 2. Pick 2 random cells (excluding Cell 5, which is idx 4)
      const availableIndices = [0, 1, 2, 3, 5, 6, 7, 8];
      
      // Shuffle available indices to pick 2 random cells
      for (let i = availableIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
      }
      
      const randomIdx1 = availableIndices[0];
      const randomIdx2 = availableIndices[1];
      
      // The 3 active indices (sorted so the text reads naturally based on grid flow)
      const activeIndices = [randomIdx1, 4, randomIdx2].sort((a, b) => a - b);
      
      // Assign words and colors
      const currentWords = statementPairs[Math.floor(Math.random() * statementPairs.length)];
      let wordCounter = 0;
      activeIndices.forEach(idx => {
        const cell = cells[idx];
        // Assign random color
        const randomColor = colorClasses[Math.floor(Math.random() * colorClasses.length)];
        cell.classList.add(randomColor);
        
        // Update text for the non-center cells
        if (idx !== 4) {
          const textSpan = cell.querySelector('.cell-text');
          if (textSpan) {
            textSpan.innerHTML = currentWords[wordCounter];
            wordCounter++;
          }
        }
      });
    }, 4000); // Change every 4 seconds
  };
  
  startGridRandomizer();

});
