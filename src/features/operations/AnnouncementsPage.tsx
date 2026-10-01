import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Calendar,
  Users,
  MessageCircle,
  Bell,
  X
} from 'lucide-react';
import { Announcement, Student, SchoolClass } from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import {
  Card,
  Button,
  Badge,
  EmptyState,
  ConfirmDialog
} from '../../components/ui/primitives';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  classes?: SchoolClass[];
  students?: Student[];
  schoolName?: string;
  onAddAnnouncement: (ann: Omit<Announcement, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateAnnouncement?: (id: string, ann: Partial<Announcement>) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  theme?: 'light' | 'dark';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function AnnouncementsPage({
  announcements,
  students = [],
  schoolName = 'Dugsi Pro',
  onAddAnnouncement,
  onDeleteAnnouncement
}: AnnouncementsViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState<string>('ALL');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    audience: 'Everyone' as Announcement['audience'],
    priority: 'Normal' as Announcement['priority'],
    status: 'Active' as Announcement['status'],
    author: 'Maamulka Dugsiga'
  });

  const filtered = announcements.filter(
    (a) => audienceFilter === 'ALL' || a.audience === audienceFilter
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddAnnouncement({
      ...formData,
      publishDate: new Date().toISOString().split('T')[0]
    });
    setFormData({
      title: '',
      message: '',
      audience: 'Everyone',
      priority: 'Normal',
      status: 'Active',
      author: 'Maamulka Dugsiga'
    });
    setShowModal(false);
  };

  const shareViaWhatsApp = (ann: Announcement) => {
    const text = `*OGEYSIIS — ${schoolName.toUpperCase()}*\n\n*${ann.title}*\n${ann.message}\n\n_Taariikh: ${ann.publishDate || ann.createdAt} • ${ann.author}_`;
    const firstGuardianPhone =
      students.find((s) => s.guardianPhone)?.guardianPhone?.replace(/[^0-9]/g, '') || '';
    const url = firstGuardianPhone
      ? `https://wa.me/${firstGuardianPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getPriorityBadgeVariant = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'Urgent':
        return 'danger' as const;
      case 'High':
        return 'warning' as const;
      default:
        return 'success' as const;
    }
  };

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Ogeysiisyada & Wararka (Notice Board)"
        subtitle="La wadaag fariimaha muhiimka ah waalidiinta, macalimiinta, iyo ardayda."
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowModal(true)}
          >
            Ogeysiis Cusub (Post Notice)
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'Everyone', 'Parents', 'Teachers', 'Students', 'Staff'].map((aud) => (
          <button
            key={aud}
            type="button"
            onClick={() => setAudienceFilter(aud)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              audienceFilter === aud
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {aud === 'ALL'
              ? 'Dhammaan Ogeysiisyada'
              : `Ku socota: ${aud}`}
          </button>
        ))}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="w-6 h-6" />}
            title="Ogeysiisyo lama helin"
            description="Riix 'Ogeysiis Cusub' si aad u daabacdo fariin ku socota dugsiga."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowModal(true)}
              >
                Ogeysiis Cusub (Post Notice)
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((ann) => (
            <Card
              key={ann.id}
              className="p-6 hover:border-emerald-500/30 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getPriorityBadgeVariant(ann.priority)} dot>
                    {ann.priority}
                  </Badge>
                  <Badge variant="neutral" className="gap-1">
                    <Users className="w-3 h-3" /> {ann.audience}
                  </Badge>
                  <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {ann.publishDate || ann.createdAt}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<MessageCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    onClick={() => shareViaWhatsApp(ann)}
                  >
                    U dir WhatsApp
                  </Button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(ann.id)}
                    className="p-1.5 text-[var(--color-text-secondary)] hover:text-rose-500 rounded-lg transition-colors"
                    title="Tirtir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-500 shrink-0" />
                {ann.title}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-line leading-relaxed">
                {ann.message}
              </p>
              <div className="mt-4 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                Qore: <span className="text-[var(--color-text-primary)] font-medium">{ann.author}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ds-surface-elevated rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Daabac Ogeysiis Cusub
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                  Cinwaanka Ogeysiiska (Title)
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Tusaale: Fasaxa Ciidda ama Kulanka Waalidiinta"
                  className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3.5 text-sm text-[var(--color-text-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Cidda ay khuseyso (Audience)
                  </label>
                  <select
                    value={formData.audience}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        audience: e.target.value as Announcement['audience']
                      })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  >
                    <option value="Everyone">Dhammaan (Everyone)</option>
                    <option value="Parents">Waalidiinta (Parents)</option>
                    <option value="Teachers">Macalimiinta (Teachers)</option>
                    <option value="Students">Ardayda (Students)</option>
                    <option value="Staff">Shaqaalaha (Staff)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Muhiimadda (Priority)
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as Announcement['priority']
                      })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  >
                    <option value="Normal">Caadi (Normal)</option>
                    <option value="High">Muhiim (High)</option>
                    <option value="Urgent">Degdeg (Urgent)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                  Fariinta Ogeysiiska (Message)
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Qor faahfaahinta ogeysiiska..."
                  className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl p-3.5 text-sm text-[var(--color-text-primary)]"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  Jooji
                </Button>
                <Button variant="primary" type="submit">
                  Daabac Ogeysiiska
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Tirtir Ogeysiiska (Delete Announcement)"
        description="Ma hubtaa inaad tirtirto ogeysiiskan?"
        confirmLabel="Haa, Tirtir"
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId === null) return;
          setIsDeleting(true);
          try {
            await onDeleteAnnouncement(pendingDeleteId);
          } finally {
            setIsDeleting(false);
            setPendingDeleteId(null);
          }
        }}
      />
    </PageContainer>
  );
}
