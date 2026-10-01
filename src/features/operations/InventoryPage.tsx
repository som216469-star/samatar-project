import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapPin,
  DollarSign,
  CheckCircle2,
  Wrench,
  X
} from 'lucide-react';
import { InventoryItem } from '../../types';
import { PageContainer, PageHeader } from '../../components/layout/PageLayout';
import {
  Card,
  StatCard,
  Button,
  Badge,
  EmptyState,
  ConfirmDialog
} from '../../components/ui/primitives';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onAddItem: (item: Omit<InventoryItem, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  currency?: string;
  theme?: 'light' | 'dark';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function InventoryPage({
  inventory,
  onAddItem,
  onUpdateItem,
  onDeleteItem
}: InventoryViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<InventoryItem | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Furniture' as InventoryItem['category'],
    quantity: 1,
    purchaseCost: 0,
    condition: 'Good' as InventoryItem['condition'],
    location: 'Main Building',
    status: 'Available' as InventoryItem['status'],
    notes: ''
  });

  const filtered = inventory.filter((a) => {
    const matchesSearch =
      a.itemName.toLowerCase().includes(search.toLowerCase()) ||
      (a.location || '').toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || a.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalItems = inventory.reduce((acc, a) => acc + (Number(a.quantity) || 0), 0);
  const totalValue = inventory.reduce(
    (acc, a) => acc + (Number(a.quantity) || 0) * (Number(a.purchaseCost) || 0),
    0
  );
  const needsRepair = inventory.filter(
    (a) => a.condition === 'Needs Repair' || a.condition === 'Damaged'
  ).length;

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setFormData({
      itemName: '',
      category: 'Furniture',
      quantity: 1,
      purchaseCost: 0,
      condition: 'Good',
      location: 'Main Building',
      status: 'Available',
      notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (asset: InventoryItem) => {
    setEditingAsset(asset);
    setFormData({
      itemName: asset.itemName,
      category: asset.category,
      quantity: asset.quantity,
      purchaseCost: asset.purchaseCost,
      condition: asset.condition,
      location: asset.location || '',
      status: asset.status || 'Available',
      notes: asset.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      purchaseDate:
        editingAsset?.purchaseDate || new Date().toISOString().split('T')[0]
    };
    if (editingAsset) {
      await onUpdateItem(editingAsset.id, payload);
    } else {
      await onAddItem(payload);
    }
    setShowModal(false);
  };

  const getConditionBadgeVariant = (condition: InventoryItem['condition']) => {
    switch (condition) {
      case 'Excellent':
      case 'Good':
        return 'success' as const;
      case 'Fair':
        return 'warning' as const;
      default:
        return 'danger' as const;
    }
  };

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Hantida & Agabka Dugsiga (Inventory & Assets)"
        subtitle="La soco agabka dugsiga, kuraasta, kombiyuutarada, iyo xaaladdooda."
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAdd}
          >
            Ku dar Agab (Add Asset)
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Noocyada Agabka"
          value={inventory.length}
          icon={<Package className="w-4 h-4" />}
          tone="default"
        />
        <StatCard
          label="Wadarta Tirada (Units)"
          value={totalItems}
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="info"
        />
        <StatCard
          label="Qiimaha Guud (Est. Value)"
          value={`$${totalValue.toLocaleString()}`}
          icon={<DollarSign className="w-4 h-4" />}
          tone="emerald"
        />
        <StatCard
          label="Dayactir u Baahan"
          value={needsRepair}
          icon={<Wrench className="w-4 h-4" />}
          tone="warning"
        />
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Raadi agab ama goobta uu yaallo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            'ALL',
            'Furniture',
            'Electronics',
            'Lab Equipment',
            'Sports',
            'Books',
            'Other'
          ].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                categoryFilter === cat
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {cat === 'ALL' ? 'Dhammaan' : cat}
            </button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="Agab lama helin"
            description="Riix 'Ku dar Agab' si aad u diiwaangeliso hantida dugsiga."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenAdd}
              >
                Ku dar Agab (Add Asset)
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  <th className="py-3.5 px-4">Agabka (Item Name)</th>
                  <th className="py-3.5 px-4">Qaybta</th>
                  <th className="py-3.5 px-4">Tirada (Qty)</th>
                  <th className="py-3.5 px-4">Qiimaha Guud</th>
                  <th className="py-3.5 px-4">Goobta (Location)</th>
                  <th className="py-3.5 px-4">Xaaladda</th>
                  <th className="py-3.5 px-4 text-right">Ficillo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-sm">
                {filtered.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--color-text-primary)]">
                        {asset.itemName}
                      </div>
                      {asset.notes && (
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {asset.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="neutral">{asset.category}</Badge>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[var(--color-text-primary)] tabular-nums">
                      {asset.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-500 font-semibold tabular-nums">
                      $
                      {(
                        (Number(asset.quantity) || 0) *
                        (Number(asset.purchaseCost) || 0)
                      ).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[var(--color-text-secondary)]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                        {asset.location || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={getConditionBadgeVariant(asset.condition)}
                        dot
                      >
                        {asset.condition}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(asset)}
                          className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-lg"
                          title="Wax ka beddel"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(asset.id)}
                          className="p-1.5 text-[var(--color-text-secondary)] hover:text-rose-500 rounded-lg"
                          title="Tirtir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="ds-surface-elevated rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                {editingAsset ? 'Wax ka beddel Agabka' : 'Diiwaangeli Agab Cusub'}
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
                  Magaca Agabka (Asset Name)
                </label>
                <input
                  type="text"
                  required
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  placeholder="Tusaale: Kuraasta Fasalka 1aad"
                  className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3.5 text-sm text-[var(--color-text-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Qaybta (Category)
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as InventoryItem['category']
                      })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  >
                    <option value="Furniture">Furniture</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Lab Equipment">Lab Equipment</option>
                    <option value="Sports">Sports</option>
                    <option value="Books">Books</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Xaaladda (Condition)
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        condition: e.target.value as InventoryItem['condition']
                      })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Tirada (Quantity)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: Number(e.target.value) })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                    Qiimaha Halkii Xabo ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.purchaseCost}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        purchaseCost: Number(e.target.value)
                      })
                    }
                    className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                  Goobta (Location / Room)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full h-10 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3.5 text-sm text-[var(--color-text-primary)]"
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
                  Kaydi Agabka
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Tirtir Agabka (Delete Asset)"
        description="Ma hubtaa inaad tirtirto agabkan?"
        confirmLabel="Haa, Tirtir"
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId === null) return;
          setIsDeleting(true);
          try {
            await onDeleteItem(pendingDeleteId);
          } finally {
            setIsDeleting(false);
            setPendingDeleteId(null);
          }
        }}
      />
    </PageContainer>
  );
}
