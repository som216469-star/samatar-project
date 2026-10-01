import React from 'react';
import { ArrowRight } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: 'login' | 'signup' | 'dashboard') => void;
  isAuthenticated: boolean;
  onScrollTo: (id: string) => void;
}

export default function Footer({
  onNavigate,
  isAuthenticated,
  onScrollTo,
}: FooterProps) {
  return (
    <footer className="border-t border-white/[0.08] bg-[#05070c] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/[0.06]">
          {/* Brand Column (4 Cols) */}
          <div className="md:col-span-4 space-y-3">
            <button
              type="button"
              onClick={() => onScrollTo('hero')}
              className="text-left text-lg font-bold tracking-tight text-white landing-display cursor-pointer"
            >
              DUGSI PRO
            </button>
            <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed max-w-sm">
              The unified school management platform for student registries, twice-daily attendance, automated exam grading, tuition finance, and institutional operations.
            </p>
            <div className="pt-1 text-xs text-[#64748b]">
              Multi-tenant School ID data isolation · Offline-ready web platform
            </div>
          </div>

          {/* Product Column (2 Cols) */}
          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-white mb-4">Product</div>
            <ul className="space-y-2.5 text-xs text-[#94a3b8]">
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('product-overview')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Ecosystem Architecture
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('preview')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Interactive Demo
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('workflow')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Operating Workflow
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('pricing')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Institutional Pricing
                </button>
              </li>
            </ul>
          </div>

          {/* Capabilities Column (3 Cols) */}
          <div className="md:col-span-3">
            <div className="text-xs font-semibold text-white mb-4">
              Core Capabilities
            </div>
            <ul className="space-y-2.5 text-xs text-[#94a3b8]">
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('students-management')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Student Registry &amp; Excel Import
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('attendance-management')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Morning &amp; Afternoon Attendance
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('exams-management')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Examinations &amp; Automated Grading
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('fees-management')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Tuition Billing, Payroll &amp; Finance
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('campus-operations')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Admissions, Timetable &amp; Library
                </button>
              </li>
            </ul>
          </div>

          {/* Solutions & Workspace Access (3 Cols) */}
          <div className="md:col-span-3">
            <div className="text-xs font-semibold text-white mb-4">
              Workspace Access
            </div>
            <ul className="space-y-2.5 text-xs text-[#94a3b8]">
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('solutions')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Solutions by School Role
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('resources')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Implementation Guides &amp; FAQ
                </button>
              </li>
              {isAuthenticated ? (
                <li className="pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="inline-flex items-center gap-1.5 text-[#a5b4fc] hover:text-white font-semibold cursor-pointer"
                  >
                    <span>Open Active Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </li>
              ) : (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('login')}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      Sign In to School Portal
                    </button>
                  </li>
                  <li className="pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigate('signup')}
                      className="inline-flex items-center gap-1.5 text-[#a5b4fc] hover:text-white font-semibold cursor-pointer"
                    >
                      <span>Create New School Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Quiet Copyright Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748b]">
          <p>&copy; {new Date().getFullYear()} Dugsi Pro. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onScrollTo('roles-permissions')}
              className="hover:text-[#94a3b8] transition-colors cursor-pointer"
            >
              Data Isolation &amp; Security
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onScrollTo('faq')}
              className="hover:text-[#94a3b8] transition-colors cursor-pointer"
            >
              Support &amp; FAQ
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
