import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onNavigate: (route: 'login' | 'signup' | 'dashboard') => void;
  isAuthenticated: boolean;
  userEmail?: string;
  onScrollTo: (id: string) => void;
}

export default function Navbar({
  onNavigate,
  isAuthenticated,
  onScrollTo,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const navItems = [
    { label: 'Product', target: 'product-overview' },
    { label: 'Features', target: 'features' },
    { label: 'Solutions', target: 'solutions' },
    { label: 'Pricing', target: 'pricing' },
    { label: 'Resources', target: 'resources' },
  ];

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    onScrollTo(sectionId);
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        scrolled
          ? 'bg-[#06080f]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.45)]'
          : 'bg-[#06080f]/60 backdrop-blur-md border-b border-white/[0.04]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single clean Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('hero')}
          className="text-left text-lg font-bold tracking-tight text-white hover:text-[#cbd5e1] transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 landing-display"
        >
          DUGSI PRO
        </button>

        {/* Zone 2: 5 Clean Single-Line Text Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-[#94a3b8]"
        >
          {navItems.map((item) => (
            <button
              key={item.target}
              type="button"
              onClick={() => handleNavClick(item.target)}
              className="relative py-1 text-[#94a3b8] hover:text-white transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[1.5px] after:bg-[#6366f1] after:origin-left after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-150"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1-2 Primary Actions */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm transition-colors duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="px-4 py-2 rounded-lg text-[#cbd5e1] hover:text-white hover:bg-white/[0.04] font-medium text-sm transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => onNavigate('signup')}
                className="px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm transition-colors duration-150 shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button (>= 44px touch target) */}
        <div className="md:hidden flex items-center">
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="w-11 h-11 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-white/[0.05] transition-colors duration-150 cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Accessible Animated Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-navigation-drawer"
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden border-t border-white/[0.08] bg-[#080b14]/98 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4 shadow-2xl"
          >
            <nav className="flex flex-col space-y-1" aria-label="Mobile sections">
              {navItems.map((item) => (
                <button
                  key={item.target}
                  type="button"
                  onClick={() => handleNavClick(item.target)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#cbd5e1] hover:text-white hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-2.5">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('dashboard');
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm text-center transition-colors duration-150 cursor-pointer"
                >
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('login');
                    }}
                    className="w-full py-2.5 px-4 rounded-lg border border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.06] text-white font-medium text-sm text-center transition-colors duration-150 cursor-pointer"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('signup');
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm text-center transition-colors duration-150 cursor-pointer"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
