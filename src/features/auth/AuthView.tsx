import React from 'react';
import {
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail
} from 'lucide-react';
import { Button, ToastContainer, ToastItem } from '../../components/ui/primitives';

export interface AuthViewProps {
  authView: 'login' | 'signup';
  onSwitchAuthView: (view: 'login' | 'signup') => void;
  email: string;
  onChangeEmail: (val: string) => void;
  password: string;
  onChangePassword: (val: string) => void;
  authError: string;
  authLoading: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onBackToLanding: () => void;
  onForgotPassword: () => void;
  toasts: ToastItem[];
  onDismissToast: (id: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  authView,
  onSwitchAuthView,
  email,
  onChangeEmail,
  password,
  onChangePassword,
  authError,
  authLoading,
  onSubmit,
  onBackToLanding,
  onForgotPassword,
  toasts,
  onDismissToast
}) => {
  return (
    <div className="min-h-screen w-full bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col font-sans">
      <ToastContainer toasts={toasts} onDismiss={onDismissToast} />

      {/* Top Navigation Header */}
      <header className="h-16 px-6 sm:px-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLanding}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white flex items-center justify-center font-bold text-sm">
            D
          </div>
          <div className="text-left">
            <span className="text-sm font-bold tracking-tight block">DUGSI PRO 2026</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] block">
              Institutional ERP
            </span>
          </div>
        </button>

        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-3.5 h-3.5" />}
          onClick={onBackToLanding}
        >
          Back to Homepage
        </Button>
      </header>

      {/* Main Split Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Institutional Context Column */}
        <div className="lg:col-span-7 p-8 sm:p-14 lg:p-20 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[var(--color-border)] bg-[var(--color-surface-muted)]">
          <div className="space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] text-xs font-semibold text-[var(--color-brand)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enterprise School Management Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[var(--color-text-primary)] leading-[1.12]">
              Unified Academic, Attendance & Financial Governance.
            </h1>

            <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
              Dugsi Pro 2026 empowers schools, madrasas, and academies with real-time student
              directories, daily roll-call attendance, double-entry tuition billing, and executive
              reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10">
            <div className="ds-surface p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
                <span>360° Student Records</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Enrollment, guardian contacts, and academic transcripts
              </p>
            </div>
            <div className="ds-surface p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
                <span>Financial Control</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Invoices, receipts, expenses, payroll, and P&amp;L statements
              </p>
            </div>
            <div className="ds-surface p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
                <span>Offline-Ready PWA</span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Continue marking attendance even during connectivity drops
              </p>
            </div>
          </div>
        </div>

        {/* Right Authentication Form Column */}
        <div className="lg:col-span-5 p-6 sm:p-12 lg:p-16 flex flex-col justify-center bg-[var(--color-surface)]">
          <div className="w-full max-w-sm mx-auto space-y-6">
            {/* Mode Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => onSwitchAuthView('login')}
                className={`py-2 text-xs font-semibold rounded-[var(--radius-xs)] transition-colors cursor-pointer ${
                  authView === 'login'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onSwitchAuthView('signup')}
                className={`py-2 text-xs font-semibold rounded-[var(--radius-xs)] transition-colors cursor-pointer ${
                  authView === 'signup'
                    ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Create School Account
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                {authView === 'login' ? 'Sign in to your workspace' : 'Register your institution'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {authView === 'login'
                  ? 'Enter your administrator or teacher credentials to continue.'
                  : 'Create a dedicated workspace for your school or academy.'}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {authError && (
                <div
                  className="p-3 rounded-[var(--radius-sm)] bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] text-[var(--color-danger)] text-xs flex items-start gap-2"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-semibold text-[var(--color-text-secondary)]"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-2.5" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => onChangeEmail(e.target.value)}
                    placeholder="admin@dugsigapro.edu"
                    className="ds-input w-full pl-9 py-2.5"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-semibold text-[var(--color-text-secondary)]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-[11px] font-medium text-[var(--color-brand)] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-2.5" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => onChangePassword(e.target.value)}
                    placeholder="••••••••"
                    className="ds-input w-full pl-9 py-2.5"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={authLoading}
              >
                {authView === 'login' ? 'Sign In to Workspace' : 'Create School Workspace'}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};
