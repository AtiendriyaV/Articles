import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  FolderOpen, 
  Key, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Code2,
  FileCode,
  Terminal
} from 'lucide-react';
import { DriveConfigStatus } from '@/lib/types';

interface CloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  driveStatus: DriveConfigStatus | null;
  onRefreshStatus: () => void;
}

export const CloudSetupModal: React.FC<CloudSetupModalProps> = ({
  isOpen,
  onClose,
  driveStatus,
  onRefreshStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'status' | 'nextjs-code'>('guide');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedCodeFile, setSelectedCodeFile] = useState<string>('googleDrive.ts');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: 'Step 1: Create a Project in Google Cloud Console',
      desc: 'Open Google Cloud Console, select the project dropdown at the top, and click "NEW PROJECT". Name it "atiendriya-portfolio-cms" and click "Create".',
      actionLink: 'https://console.cloud.google.com/projectcreate',
      actionLabel: 'Open GCP New Project',
    },
    {
      title: 'Step 2: Enable the Google Drive API',
      desc: 'Navigate to "APIs & Services" > "Library". In the search bar, type "Google Drive API". Select the Google Drive API result and click "Enable".',
      actionLink: 'https://console.cloud.google.com/apis/library/drive.googleapis.com',
      actionLabel: 'Enable Google Drive API',
    },
    {
      title: 'Step 3: Create a Service Account',
      desc: 'Go to "APIs & Services" > "Credentials". Click "+ CREATE CREDENTIALS" at the top and choose "Service account". Name it "blog-drive-writer". You do not need project-wide IAM roles because permissions will be granted directly at the folder level.',
      actionLink: 'https://console.cloud.google.com/apis/credentials/serviceaccountcreate',
      actionLabel: 'Create Service Account',
    },
    {
      title: 'Step 4: Generate and Download Private Key (JSON)',
      desc: 'Click on your newly created service account email. Go to the "KEYS" tab > "ADD KEY" > "Create new key". Select "JSON" and click "Create". A JSON file containing client_email and private_key will download to your computer.',
    },
    {
      title: 'Step 5: Create a Google Drive Folder & Share with Service Account',
      desc: 'Open Google Drive (drive.google.com). Create a new folder named "Atiendriya Blog Articles". Right-click the folder > "Share". Paste your Service Account email (e.g. blog-drive-writer@your-project.iam.gserviceaccount.com). Grant it "Editor" access. Uncheck "Notify people" and click "Share".',
      actionLink: 'https://drive.google.com',
      actionLabel: 'Open Google Drive',
    },
    {
      title: 'Step 6: Copy Folder ID & Configure .env.local',
      desc: 'Open your folder in Google Drive. Look at the browser URL bar: drive.google.com/drive/folders/1a2B3c4D5e6F7g8H9i0jKlMnOpQrStUvW. The alphanumeric string at the end is your GOOGLE_DRIVE_FOLDER_ID. Paste it into your .env.local file.',
    },
  ];

  const codeSnippets: Record<string, { filename: string; path: string; code: string }> = {
    'googleDrive.ts': {
      filename: 'googleDrive.ts',
      path: 'lib/googleDrive.ts',
      code: `import { google } from 'googleapis';
import matter from 'gray-matter';
import { Article, PublishArticlePayload } from './types';

function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!clientEmail || !privateKey) return null;
  if (privateKey.includes('\\\\n')) privateKey = privateKey.replace(/\\\\n/g, '\\n');
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

export async function fetchArticles(): Promise<Article[]> {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!drive || !folderId) return [];
  const listRes = await drive.files.list({
    q: \`'\${folderId}' in parents and trashed = false and (name contains '.md')\`,
    fields: 'files(id, name, createdTime, modifiedTime)',
    orderBy: 'modifiedTime desc',
  });
  const files = listRes.data.files || [];
  const articles: Article[] = [];
  for (const file of files) {
    if (!file.id) continue;
    const res = await drive.files.get({ fileId: file.id, alt: 'media' }, { responseType: 'text' });
    const parsed = matter(res.data as string);
    articles.push({
      title: parsed.data.title || file.name,
      slug: parsed.data.slug || file.name.replace(/\\.md$/, ''),
      date: parsed.data.date || 'Recent',
      excerpt: parsed.data.excerpt || '',
      tags: parsed.data.tags || [],
      readTime: parsed.data.readTime || '5 min read',
      author: parsed.data.author || 'Atiendriya Verma',
      content: parsed.content,
      driveFileId: file.id,
    });
  }
  return articles;
}

export async function uploadArticle(payload: PublishArticlePayload) {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!drive || !folderId) throw new Error('Drive not configured');
  const fileContent = matter.stringify(payload.content, {
    title: payload.title,
    slug: payload.slug,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    excerpt: payload.excerpt,
    tags: payload.tags,
    readTime: payload.readTime,
    author: payload.author || 'Atiendriya Verma',
  });
  const fileName = \`\${payload.slug}.md\`;
  const existing = await drive.files.list({
    q: \`'\${folderId}' in parents and name = '\${fileName}' and trashed = false\`,
  });
  if (existing.data.files && existing.data.files.length > 0) {
    const fileId = existing.data.files[0].id!;
    await drive.files.update({ fileId, media: { mimeType: 'text/markdown', body: fileContent } });
    return { success: true, fileId };
  } else {
    const create = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId], mimeType: 'text/markdown' },
      media: { mimeType: 'text/markdown', body: fileContent },
    });
    return { success: true, fileId: create.data.id! };
  }
}`
    },
    'publish.ts': {
      filename: 'publish.ts',
      path: 'app/actions/publish.ts',
      code: `'use server';

import { revalidatePath } from 'next/cache';
import { uploadArticle, calculateReadTime } from '@/lib/googleDrive';
import { PublishArticlePayload } from '@/lib/types';

export async function publishArticleAction(formData: FormData | PublishArticlePayload) {
  const passcode = formData instanceof FormData ? formData.get('passcode') as string : formData.passcode;
  const serverSecret = process.env.ADMIN_SECRET_KEY || 'alpha-research-2026';
  
  if (!passcode || passcode.trim() !== serverSecret.trim()) {
    return { success: false, message: 'Unauthorized: Invalid Admin Secret Key' };
  }

  const payload: PublishArticlePayload = formData instanceof FormData ? {
    title: formData.get('title') as string,
    slug: formData.get('slug') as string,
    content: formData.get('content') as string,
    excerpt: formData.get('excerpt') as string,
    tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
    readTime: calculateReadTime(formData.get('content') as string),
    author: 'Atiendriya Verma',
  } : formData;

  const res = await uploadArticle(payload);
  
  // Revalidate Next.js ISR Cache
  revalidatePath('/');
  revalidatePath(\`/blog/\${payload.slug}\`);

  return { success: true, message: 'Published directly to Google Drive!', fileId: res.fileId, slug: payload.slug };
}`
    },
    'admin-page.tsx': {
      filename: 'page.tsx',
      path: 'app/admin/write/page.tsx',
      code: `'use client';

import React, { useState, useTransition } from 'react';
import { publishArticleAction } from '@/app/actions/publish';

export default function AdminWritePage() {
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('# Investment Thesis\\n\\n### Key Highlights...');
  const [isPending, startTransition] = useTransition();

  const handlePublish = () => {
    startTransition(async () => {
      const res = await publishArticleAction({
        title,
        slug,
        content,
        excerpt: content.slice(0, 150) + '...',
        tags: ['Equity Research'],
        passcode,
      });
      alert(res.message);
    });
  };

  if (!isUnlocked) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <h2 className="text-lg font-bold mb-4">Admin Passcode</h2>
        <input 
          type="password" 
          value={passcode} 
          onChange={(e) => setPasscode(e.target.value)} 
          className="border p-2 w-full mb-4" 
          placeholder="Enter ADMIN_SECRET_KEY"
        />
        <button onClick={() => setIsUnlocked(true)} className="bg-black text-white px-4 py-2">
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <input 
        value={title} 
        onChange={(e) => setTitle(e.target.value)} 
        placeholder="Article Title" 
        className="text-2xl font-bold w-full border-b mb-4 p-2"
      />
      <textarea 
        value={content} 
        onChange={(e) => setContent(e.target.value)} 
        className="w-full h-96 border p-4 font-mono text-sm"
      />
      <button onClick={handlePublish} disabled={isPending} className="mt-4 bg-black text-white px-6 py-2">
        {isPending ? 'Publishing...' : 'Publish to Google Drive'}
      </button>
    </div>
  );
}`
    },
    'env.local': {
      filename: '.env.local',
      path: '.env.local',
      code: `# Atiendriya Verma Blog - Environment Configuration
ADMIN_SECRET_KEY="alpha-research-2026"
GOOGLE_CLIENT_EMAIL="blog-drive-writer@your-project-id.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvg...YOUR_KEY...\\n-----END PRIVATE KEY-----\\n"
GOOGLE_DRIVE_FOLDER_ID="1a2B3c4D5e6F7g8H9i0jKlMnOpQrStUvW"
CACHE_REVALIDATE_SECONDS="60"`
    }
  };

  const handleCopyCurrentCode = () => {
    const code = codeSnippets[selectedCodeFile]?.code || '';
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#e7e5e4] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e7e5e4] flex items-center justify-between bg-[#faf9f6]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1c1917] text-white flex items-center justify-center font-serif text-sm font-bold">
              GC
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1c1917]">
                Google Cloud Console & Next.js Architecture
              </h2>
              <p className="text-xs text-[#78716c]">
                Production Google Drive CMS Integration & Source Code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#78716c] hover:text-[#1c1917] hover:bg-[#e7e5e4] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="px-6 border-b border-[#e7e5e4] flex items-center gap-4 bg-white text-xs">
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 font-medium transition-colors cursor-pointer border-b-2 ${
              activeTab === 'guide'
                ? 'border-[#1c1917] text-[#1c1917]'
                : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            1. Setup Guide (Steps 1–6)
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 font-medium transition-colors cursor-pointer border-b-2 ${
              activeTab === 'status'
                ? 'border-[#1c1917] text-[#1c1917]'
                : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            2. Live Drive Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('nextjs-code')}
            className={`py-3 font-medium transition-colors cursor-pointer border-b-2 ${
              activeTab === 'nextjs-code'
                ? 'border-[#1c1917] text-[#1c1917]'
                : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            3. Next.js App Router Source Files
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#f5f4ef] border-l-3 border-[#1c1917] text-xs text-[#44403c] leading-relaxed">
                <strong>Why Google Drive as a CMS?</strong> Markdown files (.md) saved to your Drive folder can be edited on your phone, shared with co-authors, and backed up in Google Drive. Next.js fetches and caches them via ISR (revalidate) for lightning-fast reader performance.
              </div>

              <div className="space-y-4">
                {steps.map((st, i) => (
                  <div key={i} className="p-4 border border-[#e7e5e4] bg-white hover:border-[#a8a29e] transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="font-serif font-bold text-sm text-[#1c1917]">{st.title}</h3>
                      {st.actionLink && (
                        <a
                          href={st.actionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-1 text-[11px] font-mono text-[#0a66c2] hover:underline"
                        >
                          <span>{st.actionLabel}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-[#57534e] leading-relaxed">{st.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white border border-[#e7e5e4]">
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#1c1917]">Drive Connection Status</h3>
                  <p className="text-xs text-[#78716c] mt-0.5">
                    {driveStatus?.message || 'Checking environment status...'}
                  </p>
                </div>
                <button
                  onClick={onRefreshStatus}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1917] text-white text-xs font-mono cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retest</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 border border-[#e7e5e4] bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[#78716c]">GOOGLE_CLIENT_EMAIL</span>
                    {driveStatus?.hasClientEmail ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <span className="text-[11px] text-[#57534e]">
                    {driveStatus?.hasClientEmail ? 'Detected in environment' : 'Not configured'}
                  </span>
                </div>

                <div className="p-4 border border-[#e7e5e4] bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[#78716c]">GOOGLE_PRIVATE_KEY</span>
                    {driveStatus?.hasPrivateKey ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <span className="text-[11px] text-[#57534e]">
                    {driveStatus?.hasPrivateKey ? 'RSA Private Key loaded' : 'Not configured'}
                  </span>
                </div>

                <div className="p-4 border border-[#e7e5e4] bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[#78716c]">GOOGLE_DRIVE_FOLDER_ID</span>
                    {driveStatus?.hasFolderId ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <span className="text-[11px] text-[#57534e]">
                    {driveStatus?.hasFolderId ? `Folder: ${driveStatus.folderId?.slice(0, 8)}...` : 'Not configured'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#f5f5f4] text-xs font-mono text-[#44403c] space-y-2">
                <div className="font-semibold text-[#1c1917]">💡 Active Runtime Mode:</div>
                <p>
                  {driveStatus?.connectionOk
                    ? 'Connected directly to Google Drive API. Every article published at /admin/write writes a real .md file to your shared Google Drive folder.'
                    : 'Currently operating in High-Speed Local Cache Mode with seeded equity research memorandums. Once you add your Google Cloud credentials to .env.local, it will automatically connect to your Google Drive folder.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: NEXT.JS SOURCE FILES */}
          {activeTab === 'nextjs-code' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e7e5e4]">
                {/* File picker */}
                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                  {Object.keys(codeSnippets).map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCodeFile(key)}
                      className={`px-3 py-1.5 font-mono cursor-pointer transition-colors ${
                        selectedCodeFile === key
                          ? 'bg-[#1c1917] text-white font-medium'
                          : 'bg-[#f5f5f4] text-[#57534e] hover:bg-[#e7e5e4]'
                      }`}
                    >
                      {codeSnippets[key].path}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCopyCurrentCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1917] hover:bg-black text-white text-xs font-mono cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy File'}</span>
                </button>
              </div>

              <div className="bg-[#1c1917] text-[#f5f5f4] p-4 text-xs font-mono overflow-x-auto max-h-[420px] leading-relaxed">
                <pre>{codeSnippets[selectedCodeFile]?.code}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#e7e5e4] bg-[#faf9f6] flex items-center justify-between text-xs text-[#78716c]">
          <span className="font-mono">Atiendriya Verma Blog · Google Drive CMS</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1c1917] text-white text-xs font-medium uppercase tracking-wider cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
