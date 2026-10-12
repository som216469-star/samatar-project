import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './typography.css';

const isMobileBuild = import.meta.env.MODE === 'mobile';

function QuantoraNativeLaunchCover() {
  const [phase, setPhase] = useState<'visible' | 'hiding' | 'hidden'>(() =>
    isMobileBuild ? 'visible' : 'hidden'
  );

  useEffect(() => {
    if (!isMobileBuild) return;
    const hide = window.setTimeout(() => setPhase('hiding'), 1250);
    const remove = window.setTimeout(() => setPhase('hidden'), 1650);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(remove);
    };
  }, []);

  if (!isMobileBuild || phase === 'hidden') return null;

  return (
    <div
      className={`quantora-launch-cover ${phase === 'hiding' ? 'is-hiding' : ''}`}
      aria-hidden="true"
      data-testid="quantora-native-launch-cover"
    >
      <div className="quantora-launch-band">
        <div className="quantora-launch-tile">
          <svg className="quantora-launch-logo" viewBox="0 0 512 512" role="presentation">
            <defs>
              <linearGradient id="quantora-launch-cyan" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#12f5ef" />
                <stop offset=".52" stopColor="#12c9f5" />
                <stop offset="1" stopColor="#0788ff" />
              </linearGradient>
            </defs>
            <circle cx="256" cy="256" r="169" fill="none" stroke="url(#quantora-launch-cyan)" strokeWidth="22" />
            <circle cx="256" cy="250" r="79" fill="none" stroke="url(#quantora-launch-cyan)" strokeWidth="20" />
            <path d="M237 238 L255 220 L426 391 L408 409 Z" fill="url(#quantora-launch-cyan)" />
          </svg>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <QuantoraNativeLaunchCover />
  </StrictMode>,
);
