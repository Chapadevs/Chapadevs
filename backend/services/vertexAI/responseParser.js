/**
 * responseParser.js
 * Universal AI response parser for Sandpack rendering
 */

import { unescapeCode } from "../../utils/codeUtils.js";
import {
  KNOWN_COMPONENT_NAMES,
  KNOWN_FILE_PATHS,
} from "./templateStructure.js";

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Replace unsafe images. Allows data:image/ (Gemini-generated) and picsum/placehold.
 */
export function fixBrokenImageSrc(html) {
  const allowlist = [
    "picsum.photos",
    "placehold.co",
    "placeholder.com",
    "data:image/",
    "storage.googleapis.com",
  ];

  const isAllowed = (src) =>
    (src || "").startsWith("data:image/") ||
    allowlist.some((h) => (src || "").toLowerCase().includes(h));

  return html.replace(
    /<img([^>]*)\ssrc=["']([^"']*)["']([^>]*)>/gi,
    (match, before, src, after) => {
      if (isAllowed(src)) return match;

      const altMatch = /alt=["']([^"']*)["']/i.exec(match);
      const alt = altMatch
        ? encodeURIComponent(altMatch[1].slice(0, 30))
        : "Preview";

      return `<img${before} src="https://placehold.co/400x300?text=${alt}"${after}>`;
    },
  );
}

/**
 * Inject generated image data URLs into code and/or files.
 * urls[0]=logo (image-1), urls[1]=hero (image-2), urls[2]=display (image-3).
 * Replaces __LOGO__ with urls[0], __IMAGE_1__ with urls[1] (hero), __IMAGE_2__/3 with urls[2] (display).
 * __IMAGE_4__–6 cycle hero and display.
 * @param {string} code - Single App.js code string
 * @param {object|null} files - Optional files object (path -> content)
 * @param {string[]} dataUrls - Array of 3 URLs: [logo, hero, display]
 * @returns {{ code: string, files: object|null }}
 */
