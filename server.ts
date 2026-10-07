import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  fetchArticles, 
  uploadArticle, 
  checkDriveStatus,
  calculateReadTime 
} from './lib/googleDrive';
import { PublishArticlePayload } from './lib/types';

dotenv.config();
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check Google Drive configuration and folder connectivity
app.get('/api/drive/status', async (req, res) => {
  try {
    const status = await checkDriveStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error checking drive status' });
  }
});

// Fetch all articles (with simulated Next.js ISR cache)
app.get('/api/articles', async (req, res) => {
  try {
    const forceRevalidate = req.query.revalidate === 'true';
    const articles = await fetchArticles(forceRevalidate);
    res.json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch articles' });
  }
});

// Fetch a single article by slug
app.get('/api/articles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const articles = await fetchArticles();
    const article = articles.find((a) => a.slug === slug);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }
    res.json({ success: true, article });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch article' });
  }
});

// Verify Admin Passcode
app.post('/api/verify-key', (req, res) => {
  const { passcode } = req.body;
  const configuredKey = process.env.ADMIN_SECRET_KEY || 'alpha-research-2026';
  if (!passcode || passcode.trim() !== configuredKey.trim()) {
    return res.status(401).json({ success: false, message: 'Invalid Admin Secret Key' });
  }
  return res.json({ success: true, message: 'Authorized' });
});

// Publish article to Google Drive and local store
app.post('/api/publish', async (req, res) => {
  try {
    const payload: PublishArticlePayload = req.body;
    const { title, slug, content, tags, excerpt, passcode } = payload;

    // Verify Passcode Gate
    const configuredKey = process.env.ADMIN_SECRET_KEY || 'alpha-research-2026';
    if (!passcode || passcode.trim() !== configuredKey.trim()) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid Admin Secret Key.',
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Article title is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Article content cannot be empty' });
    }

    const cleanSlug =
      slug?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const readTime = payload.readTime || calculateReadTime(content);
    const finalTags = tags && tags.length > 0 ? tags : ['Equity Research'];
    const finalExcerpt = excerpt?.trim() || content.slice(0, 160).replace(/[#*`_]/g, '') + '...';

    const result = await uploadArticle({
      title: title.trim(),
      slug: cleanSlug,
      content: content.trim(),
      tags: finalTags,
      excerpt: finalExcerpt,
      readTime,
      author: payload.author || 'Atiendriya Verma',
    });

    res.json(result);
  } catch (err: any) {
    console.error('Publish API error:', err);
    res.status(500).json({
      success: false,
      message: err?.message || 'Internal server error during publishing',
    });
  }
});

// Step-by-step Setup Guide JSON endpoint
app.get('/api/setup-guide', (req, res) => {
  res.json({
    title: 'Google Cloud Console Setup Guide for Google Drive CMS',
    steps: [
      {
        step: 1,
        title: 'Create or Select a Google Cloud Project',
        detail: 'Navigate to https://console.cloud.google.com/. Click the project dropdown in the top bar, click "New Project", name it "atiendriya-blog-cms", and click "Create".'
      },
      {
        step: 2,
        title: 'Enable the Google Drive API',
        detail: 'In the navigation menu, go to "APIs & Services" > "Library". Search for "Google Drive API", select it, and click "Enable".'
      },
      {
        step: 3,
        title: 'Create a Service Account',
        detail: 'Go to "APIs & Services" > "Credentials". Click "+ CREATE CREDENTIALS" > "Service account". Name it "blog-drive-writer", give it description "Service account for writing markdown articles to Google Drive folder", and click "Done".'
      },
      {
        step: 4,
        title: 'Generate and Download the Private Key (JSON)',
        detail: 'Click on the newly created Service Account. Go to the "KEYS" tab > "ADD KEY" > "Create new key". Choose "JSON" format and click "Create". Open the downloaded .json file to copy "client_email" and "private_key".'
      },
      {
        step: 5,
        title: 'Create a Target Google Drive Folder & Share Permissions',
        detail: 'Open your Google Drive (https://drive.google.com). Create a new folder named "Blog Articles". Right-click the folder > "Share". Add the Service Account email (e.g. blog-drive-writer@your-project.iam.gserviceaccount.com) with "Editor" permission. Uncheck "Notify people" and click "Share".'
      },
      {
        step: 6,
        title: 'Copy the Folder ID & Configure Environment Variables',
        detail: 'Open the Drive folder in your browser. Look at the URL bar: drive.google.com/drive/folders/1a2B3c4D5e6F7g8H9i0jKlMnOpQrStUvW. The alphanumeric string at the end is your GOOGLE_DRIVE_FOLDER_ID. Paste it into your .env.local file alongside GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and ADMIN_SECRET_KEY.'
      }
    ]
  });
});

// Setup Vite middleware in dev or static files in production
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[Atiendriya Verma Blog] Server running on http://0.0.0.0:${PORT}`);
});
