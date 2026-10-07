import { google } from 'googleapis';
import matter from 'gray-matter';
import { Article, ArticleMetadata, DriveConfigStatus, PublishArticlePayload } from './types';
import { SEED_ARTICLES } from './seedData';

// Cache structure to simulate Next.js ISR (Incremental Static Regeneration)
// and protect against Google Drive API rate limits (100 reqs/100s per user)
interface CacheStore {
  articles: Article[];
  lastFetchedAt: number;
  ttlMs: number; // default: 60 seconds
}

let articleCache: CacheStore = {
  articles: [],
  lastFetchedAt: 0,
  ttlMs: 60 * 1000,
};

// In-memory published fallback store (so newly created articles persist during session
// even before user adds their real Google Drive service account credentials)
let localArticlesStore: Article[] = [...SEED_ARTICLES];

/**
 * Helper to identify placeholder credentials
 */
function isPlaceholder(val?: string): boolean {
  if (!val) return true;
  return (
    val.includes('YOUR_PRIVATE_KEY') ||
    val.includes('YOUR_KEY') ||
    val.includes('your-gcp-project') ||
    val.includes('your-project-id') ||
    val.includes('MY_GEMINI') ||
    val.length < 60
  );
}

/**
 * Creates an authenticated Google Drive client using Service Account credentials.
 */
function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey || isPlaceholder(clientEmail) || isPlaceholder(privateKey)) {
    return null;
  }

  // Handle newline escapes commonly found in environment variables
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    return google.drive({ version: 'v3', auth });
  } catch (err) {
    console.warn('Failed to initialize Google Drive auth client:', err);
    return null;
  }
}

/**
 * Computes an estimated reading time from markdown content.
 */
export function calculateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return `${minutes} min read`;
}

/**
 * Tests connection to Google Drive and verifies folder access.
 */
export async function checkDriveStatus(): Promise<DriveConfigStatus> {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const hasClientEmail = Boolean(clientEmail && !isPlaceholder(clientEmail));
  const hasPrivateKey = Boolean(privateKey && !isPlaceholder(privateKey));
  const hasFolderId = Boolean(folderId && !isPlaceholder(folderId) && folderId !== '1a2B3c4D5e6F7g8H9i0jKlMnOpQrStUvW');

  if (!hasClientEmail || !hasPrivateKey || !hasFolderId) {
    return {
      isConfigured: false,
      hasClientEmail,
      hasPrivateKey,
      hasFolderId,
      connectionOk: false,
      message: 'Running in High-Speed Local & Cache CMS Mode. (To link Google Drive, replace placeholder credentials in .env.local with your Google Cloud Service Account key).',
      filesCount: localArticlesStore.length,
    };
  }

  try {
    const drive = getDriveClient();
    if (!drive) {
      throw new Error('Could not instantiate Google Drive client');
    }

    // Attempt to read the folder metadata
    const folderRes = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, capabilities, mimeType',
      supportsAllDrives: true,
    });

    // Check files inside the folder
    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 20,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const fileCount = listRes.data.files ? listRes.data.files.length : 0;

    return {
      isConfigured: true,
      hasClientEmail: true,
      hasPrivateKey: true,
      hasFolderId: true,
      folderId,
      folderName: folderRes.data.name || 'Target Articles Folder',
      connectionOk: true,
      message: `Connected successfully to Google Drive folder "${folderRes.data.name || folderId}" (${fileCount} items found).`,
      filesCount: fileCount,
    };
  } catch (error: any) {
    console.error('Google Drive health check failed:', error);
    return {
      isConfigured: true,
      hasClientEmail: true,
      hasPrivateKey: true,
      hasFolderId: true,
      folderId,
      connectionOk: false,
      message: `Connection failed: ${error?.message || 'Check Service Account permissions and Folder Sharing'}.`,
    };
  }
}

/**
 * Fetches all markdown articles from the configured Google Drive folder.
 * Uses in-memory caching to simulate Next.js ISR (Incremental Static Regeneration).
 */
