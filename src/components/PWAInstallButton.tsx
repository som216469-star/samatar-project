import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Button, Modal } from './ui/primitives';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={install}
        icon={<Download className="w-3.5 h-3.5 text-emerald-500" />}
        className={className}
        fullWidth={variant === 'sidebar'}
        title="Ku shub Taleefankaaga ama Computer-kaaga (Install App)"
      >
        {variant === 'full' ? 'Ku shub Qalabkaaga (Install App)' : 'Install App'}
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowIOSGuide(true)}
          icon={<Smartphone className="w-3.5 h-3.5 text-emerald-500" />}
          className={className}
          fullWidth={variant === 'sidebar'}
          title="Ku dar iPhone/iPad Home Screen"
        >
          {variant === 'full' ? 'Install on iPhone/iPad' : 'Install (iOS)'}
        </Button>

        <Modal
          isOpen={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Ku shub iPhone / iPad"
          size="sm"
          footer={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowIOSGuide(false)}
              className="w-full justify-center"
            >
              Fahmay (Done)
            </Button>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Raac talaabooyinkan fudud si aad DUGSI PRO 2026 ugu darto shaashadaada
              taleefanka (Home Screen):
            </p>

            <ol className="space-y-2.5 text-xs text-[var(--text-primary)]">
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <Share2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  1. Riix astaanta <strong>Share</strong> (Wadaag) ee hoose ama sare ee Safari
                  browser.
                </span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <PlusSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  2. Hoos u deji liiska, kadibna dooro <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <Smartphone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  3. Riix <strong>Add</strong> ee geeska sare. Waxay toos ugu furmaysaa sida App
                  caadi ah!
                </span>
              </li>
            </ol>
          </div>
        </Modal>
      </>
    );
  }

  return null;
};
