document.addEventListener('DOMContentLoaded', () => {
  console.log('After Trials landing page initialized.');

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
  // 3. TYPEFORM-STYLE ONBOARDING STEPS
  // ==========================================================================
  // ==========================================================================
  // 3. EDITORIAL PROSE ONBOARDING INTAKE
  // ==========================================================================
  const onboardingForm = document.getElementById('onboardingForm');
  const petitionProse = document.getElementById('petitionProse');
  const petitionActions = document.getElementById('petitionActions');
  const successSlide = document.getElementById('successSlide');
  const inlineInputs = document.querySelectorAll('.inline-input, .inline-select');

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
      tempSpan.textContent = selectedOption ? selectedOption.text : "select your role";
      document.body.appendChild(tempSpan);
      input.style.width = `${Math.max(tempSpan.offsetWidth + 30, 160)}px`;
    } else {
      tempSpan.textContent = input.value || input.placeholder || "";
      document.body.appendChild(tempSpan);
      input.style.width = `${Math.max(tempSpan.offsetWidth + 20, 150)}px`;
    }
    document.body.removeChild(tempSpan);
  };

  // Bind input listeners
  inlineInputs.forEach(input => {
    // Initial size
    adjustInputWidth(input);
    
    // Auto resize as user types
    input.addEventListener('input', () => adjustInputWidth(input));
    input.addEventListener('change', () => adjustInputWidth(input));
  });

  // Submit petition handler
  if (onboardingForm) {
    onboardingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Animate transition
      if (petitionProse) petitionProse.style.opacity = '0';
      if (petitionActions) petitionActions.style.opacity = '0';
      
      setTimeout(() => {
        if (petitionProse) petitionProse.style.display = 'none';
        if (petitionActions) petitionActions.style.display = 'none';
        
        if (successSlide) {
          successSlide.style.display = 'block';
          setTimeout(() => {
            successSlide.classList.add('active');
          }, 50);
        }
      }, 500);
    });
  }

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

  // Keyboard escape key to close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDocument();
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

  // Initial State Setup
  scrollspy();
  // Delay initial drawing slightly to let layout dimensions initialize
  setTimeout(drawConnections, 400);
});
