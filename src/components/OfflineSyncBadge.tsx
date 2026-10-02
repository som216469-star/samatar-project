import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNetworkSync } from '../utils/offlineSync';
import { Badge, Button, Modal } from './ui/primitives';

export const OfflineSyncBadge: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, queue, lastSyncTime, triggerSync } =
    useNetworkSync();
  const [showModal, setShowModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleManualSync = async () => {
    setStatusMsg('Isku xirka xogta ayaa socda...');
    const res = await triggerSync();
    if (res.syncedCount > 0) {
      setStatusMsg(`Si guul leh ayaa loo sync-gareeyay ${res.syncedCount} diiwaan.`);
    } else if (res.errors > 0) {
      setStatusMsg(`Sync-gu wuxuu la kulmay ${res.errors} cilad. Fadlan hubi internet-ka.`);
    } else {
      setStatusMsg('Ma jiraan xog cusub oo offline ah oo u baahan sync.');
    }
    setTimeout(() => setStatusMsg(null), 4000);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
          !isOnline
            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/15'
            : isSyncing
              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse'
              : pendingCount > 0
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
        }`}
        title={
          !isOnline
            ? 'Waxaad ku jirtaa habka Offline-ka'
            : 'Nidaamku wuxuu ku xiran yahay internet-ka'
        }
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Offline</span>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {pendingCount}
              </span>
            )}
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
            <span className="hidden sm:inline">Syncing...</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Pending Sync</span>
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              {pendingCount}
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">Online</span>
          </>
        )}
      </button>

      {/* Sync Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Xaaladda Internet-ka & Sync-ga"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>
              Xir
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleManualSync}
              disabled={!isOnline || isSyncing}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
            >
              {isSyncing ? 'Sync ayaa socda...' : 'Hadda Sync Garee'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-emerald-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-500" />
              )}
              Xaaladda Shabakadda:
            </span>
            <Badge variant={isOnline ? 'success' : 'warning'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)]">Xogta sugaysa Sync-ga:</span>
            <span className="font-bold font-mono text-emerald-500">
              {pendingCount} diiwaan
            </span>
          </div>

          {lastSyncTime && (
            <div className="text-[11px] text-[var(--text-muted)] text-right">
              Sync-gii ugu dambeeyay: {new Date(lastSyncTime).toLocaleTimeString()}
            </div>
          )}

          {statusMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {queue.length > 0 && (
            <div className="mt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Liiska Xogta Sugaysa:
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="text-xs p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-[var(--text-primary)] capitalize">
                        {item.type}
                      </span>
                      <span className="text-[var(--text-muted)] ml-1.5 text-[11px]">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <Badge
                      variant={
                        item.status === 'failed'
                          ? 'danger'
                          : item.status === 'syncing'
                            ? 'info'
                            : 'warning'
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1">
            Markaad offline tahay, dhammaan xaadirinta iyo dhibcaha aad geliso waxaa lagu
            keydinayaa qalabkaaga (browser-ka). Isla marka internet-ku soo laabto si toos ah
            ayaa loogu shubayaa server-ka.
          </p>
        </div>
      </Modal>
    </>
  );
};
