import React from 'react';
import { 
  PenTool, 
  Linkedin, 
  ShieldCheck, 
  Lock,
  Unlock,
  Edit3
} from 'lucide-react';

interface NavbarProps {
  currentView: 'home' | 'about' | 'write' | 'article';
  onNavigate: (view: 'home' | 'about' | 'write') => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  isAdmin,
  onToggleAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#faf9f6]/95 backdrop-blur-md border-b border-[#e7e5e4] transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <button
          onClick={() => onNavigate('home')}
          className="text-left group flex items-center gap-3 cursor-pointer"
        >
          <div className="w-9 h-9 bg-[#1c1917] text-white flex items-center justify-center font-serif text-base font-bold transition-transform group-hover:scale-105">
            AV
          </div>
          <div>
            <div className="text-base font-serif font-bold text-[#1c1917] tracking-tight group-hover:text-black">
              Atiendriya Verma
            </div>
            <div className="text-[11px] font-sans-clean text-[#78716c] tracking-normal">
              Equity Research & Macro Insights
            </div>
          </div>
        </button>

        {/* Navigation items */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('home')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              currentView === 'home'
                ? 'text-[#1c1917] font-semibold border-b-2 border-[#1c1917]'
                : 'text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            Articles
          </button>

          <button
            onClick={() => onNavigate('about')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              currentView === 'about'
                ? 'text-[#1c1917] font-semibold border-b-2 border-[#1c1917]'
                : 'text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            About Me
          </button>

          <button
            onClick={() => onNavigate('write')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              currentView === 'write'
                ? 'text-[#1c1917] font-semibold border-b-2 border-[#1c1917]'
                : 'text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Write</span>
          </button>

          {/* Admin Access Toggle Badge */}
          <button
            onClick={onToggleAdmin}
            title={isAdmin ? "Admin mode active (Click to switch)" : "Unlock Admin editing access"}
            className={`ml-2 flex items-center gap-1.5 px-2.5 py-1 text-[11px] border transition-colors cursor-pointer ${
              isAdmin 
                ? 'border-[#1c1917] bg-[#1c1917] text-white shadow-xs' 
                : 'border-[#e7e5e4] bg-white hover:bg-[#f5f5f4] text-[#57534e]'
            }`}
          >
            {isAdmin ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium tracking-tight">Admin Active</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#78716c]" />
                <span className="hidden sm:inline">Admin Access</span>
              </>
            )}
          </button>

          {/* External Social Profiles */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-[#e7e5e4] ml-1">
            <a
              href="https://www.linkedin.com/in/atiendriya-verma/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-[#78716c] hover:text-[#0a66c2] transition-colors"
              title="LinkedIn Profile"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="https://medium.com/@atiendriyaverma"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-[#78716c] hover:text-[#1c1917] transition-colors font-serif font-bold text-xs"
              title="Medium Profile (@atiendriyaverma)"
            >
              M
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};
