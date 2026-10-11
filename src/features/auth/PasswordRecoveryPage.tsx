import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  TriangleAlert
} from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';

type RecoveryMode = 'request' | 'reset';

interface PasswordRecoveryPageProps {
  mode: RecoveryMode;
  token?: string;
  initialEmail?: string;
  onBackToLogin: () => void;
}

export const PasswordRecoveryPage: React.FC<PasswordRecoveryPageProps> = ({
  mode,
  token = '',
  initialEmail = '',
  onBackToLogin
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [reset, setReset] = useState(false);

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || 'Codsiga lama fulin karin. Fadlan mar kale isku day.');
        return;
      }
      setSent(true);
    } catch {
      setError('Xiriirka server-ka waa la waayay. Fadlan mar kale isku day.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 10) {
      setError('Password-ku waa inuu ka koobnaadaa ugu yaraan 10 xaraf.');
      return;
    }
    if (password.length > 128) {
      setError('Password-ku kama badnaan karo 128 xaraf.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Labada password isma laha. Fadlan hubi.');
      return;
    }
    if (!token) {
      setError('Link-ga dib-u-dejinta ma laha token sax ah. Codso link cusub.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || 'Link-gu ma shaqaynayo ama wuu dhacay. Codso mid cusub.');
        return;
      }
      setReset(true);
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError('Xiriirka server-ka waa la waayay. Fadlan mar kale isku day.');
    } finally {
      setLoading(false);
    }
  };

  const heading = mode === 'request'
    ? 'Dib u hel akoonkaaga'
    : reset
      ? 'Password-ka waa la beddelay'
      : 'Samee password cusub';

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
        <div className="p-6 sm:p-8">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Ku noqo login
          </button>

          <div className="mt-7 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
            {mode === 'request' ? <Mail className="h-6 w-6" /> : reset ? <CheckCircle2 className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">{heading}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {mode === 'request'
              ? 'Geli email-ka ku xiran akoonkaaga. Haddii akoonku jiro, waxaan kuu soo diri doonnaa link ammaan ah.'
              : reset
                ? 'Password-kaaga cusub waa la kaydiyey. Isticmaal password-ka cusub marka aad login samaynayso.'
                : 'Link-ga dib-u-dejintu waa hal-mar oo muddo kooban shaqaynaya. Dooro password cusub oo ugu yaraan 10 xaraf ah.'}
          </p>

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'request' && !sent && (
            <form onSubmit={handleRequest} className="mt-6 space-y-4">
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)]" htmlFor="recovery-email">
                Email address
              </label>
              <input
                id="recovery-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="ds-input w-full"
                placeholder="admin@school.edu"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Waa la dirayaa…' : 'Ii soo dir recovery link'}
              </button>
            </form>
          )}

          {mode === 'request' && sent && (
            <div role="status" aria-live="polite" className="mt-6 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-success)]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Hubi email-kaaga
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Haddii email-ku la xiriiro akoon jira, link dib-u-dejin ayaa loo diray. Ka eeg Inbox iyo Spam. Link-gu wuxuu dhacayaa 30 daqiiqo gudahood.
              </p>
            </div>
          )}

          {mode === 'reset' && !reset && (
            <form onSubmit={handleReset} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]" htmlFor="reset-password">
                  Password cusub
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                  <input
                    id="reset-password"
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={10}
                    maxLength={128}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="ds-input w-full pl-10 pr-11"
                    placeholder="Ugu yaraan 10 xaraf"
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Qari password-ka' : 'Muuji password-ka'} className="absolute right-3 top-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]" htmlFor="confirm-reset-password">
                  Xaqiiji password-ka
                </label>
                <input
                  id="confirm-reset-password"
                  name="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="ds-input w-full"
                  placeholder="Ku celi password-ka cusub"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Waa la cusboonaysiinayaa…' : 'Beddel password-ka'}
              </button>
              <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Password-ka waxaa lagu kaydinayaa hash ammaan ah; lama kaydinayo qoraal furan.
              </p>
            </form>
          )}

          {mode === 'reset' && reset && (
            <button type="button" onClick={onBackToLogin} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              U gudub login
            </button>
          )}
        </div>
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-6 py-3 text-center text-[11px] text-[var(--color-text-muted)]">
          DUGSI PRO 2026 · Secure account recovery
        </div>
      </section>
    </main>
  );
};

export default PasswordRecoveryPage;
