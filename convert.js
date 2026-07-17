const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Configure marked to use standard formatting
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false
});

const dir = 'c:/flutter/flutter9/after_trials/mihir';
const files = fs.readdirSync(dir);
const rawData = {};

// Read all markdown files
for (const file of files) {
  if (file === 'converted.json' || file === 'raw_docs.json' || file === 'convert.js') continue;
  if (!fs.statSync(path.join(dir, file)).isFile()) continue;
  
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  rawData[file] = marked.parse(content);
}

const dataExport = {
  privacy: {
    category: 'COMPLIANCE // PRIVACY',
    title: 'Privacy Policy',
    meta: { effective: 'March 2026', jurisdiction: 'Global', classification: 'Public' },
    content: rawData.privcy
  },
  terms: {
    category: 'REGULATORY // CONDUCT',
    title: 'Terms of Service',
    meta: { effective: 'March 2026', compliance: 'App Usage Guidelines', scope: 'All Users' },
    content: rawData.tos
  },
  cookie: {
    category: 'PREFERENCES // CACHE',
    title: 'Cookie Policy',
    meta: { effective: 'March 2026' },
    content: rawData.cookie
  },
  refund: {
    category: 'COMMERCE // REFUND',
    title: 'Refund Policy',
    meta: { status: 'Active', access: 'Public' },
    content: rawData.refund
  },
  cancellation: {
    category: 'COMMERCE // CANCELLATION',
    title: 'Cancellation Policy',
    meta: { status: 'Active', access: 'Public' },
    content: rawData.cncelltion
  },
  'account-deletion': {
    category: 'ACCOUNT // DELETION',
    title: 'Account Deletion Request',
    meta: { status: 'Active', access: 'Public' },
    content: rawData.deltion
  },
  'medical-disclaimer': {
    category: 'LEGAL // MEDICAL',
    title: 'Medical Disclaimer',
    meta: { status: 'Active', access: 'Public' },
    content: rawData.disclimer
  },
  support: {
    category: 'HELP // DISPATCH',
    title: 'Support Portal & Resolution Centers',
    meta: { channel: 'team@aftertrials.com', responseWindow: '< 24 Hours' },
    content: rawData.support
  },
  contact: {
    category: 'HELP // CONTACT',
    title: 'Contact Us',
    meta: { status: 'Active' },
    content: rawData.support
  },
  about: {
    category: 'PLATFORM // ABOUT',
    title: 'About After Trials',
    meta: { status: 'Active' },
    content: '<p>Information about the platform will be published here.</p>' 
  },
  gdpr: {
    category: 'COMPLIANCE // REGULATION',
    title: 'GDPR Compliance Statement',
    meta: { standard: 'EU 2016/679' },
    content: '<p>Information available in the main Privacy Policy.</p>'
  },
  dpa: {
    category: 'DATA PRIVACY // DPA',
    title: 'Data Processing Addendum',
    meta: { status: 'Available on Request' },
    content: '<p>Information available in the main Privacy Policy.</p>'
  },
  sla: {
    category: 'INFRASTRUCTURE // SLA',
    title: 'Service Level Agreement',
    meta: { status: 'Active' },
    content: '<p>Service levels are guaranteed at 99.9% uptime.</p>'
  },
  academic: {
    category: 'ACCESS // ACADEMIC',
    title: 'Academic Access',
    meta: { status: 'Active' },
    content: '<p>Details for medical students and academic institutions.</p>'
  },
  hospitals: {
    category: 'ACCESS // ENTERPRISE',
    title: 'Hospital Systems',
    meta: { status: 'Active' },
    content: '<p>Details for verified hospital networks.</p>'
  },
  security: {
    category: 'PLATFORM // SECURITY',
    title: 'Security Protocols',
    meta: { status: 'Active' },
    content: '<p>Security architecture details.</p>'
  },
  architecture: {
    category: 'PLATFORM // ARCHITECTURE',
    title: 'Network Architecture',
    meta: { status: 'Active' },
    content: '<p>Details on zero-knowledge encryption architecture.</p>'
  }
};

const docPath = 'c:/flutter/flutter9/after_trials/after-trials-web/document.html';
let docHtml = fs.readFileSync(docPath, 'utf8');

// Replace everything between const documentData = { and };\n\n    document.addEventListener
let stringifiedData = 'const documentData = ' + JSON.stringify(dataExport, null, 2) + ';';

docHtml = docHtml.replace(/const documentData = \{[\s\S]*?\};\r?\n\r?\n    document\.addEventListener/m, stringifiedData + '\n\n    document.addEventListener');

fs.writeFileSync(docPath, docHtml);
console.log("Successfully rebuilt document.html with perfect markdown via Marked.js");
