import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ArticleList } from './components/ArticleList';
import { ArticleReader } from './components/ArticleReader';
import { AboutView } from './components/AboutView';
import { AdminPortal } from './components/AdminPortal';
import { CloudSetupModal } from './components/CloudSetupModal';
import { Footer } from './components/Footer';
import { Article, DriveConfigStatus } from '@/lib/types';
import { SEED_ARTICLES } from '@/lib/seedData';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'about' | 'write' | 'article'>('home');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articles, setArticles] = useState<Article[]>(SEED_ARTICLES);
  const [isLoading, setIsLoading] = useState(false);
  const [driveStatus, setDriveStatus] = useState<DriveConfigStatus | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Load articles from Express server / Google Drive API
  const loadArticles = useCallback(async (forceRevalidate = false) => {
    setIsLoading(true);
    try {
      const url = forceRevalidate ? '/api/articles?revalidate=true' : '/api/articles';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.articles && data.articles.length > 0) {
          setArticles(data.articles);
        }
      }
    } catch (err) {
      console.warn('Using seeded articles due to fetch failure:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check Drive Status
  const loadDriveStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/drive/status');
      if (res.ok) {
        const data = await res.json();
        setDriveStatus(data);
      }
    } catch (err) {
      console.warn('Could not check drive status:', err);
    }
  }, []);

  // Handle client URL routing
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path === '/about') {
        setCurrentView('about');
        setSelectedArticle(null);
      } else if (path === '/admin/write') {
        setCurrentView('write');
        setSelectedArticle(null);
      } else if (path.startsWith('/blog/')) {
        const slug = path.replace('/blog/', '');
        const found = articles.find((a) => a.slug === slug);
        if (found) {
          setSelectedArticle(found);
          setCurrentView('article');
        }
      } else {
        setCurrentView('home');
        setSelectedArticle(null);
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [articles]);

  useEffect(() => {
    loadArticles();
    loadDriveStatus();
  }, [loadArticles, loadDriveStatus]);

  const handleNavigate = (view: 'home' | 'about' | 'write') => {
    setCurrentView(view);
    setSelectedArticle(null);
    let path = '/';
    if (view === 'about') path = '/about';
    if (view === 'write') path = '/admin/write';
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article);
    setCurrentView('article');
    window.history.pushState({}, '', `/blog/${article.slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleArticlePublished = (newArticle: Article) => {
    setArticles((prev) => [newArticle, ...prev.filter((a) => a.slug !== newArticle.slug)]);
    handleSelectArticle(newArticle);
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] flex flex-col font-sans-clean antialiased selection:bg-[#fde047] selection:text-[#1c1917]">
      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        driveStatus={driveStatus}
        onOpenSetupModal={() => setIsSetupModalOpen(true)}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1">
        {currentView === 'home' && (
          <>
            <Hero
              onExploreArticles={() => {
                const feedElement = document.getElementById('articles-feed');
                if (feedElement) {
                  feedElement.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              onViewAbout={() => handleNavigate('about')}
            />
            <div id="articles-feed">
              <ArticleList
                articles={articles}
                onSelectArticle={handleSelectArticle}
                isLoading={isLoading}
                onRefresh={() => loadArticles(true)}
              />
            </div>
          </>
        )}

        {currentView === 'about' && (
          <AboutView
            onExploreArticles={() => handleNavigate('home')}
            onOpenWritePortal={() => handleNavigate('write')}
          />
        )}

        {currentView === 'write' && (
          <AdminPortal
            onArticlePublished={handleArticlePublished}
            onReturnHome={() => handleNavigate('home')}
            onOpenSetupModal={() => setIsSetupModalOpen(true)}
          />
        )}

        {currentView === 'article' && selectedArticle && (
          <ArticleReader
            article={selectedArticle}
            onBack={() => handleNavigate('home')}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenSetupModal={() => setIsSetupModalOpen(true)}
      />

      {/* Google Cloud Console Setup & Next.js Architecture Modal */}
      <CloudSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        driveStatus={driveStatus}
        onRefreshStatus={loadDriveStatus}
      />
    </div>
  );
}
