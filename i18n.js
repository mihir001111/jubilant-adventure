// Global language state
window.currentLanguage = localStorage.getItem('site_lang') || 'en';

// Apply translations
function applyTranslations(lang) {
  if (!translations[lang]) return;
  
  // Find all elements with data-i18n attribute
  const elements = document.querySelectorAll('[data-i18n]');
  
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      // Use innerHTML so we can inject spans, like story-num and arrows
      el.innerHTML = translations[lang][key];
    }
  });

  // Update active state of language toggles
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Switch language function
function switchLanguage(lang) {
  if (lang !== 'en' && lang !== 'it') return;
  window.currentLanguage = lang;
  localStorage.setItem('site_lang', lang);
  applyTranslations(lang);
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // Apply initial translations
  applyTranslations(window.currentLanguage);

  // Bind click events to any lang-btn elements
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-btn');
    if (btn) {
      const lang = btn.getAttribute('data-lang');
      if (lang) switchLanguage(lang);
    }
  });
});
