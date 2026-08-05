import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'node-html-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 2999;

// Path to storage
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'links.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default links in case links.json does not exist
const DEFAULT_LINKS = [
  {
    "id": "github",
    "title": "GitHub",
    "description": "Collaborative software development, code hosting, and version control.",
    "url": "https://github.com",
    "icon": "https://github.githubassets.com/favicons/favicon.svg"
  },
  {
    "id": "jira",
    "title": "Jira Software",
    "description": "Sprint planning, issue tracking, and agile project management.",
    "url": "https://jira.atlassian.com",
    "icon": "https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png"
  },
  {
    "id": "grafana",
    "title": "Grafana Dashboards",
    "description": "Operational dashboards, performance analytics, and log monitoring.",
    "url": "https://grafana.com",
    "icon": "https://grafana.com/static/img/favicons/favicon.ico"
  },
  {
    "id": "sentry",
    "title": "Sentry",
    "description": "Application monitoring, error tracking, and performance diagnostics.",
    "url": "https://sentry.io",
    "icon": "https://sentry.io/favicon.ico"
  }
];

// Initialize links.json if not present
if (!fs.existsSync(DATA_FILE)) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_LINKS, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write default links:', err);
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get all links
app.get('/api/links', (req, res) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const rawData = fs.readFileSync(DATA_FILE, 'utf8');
      const links = JSON.parse(rawData);
      return res.json(links);
    }
    return res.json(DEFAULT_LINKS);
  } catch (err) {
    console.error('Error reading links file:', err);
    return res.status(500).json({ error: 'Failed to read links database' });
  }
});

// Update links
app.post('/api/links', (req, res) => {
  try {
    const links = req.body;
    if (!Array.isArray(links)) {
      return res.status(400).json({ error: 'Data must be an array of links' });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2), 'utf8');
    return res.json({ success: true, count: links.length });
  } catch (err) {
    console.error('Error writing links file:', err);
    return res.status(500).json({ error: 'Failed to save links' });
  }
});

// Fetch metadata from URL
app.get('/api/metadata', async (req, res) => {
  let targetUrlStr = req.query.url;
  if (!targetUrlStr) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Normalize URL
  if (!/^https?:\/\//i.test(targetUrlStr)) {
    targetUrlStr = 'https://' + targetUrlStr;
  }

  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    // Set up request with 5s timeout and common browser User-Agent to avoid scraping blocks
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(targetUrl.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const htmlText = await response.text();
    const root = parse(htmlText);

    // 1. Resolve Title
    let title = '';
    
    // Check <title>
    const titleNode = root.querySelector('title');
    if (titleNode) {
      title = titleNode.text.trim();
    }
    
    // Check og:title
    if (!title) {
      const ogTitleNode = root.querySelector('meta[property="og:title"]') || root.querySelector('meta[name="og:title"]');
      if (ogTitleNode) {
        title = ogTitleNode.getAttribute('content')?.trim() || '';
      }
    }
    
    // Check twitter:title
    if (!title) {
      const twTitleNode = root.querySelector('meta[name="twitter:title"]');
      if (twTitleNode) {
        title = twTitleNode.getAttribute('content')?.trim() || '';
      }
    }

    // Default to domain name if no title found
    if (!title) {
      title = targetUrl.hostname;
    }

    // 2. Resolve Description
    let description = '';
    const descNode = root.querySelector('meta[name="description"]');
    if (descNode) {
      description = descNode.getAttribute('content')?.trim() || '';
    }

    if (!description) {
      const ogDescNode = root.querySelector('meta[property="og:description"]') || root.querySelector('meta[name="og:description"]');
      if (ogDescNode) {
        description = ogDescNode.getAttribute('content')?.trim() || '';
      }
    }

    if (!description) {
      const twDescNode = root.querySelector('meta[name="twitter:description"]');
      if (twDescNode) {
        description = twDescNode.getAttribute('content')?.trim() || '';
      }
    }

    // 3. Resolve Favicon Icon
    let iconUrl = '';

    // Order of preference for icon rels
    const iconSelectors = [
      'link[rel="apple-touch-icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="icon"]',
      'link[rel*="icon"]' // catches "alternate icon", etc.
    ];

    for (const selector of iconSelectors) {
      const linkNode = root.querySelector(selector);
      if (linkNode) {
        const href = linkNode.getAttribute('href');
        if (href) {
          iconUrl = href;
          break;
        }
      }
    }

    // Resolve relative URLs to absolute
    if (iconUrl) {
      try {
        iconUrl = new URL(iconUrl, targetUrl.href).href;
      } catch (err) {
        console.error('Failed to resolve icon URL absolute path:', err);
      }
    } else {
      // Fallback: standard domain favicon.ico
      iconUrl = `${targetUrl.origin}/favicon.ico`;
    }

    return res.json({
      url: targetUrl.href,
      title,
      description,
      icon: iconUrl
    });

  } catch (err) {
    console.error(`Error scraping URL ${targetUrl.href}:`, err.message);
    
    // Return empty fields on error so client can fill them manually
    return res.json({
      url: targetUrl.href,
      title: targetUrl.hostname,
      description: '',
      icon: `${targetUrl.origin}/favicon.ico`,
      error: err.message || 'Failed to fetch site metadata'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
