'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash2, MoreHorizontal, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import Link from 'next/link';

const CONSULTATION_STATUSES = [
  { value: 'PENDING',             label: 'Pending' },
  { value: 'PAID',                label: 'Paid' },
  { value: 'IN_REVIEW',           label: 'In Review' },
  { value: 'PRESCRIPTION_READY', label: 'Prescription Ready' },
  { value: 'COMPLETED',           label: 'Completed' },
  { value: 'CANCELLED',           label: 'Cancelled' },
  { value: 'EMERGENCY',           label: 'Emergency' },
] as const;

interface ConsultationActionsMenuProps {
  consultationId: string;
  currentStatus: string;
  patientName: string;
  /** Where to redirect after delete */
  afterDeleteHref?: string;
  /** 'dropdown' for list rows, 'inline' for detail page */
  variant?: 'dropdown' | 'inline';
}

export function ConsultationActionsMenu({
  consultationId,
  currentStatus,
  patientName,
  afterDeleteHref = '/dashboard/consultations',
  variant = 'dropdown',
}: ConsultationActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState(currentStatus);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Reset status selection when modal opens
  React.useEffect(() => {
    if (editOpen) setSelectedStatus(currentStatus);
  }, [editOpen, currentStatus]);

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleSaveStatus(e: React.FormEvent) {
    e.preventDefault();
    if (selectedStatus === currentStatus) { setEditOpen(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/consultation/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (!res.ok) throw new Error('Save failed');
      setEditOpen(false);
      router.refresh();
    } catch {
      alert('Failed to update status. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/consultation/${consultationId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push(afterDeleteHref);
      router.refresh();
    } catch {
      alert('Failed to delete consultation. Please try again.');
      setDeleting(false);
    }
  }

  const triggerEdit   = () => { setOpen(false); setEditOpen(true); };
  const triggerDelete = () => { setOpen(false); setDeleteOpen(true); };

  return (
    <>
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      {variant === 'dropdown' ? (
        <div className="relative inline-block" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            aria-label="Consultation actions"
          >
            <MoreHorizontal size={15} />
          </button>

          {open && (
            <div className="absolute right-0 z-50 mt-1 w-48 origin-top-right rounded-xl border border-gray-100 bg-white shadow-lg ring-1 ring-black/5">
              <div className="py-1">
                <Link
                  href={`/dashboard/consultations/${consultationId}`}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <Eye size={14} className="text-blue-500" />
                  View Details
                </Link>
                <button
                  onClick={triggerEdit}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={14} className="text-amber-500" />
                  Edit Status
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={triggerDelete}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
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
            Edit Status
          </Button>
          <Button size="sm" variant="destructive" onClick={triggerDelete}>
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      )}

      {/* ── Edit Status Modal ────────────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditOpen(false)}
          />

          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Edit Consultation</h2>
                <p className="text-xs text-gray-500 mt-0.5">{patientName}</p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveStatus}>
              <div className="px-6 py-5">
                <p className="mb-3 text-xs font-medium text-gray-700">Select new status</p>

                <div className="space-y-2">
                  {CONSULTATION_STATUSES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSelectedStatus(s.value)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all ${
                        selectedStatus === s.value
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-gray-100 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium text-gray-800">{s.label}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(s.value)}>
                          {s.value.replace('_', ' ')}
                        </Badge>
                        {selectedStatus === s.value && (
                          <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

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
                <Button
                  type="submit"
                  size="sm"
                  loading={saving}
                  disabled={selectedStatus === currentStatus}
                >
                  Update Status
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
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>

              <h2 className="text-center text-base font-semibold text-gray-900">Delete Consultation</h2>
              <p className="mt-2 text-center text-sm text-gray-500">
                Are you sure you want to delete this consultation for{' '}
                <span className="font-semibold text-gray-900">{patientName}</span>?
              </p>
              <p className="mt-1 text-center text-xs text-red-500">
                Payment and prescription records will also be deleted. This cannot be undone.
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
