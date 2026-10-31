'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash2, MoreHorizontal, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Patient {
  id: string;
  name: string;
  phone: string;
  age?: number | null;
  gender?: string | null;
  allergies?: string | null;
  currentMedicines?: string | null;
}

interface PatientActionsMenuProps {
  patient: Patient;
  /** Where to redirect after delete (defaults to /dashboard/patients) */
  afterDeleteHref?: string;
  /** Show as icon-only dropdown (for list rows) or full buttons (for detail page) */
  variant?: 'dropdown' | 'inline';
}

export function PatientActionsMenu({
  patient,
  afterDeleteHref = '/dashboard/patients',
  variant = 'dropdown',
}: PatientActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Form state — pre-seeded from patient
  const [form, setForm] = React.useState({
    name: patient.name,
    phone: patient.phone,
    age: patient.age?.toString() ?? '',
    gender: patient.gender ?? '',
    allergies: patient.allergies ?? '',
    currentMedicines: patient.currentMedicines ?? '',
  });

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset form when edit modal opens
  React.useEffect(() => {
    if (editOpen) {
      setForm({
        name: patient.name,
        phone: patient.phone,
        age: patient.age?.toString() ?? '',
        gender: patient.gender ?? '',
        allergies: patient.allergies ?? '',
        currentMedicines: patient.currentMedicines ?? '',
      });
    }
  }, [editOpen, patient]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          age: form.age === '' ? null : Number(form.age),
          gender: form.gender || null,
          allergies: form.allergies.trim() || null,
          currentMedicines: form.currentMedicines.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setEditOpen(false);
      router.refresh();
    } catch {
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push(afterDeleteHref);
      router.refresh();
    } catch {
      alert('Failed to delete patient. Please try again.');
      setDeleting(false);
    }
  }

  const triggerEdit = () => { setOpen(false); setEditOpen(true); };
  const triggerDelete = () => { setOpen(false); setDeleteOpen(true); };

  return (
    <>
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      {variant === 'dropdown' ? (
        <div className="relative inline-block" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            aria-label="Patient actions"
          >
            <MoreHorizontal size={15} />
          </button>

          {open && (
            <div className="absolute right-0 z-50 mt-1 w-44 origin-top-right rounded-xl border border-gray-100 bg-white shadow-lg ring-1 ring-black/5">
              <div className="py-1">
                <Link
                  href={`/dashboard/patients/${patient.id}`}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <Eye size={14} className="text-blue-500" />
                  View Profile
                </Link>
                <button
                  onClick={triggerEdit}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={14} className="text-amber-500" />
                  Edit Patient
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={triggerDelete}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete Patient
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Inline buttons for detail page */
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={triggerEdit}>
            <Pencil size={14} />
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={triggerDelete}>
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Edit Patient</h2>
                <p className="text-xs text-gray-500 mt-0.5">Update {patient.name}'s information</p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave}>
              <div className="px-6 py-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full name"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+91XXXXXXXXXX"
                  />
                </div>

                {/* Age + Gender row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Age</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. 32"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Gender</label>
                    <div className="flex gap-2 mt-0.5">
                      {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setForm({ ...form, gender: g })}
                          className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-all ${
                            form.gender === g
                              ? g === 'MALE'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : g === 'FEMALE'
                                ? 'border-pink-500 bg-pink-50 text-pink-700'
                                : 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {g === 'MALE' ? '🔵 M' : g === 'FEMALE' ? '🔴 F' : '⚪ O'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Allergies */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Allergies</label>
                  <input
                    value={form.allergies}
                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Penicillin, Aspirin (leave blank if none)"
                  />
                </div>

                {/* Current Medicines */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Current Medicines</label>
                  <input
                    value={form.currentMedicines}
                    onChange={(e) => setForm({ ...form, currentMedicines: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Metformin 500mg (leave blank if none)"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={saving}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteOpen(false)}
          />

          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="p-6">
              {/* Icon */}
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>

              <h2 className="text-center text-base font-semibold text-gray-900">Delete Patient</h2>
              <p className="mt-2 text-center text-sm text-gray-500">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-gray-900">{patient.name}</span>?
              </p>
              <p className="mt-1 text-center text-xs text-red-500">
                This will permanently delete all consultations, payments, and prescriptions. This cannot be undone.
              </p>

              <div className="mt-5 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  loading={deleting}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
