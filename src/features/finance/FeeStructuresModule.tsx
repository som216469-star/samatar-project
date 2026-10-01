import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Layers, 
  X, 
  Download,
  CheckCircle2
} from "lucide-react";
import type { FeeStructure } from "../../types";
import { ConfirmDialog } from "../../components/ui/primitives";
import { formatMoney, exportToExcel } from "./financeUtils";
import { apiFetch } from "../../lib/apiClient";

interface FeeStructuresModuleProps {
  feeStructures: FeeStructure[];
  classes: any[];
  currency: string;
  schoolName: string;
  onRefresh: () => void;
}

const CATEGORIES = [
  "Monthly Tuition",
  "Term Fee",
  "Admission Fee",
  "Exam Fee",
  "Transport Fee",
  "Library Fee",
  "Uniform Fee",
  "Other Fee"
];

export const FeeStructuresModule: React.FC<FeeStructuresModuleProps> = ({
  feeStructures,
  classes,
  currency,
  schoolName,
  onRefresh
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const [form, setForm] = useState({
    name: "Lacagta Bishan",
    category: "Monthly Tuition",
    amount: 50,
    className: "All Classes",
    academicYear: "2026-2027",
    term: "All Terms",
    description: "Fiiga caadiga ah ee bishii"
  });

  const openAddModal = () => {
    setEditingFee(null);
    setForm({
      name: "Lacagta Bishan",
      category: "Monthly Tuition",
      amount: 50,
      className: "All Classes",
      academicYear: "2026-2027",
      term: "All Terms",
      description: "Fiiga caadiga ah ee bishii"
    });
    setShowModal(true);
  };

  const openEditModal = (fs: FeeStructure) => {
    setEditingFee(fs);
    setForm({
      name: fs.name,
      category: fs.category,
      amount: fs.amount,
      className: fs.className,
      academicYear: fs.academicYear,
      term: fs.term || "All Terms",
      description: fs.description || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingFee) {
        await apiFetch(`/api/fee-structures/${editingFee.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
      } else {
        await apiFetch("/api/fee-structures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
      }
      setShowModal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: "Tirtir Qaab-dhismeedka Fiiga?",
      message: "Ma hubtaa inaad tirtirto qaab-dhismeedkan fiiga?",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/fee-structures/${id}`, { method: "DELETE" });
          if (res.ok) onRefresh();
        } catch (err) {
          console.error(err);
        } finally {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleExportExcel = () => {
    const data = feeStructures.map((f) => ({
      Name: f.name,
      Category: f.category,
      Amount: f.amount,
      Class: f.className,
      "Academic Year": f.academicYear,
      Term: f.term,
      Description: f.description
    }));
    exportToExcel(`Fee_Structures_${schoolName.replace(/\s+/g, "_")}`, "FeeStructures", data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#e5e5e5]">
            Qaab-dhismeedka Fiiga (Fee Structures)
          </h2>
          <p className="text-[10px] text-[#737373]">
            Habee khidmadaha kala duwan ee fasallada, xilliyada, iyo sannad-dugsiyeedka
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#ffffff10] bg-[#0f0f0f] hover:bg-[#ffffff05] text-[#a3a3a3] hover:text-[#e5e5e5] text-[10px] uppercase font-bold tracking-wider cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] text-[10px] uppercase font-bold tracking-wider cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kudar Fi Cusub (Add Structure)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {feeStructures.map((fs) => (
          <div key={fs.id} className="bg-[#0f0f0f] border border-[#ffffff10] p-4 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#e5e5e5] block">{fs.name}</span>
                <span className="text-[9px] text-emerald-400 font-medium">{fs.category}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(fs)}
                  className="p-1 rounded-sm text-[#737373] hover:text-[#e5e5e5] hover:bg-[#ffffff05]"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(fs.id)}
                  className="p-1 rounded-sm text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatMoney(fs.amount, currency)}
            </div>

            <div className="text-[10px] text-[#a3a3a3] space-y-1 pt-2 border-t border-[#ffffff08]">
              <div className="flex justify-between">
                <span>Fasalka:</span>
                <span className="text-[#e5e5e5] font-semibold">{fs.className}</span>
              </div>
              <div className="flex justify-between">
                <span>Sanad-dugsiyeedka:</span>
                <span className="text-[#e5e5e5]">{fs.academicYear}</span>
              </div>
              <div className="flex justify-between">
                <span>Xilliga (Term):</span>
                <span className="text-[#e5e5e5]">{fs.term}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={editingFee ? "Wax ka beddel Fiiga" : "Kudar Qaab-dhismeed Fi Cusub"}
        >
          <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm w-full max-w-md shadow-2xl p-6 relative">
            <button
              className="absolute right-4 top-4 p-1.5 rounded-sm text-[#737373] hover:bg-[#ffffff05]"
              onClick={() => setShowModal(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold font-serif text-[#f5f5f5] mb-5">
              {editingFee ? "Wax ka beddel Fiiga" : "Kudar Qaab-dhismeed Fi Cusub"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">
                  Magaca Fiiga (Fee Name) *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">
                    Nooca (Category) *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">
                    Cadadka ({currency}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">
                    Fasalka *
                  </label>
                  <select
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="All Classes">Dhammaan Fasallada (All)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.className}>{c.className}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">
                    Xilliga (Term)
                  </label>
                  <select
                    value={form.term}
                    onChange={(e) => setForm({ ...form, term: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="All Terms">All Terms</option>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#737373] uppercase tracking-wider text-[9px]">
                  Sanad-Dugsiyeedka *
                </label>
                <input
                  type="text"
                  value={form.academicYear}
                  onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                  className="w-full px-3 py-2 rounded-sm border border-[#ffffff10] bg-[#0a0a0a] text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-sm border border-[#ffffff10] text-[#737373] hover:text-[#e5e5e5] text-[10px] uppercase font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-sm bg-[#e5e5e5] hover:bg-white text-[#0a0a0a] text-[10px] uppercase font-bold tracking-wider disabled:opacity-50"
                >
                  {submitting ? "Kaydinaya..." : "Save Structure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
