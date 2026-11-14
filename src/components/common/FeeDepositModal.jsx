import React, { useState, useEffect } from 'react';
import { Send, Building2, Receipt, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import Button from './Button';
import Badge from './Badge';
import { dbService } from '../../services/db';
import { mealAutomationService } from '../../services/mealAutomationService';

export default function FeeDepositModal({
  isOpen,
  onClose,
  userProfile,
  effectiveHostelId,
  effectivePtiId,
  onSuccess,
  targetMonth
}) {
  const role = (userProfile?.role || '').toLowerCase();
  const isSuperintendent = role.includes('superintendent') || role === 'admin';
  const isHostelSuper = role.includes('hostel_super');
  const isStaffOrAdmin = isSuperintendent || isHostelSuper || role.includes('monitor');

  const [hostelsList, setHostelsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [newDeposit, setNewDeposit] = useState({
    hostelId: effectiveHostelId || 'hostel_01',
    depositType: 'Mess Fee Deposit',
    amount: '',
    paymentMethod: 'bKash / Mobile Banking',
    trxId: ''
  });

  useEffect(() => {
    if (!isOpen) return;

    // Load available hostels
    const allHostels = dbService.getHostels();
    const ptiId = effectivePtiId || userProfile?.pti_id;
    const scoped = ptiId && ptiId !== 'GLOBAL'
      ? allHostels.filter(h => !h.pti_id || h.pti_id === ptiId)
      : allHostels;
    
    setHostelsList(scoped.length > 0 ? scoped : allHostels);

    // Initial selected hostel: only superintendent may choose cross-hostel
    const defaultHostel = effectiveHostelId || 
      (isSuperintendent ? localStorage.getItem('pti_superintendent_chosen_hostel') : null) || 
      userProfile?.hostelId ||
      scoped[0]?.id || 
      'hostel_01';

    setNewDeposit(prev => ({
      ...prev,
      hostelId: isSuperintendent ? (prev.hostelId || defaultHostel) : (effectiveHostelId || userProfile?.hostelId || 'hostel_01'),
      depositType: prev.depositType || 'Mess Fee Deposit'
    }));
  }, [isOpen, effectiveHostelId, effectivePtiId, userProfile, isSuperintendent]);

  if (!isOpen) return null;

  const assignedHostelObj = hostelsList.find(h => h.id === (effectiveHostelId || userProfile?.hostelId)) || 
    hostelsList[0] || { name: userProfile?.hostelName || 'Assigned Hostel Hall' };
  const assignedHostelName = assignedHostelObj?.name || userProfile?.hostelName || 'Assigned Hostel Hall';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newDeposit.amount || !newDeposit.trxId) return;

    setSubmitting(true);
    try {
      // Superintendent can choose any hostel; Hostel Super & others automatically map to assigned hostel
      const chosenHostelId = isSuperintendent 
        ? (newDeposit.hostelId || effectiveHostelId || 'hostel_01') 
        : (effectiveHostelId || userProfile?.hostelId || 'hostel_01');
      const selectedHostelObj = hostelsList.find(h => h.id === chosenHostelId);

      const entry = {
        id: `DEP-${Date.now().toString().slice(-4)}`,
        pti_id: effectivePtiId || userProfile?.pti_id || 'pti_dhaka',
        hostelId: chosenHostelId,
        hostelName: selectedHostelObj?.name || assignedHostelName,
        studentId: userProfile?.id || userProfile?.loginId || (isSuperintendent ? 'admin' : (isHostelSuper ? 'hostel_super' : 'user_101')),
        studentName: userProfile?.name || 'Authorized User',
        rollNumber: userProfile?.rollNumber || (isSuperintendent ? 'STAFF-T1' : (isHostelSuper ? 'hostel_super' : '101')),
        userType: userProfile?.role || 'boarder_student',
        roomNumber: userProfile?.roomNumber || (isSuperintendent ? 'Executive Quarters' : (isHostelSuper ? 'Super Quarters' : 'Hall')),
        depositType: newDeposit.depositType,
        amount: Number(newDeposit.amount),
        paymentMethod: newDeposit.paymentMethod,
        trxId: newDeposit.trxId.trim(),
        month: targetMonth || mealAutomationService.getCurrentMonth(),
        submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'pending',
        approvedBy: null,
        approvedAt: null
      };

      const updated = dbService.insertDeposit(entry);

      if (typeof onSuccess === 'function') {
        onSuccess(entry, updated);
      }

      onClose();
      setNewDeposit({
        hostelId: chosenHostelId,
        depositType: 'Mess Fee Deposit',
        amount: '',
        paymentMethod: 'bKash / Mobile Banking',
        trxId: ''
      });
    } finally {
      setSubmitting(false);
    }
  };

  const monthLabel = mealAutomationService.getMonthDisplayName(targetMonth);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-brand-teal" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-heading">Submit Fee Deposit</h3>
              <p className="text-xs text-slate-500">
                Deposit for <strong>{userProfile?.name}</strong> • {monthLabel}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Superintendent Banner */}
        {isSuperintendent && (
          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-start gap-2 font-medium">
            <Building2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-teal-950">Superintendent Cross-Hostel Privileges:</span>
              <p className="text-[11px] text-teal-800 mt-0.5">
                You may select any hostel dining hall in the institute to submit your fee deposit.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Hostel Selection: ONLY Superintendent has cross-hostel dropdown. Hostel Super & others automatically map to assigned hostel */}
          {isSuperintendent ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 font-heading flex items-center justify-between">
                <span>Select Target Hostel / Hall</span>
                <span className="text-[10px] text-brand-teal font-normal lowercase">(cross-hostel permitted)</span>
              </label>
              <div className="relative">
                <select
                  value={newDeposit.hostelId}
                  onChange={(e) => setNewDeposit({ ...newDeposit, hostelId: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-md border border-teal-300 bg-teal-50/30 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-gold font-medium cursor-pointer"
                  required
                >
                  {hostelsList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.type || 'Hall'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1 font-heading">
                Hostel Hall (Strictly Assigned)
              </label>
              <input
                type="text"
                disabled
                value={assignedHostelName}
                className="w-full text-xs p-2.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 font-medium cursor-not-allowed"
              />
              {isHostelSuper && (
                <p className="text-[11px] text-teal-700 mt-1">
                  Mapped to your assigned hall ({assignedHostelName}). Verification handled by that hostel's Meal Manager.
                </p>
              )}
            </div>
          )}

          {/* Deposit Type - Establishment fee option exclusively accessible to Admins */}
          {isStaffOrAdmin ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 font-heading">
                Deposit Type
              </label>
              <select
                value={newDeposit.depositType}
                onChange={(e) => setNewDeposit({ ...newDeposit, depositType: e.target.value })}
                className="w-full text-xs p-2.5 rounded-md border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-teal font-medium"
              >
                <option value="Mess Fee Deposit">Mess Fee Deposit (Meal Advance)</option>
                <option value="Establishment Fee Deposit">Establishment Fee Deposit (Maintenance / Term)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1 font-heading">
                Deposit Type
              </label>
              <input
                type="text"
                disabled
                value="Mess Fee Deposit (Meal Advance)"
                className="w-full text-xs p-2.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 font-medium cursor-not-allowed"
              />
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 font-heading">
              Deposit Amount (৳)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">৳</span>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 3000"
                value={newDeposit.amount}
                onChange={(e) => setNewDeposit({ ...newDeposit, amount: e.target.value })}
                className="w-full text-xs pl-7 pr-3 py-2.5 rounded-md border border-slate-200 bg-white text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 font-heading">
              Payment Channel
            </label>
            <select
              value={newDeposit.paymentMethod}
              onChange={(e) => setNewDeposit({ ...newDeposit, paymentMethod: e.target.value })}
              className="w-full text-xs p-2.5 rounded-md border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-teal font-medium"
            >
              <option>bKash / Mobile Banking</option>
              <option>Nagad</option>
              <option>Rocket</option>
              <option>Bank Challan / Slip</option>
              <option>Cash at Warden Office</option>
            </select>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 font-heading">
              Transaction ID / Bank Challan No.
            </label>
            <input
              type="text"
              required
              placeholder="e.g. TRX982736481 or CHLN-881"
              value={newDeposit.trxId}
              onChange={(e) => setNewDeposit({ ...newDeposit, trxId: e.target.value })}
              className="w-full text-xs p-2.5 rounded-md border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-brand-teal uppercase"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium rounded-md font-heading bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newDeposit.amount || !newDeposit.trxId}
              className="px-4 py-2 text-sm font-medium rounded-md font-heading bg-brand-gold hover:bg-yellow-600 text-white transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit Deposit'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
