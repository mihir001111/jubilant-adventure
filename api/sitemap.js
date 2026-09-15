// api/sitemap.js
// Dynamic sitemap generator for After Trials
// Runs as a Vercel Serverless Function
// Fetches published blog posts from Supabase and combines them with real static pages.

const SUPABASE_URL = 'https://mzcydbxztotigdubrabb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16Y3lkYnh6dG90aWdkdWJyYWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTYxMDMsImV4cCI6MjEwNDg5MjEwM30.cd9nk2c7h1SZ6pSV72Xo_Wees5yICK6qbBLHObkFVs4';

// ─────────────────────────────────────────────────────────────
// STATIC PAGES THAT ACTUALLY EXIST IN THE PROJECT
// ─────────────────────────────────────────────────────────────

const STATIC_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },

  { url: '/blogs', priority: '0.9', changefreq: 'daily' },

  { url: '/careers', priority: '0.6', changefreq: 'monthly' },
  { url: '/contact', priority: '0.6', changefreq: 'monthly' },

  { url: '/privacy', priority: '0.5', changefreq: 'yearly' },
  { url: '/terms', priority: '0.5', changefreq: 'yearly' },
  { url: '/cookie', priority: '0.4', changefreq: 'yearly' },
  { url: '/medical-disclaimer', priority: '0.4', changefreq: 'yearly' },
  { url: '/gdpr', priority: '0.4', changefreq: 'yearly' },
  { url: '/guidelines', priority: '0.4', changefreq: 'yearly' }
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function toISODate(dateStr) {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0];
  }

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  return date.toISOString().split('T')[0];
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─────────────────────────────────────────────────────────────
// VERCEL SERVERLESS FUNCTION
// ─────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // ───────────────────────────────────────────────────────────
  // FETCH PUBLISHED BLOGS FROM SUPABASE
  // ───────────────────────────────────────────────────────────

  let blogPosts = [];

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/blogs?select=slug,published_at,updated_at&published=eq.true&order=published_at.desc`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      blogPosts = await response.json();
    } else {
      const errorText = await response.text();

      console.error(
        'Sitemap: Supabase returned error:',
        response.status,
        errorText
      );
    }
  } catch (error) {
    console.error(
      'Sitemap: failed to fetch blogs from Supabase:',
      error.message
    );
  }

  // ───────────────────────────────────────────────────────────
  // STATIC PAGE XML
  // ───────────────────────────────────────────────────────────

  const staticUrls = STATIC_PAGES.map((page) => {
    return `
  <url>
    <loc>https://aftertrials.com${escapeXml(page.url)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }).join('');

  // ───────────────────────────────────────────────────────────
  // BLOG XML
  // ───────────────────────────────────────────────────────────

  const blogUrls = blogPosts.map((post) => {
    const lastmod = toISODate(
      post.updated_at || post.published_at
    );

    return `
  <url>
    <loc>https://aftertrials.com/blog/${encodeURIComponent(
      post.slug
    )}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('');

  // ───────────────────────────────────────────────────────────
  // FINAL XML
  // ───────────────────────────────────────────────────────────

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Homepage -->
  <url>
    <loc>https://aftertrials.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>

    <image:image>
      <image:loc>https://aftertrials.com/assets/social-banner.jpg</image:loc>
      <image:title>After Trials — The Sovereign Healthcare Network</image:title>
    </image:image>
  </url>

  <!-- Static pages -->
${staticUrls}

  <!-- Published blog posts -->
${blogUrls}

</urlset>`;

  // ───────────────────────────────────────────────────────────
  // RESPONSE
  // ───────────────────────────────────────────────────────────

  res.setHeader(
    'Content-Type',
    'application/xml; charset=utf-8'
  );

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=600'
  );

  return res.status(200).send(xml);
};