export async function fetchArticles(forceRevalidate = false): Promise<Article[]> {
  const now = Date.now();

  // Return cached articles if valid and revalidate not forced
  if (
    !forceRevalidate &&
    articleCache.articles.length > 0 &&
    now - articleCache.lastFetchedAt < articleCache.ttlMs
  ) {
    return articleCache.articles;
  }

  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!drive || !folderId) {
    // Return local store if Drive credentials are not yet supplied
    articleCache = {
      articles: localArticlesStore,
      lastFetchedAt: now,
      ttlMs: 30 * 1000,
    };
    return localArticlesStore;
  }

  try {
    // List all non-trashed markdown or text files in the target folder
    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and (mimeType = 'text/markdown' or mimeType = 'text/plain' or name contains '.md')`,
      fields: 'files(id, name, createdTime, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = listRes.data.files || [];

    if (files.length === 0) {
      // If folder is empty, fallback to local seed articles
      articleCache = {
        articles: localArticlesStore,
        lastFetchedAt: now,
        ttlMs: 30 * 1000,
      };
      return localArticlesStore;
    }

    // Download and parse each markdown file
    const fetchedArticles: Article[] = [];

    for (const file of files) {
      try {
        if (!file.id) continue;
        const fileContentRes = await drive.files.get(
          {
            fileId: file.id,
            alt: 'media',
            supportsAllDrives: true,
          },
          { responseType: 'text' }
        );

        const rawMarkdown = typeof fileContentRes.data === 'string' 
          ? fileContentRes.data 
          : JSON.stringify(fileContentRes.data);

        // Parse frontmatter with gray-matter
        const parsed = matter(rawMarkdown);
        const data = parsed.data || {};

        const slug =
          data.slug ||
          file.name?.replace(/\.md$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
          file.id;

        const title = data.title || file.name?.replace(/\.md$/, '') || 'Untitled Article';
        const date = data.date || (file.createdTime ? new Date(file.createdTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recent');
        const excerpt = data.excerpt || parsed.content.slice(0, 160).replace(/[#*`_]/g, '') + '...';
        const tags = Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? data.tags.split(',').map((t: string) => t.trim()) : ['Equity Research']);
        const readTime = data.readTime || calculateReadTime(parsed.content);
        const author = data.author || 'Atiendriya Verma';

        fetchedArticles.push({
          title,
          slug,
          date,
          excerpt,
          tags,
          readTime,
          author,
          coverImage: data.coverImage,
          driveFileId: file.id,
          content: parsed.content,
        });
      } catch (err) {
        console.error(`Error reading article file ${file.name} (${file.id}):`, err);
      }
    }

    // Merge with any local articles if none found, or use fetched
    const finalArticles = fetchedArticles.length > 0 ? fetchedArticles : localArticlesStore;

    // Update ISR cache
    articleCache = {
      articles: finalArticles,
      lastFetchedAt: now,
      ttlMs: 60 * 1000,
    };

    return finalArticles;
  } catch (error) {
    console.error('Failed to fetch articles from Google Drive, falling back to local store:', error);
    return localArticlesStore;
  }
}

/**
 * Uploads or updates an article in the Google Drive folder.
 * Formats data into Markdown with YAML frontmatter.
 */
export async function uploadArticle(payload: PublishArticlePayload): Promise<{
  success: boolean;
  message: string;
  fileId?: string;
  slug: string;
  article: Article;
}> {
  const { title, slug, content, tags, excerpt, author = 'Atiendriya Verma' } = payload;
  const readTime = payload.readTime || calculateReadTime(content);
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Construct frontmatter YAML + Markdown body
  const frontmatterData = {
    title,
    slug,
    date: formattedDate,
    excerpt,
    tags,
    readTime,
    author,
    publishedAt: new Date().toISOString(),
  };

  const fileString = matter.stringify(content, frontmatterData);
  const fileName = `${slug}.md`;

  const articleObject: Article = {
    title,
    slug,
    date: formattedDate,
    excerpt,
    tags,
    readTime,
    author,
    content,
    publishedAt: frontmatterData.publishedAt,
  };

  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // Always update local memory store for instant responsiveness
  const existingIdx = localArticlesStore.findIndex((a) => a.slug === slug);
  if (existingIdx >= 0) {
    localArticlesStore[existingIdx] = articleObject;
  } else {
    localArticlesStore.unshift(articleObject);
  }

  // Bust cache
  articleCache.lastFetchedAt = 0;

  if (!drive || !folderId) {
    return {
      success: true,
      message: 'Article saved to local repository! (To sync to Google Drive, configure GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID in environment).',
      slug,
      article: articleObject,
    };
  }

  try {
    // 1. Check if file already exists with same name in the folder
    const searchRes = await drive.files.list({
      q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const existingFile = searchRes.data.files && searchRes.data.files[0];

    let fileId: string;

    if (existingFile && existingFile.id) {
      // Update existing file
      fileId = existingFile.id;
      await drive.files.update({
        fileId: existingFile.id,
        media: {
          mimeType: 'text/markdown',
          body: fileString,
        },
        supportsAllDrives: true,
      });
    } else {
      // Create new file
      const createRes = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
          mimeType: 'text/markdown',
          description: `Article published via Atiendriya Verma Blog Portal: ${title}`,
        },
        media: {
          mimeType: 'text/markdown',
          body: fileString,
        },
        supportsAllDrives: true,
      });

      if (!createRes.data.id) {
        throw new Error('Failed to retrieve file ID from Google Drive API response');
      }
      fileId = createRes.data.id;
    }

    articleObject.driveFileId = fileId;

    return {
      success: true,
      message: `Successfully published "${title}" directly to Google Drive (File ID: ${fileId})!`,
      fileId,
      slug,
      article: articleObject,
    };
  } catch (error: any) {
    console.error('Google Drive upload error:', error);
    // Even if Drive upload fails due to API permissions or rate limits, local fallback succeeded
    return {
      success: true,
      message: `Article saved locally, but Google Drive sync encountered an issue: ${error?.message || 'Check service account write permissions'}.`,
      slug,
      article: articleObject,
    };
  }
}
