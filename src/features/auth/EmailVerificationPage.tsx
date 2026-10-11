import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  TriangleAlert
} from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';

interface EmailVerificationPageProps {
  token?: string;
  initialEmail?: string;
  onBackToLogin: () => void;
}

type VerificationState = 'pending' | 'verifying' | 'verified' | 'error';

export const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({
  token = '',
  initialEmail = '',
  onBackToLogin
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [verificationState, setVerificationState] = useState<VerificationState>(
    token ? 'verifying' : 'pending'
  );
  const [verificationError, setVerificationError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const verificationPromiseRef = useRef<Promise<{ ok: boolean; payload: any }> | null>(null);

  useEffect(() => {
    if (!token) {
      setVerificationState('pending');
      return;
    }

    // StrictMode can re-run effects in development. Reuse a single request so a
    // one-time token isn't consumed twice by the same mounted page.
    if (!verificationPromiseRef.current) {
      verificationPromiseRef.current = apiFetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      }).then(async (response) => ({
        ok: response.ok,
        payload: await response.json().catch(() => ({}))
      }));
    }

    let cancelled = false;
    verificationPromiseRef.current.then(({ ok, payload }) => {
      if (cancelled) return;
      if (ok) {
        setVerificationState('verified');
        setVerificationError('');
        if (payload.email) setEmail(payload.email);
        // Remove the one-time bearer token from the visible URL after use.
        window.history.replaceState({}, '', '/verify-email?verified=1');
      } else {
        setVerificationState('error');
        setVerificationError(
          payload.error || 'Link-ga xaqiijintu ma shaqaynayo ama wuu dhacay.'
        );
      }
    }).catch(() => {
      if (cancelled) return;
      setVerificationState('error');
      setVerificationError('Xiriirka server-ka waa la waayay. Fadlan mar kale isku day.');
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async (event: React.FormEvent) => {
    event.preventDefault();
    setResending(true);
    setResendMessage('');
    setResendError('');
    try {
      const response = await apiFetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResendError(payload.error || 'Codsiga lama fulin karin hadda.');
        return;
      }
      setResendMessage(
        payload.message || 'Haddii akoonku u baahan yahay xaqiijin, link cusub ayaa email-ka loo soo diray.'
      );
    } catch {
      setResendError('Xiriirka server-ka waa la waayay. Fadlan mar kale isku day.');
    } finally {
      setResending(false);
    }
  };

  const isVerified = verificationState === 'verified';

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
        <div className="p-6 sm:p-8">
          {!isVerified && (
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Ku noqo login
            </button>
          )}

          <div className="mt-7 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
            {verificationState === 'verified'
              ? <CheckCircle2 className="h-6 w-6" />
              : verificationState === 'verifying'
                ? <RefreshCw className="h-6 w-6 animate-spin" />
                : <MailCheck className="h-6 w-6" />}
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            {verificationState === 'verifying'
              ? 'Xaqiijinta email-ka'
              : isVerified
                ? 'Email-ka waa la xaqiijiyey'
                : verificationState === 'error'
                  ? 'Link-ga xaqiijintu ma shaqaynayo'
                  : 'Hal tallaabo ayaa kuu harsan'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {verificationState === 'verifying'
              ? 'Waxaan hubinaynaa in link-gu sax yahay, uusan dhicin, isla markaana aan hore loo isticmaalin.'
              : isVerified
                ? 'Aqoonsiga email-kaaga waa la xaqiijiyey. Hadda waxaad login samayn kartaa.'
                : verificationState === 'error'
                  ? verificationError
                  : 'Si loo ilaaliyo akoonka maamulka dugsiga, xaqiiji inaad adigu maamusho email-ka aad gelisay.'}
          </p>

          {verificationState === 'pending' && (
            <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MailCheck className="h-4 w-4 text-[var(--color-brand)]" aria-hidden="true" />
                Hubi inbox-kaaga iyo spam
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                {email
                  ? `Haddii ${email} uu sax yahay, link xaqiijin ah ayaa loo diray. Link-gu wuxuu shaqaynayaa 24 saacadood.`
                  : 'Link xaqiijin ah ayaa loo diraa email-ka marka school account la sameeyo. Link-gu wuxuu shaqaynayaa 24 saacadood.'}
              </p>
            </div>
          )}

          {verificationState === 'verified' && (
            <div role="status" className="mt-5 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-success)]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Diyaar u ah login
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Password-ka aad samaysatay waa diyaar. Email verification-ku ma abuuro session cusub; fadlan login ku gal si ammaan ah.
              </p>
              <button type="button" onClick={onBackToLogin} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
                U gudub login
              </button>
            </div>
          )}

          {!isVerified && verificationState !== 'verifying' && (
            <form onSubmit={handleResend} className="mt-6 space-y-3">
              <label htmlFor="verification-email" className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                Email address
              </label>
              <input
                id="verification-email"
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="ds-input w-full"
                placeholder="admin@school.edu"
              />

              {resendError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] p-3 text-xs text-[var(--color-danger)]">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{resendError}</span>
                </div>
              )}
              {resendMessage && (
                <div role="status" aria-live="polite" className="rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-soft)] p-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {resendMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={resending || !email.trim()}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? 'Waa la dirayaa…' : 'Dib u dir link-ga xaqiijinta'}
              </button>
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Sababo amni awgood, fariintu ma sheegi doonto in email-ku ku jiro database-ka iyo in kale.
              </p>
            </form>
          )}
        </div>
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-6 py-3 text-center text-[11px] text-[var(--color-text-muted)]">
          DUGSI PRO 2026 · Verified school account access
        </div>
      </section>
    </main>
  );
};

export default EmailVerificationPage;
