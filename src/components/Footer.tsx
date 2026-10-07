import React from 'react';
import { Linkedin, ExternalLink, ArrowUp } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'home' | 'about' | 'write') => void;
  onOpenSetupModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenSetupModal }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-[#e7e5e4] bg-[#f5f4ef] py-12 px-4 sm:px-6 text-xs text-[#78716c]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="font-serif font-bold text-base text-[#1c1917] mb-1">
            Atiendriya Verma
          </div>
          <p className="max-w-md text-[#57534e] text-xs leading-relaxed">
            Equity Research & Macroeconomic Insights · MBA in Finance & Business Analysis (IILM University) · CFA Program Candidate.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 font-sans-clean">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-[#1c1917] cursor-pointer"
          >
            All Articles
          </button>
          <button
            onClick={() => onNavigate('about')}
            className="hover:text-[#1c1917] cursor-pointer"
          >
            About Me
          </button>
          <button
            onClick={() => onNavigate('write')}
            className="hover:text-[#1c1917] cursor-pointer"
          >
            Admin Writer
          </button>
          <button
            onClick={onOpenSetupModal}
            className="hover:text-[#1c1917] cursor-pointer"
          >
            Google Cloud Setup
          </button>
          <a
            href="https://www.linkedin.com/in/atiendriya-verma/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-[#0a66c2]"
          >
            <Linkedin className="w-3.5 h-3.5" />
            <span>LinkedIn</span>
          </a>
          <a
            href="https://medium.com/@atiendriyaverma"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-[#1c1917]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Medium</span>
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto pt-8 mt-8 border-t border-[#e7e5e4] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
        <div>
          © {new Date().getFullYear()} Atiendriya Verma. All research memorandums are for intellectual analysis and do not constitute financial advice.
        </div>
        <button
          onClick={scrollToTop}
          className="flex items-center gap-1 text-[#57534e] hover:text-[#1c1917] cursor-pointer"
        >
          <span>Top</span>
          <ArrowUp className="w-3 h-3" />
        </button>
      </div>
    </footer>
  );
};
