import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import Badge from './Badge';

export default function UserDeleteConfirmModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false
}) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full border border-rose-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 pb-4 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900">
              Confirm Resident Deletion
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              This administrative action cannot be undone.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resident Summary Box */}
        <div className="px-6 py-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Full Name:</span>
              <span className="font-bold text-slate-900">{user.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Roll / User ID:</span>
              <span className="font-mono font-bold text-teal-700">{user.rollNumber || user.loginId || 'Staff'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Assigned Tier / Role:</span>
              <Badge variant="neutral" size="sm">
                {(user.role || 'resident').replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Hostel Allotment:</span>
              <span className="font-medium text-slate-700">{user.hostelName || 'General / Hall'}</span>
            </div>
            {user.roomNumber && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Room Allotment:</span>
                <span className="font-medium text-slate-700">Room {user.roomNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning Callout */}
        <div className="px-6 py-2">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Deleting this record will immediately remove the member from active attendance sheets, free up their dormitory bed, and purge their directory record.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-4 flex items-center justify-end gap-3 bg-slate-50/50 border-t border-slate-100 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Resident'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