export function injectGeneratedImages(code, files, dataUrls) {
  const displayFallback = "https://placehold.co/400x300?text=Image";
  const heroFallback = "https://placehold.co/1200x600?text=Hero";
  const logoFallback = "https://placehold.co/96x96?text=Logo";
  let urls = Array.isArray(dataUrls) ? dataUrls : [];
  const defaults = [logoFallback, heroFallback, displayFallback];
  while (urls.length < 3) urls.push(defaults[urls.length]);
  urls = urls.slice(0, 3);
  const valid = (u) =>
    typeof u === "string" &&
    u.trim().length > 0 &&
    (u.startsWith("data:image/") || u.startsWith("https://"));
  const getUrl = (slotIndex0Based) => {
    // urls[0]=logo, urls[1]=hero, urls[2]=display. __IMAGE_1__→hero, __IMAGE_2__/3→display, __IMAGE_4__+→cycle hero/display.
    let idx = slotIndex0Based === 0 ? 1 : 2; // __IMAGE_1__→hero, __IMAGE_2__/3→display
    if (slotIndex0Based >= 3) idx = 1 + ((slotIndex0Based - 3) % 2); // __IMAGE_4__+ cycle hero, display
    const u = valid(urls[idx]) ? urls[idx] : displayFallback;
    return u && u.trim() ? u.trim() : displayFallback;
  };
  const getLogoUrl = () => (valid(urls[0]) ? urls[0].trim() : logoFallback);

  /**
   * Fix AI misuse: when it outputs __IMAGE_1__ for the header logo, replace with __LOGO__
   * so the logo gets urls[0] (image-1) instead of urls[1] (hero).
   * Uses flexible src regex to handle attribute order and optional whitespace.
   */
  const fixLogoMisuse = (text, filePath) => {
    if (!text || typeof text !== "string") return text;
    let out = text;
    // Flexible: src before/after other attrs, optional whitespace
    const image1SrcRegex = () => /src\s*=\s*["']\s*__IMAGE_1__\s*["']/g;
    const replaceLogo = (s) => s.replace(image1SrcRegex(), 'src="__LOGO__"');
    const hasImage1InLogoContext = (s) => image1SrcRegex().test(s);
    // 1. Inside <header> or <nav>: all __IMAGE_1__ there = logo
    out = out.replace(
      /<(?:header|nav)[^>]*>[\s\S]*?<\/(?:header|nav)>/gi,
      replaceLogo,
    );
    // 2. In Header.js(x): the only img is the logo
    if (filePath && /\bHeader\.(js|jsx)$/i.test(String(filePath))) {
      out = out.replace(image1SrcRegex(), 'src="__LOGO__"');
    }
    // 3. Inside <button> wrapping logo-style img (e.g. nav home button with logo)
    out = out.replace(/<button[^>]*>[\s\S]*?<\/button>/gi, (block) => {
      if (
        /<img[\s\S]*?>/.test(block) &&
        /object-contain|w-16|h-16|alt=["'][^"']*logo[^"']*["']/i.test(block) &&
        hasImage1InLogoContext(block)
      ) {
        return replaceLogo(block);
      }
      return block;
    });
    // 4. Any img with object-contain (logo style) and src=__IMAGE_1__ -> logo. Hero uses object-cover.
    out = out.replace(/<img[\s\S]*?>/gi, (tag) => {
      if (!hasImage1InLogoContext(tag)) return tag;
      if (/object-contain/.test(tag) && !/object-cover/.test(tag))
        return replaceLogo(tag);
      if (/\b(?:w-16|h-16)\b/.test(tag) && !/object-cover|w-full/.test(tag))
        return replaceLogo(tag);
      if (/alt=["'][^"']*logo[^"']*["']/i.test(tag)) return replaceLogo(tag);
      return tag;
    });
    return out;
  };

  // Replace AI-emitted placehold.co URLs with __IMAGE_N__ so they get real images when dataUrls exist
  const replacePlaceholderUrlsWithImageSlots = (text) => {
    if (!text || typeof text !== "string") return text;
    const placeholdPattern = /https:\/\/placehold\.co\/[^'"]*['"]/g;
    let slot = 0;
    return text.replace(placeholdPattern, (match) => {
      const n = (slot % 3) + 1; // 3 slots: 1=hero, 2=display, 3=display (logo is __LOGO__)
      slot += 1;
      const quote = match.slice(-1);
      return `__IMAGE_${n}__${quote}`;
    });
  };

  const replaceInText = (text, filePath) => {
    if (!text || typeof text !== "string") return text;
    // Run placehold.co conversion BEFORE fixLogoMisuse so converted __IMAGE_1__ can be fixed
    let out = text;
    if (urls.length > 0) {
      out = replacePlaceholderUrlsWithImageSlots(out);
    }
    out = fixLogoMisuse(out, filePath);
    out = out.split("__LOGO__").join(getLogoUrl());
    for (let i = 1; i <= 6; i++) {
      const placeholder = `__IMAGE_${i}__`;
      out = out.split(placeholder).join(getUrl(i - 1));
    }
    return out;
  };

  const newCode = replaceInText(code || "", "/App.js");
  let newFiles = null;
  if (files && typeof files === "object") {
    newFiles = {};
    for (const [path, content] of Object.entries(files)) {
      const normPath = path.startsWith("/") ? path : `/${path}`;
      newFiles[path] = replaceInText(content, normPath);
    }
  }
  return { code: newCode, files: newFiles };
}

/** Minimal fallbacks when AI omits required files but App.js imports them. */

const FALLBACK_CONTACT_PAGE = `import React, { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); };
  return (
    <div className="py-16">
      <div className="max-w-2xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6">Contact Us</h2>
        <div className="grid gap-4 mb-8 md:grid-cols-3">
          <div className="bg-gray-50 p-4 rounded-lg"><p className="font-semibold">Email</p><p>contact@example.com</p></div>
          <div className="bg-gray-50 p-4 rounded-lg"><p className="font-semibold">Phone</p><p>+1 234 567 8900</p></div>
          <div className="bg-gray-50 p-4 rounded-lg"><p className="font-semibold">Location</p><p>123 Main St</p></div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-purple-500" />
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-purple-500" />
          <input type="text" name="subject" placeholder="Subject" value={formData.subject} onChange={handleChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-purple-500" />
          <textarea name="message" placeholder="Message" rows={4} value={formData.message} onChange={handleChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-purple-500" />
          <button type="submit" className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">Send</button>
        </form>
      </div>
    </div>
  );
}
`;

const FALLBACK_HEADER = `import React from 'react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-bold">
          <img src="__LOGO__" alt="Logo" className="w-12 h-12 object-contain transition-transform duration-200 hover:scale-110" />
          <span>Brand</span>
        </div>
        <nav className="hidden md:flex gap-6">
          <button>Home</button>
          <button>About</button>
          <button>Services</button>
          <button>Contact</button>
        </nav>
      </div>
    </header>
  );
}
`;

const FALLBACK_FOOTER = `import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p>&copy; 2024 Brand. All rights reserved.</p>
      </div>
    </footer>
  );
}
`;

const FALLBACK_HOME_PAGE = `import React from 'react';

export default function HomePage() {
  return (
    <div className="py-16">
      <section className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-24 text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome</h1>
        <p className="text-xl opacity-90">Your business deserves the best.</p>
      </section>
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Featured</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-50 p-6">Feature 1</div>
          <div className="bg-gray-50 p-6">Feature 2</div>
          <div className="bg-gray-50 p-6">Feature 3</div>
        </div>
      </section>
    </div>
  );
}
`;

const FALLBACK_ABOUT_PAGE = `import React from 'react';

export default function AboutPage() {
  return (
    <div className="py-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-6">About Us</h1>
        <p className="text-lg mb-8">We are a dedicated team focused on delivering quality.</p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-50 p-6 text-center">
            <p className="text-3xl font-bold">100+</p>
            <p>Projects</p>
          </div>
          <div className="bg-gray-50 p-6 text-center">
            <p className="text-3xl font-bold">98%</p>
            <p>Satisfaction</p>
          </div>
          <div className="bg-gray-50 p-6 text-center">
            <p className="text-3xl font-bold">10+</p>
            <p>Years</p>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const FALLBACK_SERVICES_PAGE = `import React from 'react';

export default function ServicesPage() {
  const services = [
    { title: 'Service 1', desc: 'Description for service 1' },
    { title: 'Service 2', desc: 'Description for service 2' },
    { title: 'Service 3', desc: 'Description for service 3' },
  ];
  return (
    <div className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Our Services</h1>
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((s, i) => (
            <div key={i} className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold mb-2">{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
`;

const FALLBACK_PRODUCTS_PAGE = `import React from 'react';

export default function ProductsPage() {
  const products = [
    { name: 'Product 1', price: '$29' },
    { name: 'Product 2', price: '$49' },
    { name: 'Product 3', price: '$39' },
  ];
  return (
    <div className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Our Products</h1>
        <div className="grid md:grid-cols-3 gap-8">
          {products.map((p, i) => (
            <div key={i} className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="text-lg font-semibold text-purple-600">{p.price}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
`;

const FALLBACK_LOGIN_PAGE = `import React, { useState } from 'react';

export default function LoginPage({ onNav, onNavigate }) {
  const nav = onNavigate || onNav;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); if (nav) nav(e, 'dashboard'); };
  const handleNav = (e, p) => { e.preventDefault(); if (nav) nav(e, p); };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Sign In</h1>
          <p className="text-gray-600">Welcome back</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border focus:ring-2 focus:ring-purple-500" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border focus:ring-2 focus:ring-purple-500" />
          <button type="submit" className="w-full py-2 bg-purple-600 text-white hover:bg-purple-700">Sign In</button>
        </form>
        <p className="mt-4 text-center text-sm">
          <button type="button" onClick={(e) => handleNav(e, 'register')} className="text-purple-600 hover:underline">Don't have an account? Register</button>
        </p>
      </div>
    </div>
  );
}
`;

const FALLBACK_REGISTER_PAGE = `import React, { useState } from 'react';

export default function RegisterPage({ onNav, onNavigate }) {
  const nav = onNavigate || onNav;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); if (nav) nav(e, 'login'); };
  const handleNav = (e, p) => { e.preventDefault(); if (nav) nav(e, p); };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-600">Join us today</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border focus:ring-2 focus:ring-purple-500" />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border focus:ring-2 focus:ring-purple-500" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border focus:ring-2 focus:ring-purple-500" />
          <button type="submit" className="w-full py-2 bg-purple-600 text-white hover:bg-purple-700">Register</button>
        </form>
        <p className="mt-4 text-center text-sm">
          <button type="button" onClick={(e) => handleNav(e, 'login')} className="text-purple-600 hover:underline">Already have an account? Login</button>
        </p>
      </div>
    </div>
  );
}
`;

const FALLBACK_DASHBOARD_PAGE = `import React from 'react';

export default function DashboardPage() {
  const stats = [
    { label: 'Total Products', value: '128' },
    { label: 'Total Users', value: '1,240' },
    { label: 'Recent Orders', value: '24' },
    { label: 'Revenue', value: '$12,450' },
  ];
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-6 shadow rounded-lg border">
            <p className="text-sm text-gray-600">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

const FALLBACK_USERS_PAGE = `import React from 'react';

export default function UsersPage() {
  const users = [
    { name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
    { name: 'Bob Wilson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
  ];
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Users</h1>
      <div className="bg-white shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i} className="border-t">
                <td className="px-6 py-4">{u.name}</td>
                <td className="px-6 py-4">{u.email}</td>
                <td className="px-6 py-4">{u.role}</td>
                <td className="px-6 py-4">{u.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;

const FALLBACK_SIDEBAR = `import React from 'react';

export default function Sidebar({ onNav, onNavigate }) {
  const nav = onNavigate || onNav;
  const handleClick = (e, p) => { e.preventDefault(); if (nav) nav(e, p); };
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <h2 className="text-xl font-bold mb-6">Panel</h2>
      <nav className="space-y-2">
        <button onClick={(e) => handleClick(e, 'dashboard')} className="block w-full text-left px-4 py-2 hover:bg-gray-800">Dashboard</button>
        <button onClick={(e) => handleClick(e, 'products')} className="block w-full text-left px-4 py-2 hover:bg-gray-800">Products</button>
        <button onClick={(e) => handleClick(e, 'users')} className="block w-full text-left px-4 py-2 hover:bg-gray-800">Users</button>
        <button onClick={(e) => handleClick(e, 'login')} className="block w-full text-left px-4 py-2 hover:bg-gray-800 mt-4">Login</button>
      </nav>
    </aside>
  );
}
`;

/** Map: component name -> { path, fallback } for ensureRequiredFiles. */
const REQUIRED_IMPORTS = {
  ContactPage: {
    path: "/pages/ContactPage.js",
    fallback: FALLBACK_CONTACT_PAGE,
  },
  HomePage: { path: "/pages/HomePage.js", fallback: FALLBACK_HOME_PAGE },
  AboutPage: { path: "/pages/AboutPage.js", fallback: FALLBACK_ABOUT_PAGE },
  ServicesPage: {
    path: "/pages/ServicesPage.js",
    fallback: FALLBACK_SERVICES_PAGE,
  },
  ProductsPage: {
    path: "/pages/ProductsPage.js",
    fallback: FALLBACK_PRODUCTS_PAGE,
  },
  LoginPage: { path: "/pages/LoginPage.js", fallback: FALLBACK_LOGIN_PAGE },
  RegisterPage: {
    path: "/pages/RegisterPage.js",
    fallback: FALLBACK_REGISTER_PAGE,
  },
  DashboardPage: {
    path: "/pages/DashboardPage.js",
    fallback: FALLBACK_DASHBOARD_PAGE,
  },
  UsersPage: { path: "/pages/UsersPage.js", fallback: FALLBACK_USERS_PAGE },
  Header: { path: "/components/Header.js", fallback: FALLBACK_HEADER },
  Footer: { path: "/components/Footer.js", fallback: FALLBACK_FOOTER },
  Sidebar: { path: "/components/Sidebar.js", fallback: FALLBACK_SIDEBAR },
};

/**
 * Extract component names imported from ./pages/ or ./components/ in App.js.
 * @param {string} appCode - App.js source
 * @returns {Set<string>} Set of imported component names (e.g. ContactPage, Header)
 */
function extractImportsFromApp(appCode) {
  const imports = new Set();
  if (!appCode || typeof appCode !== "string") return imports;
  const regex =
    /import\s+(\w+)\s+from\s+['"]\.\/(?:pages|components)\/[\w/]+['"]/g;
  let m;
  while ((m = regex.exec(appCode)) !== null) {
    imports.add(m[1]);
  }
  return imports;
}

/**
 * If App.js imports a component but the file is missing, add a fallback.
 * Prevents runtime errors when the AI omits required files.
 * @param {object} files - websitePreviewFiles object (mutated in place)
 */
export function ensureRequiredFiles(files) {
  if (!files || typeof files !== "object") return;
  const appCode = files["/App.js"] || files["App.js"] || "";
  const imports = extractImportsFromApp(appCode);
  for (const [name, { path, fallback }] of Object.entries(REQUIRED_IMPORTS)) {
    const pathNoLeading = path.slice(1);
    if (imports.has(name) && !files[path] && !files[pathNoLeading]) {
      files[path] = fallback;
    }
  }
}

/**
 * Normalize preview metadata so App.js always has valid "function App()" (fixes legacy or AI-dropped "function").
 * Ensures ContactPage.js exists when App imports it but AI omitted it.
 * Call before sending preview to client so Sandpack receives valid code.
 * @param {object} [metadata] - preview.metadata (may have websitePreviewCode and/or websitePreviewFiles)
 */
export function normalizePreviewMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return;
  const files = metadata.websitePreviewFiles;
  if (files && typeof files === "object") {
    ensureRequiredFiles(files);
    for (const [path, content] of Object.entries(files)) {
      if (typeof content === "string" && content.length > 10) {
        files[path] = normalizeComponentCode(content, path);
      }
    }
  }
  if (
    metadata.websitePreviewCode &&
    typeof metadata.websitePreviewCode === "string"
  ) {
    metadata.websitePreviewCode = normalizeComponentCode(
      metadata.websitePreviewCode,
    );
  }
}

// --- Phase pipeline: used by normalizeComponentCode ---

/** Strip markdown code fences from code blocks. */
function removeMarkdown(code) {
  return code.replace(/```[\s\S]*?```/g, (m) =>
    m.replace(/```[a-z]*/gi, "").replace(/```/g, ""),
  );
}

/** Fix invalid escape sequences and string literal issues. */
function fixInvalidEscapes(code) {
  return code
    .replace(/\\u(?!([0-9a-fA-F]{4}))/g, "\\\\u")
    .replace(/\\'(?=\s*[,\]\}])/g, "'")
    .replace(/([a-zA-Z])'([a-zA-Z])/g, "$1\\'$2")
    .replace(
      /(?<![:\,\[\(\{\=]\s*)(\s)'([A-Z][a-zA-Z0-9_]*)'(\s)/g,
      (m, before, word, after) => `${before}\\'${word}\\'${after}`,
    )
    .replace(/'\s*;/g, "'");
}

/**
 * Fix AI corruption: </n + spaces used instead of \\n (newline).
 * E.g. "123 Ave,</n              Venice, CA" -> "123 Ave,\nVenice, CA"
 * Avoids replacing valid tags: </nav>, </noscript>, </nobr>
 */
function fixMalformedJsxNewlines(code) {
  return code.replace(/<\/n\s*(?!av>|oscript>|obr>)(?=[A-Za-z])/g, "\n");
}

/** Fix structural issues (extra braces, etc.). */
function fixStructure(code) {
  return code.replace(/\}\}\s*export default/g, "}\nexport default");
}

/**
 * Fix component declarations: bare Name() {, function App() =>, wrong exports, path-derived names.
 * @param {string} code
 * @param {string} [filePath]
 * @param {string} componentNamesRegex - Pipe-separated names, e.g. "Header|Footer|HomePage|..."
 */
function fixComponentDeclarations(code, filePath, componentNamesRegex) {
  let c = code;

  if (!c.includes("function App") && !c.includes("const App")) {
    c = c.replace(
      /(^|\n)(\s*)App\s*\(\s*\)\s*(=>\s*)?\{/gm,
      "$1$2function App() {",
    );
  }
  c = c.replace(/function App\s*\(\s*\)\s*=>\s*\{/g, "function App() {");

  c = c.replace(
    new RegExp(`(^|\\n)(\\s*)(${componentNamesRegex})(\\s*)(\\()`, "g"),
    (m, start, sp, name, sp2, paren, offset, fullString) => {
      const lineStart =
        offset > 0 ? fullString.lastIndexOf("\n", offset - 1) + 1 : 0;
      const line = fullString.slice(lineStart, offset);
      if (
        new RegExp(
          `(?:function|export\\s+default\\s+function|const)\\s+${name}\\b`,
        ).test(line)
      )
        return m;
      return `${start}${sp}export default function ${name}${sp2}${paren}`;
    },
  );
  c = c.replace(
    /export default function export default function /g,
    "export default function ",
  );

  const mainExportMatch = c.match(
    new RegExp(`export default function (${componentNamesRegex})\\s*\\(`),
  );
  if (mainExportMatch) {
    const correctName = mainExportMatch[1];
    c = c.replace(
      /\bexport default App\s*;?/g,
      `export default ${correctName};`,
    );
  }

  if (
    filePath &&
    !/(^|\/)App\.(js|jsx)$/.test(filePath) &&
    c.includes("export default App")
  ) {
    const base = filePath.replace(/.*\//, "").replace(/\.(js|jsx)$/, "");
    const expectedName = base && /^[A-Z][a-zA-Z0-9]*$/.test(base) ? base : null;
    if (expectedName) {
      c = c.replace(
        /\bexport default function App\s*\(/g,
        `export default function ${expectedName}(`,
      );
      c = c.replace(/\bfunction App\s*\(/g, `function ${expectedName}(`);
      c = c.replace(
        /\bexport default App\s*;?/g,
        `export default ${expectedName};`,
      );
    }
  }

  // Fix inner component wrongly named App: when page file uses <StatCard> etc. but defines const App =, rename it
  if (filePath && /\/pages\/\w+Page\.(js|jsx)$/.test(filePath)) {
    if (
      c.includes("<StatCard") &&
      !c.match(/(?:const|function)\s+StatCard\b/)
    ) {
      c = c.replace(/\bconst App\s*=\s*\(/g, "const StatCard = (");
    }
    if (
      c.includes("<QuickActionButton") &&
      !c.match(/(?:const|function)\s+QuickActionButton\b/)
    ) {
      c = c.replace(/\bconst App\s*=\s*\(/g, "const QuickActionButton = (");
    }
  }

  // Fix LoginPage/RegisterPage: onNavigate('page') must be onNavigate(e, 'page') so parent receives page correctly
  if (filePath && /\/pages\/(Login|Register)Page\.(js|jsx)$/.test(filePath)) {
    c = c.replace(
      /onNavigate\s*\(\s*['"]dashboard['"]\s*\)/g,
      "onNavigate(e, 'dashboard')",
    );
    c = c.replace(
      /onNavigate\s*\(\s*['"]login['"]\s*\)/g,
      "onNavigate(e, 'login')",
    );
    c = c.replace(
      /onNavigate\s*\(\s*['"]register['"]\s*\)/g,
      "onNavigate(e, 'register')",
    );
  }

  const nonAppComponentPattern = componentNamesRegex.replace(/\|App$/, "");
  const hasOtherExportDefaultFunction = new RegExp(
    `export default function (?:${nonAppComponentPattern})\\s*\\(`,
  ).test(c);
  // Page files (DashboardPage, etc.) export the page component and may have inner helpers (StatCard, QuickActionButton).
  // Never replace those inner components with App.
  const isPageFile = filePath && /\/pages\/\w+Page\.(js|jsx)$/.test(filePath);
  const pageBase = isPageFile
    ? filePath.replace(/.*\//, "").replace(/\.(js|jsx)$/, "")
    : null;
  const hasCorrectPageExport =
    pageBase && new RegExp(`export default\\s+${pageBase}\\s*;?`).test(c);
  const skipCreateApp = isPageFile && hasCorrectPageExport;
  if (
    !skipCreateApp &&
    !hasOtherExportDefaultFunction &&
    !c.includes("function App") &&
    !c.includes("const App")
  ) {
    c = c.replace(/(function|const|class)\s+([A-Z][a-zA-Z0-9_]*)/, "$1 App");
  }

  if (
    !skipCreateApp &&
    !hasOtherExportDefaultFunction &&
    !c.includes("export default App")
  ) {
    c = c.replace(/export default\s+\w+;?/g, "");
    if (!c.endsWith(";")) c += ";";
    c += "\n\nexport default App;";
  }

  return c;
}

/** Fix invalid JSX expression syntax (semicolons, trailing commas, stray periods). */
function fixJSXExpressions(code) {
  return code
    .replace(/\{([^{}]*?);+\}/g, "{$1}")
    .replace(/\{([^{}]*?),+\}/g, "{$1}")
    .replace(/\{([^{}]*?)\.\}/g, "{$1}")
    .replace(/\{;\}/g, "{}");
}

/** Repairs small syntax mistakes AI models often generate. */
function safeSyntaxFix(code) {
  try {
    new Function(code);
    return code;
  } catch {
    return code
      .replace(/;\s*}/g, "}")
      .replace(/'\s*;/g, "'")
      .replace(/,\s*,/g, ",")
      .replace(/\{\s*,/g, "{")
      .replace(/,\s*\}/g, "}");
  }
}

/** Regex pattern for component names (from templateStructure registry). */
const COMPONENT_NAMES_REGEX = KNOWN_COMPONENT_NAMES.join("|");

/**
 * Normalizes AI component code into valid React component.
 * Pipeline: unescape → removeMarkdown → fixInvalidEscapes → fixStructure → fixComponentDeclarations → fixJSXExpressions → safeSyntaxFix
 * @param {string} code - Raw component code
 * @param {string} [filePath] - Optional path (e.g. "/components/ui/ProductCard.js") to fix export/name when model outputs App instead of filename
 */
export function normalizeComponentCode(code, filePath) {
  if (!code) return "";

  let c = unescapeCode(code);
  c = removeMarkdown(c);
  c = fixInvalidEscapes(c);
  c = fixMalformedJsxNewlines(c);
  c = fixStructure(c);
  c = fixComponentDeclarations(c, filePath, COMPONENT_NAMES_REGEX);
  c = fixJSXExpressions(c);
  c = safeSyntaxFix(c);

  return c.trim();
}

/**
 * Find the index of the closing quote for the "code" JSON string value.
 * Respects backslash escapes (\" and \\) so we don't truncate at a quote inside the code.
 * Only treats a quote as closing if it's followed by optional whitespace and then , or }.
 */
function findCodeStringEnd(text, valueStart) {
  let i = valueStart;
  while (i < text.length) {
    if (text[i] === "\\") {
      i += 2; // skip backslash and escaped char
      continue;
    }
    if (text[i] === '"') {
      const after = text.substring(i + 1).match(/^\s*[,}]/);
      if (after) return i;
      // Unescaped quote not followed by , or } — malformed, treat as content and continue
    }
    i++;
  }
  return -1;
}

/**
 * Try to extract a string value for key "key" (e.g. "/App.js" or "code") in text.
 * Looks for "key": " and then finds the closing quote (escape-aware).
 */
function extractStringValue(text, key) {
  const quoted = `"${key}":`;
  const idx = text.indexOf(quoted);
  if (idx === -1) return null;
  const valueStart = text.indexOf('"', idx + quoted.length);
  if (valueStart === -1) return null;
  const start = valueStart + 1;
  const end = findCodeStringEnd(text, start);
  if (end === -1) return null;
  return text.substring(start, end);
}

/**
 * Try to extract React component code from raw text (e.g. when response is not valid JSON).
 */
function extractReactCodeFromRaw(text) {
  if (!text || text.length < 50) return "";
  const hasApp = text.includes("function App") || text.includes("const App ");
  const hasExport = text.includes("export default App");
  if (!hasApp && !hasExport) return "";
  const idxImport = text.indexOf("import ");
  const idxFunctionApp = text.indexOf("function App");
  const idxConstApp = text.indexOf("const App ");
  const candidates = [idxImport, idxFunctionApp, idxConstApp].filter(
    (i) => i !== -1,
  );
  if (candidates.length === 0) return "";
  const start = Math.min(...candidates);
  const exportIdx = text.indexOf("export default App");
  const end = exportIdx !== -1 ? text.indexOf(";", exportIdx) + 1 : text.length;
  if (end <= start) return "";
  return text.substring(start, end).trim();
}

/**
 * Extract "files" object from raw text by pulling each known path's string value.
 * Returns object with norm path -> raw content (unescaping done later in main parser).
 */
function extractFilesFromRawText(text) {
  if (!text || text.indexOf('"files"') === -1) return null;
  const out = {};
  for (const path of KNOWN_FILE_PATHS) {
    const content =
      extractStringValue(text, path) || extractStringValue(text, path.slice(1));
    if (content && content.length > 10) out[path] = content;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Manual recovery if JSON.parse fails.
 * Tries: extract "code", then "files" -> "/App.js", then raw React-like block.
 * When "files" is present, also extracts all known file paths so components/pages are not lost.
 */
function repairAndParseManual(text) {
  let code = null;
  let files = null;

  const codeStart = text.indexOf('"code"');
  if (codeStart !== -1) {
    const firstQuote = text.indexOf('"', codeStart + 6);
    if (firstQuote !== -1) {
      const start = firstQuote + 1;
      const end = findCodeStringEnd(text, start);
      const lastBrace = text.lastIndexOf("}");
      code =
        end !== -1
          ? text.substring(start, end)
          : text.substring(start, Math.max(start, lastBrace));
    }
  }

  if (text.indexOf('"files"') !== -1) {
    files = extractFilesFromRawText(text);
    if (!code && files) code = files["/App.js"] || files["App.js"] || null;
    if (!code)
      code =
        extractStringValue(text, "/App.js") ||
        extractStringValue(text, "App.js");
  }

  if (!code || code.length < 20) {
    const rawCode = extractReactCodeFromRaw(text);
    if (rawCode.length > 100) code = rawCode;
  }

  if (!code) {
    const looksLikeJson =
      text.trim().startsWith("{") &&
      (text.includes('"analysis"') || text.includes('"files"'));
    return {
      analysis: "No JSON detected. Using raw response.",
      code: looksLikeJson ? "" : text,
    };
  }

  const result = { analysis: "Recovered manually", code };
  if (files) result.files = files;
  return result;
}

/**
 * MAIN PARSER
 */
export function parseCombinedResponse(text) {
  if (!text) throw new Error("Empty AI response");

  let clean = text.trim();

  // Remove markdown wrappers
  clean = clean.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "");

  // Try extract JSON
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) clean = match[0];

  // Remove control chars except \n and \r so pretty-printed JSON isn't corrupted
  clean = clean.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "");

  let parsed;

  try {
    parsed = JSON.parse(clean);
  } catch {
    parsed = repairAndParseManual(clean);
  }

  // Multi-file: prefer "files" object; normalize each file and keep "code" as App.js for display/legacy
  if (parsed.files && typeof parsed.files === "object") {
    const normalized = {};
    for (const [path, content] of Object.entries(parsed.files)) {
      if (typeof content !== "string") continue;
      const normPath = path.startsWith("/") ? path : `/${path}`;
      let c = unescapeCode(content);
      c = fixBrokenImageSrc(c);
      c = c
        .replace(/^```[a-z]*\n?/gi, "")
        .replace(/\n?```$/i, "")
        .trim();
      c = normalizeComponentCode(c, normPath);
      normalized[normPath] = c;
    }
    parsed.files = normalized;
    const appCode = normalized["/App.js"] || "";
    parsed.code = appCode || parsed.code || "";
  }

  if (parsed.code) {
    if (!parsed.files) {
      parsed.code = normalizeComponentCode(parsed.code);
      parsed.code = fixBrokenImageSrc(parsed.code);
    }
  }

  // Never use full JSON as code (e.g. model put whole response in "code" or App.js)
  const codeTrim = (parsed.code || "").trim();
  if (
    codeTrim.startsWith("{") &&
    (codeTrim.includes('"analysis"') || codeTrim.includes('"files"'))
  ) {
    parsed.code = parsed.files?.["/App.js"] || "";
  }

  return parsed;
}
