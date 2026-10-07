import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { ArrowLeft, Clock, Calendar, Share2, Bookmark, Heart, Tag, BookOpen } from 'lucide-react';
import { fetchArticles } from '@/lib/googleDrive';
import { Article } from '@/lib/types';

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

// Next.js ISR: Revalidate page every 60 seconds (or on-demand via Server Action)
export const revalidate = 60;

/**
 * Generate dynamic metadata for SEO and OpenGraph
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const articles = await fetchArticles();
  const article = articles.find((a) => a.slug === resolvedParams.slug);

  if (!article) {
    return {
      title: 'Article Not Found | Atiendriya Verma',
    };
  }

  return {
    title: `${article.title} | Atiendriya Verma`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [article.author || 'Atiendriya Verma'],
      tags: article.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
    },
  };
}

/**
 * Static Params generation for high performance
 */
export async function generateStaticParams() {
  const articles = await fetchArticles();
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

/**
 * Server Component: Article Details Page
 */
export default async function ArticlePage({ params }: PageProps) {
  const resolvedParams = await params;
  const articles = await fetchArticles();
  const article = articles.find((a) => a.slug === resolvedParams.slug);

  if (!article) {
    notFound();
    return null;
  }

  return (
    <article className="min-h-screen bg-[#faf9f6] text-[#1c1917] pb-24">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-[#faf9f6]/95 backdrop-blur-md border-b border-[#e7e5e4] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#78716c] hover:text-[#1c1917] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Articles</span>
          </Link>

          <div className="flex items-center gap-4 text-xs text-[#78716c]">
            <Link href="/about" className="hover:text-[#1c1917] transition-colors">
              About Atiendriya
            </Link>
            <span>·</span>
            <Link href="/admin/write" className="hover:text-[#1c1917] transition-colors">
              Write Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Article Header */}
      <div className="max-w-3xl mx-auto px-6 pt-12 md:pt-16 pb-8">
        {/* Zero-Pill Unboxed Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716c] mb-6 font-mono">
          <span>{article.date}</span>
          <span aria-hidden="true">·</span>
          <span>{article.readTime}</span>
          <span aria-hidden="true">·</span>
          <span>By {article.author || 'Atiendriya Verma'}</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#1c1917] tracking-tight leading-[1.15] mb-6">
          {article.title}
        </h1>

        <p className="text-lg md:text-xl font-serif text-[#57534e] leading-relaxed italic border-l-2 border-[#1c1917] pl-4 my-6">
          {article.excerpt}
        </p>

        {/* Tags (Zero-Pill clean typography) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#78716c] pt-4 border-t border-[#e7e5e4]">
          <span className="font-medium text-[#44403c]">Themes:</span>
          {article.tags.map((tag, idx) => (
            <React.Fragment key={tag}>
              <span className="hover:text-[#1c1917] transition-colors">#{tag}</span>
              {idx < article.tags.length - 1 && <span className="text-[#d6d3d1]">·</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Article Markdown Body */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="font-serif text-[#292524] text-lg leading-[1.8] space-y-6 border-b border-[#e7e5e4] pb-16">
          {article.content.split('\n\n').map((block, index) => {
            const trimmed = block.trim();
            if (trimmed.startsWith('# ')) {
              return (
                <h1 key={index} className="text-2xl md:text-3xl font-serif font-bold text-[#1c1917] mt-10 mb-4 pt-4 border-t border-[#e7e5e4]">
                  {trimmed.replace('# ', '')}
                </h1>
              );
            }
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={index} className="text-xl md:text-2xl font-serif font-semibold text-[#1c1917] mt-8 mb-3">
                  {trimmed.replace('## ', '')}
                </h2>
              );
            }
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={index} className="text-lg md:text-xl font-serif font-semibold text-[#1c1917] mt-6 mb-2">
                  {trimmed.replace('### ', '')}
                </h3>
              );
            }
            if (trimmed.startsWith('> ')) {
              return (
                <blockquote key={index} className="border-l-3 border-[#1c1917] pl-5 italic text-[#57534e] my-6">
                  {trimmed.replace(/^>\s*/, '')}
                </blockquote>
              );
            }
            if (trimmed.startsWith('```')) {
              const codeLines = trimmed.replace(/```[a-z]*\n?/g, '').trim();
              return (
                <div key={index} className="my-8 rounded-lg overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-xl font-mono text-xs not-prose">
                  <div className="bg-[#161b22] px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                      <span className="ml-2 text-[11px] text-zinc-400">atiendriya@terminal: ~/research-models$ python3</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">Python 3.12 Console</span>
                  </div>
                  <div className="p-4 overflow-x-auto text-zinc-200 leading-relaxed text-[12px]">
                    <pre><code>{codeLines}</code></pre>
                  </div>
                </div>
              );
            }
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
              const items = trimmed.split('\n');
              return (
                <ul key={index} className="list-disc list-inside space-y-2 text-[#44403c] my-4 pl-2 font-serif text-base">
                  {items.map((it, i) => (
                    <li key={i}>{it.replace(/^[*|-]\s*/, '')}</li>
                  ))}
                </ul>
              );
            }
            if (trimmed === '---') {
              return <hr key={index} className="my-8 border-[#e7e5e4]" />;
            }

            return (
              <p key={index} className="text-[#292524] font-serif leading-relaxed">
                {trimmed}
              </p>
            );
          })}
        </div>

        {/* Author Bio Card at footer */}
        <div className="mt-12 p-8 bg-white border border-[#e7e5e4] flex flex-col md:flex-row items-start gap-6">
          <div className="w-16 h-16 bg-[#1c1917] text-white flex items-center justify-center font-serif text-2xl font-bold shrink-0">
            AV
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-serif font-bold text-lg text-[#1c1917]">Atiendriya Verma</h4>
              <Link
                href="https://www.linkedin.com/in/atiendriya-verma/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#78716c] hover:text-[#1c1917] underline"
              >
                LinkedIn Profile →
              </Link>
            </div>
            <p className="text-xs text-[#57534e] leading-relaxed">
              Aspiring Equity Research Analyst & Portfolio Manager. MBA in Finance & Business Analysis (IILM University), CFA Program candidate. Researches Indian equity valuation, capital goods capex cycles, and quantitative factor modeling with Python.
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs font-mono text-[#78716c]">
              <Link href="https://medium.com/@atiendriyaverma" target="_blank" rel="noopener noreferrer" className="hover:text-[#1c1917] underline">
                Medium (@atiendriyaverma)
              </Link>
              <span>·</span>
              <Link href="/about" className="hover:text-[#1c1917] underline">
                Detailed Bio & Methodology
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
