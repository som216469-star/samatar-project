import React from 'react';
import { ArrowRight } from 'lucide-react';

interface FinalCtaProps {
  onNavigate: (route: 'login' | 'signup' | 'dashboard') => void;
  isAuthenticated: boolean;
  onViewDemo?: () => void;
}

export default function FinalCta({
  onNavigate,
  isAuthenticated,
  onViewDemo,
}: FinalCtaProps) {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-[#070a12] border-t border-white/[0.08]">
      {/* Subtle radial glow */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[260px] bg-[#4f46e5]/15 blur-[130px] rounded-full pointer-events-none"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="text-xs font-medium text-[#94a3b8] mb-4">
          Ready for the 2025/2026 Academic Year
        </div>

        <h2 className="landing-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance mb-5 leading-tight">
          Bring your entire school operation onto Dugsi Pro today.
        </h2>

        <p className="text-base sm:text-lg text-[#94a3b8] max-w-2xl mx-auto mb-10 leading-relaxed">
          Provision your isolated school workspace in minutes and give your principals, registrars, bursars, and teachers a modern platform built for educational excellence.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'signup')}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm transition-colors duration-150 shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap"
          >
            <span>
              {isAuthenticated ? 'Go to School Dashboard' : 'Get Started Now'}
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {!isAuthenticated ? (
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/[0.12] hover:border-white/[0.25] bg-[#0a0d16] hover:bg-[#101524] text-white font-semibold text-sm transition-colors duration-150 cursor-pointer whitespace-nowrap"
            >
              Sign In to Existing School
            </button>
          ) : (
            onViewDemo && (
              <button
                type="button"
                onClick={onViewDemo}
                className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/[0.12] hover:border-white/[0.25] bg-[#0a0d16] hover:bg-[#101524] text-white font-semibold text-sm transition-colors duration-150 cursor-pointer whitespace-nowrap"
              >
                Explore Product Tour
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
}
