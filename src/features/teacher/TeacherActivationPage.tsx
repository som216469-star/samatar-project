import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  GraduationCap,
  ArrowRight
} from 'lucide-react';
import { Button } from '../../components/ui/primitives';

export interface TeacherActivationViewProps {
  token: string;
  onActivatedSuccess: (email: string) => void;
  onGoToLogin: () => void;
}

export const TeacherActivationPage: React.FC<TeacherActivationViewProps> = ({
  token,
  onActivatedSuccess,
  onGoToLogin
}) => {
  const [loading, setLoading] = useState(true);
  const [verifyingError, setVerifyingError] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState<{
    teacherName: string;
    email: string;
    schoolName?: string;
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setVerifyingError(
          'Token-ka casuumaaddu ma furna ama ma jiro. Fadlan hubi link-gii email-kaaga.'
        );
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/teachers/verify-invitation/${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setVerifyingError(data.error || 'Casuumaaddani ma shaqeynayso ama way dhacday.');
        } else {
          setTeacherData({
            teacherName: data.teacherName,
            email: data.email,
            schoolName: data.schoolName || 'Dugsi Pro 2026'
          });
        }
      } catch {
        setVerifyingError(
          'Ma suurtogalin in la xaqiijiyo casuumaadda. Fadlan hubi internet-kaaga.'
        );
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 8) {
      setSubmitError('Password-ku waa inuu ka koobnaadaa ugu yaraan 8 xaraf.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Labada password isma laha. Fadlan si taxaddar leh dib ugu qor.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/teachers/activate-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Dhaqaajinta akoonku way fashilantay.');
      } else {
        setIsActivated(true);
      }
    } catch {
      setSubmitError('Cilad farsamo ayaa dhacday. Fadlan mar kale isku day.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 sm:p-8 shadow-[var(--shadow-lg)]">
        {/* Top Branding */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-border)]">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-soft)] border border-[var(--color-brand-border)] flex items-center justify-center text-[var(--color-brand)]">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--color-text-primary)] tracking-tight">
              {teacherData?.schoolName || 'Dugsi Pro 2026'}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Nidaamka Dhaqaajinta Akoonka Macallinka
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              Xaqiijinta casuumaadda macallinka...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && verifyingError && (
          <div className="space-y-5 py-4">
            <div className="p-4 rounded-lg bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] text-sm flex gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--color-danger)] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[var(--color-danger)] mb-1">
                  Casuumaad Aan Shaqeynayn
                </div>
                <div className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {verifyingError}
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Haddii aad tahay macallin dugsiga ka tirsan, fadlan la xiriir maamulka dugsigaaga si
              laguu soo diro casuumaad cusub oo shaqeynaysa.
            </p>

            <Button variant="secondary" className="w-full" onClick={onGoToLogin}>
              U gudub Bogga Galitaanka (Login)
            </Button>
          </div>
        )}

        {/* Success State */}
        {!loading && !verifyingError && isActivated && (
          <div className="space-y-6 py-4 text-center">
            <div className="w-16 h-16 bg-[var(--color-success-soft)] border border-[var(--color-success-border)] rounded-full flex items-center justify-center mx-auto text-[var(--color-success)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                Hambalyo! Akoonkaagu waa Diyaar
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-sm mx-auto">
                Akoonkaaga Macallinka si buuxda ayaa loo dhaqaajiyey. Hadda waxaad geli kartaa
                adigoo isticmaalaya email-kaaga iyo password-ka cusub.
              </p>
            </div>

            <Button
              variant="primary"
              className="w-full"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => onActivatedSuccess(teacherData?.email || '')}
            >
              Gali Akoonkaaga Hadda
            </Button>
          </div>
        )}

        {/* Form State */}
        {!loading && !verifyingError && !isActivated && teacherData && (
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="p-3.5 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border)] space-y-1">
              <div className="text-xs text-[var(--color-brand)] font-medium">
                Ku soo dhowow DUGSI PRO:
              </div>
              <div className="text-sm font-bold text-[var(--color-text-primary)]">
                {teacherData.teacherName}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">{teacherData.email}</div>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Fadlan samayso password ammaan ah oo aad ku geli doonto akoonkaaga. Maamulka dugsigu
              ma oga mana arki karo password-kan.
            </p>

            {submitError && (
              <div className="p-3 rounded-lg bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] text-[var(--color-danger)] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                Password Cusub (Ugu yaraan 8 xaraf)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full ds-input pl-9 pr-10 py-2.5"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                Xaqiiji Password-ka (Confirm Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full ds-input pl-9 pr-4 py-2.5"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={submitting}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                {submitting ? 'Dhaqaajinta ayaa socota...' : 'Dhaqaaji Akoonka Macallinka'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
