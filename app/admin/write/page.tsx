'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Send, 
  Eye, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Clock, 
  FileText, 
  Tag, 
  Sparkles,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { publishArticleAction } from '@/app/actions/publish';

export default function AdminWritePage() {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [tagsInput, setTagsInput] = useState('Equity Research, Indian Macro, Valuation');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState(`# Enter Your Thesis or Analysis Here

### Key Investment Highlights
- **Catalyst 1**: Accelerated revenue growth driven by industrial capacity expansion.
- **Catalyst 2**: Operating leverage translating into 250 bps EBITDA margin expansion.
- **Valuation**: DCF model implies a target price of ₹2,450 (18% upside from current market price).

---

## 1. Industry Context & Macro Regime
Discuss the macro backdrop, interest rate environment, and sector dynamics...

\`\`\`python
# Financial calculation snippet
import numpy as np

def compute_wacc(cost_of_equity, cost_of_debt, tax_rate, equity_weight, debt_weight):
    after_tax_debt = cost_of_debt * (1 - tax_rate)
    return (cost_of_equity * equity_weight) + (after_tax_debt * debt_weight)
\`\`\`

## 2. Competitive Moat & Unit Economics
Detail return on invested capital (ROIC), working capital cycle, and pricing power...
`);

  const [activeTab, setActiveTab] = useState<'split' | 'edit' | 'preview'>('split');
  const [isPending, startTransition] = useTransition();
  const [publishStatus, setPublishStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
    slug?: string;
  }>({ type: 'idle', message: '' });

  // Compute live word count & reading time
  const stats = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return {
      words,
      readTime: `${minutes} min read`,
    };
  }, [content]);

  // Auto-generate slug from title if user hasn't explicitly typed custom slug
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError('Please enter the Admin Secret Key.');
      return;
    }
    // Verify client-side gate (full verification takes place on the server action upon publish)
    setIsAuthenticated(true);
    setAuthError('');
  };

  const handlePublish = () => {
    if (!title.trim()) {
      setPublishStatus({ type: 'error', message: 'Please specify an article title.' });
      return;
    }
    if (!content.trim()) {
      setPublishStatus({ type: 'error', message: 'Article content cannot be empty.' });
      return;
    }

    setPublishStatus({ type: 'idle', message: '' });

    startTransition(async () => {
      try {
        const tags = tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

        const res = await publishArticleAction({
          title,
          slug,
          content,
          excerpt,
          tags,
          readTime: stats.readTime,
          passcode,
          author: 'Atiendriya Verma',
        });

        if (res.success) {
          setPublishStatus({
            type: 'success',
            message: res.message || 'Article successfully published to Google Drive!',
            slug: res.slug,
          });
        } else {
          setPublishStatus({
            type: 'error',
            message: res.message || 'Failed to publish article.',
          });
        }
      } catch (err: any) {
        setPublishStatus({
          type: 'error',
          message: err?.message || 'Network error encountered during publishing.',
        });
      }
    });
  };

  // If locked, render authentication gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-[#e7e5e4] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#1c1917] text-white flex items-center justify-center font-serif text-lg font-bold">
              AV
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#1c1917]">Admin Writing Portal</h1>
              <p className="text-xs text-[#78716c]">Atiendriya Verma · Equity Research Blog</p>
            </div>
          </div>

          <div className="mb-6 p-3 bg-[#f5f5f4] text-xs text-[#57534e] leading-relaxed">
            <div className="flex items-center gap-2 font-medium text-[#1c1917] mb-1">
              <Lock className="w-3.5 h-3.5" />
              Protected by ADMIN_SECRET_KEY
            </div>
            Enter your configured passcode to access the Google Drive publishing console.
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#78716c] mb-1">
                Passcode / Admin Secret
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter ADMIN_SECRET_KEY..."
                className="w-full px-3 py-2 border border-[#d6d3d1] focus:outline-none focus:border-[#1c1917] text-sm font-mono"
                autoFocus
              />
              {authError && <p className="text-xs text-red-600 mt-1">{authError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#1c1917] hover:bg-black text-white text-xs font-medium uppercase tracking-wider transition-colors"
            >
              Unlock Editor
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#e7e5e4] flex items-center justify-between text-xs text-[#78716c]">
            <Link href="/" className="hover:text-[#1c1917] flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog
            </Link>
            <span className="text-[10px] text-[#a8a29e]">Default test key: alpha-research-2026</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e7e5e4] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Site</span>
          </Link>
          <span className="text-[#d6d3d1]">|</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-[#1c1917]">
              Google Drive Markdown Composer
            </span>
            <span className="text-[11px] text-[#78716c]">({stats.words} words · {stats.readTime})</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switchers */}
          <div className="hidden md:flex items-center bg-[#f5f5f4] p-1 border border-[#e7e5e4] text-xs">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1 text-xs transition-colors ${
                activeTab === 'edit' ? 'bg-white font-medium text-[#1c1917] shadow-xs' : 'text-[#78716c]'
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setActiveTab('split')}
              className={`px-3 py-1 text-xs transition-colors ${
                activeTab === 'split' ? 'bg-white font-medium text-[#1c1917] shadow-xs' : 'text-[#78716c]'
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 text-xs transition-colors ${
                activeTab === 'preview' ? 'bg-white font-medium text-[#1c1917] shadow-xs' : 'text-[#78716c]'
              }`}
            >
              Preview
            </button>
          </div>

          <button
            onClick={handlePublish}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#1c1917] hover:bg-black disabled:bg-[#78716c] text-white text-xs font-medium uppercase tracking-wider transition-all"
          >
            {isPending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Publishing to Drive...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Publish to Drive
              </>
            )}
          </button>
        </div>
      </header>

      {/* Notifications */}
      {publishStatus.type !== 'idle' && (
        <div
          className={`px-6 py-3 border-b text-xs flex items-center justify-between ${
            publishStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {publishStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{publishStatus.message}</span>
          </div>

          {publishStatus.slug && (
            <Link
              href={`/blog/${publishStatus.slug}`}
              className="underline font-medium hover:text-black"
            >
              View Published Article →
            </Link>
          )}
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-6 gap-6">
        {/* Metadata Controls */}
        <div className="bg-white border border-[#e7e5e4] p-5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#78716c] mb-1">
              Article Title
            </label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g. Dissecting DCF in High-Growth Indian Tech & Consumer..."
              className="w-full text-lg md:text-xl font-serif font-bold text-[#1c1917] px-3 py-2 border border-[#d6d3d1] focus:outline-none focus:border-[#1c1917]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#78716c] mb-1">
              URL Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. dissecting-dcf-high-growth-equities"
              className="w-full text-xs font-mono text-[#44403c] px-3 py-2 border border-[#d6d3d1] focus:outline-none focus:border-[#1c1917]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#78716c] mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Equity Research, Valuation, Indian Macro"
              className="w-full text-xs text-[#44403c] px-3 py-2 border border-[#d6d3d1] focus:outline-none focus:border-[#1c1917]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#78716c] mb-1">
              Executive Excerpt (1-2 sentences for feed & SEO)
            </label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="A brief executive summary of your research memorandum..."
              className="w-full text-xs text-[#44403c] px-3 py-2 border border-[#d6d3d1] focus:outline-none focus:border-[#1c1917]"
            />
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 min-h-[550px] grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Markdown Input Area */}
          {(activeTab === 'split' || activeTab === 'edit') && (
            <div className={`flex flex-col bg-white border border-[#e7e5e4] ${activeTab === 'edit' ? 'md:col-span-2' : ''}`}>
              <div className="bg-[#f5f5f4] border-b border-[#e7e5e4] px-4 py-2 flex items-center justify-between text-xs text-[#78716c]">
                <div className="flex items-center gap-1.5 font-medium text-[#44403c]">
                  <Edit3 className="w-3.5 h-3.5" />
                  Markdown Source
                </div>
                <span className="text-[11px]">Supports Standard Markdown + LaTeX math ($$)</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Compose your research memorandum in Markdown..."
                className="w-full flex-1 p-5 font-mono text-sm leading-relaxed text-[#1c1917] resize-none focus:outline-none"
              />
            </div>
          )}

          {/* Live Preview Area */}
          {(activeTab === 'split' || activeTab === 'preview') && (
            <div className={`flex flex-col bg-white border border-[#e7e5e4] overflow-y-auto ${activeTab === 'preview' ? 'md:col-span-2' : ''}`}>
              <div className="bg-[#f5f5f4] border-b border-[#e7e5e4] px-4 py-2 flex items-center justify-between text-xs text-[#78716c]">
                <div className="flex items-center gap-1.5 font-medium text-[#44403c]">
                  <Eye className="w-3.5 h-3.5" />
                  Live Reader Preview
                </div>
                <span className="text-[11px]">Editorial Serif Typography</span>
              </div>
              
              <div className="p-8 max-w-prose mx-auto w-full">
                <header className="mb-8 border-b border-[#e7e5e4] pb-6">
                  <div className="flex items-center gap-2 text-xs text-[#78716c] mb-3">
                    <span>{stats.readTime}</span>
                    <span>·</span>
                    <span>By Atiendriya Verma</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#1c1917] leading-tight mb-4">
                    {title || 'Untitled Article'}
                  </h1>
                  {excerpt && <p className="text-sm text-[#57534e] italic leading-relaxed">{excerpt}</p>}
                </header>

                <div className="prose font-serif text-[#292524] text-base leading-relaxed space-y-4">
                  {content.split('\n\n').map((paragraph, i) => {
                    if (paragraph.startsWith('# ')) {
                      return <h1 key={i} className="text-2xl font-serif font-bold text-[#1c1917] mt-6 mb-2">{paragraph.replace('# ', '')}</h1>;
                    }
                    if (paragraph.startsWith('## ')) {
                      return <h2 key={i} className="text-xl font-serif font-semibold text-[#1c1917] mt-5 mb-2">{paragraph.replace('## ', '')}</h2>;
                    }
                    if (paragraph.startsWith('### ')) {
                      return <h3 key={i} className="text-lg font-serif font-semibold text-[#1c1917] mt-4 mb-2">{paragraph.replace('### ', '')}</h3>;
                    }
                    if (paragraph.startsWith('> ')) {
                      return (
                        <blockquote key={i} className="border-l-2 border-[#1c1917] pl-4 italic text-[#57534e] my-4">
                          {paragraph.replace('> ', '')}
                        </blockquote>
                      );
                    }
                    if (paragraph.startsWith('```')) {
                      const codeLines = paragraph.replace(/```[a-z]*\n?/g, '').trim();
                      return (
                        <div key={i} className="my-4 rounded-md overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-lg font-mono text-xs">
                          <div className="bg-[#161b22] px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                              <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                              <span className="ml-2 text-[10px] text-zinc-400 font-mono">python3 console</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">Terminal</span>
                          </div>
                          <div className="p-3 overflow-x-auto text-zinc-200 text-[11px] leading-relaxed">
                            <pre><code>{codeLines}</code></pre>
                          </div>
                        </div>
                      );
                    }
                    return <p key={i} className="leading-relaxed whitespace-pre-line">{paragraph}</p>;
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
