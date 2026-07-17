// api/sitemap.js — Dynamic sitemap generator for After Trials
// Runs as a Vercel Serverless Function on every request
// Fetches live blog posts from Supabase + combines with all static pages

const SUPABASE_URL = 'https://brcefnmohobhzizxfrfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY2Vmbm1vaG9iaHppenhmcmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTg4NjEsImV4cCI6MjA3MjQ5NDg2MX0.4hT8Czdi2hqrHJgNsP6pgB11angcTnVwvdMHgYXiik0';

// ── Static pages that never change ────────────────────────────────────────────
const STATIC_PAGES = [
  { url: '/',                   priority: '1.0', changefreq: 'weekly'  },
  { url: '/blogs',              priority: '0.9', changefreq: 'daily'   },
  { url: '/campaign',           priority: '0.7', changefreq: 'monthly' },
  { url: '/about',              priority: '0.8', changefreq: 'monthly' },
  { url: '/contact',            priority: '0.7', changefreq: 'monthly' },
  { url: '/support',            priority: '0.7', changefreq: 'monthly' },
  { url: '/academic',           priority: '0.6', changefreq: 'monthly' },
  { url: '/hospitals',          priority: '0.6', changefreq: 'monthly' },
  { url: '/security',           priority: '0.6', changefreq: 'monthly' },
  { url: '/architecture',       priority: '0.5', changefreq: 'monthly' },
  { url: '/privacy',            priority: '0.5', changefreq: 'yearly'  },
  { url: '/terms',              priority: '0.5', changefreq: 'yearly'  },
  { url: '/cookie',             priority: '0.4', changefreq: 'yearly'  },
  { url: '/refund',             priority: '0.4', changefreq: 'yearly'  },
  { url: '/cancellation',       priority: '0.4', changefreq: 'yearly'  },
  { url: '/account-deletion',   priority: '0.4', changefreq: 'yearly'  },
  { url: '/medical-disclaimer', priority: '0.4', changefreq: 'yearly'  },
  { url: '/gdpr',               priority: '0.4', changefreq: 'yearly'  },
  { url: '/dpa',                priority: '0.3', changefreq: 'yearly'  },
  { url: '/sla',                priority: '0.3', changefreq: 'yearly'  },
];

function toISODate(dateStr) {
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // ── Fetch live blog posts from Supabase ────────────────────────────────────
  let blogPosts = [];
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/blogs?select=slug,published_at,updated_at&published=eq.true&order=published_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (response.ok) {
      blogPosts = await response.json();
    }
  } catch (err) {
    // If Supabase is unreachable, continue with static pages only
    console.error('Sitemap: failed to fetch blogs from Supabase:', err.message);
  }

  // ── Build XML ─────────────────────────────────────────────────────────────
  const staticUrls = STATIC_PAGES.map(page => `
  <url>
    <loc>https://aftertrials.com${escapeXml(page.url)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('');

  const blogUrls = blogPosts.map(post => {
    const lastmod = toISODate(post.updated_at || post.published_at);
    return `
  <url>
    <loc>https://aftertrials.com/blog/${escapeXml(post.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Homepage image -->
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
${staticUrls.replace(
  // Remove the duplicate homepage entry we already added above
  /\s*<url>\s*<loc>https:\/\/aftertrials\.com\/<\/loc>[\s\S]*?<\/url>/,
  ''
)}
  <!-- Blog dispatches (${blogPosts.length} posts, auto-generated ${today}) -->
${blogUrls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
  res.status(200).send(xml);
};
