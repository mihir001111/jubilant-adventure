const fs = require('fs');
let doc = fs.readFileSync('c:/flutter/flutter9/after_trials/after-trials-web/document.html', 'utf8');

const footerHtml = `  <!-- Footer -->
  <footer class="site-footer">
    <div class="footer-grid-dashboard reveal">

      <!-- Cell 1: Brand Logo -->
      <div class="footer-cell cell-brand">
        <span class="cell-label">PLATFORM LOGO</span>
        <span class="footer-logo">A F T E R T R I A L S</span>
        <p class="footer-moto">No healthcare professional should stand alone.</p>
      </div>

      <!-- Cell 2: Gateway Navigation A -->
      <div class="footer-cell">
        <span class="cell-label" data-i18n="foot_nav">NAVIGATION // CORE</span>
        <div class="cell-links">
          <a href="/index.html#hero">Index</a>
          <a href="/index.html#crisis">The Reality</a>
          <a href="/index.html#shift">The Shift Log</a>
          <a href="/index.html#philosophy">Our Philosophy</a>
          <a href="/index.html#pillars">Core Pillars</a>
          <a href="/index.html#evidence">Verified Record</a>
        </div>
      </div>

      <!-- Cell 3: Gateway Navigation B -->
      <div class="footer-cell">
        <span class="cell-label">NAVIGATION // PLATFORM</span>
        <div class="cell-links">
          <a href="/campaign.html">Referral Ledger</a>
          <a href="/blogs.html">Read Dispatches</a>
          <a href="/academic">Academic Access</a>
          <a href="/hospitals">Hospital Systems</a>
          <a href="/security">Security Protocols</a>
          <a href="/architecture">Network Architecture</a>
          <a href="/support">Support Portal</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
        </div>
      </div>

      <!-- Cell 4: Compliance & Legal -->
      <div class="footer-cell">
        <span class="cell-label">COMPLIANCE & LEGAL</span>
        <div class="cell-links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/cookie">Cookie Policy</a>
          <a href="/gdpr">GDPR Compliance</a>
          <a href="/dpa">Data Protection (DPA)</a>
          <a href="/sla">Service Level SLA</a>
          <a href="/refund">Refund Policy</a>
          <a href="/cancellation">Cancellation Policy</a>
          <a href="/account-deletion">Account Deletion</a>
          <a href="/medical-disclaimer">Medical Disclaimer</a>
        </div>
      </div>

      <!-- Cell 5: Platform Status -->
      <div class="footer-cell">
        <span class="cell-label">COLLECTIVE STATUS</span>
        <div class="status-indicator">
          <span class="status-dot"></span>
          <span>ONBOARDING OPEN</span>
        </div>
        <span class="coords-data">VERIFIED PEERS ONLY</span>
      </div>

      <!-- Cell 6: Coordinates -->
      <div class="footer-cell">
        <span class="cell-label">GEOGRAPHIC ANCHOR</span>
        <span class="cell-data-text">N 41&deg;54' - E 12&deg;29'</span>
      </div>

      <!-- Cell 7: Copyright -->
      <div class="footer-cell">
        <span class="cell-label">LEGAL COPY</span>
        <span class="cell-data-text font-small" data-i18n="foot_copyright">&copy; 2026 AFTER TRIALS INC.</span>
      </div>

    </div>
  </footer>

  <!-- Floating Bottom Navigation Dock -->
  <nav class="floating-nav-dock">
    <div class="nav-links">
      <a href="/index.html#hero" class="nav-link-item active">Index</a>
      <a href="/index.html#shift" class="nav-link-item" data-i18n="nav_philosophy">Philosophy</a>
      <a href="/index.html#crisis" class="nav-link-item" data-i18n="nav_mission">Crisis</a>
      <a href="/index.html#pillars" class="nav-link-item" data-i18n="nav_pillars">Pillars</a>
      <a href="/index.html#evidence" class="nav-link-item" data-i18n="nav_evidence">Evidence</a>
      <a href="/index.html#community" class="nav-link-item" data-i18n="nav_community">Community</a>
      <a href="/index.html#onboarding" class="nav-btn-cta">Claim</a>
    </div>

    <div class="lang-switcher-dock" style="display: none;">
      <button class="lang-btn active" data-lang="en">EN</button>
      <button class="lang-btn" data-lang="it">IT</button>
    </div>
  </nav>`;

// Remove doc-nav from the top
doc = doc.replace(/<nav class="doc-nav">[\s\S]*?<\/nav>/, '');

// Remove old nav back logic if exists and insert the new footer + nav dock at the very end before the script
doc = doc.replace(/<\/main>[\s\S]*?<script>/, '</main>\n\n' + footerHtml + '\n\n  <script>');

fs.writeFileSync('c:/flutter/flutter9/after_trials/after-trials-web/document.html', doc);
console.log("Updated!");
