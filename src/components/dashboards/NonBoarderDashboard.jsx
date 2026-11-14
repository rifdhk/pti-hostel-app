import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Send, 
  CheckCircle2, 
  Clock, 
  GraduationCap, 
  Plus, 
  Receipt, 
  FileText,
  ShieldCheck,
  Utensils
} from 'lucide-react';
import Card from '../common/Card';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import AvatarRenderer from '../Avatars/AvatarRenderer';
import { normalizeGender } from '../../constants/avatars';
import NextDayMealToggle from '../common/NextDayMealToggle';
import ConsumedMealsCard from '../common/ConsumedMealsCard';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../services/db';
import { mealAutomationService } from '../../services/mealAutomationService';

export default function NonBoarderDashboard() {
  const { userProfile, effectiveHostelId } = useAuth();

  const [myDeposits, setMyDeposits] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [depositSuccess, setDepositSuccess] = useState('');

  // Fee Deposit Form State
  const [newDeposit, setNewDeposit] = useState({
    amount: '',
    paymentMethod: 'Bank Challan (Sonali Bank)',
    trxId: ''
  });

  useEffect(() => {
    loadData();

    // Listen to Superintendent master switch updates & deposit approvals
    const handleSettingsChange = () => {
      loadData();
    };
    const handleDepositsChange = () => {
      loadData();
    };
    const handleMealsChange = () => {
      loadData();
    };
    window.addEventListener('pti_settings_changed', handleSettingsChange);
    window.addEventListener('pti_deposits_changed', handleDepositsChange);
    window.addEventListener('pti_meals_changed', handleMealsChange);
    window.addEventListener('pti_meal_values_changed', handleMealsChange);
    return () => {
      window.removeEventListener('pti_settings_changed', handleSettingsChange);
      window.removeEventListener('pti_deposits_changed', handleDepositsChange);
      window.removeEventListener('pti_meals_changed', handleMealsChange);
      window.removeEventListener('pti_meal_values_changed', handleMealsChange);
    };
  }, [effectiveHostelId, userProfile]);

  const loadData = () => {
    const roll = userProfile?.rollNumber || '201';

    // 1. Calculate financial metrics
    const fin = mealAutomationService.getStudentFinancials(roll, effectiveHostelId, 'non_boarder_student');
    setFinancials(fin);

    // 2. My deposits
    setMyDeposits(dbService.getDeposits(d => String(d.rollNumber) === String(roll) || d.studentId === userProfile?.id));
  };

  const handleDepositSubmit = (e) => {
    e.preventDefault();
    if (!newDeposit.amount || !newDeposit.trxId) return;

    const entry = {
      id: `DEP-${Date.now().toString().slice(-4)}`,
      hostelId: effectiveHostelId,
      studentId: userProfile?.id || 'student_201',
      studentName: userProfile?.name || 'Zubair Ahmed',
      rollNumber: userProfile?.rollNumber || '201',
      userType: 'non_boarder_student',
      roomNumber: 'Day-Scholar (Non-Boarder)',
      depositType: 'Mess Fee Deposit',
      amount: Number(newDeposit.amount),
      paymentMethod: newDeposit.paymentMethod,
      trxId: newDeposit.trxId,
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending',
      approvedBy: null,
      approvedAt: null
    };

    const updated = dbService.insertDeposit(entry);
    setMyDeposits(updated.filter(d => String(d.rollNumber) === String(userProfile?.rollNumber)));

    setShowDepositModal(false);
    setNewDeposit({ amount: '', paymentMethod: 'Bank Challan (Sonali Bank)', trxId: '' });

    setDepositSuccess(`Deposit slip of ৳${entry.amount} submitted successfully. Awaiting verification by Hostel Management.`);
    setTimeout(() => setDepositSuccess(''), 4500);
  };

  const pendingCount = myDeposits.filter(d => d.status === 'pending').length;

  return (
    <div className="space-y-6">
      
      {/* Non-Boarder Identity Banner */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <AvatarRenderer
            avatarId={userProfile?.avatar_id}
            gender={userProfile?.gender}
            className="w-16 h-16 rounded-full border-2 border-slate-200 ring-2 ring-teal-500/20 shadow-sm"
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Non-Boarder Attached Trainee (Tier 6)
              </span>
              <Badge variant="neutral" size="sm">Roll: {userProfile?.rollNumber || '201'}</Badge>
              <Badge variant={normalizeGender(userProfile?.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                Gender: {normalizeGender(userProfile?.gender)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 mt-0.5">
              {userProfile?.name || 'Zubair Ahmed'}
            </h1>
            {userProfile?.designation && (
              <p className="text-sm font-medium text-gray-500 mt-1">{userProfile.designation}</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">
              Attached to <strong>{userProfile?.hostelName || 'Kazi Nazrul Hall'}</strong> • Day Scholar
            </p>
          </div>
        </div>

        <Button variant="primary" size="md" icon={Plus} onClick={() => setShowDepositModal(true)}>
          Submit Fee Deposit
        </Button>
      </div>

      {/* KPI Stats with BENTO-BOX LAYOUT & ELEGANT ICONS */}
      {(() => {
        const myPersonalMeals = mealAutomationService.getUserPersonalConsumedMeals(userProfile, effectiveHostelId);
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Personal Consumed Meals Breakdown */}
              <ConsumedMealsCard
                userProfile={userProfile}
                hostelId={effectiveHostelId}
                title="My Consumed Meals"
                subtitle="Day-scholar guest meals"
              />

              {/* Card 2: Pending Challans */}
              <StatCard
                title="Pending Verification"
                value={`${pendingCount} Deposit Slips`}
                subtitle="Awaiting verification"
                change="Step 2 in Progress"
                changeType={pendingCount > 0 ? "negative" : "neutral"}
                icon={Clock}
              />

              {/* Card 3: Attached Hall */}
              <StatCard
                title="Attached Hall"
                value={userProfile?.hostelName || 'Nazrul Hall'}
                subtitle="Hostel Wing Affiliation"
                change="Affiliated"
                changeType="positive"
                icon={Building2}
              />

              {/* Card 4: Residential Status */}
              <StatCard
                title="Residential Status"
                value="Non-Boarder"
                subtitle="Day Scholar Trainee"
                change="Day Scholar"
                changeType="neutral"
                icon={Receipt}
              />
            </div>

            {/* Universal Daily Meal Choice Bento Card (T6 Non-Boarder) */}
            <NextDayMealToggle
              hostelId={effectiveHostelId || 'hostel_01'}
              rollNumber={userProfile?.rollNumber || '201'}
              userName={userProfile?.name || 'Zubair Ahmed'}
              userRole="non_boarder_student"
              onUpdate={() => loadData()}
            />
          </>
        );
      })()}

      {depositSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{depositSuccess}</span>
        </div>
      )}

      {/* My Deposit Records */}
      <Card
        title="My Deposit History"
        subtitle="Audit records of payment slips and receipts with approval verification"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Challan / Slip ID</th>
                <th className="pb-3">Deposit Category</th>
                <th className="pb-3">Channel & Transaction ID</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right pr-2">Approval & Audit Trail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myDeposits.map((dep) => (
                <tr key={dep.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pl-2">
                    <p className="font-bold text-slate-900">{dep.id}</p>
                    <span className="text-[11px] text-slate-400">{dep.submittedAt}</span>
                  </td>
                  <td className="py-3 font-medium text-slate-700">{dep.depositType}</td>
                  <td className="py-3 text-slate-600 font-mono text-[11px]">
                    {dep.paymentMethod} • Trx: {dep.trxId}
                  </td>
                  <td className="py-3 font-bold font-mono text-slate-900 text-sm">
                    ৳ {Number(dep.amount).toLocaleString()}
                  </td>
                  <td className="py-3 text-center">
                    <Badge variant={dep.status === 'approved' ? 'success' : dep.status === 'rejected' ? 'danger' : 'warning'} size="sm">
                      {dep.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 text-right pr-2">
                    {dep.status === 'approved' ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-[11px] border border-emerald-200/80">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Approved by: {dep.approvedBy_name || dep.approvedBy?.replace(/Approved by:\s*/i, '').split('(')[0]?.trim() || 'Warden'} ({dep.approvedBy_role || 'Hostel Monitor'})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(dep)}
                          className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" />
                          View Receipt
                        </button>
                      </div>
                    ) : dep.status === 'rejected' ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 font-semibold text-[11px] border border-rose-200">
                          ✕ {dep.approvedBy || 'Rejected by Warden / Monitor'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(dep)}
                          className="text-[11px] font-semibold text-slate-500 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" />
                          View Slip
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium text-[11px] border border-amber-200">
                          ⏳ Pending Hostel Monitor / Super
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(dep)}
                          className="text-[11px] font-semibold text-slate-500 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" />
                          View Slip
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Fee Deposit Form */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-dropdown p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Submit Fee Deposit</h3>
              <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Attached Hostel Hall</label>
                <input
                  type="text"
                  disabled
                  value={userProfile?.hostelName || 'Kazi Nazrul Hall'}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Deposit Amount (৳)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 1000"
                  value={newDeposit.amount}
                  onChange={(e) => setNewDeposit({ ...newDeposit, amount: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Method</label>
                <select
                  value={newDeposit.paymentMethod}
                  onChange={(e) => setNewDeposit({ ...newDeposit, paymentMethod: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                >
                  <option>Bank Challan (Sonali Bank)</option>
                  <option>bKash / Mobile Banking</option>
                  <option>Nagad</option>
                  <option>Cash Challan at Accounts</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Bank Challan No. / Trx ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CHLN-2026-9901 or TRX8829"
                  value={newDeposit.trxId}
                  onChange={(e) => setNewDeposit({ ...newDeposit, trxId: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowDepositModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" icon={Send}>Submit Deposit</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Student Fee Deposit Receipt View */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-dropdown overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Receipt Header Banner */}
            <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white p-6 relative">
              <button 
                onClick={() => setSelectedReceipt(null)} 
                className="absolute top-4 right-4 text-teal-200 hover:text-white p-1 text-base font-bold"
              >
                ✕
              </button>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-teal-300" />
                <span className="text-[11px] font-bold tracking-widest uppercase text-teal-200">
                  OFFICIAL ESTABLISHMENT DEPOSIT RECEIPT
                </span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white">{selectedReceipt.depositType}</h3>
              <p className="text-xs text-teal-200/90 mt-0.5 font-mono">
                Receipt / Challan No: {selectedReceipt.id}
              </p>
            </div>

            {/* Receipt Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Student & Hall Information */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Trainee / Attached</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedReceipt.studentName}</p>
                  <p className="text-slate-500 font-mono mt-0.5">Roll: {selectedReceipt.rollNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Enrolled Quarters</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {userProfile?.hostelName || 'Kazi Nazrul Hall'}
                  </p>
                  <p className="text-slate-500 font-mono mt-0.5">Attached Day-Scholar</p>
                </div>
              </div>

              {/* Transaction Breakdown */}
              <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                <div className="p-3 flex justify-between items-center bg-white">
                  <span className="text-slate-500">Deposit Date & Time</span>
                  <span className="font-mono text-slate-700">{selectedReceipt.submittedAt}</span>
                </div>
                <div className="p-3 flex justify-between items-center bg-white">
                  <span className="text-slate-500">Payment Channel</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.paymentMethod}</span>
                </div>
                <div className="p-3 flex justify-between items-center bg-white">
                  <span className="text-slate-500">Challan / Transaction Reference</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{selectedReceipt.trxId}</span>
                </div>
                <div className="p-3.5 flex justify-between items-center bg-teal-50/60 text-teal-950 font-bold">
                  <span className="text-xs uppercase tracking-wider text-teal-900">Total Deposited Amount</span>
                  <span className="text-lg font-mono text-teal-700">৳ {Number(selectedReceipt.amount).toLocaleString()}</span>
                </div>
              </div>

              {/* Approval & Audit Trail Box */}
              <div className={`p-4 rounded-2xl border ${
                selectedReceipt.status === 'approved' 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                  : selectedReceipt.status === 'rejected'
                  ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Audit Verification Status
                  </span>
                  <Badge variant={selectedReceipt.status === 'approved' ? 'success' : selectedReceipt.status === 'rejected' ? 'danger' : 'warning'} size="sm">
                    {selectedReceipt.status.toUpperCase()}
                  </Badge>
                </div>

                {selectedReceipt.status === 'approved' ? (
                  <div className="space-y-1 mt-2 text-xs">
                    <p className="font-semibold text-emerald-950">
                      ✓ {selectedReceipt.approvedBy || `Approved by: ${selectedReceipt.approvedBy_name || 'Warden'} (${selectedReceipt.approvedBy_role || 'Hostel Monitor'})`}
                    </p>
                    <p className="text-[11px] text-emerald-800/80 font-mono">
                      Sanctioned On: {selectedReceipt.approvedAt || 'Official Session'}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-medium pt-1">
                      Digital Audit Stamp: Deposited into Hostel Accounts.
                    </p>
                  </div>
                ) : selectedReceipt.status === 'rejected' ? (
                  <div className="space-y-0.5 mt-2 text-xs">
                    <p className="font-semibold text-rose-950">{selectedReceipt.approvedBy || 'Rejected by Warden / Approver'}</p>
                    <p className="text-[11px] text-rose-800/80">Please check your payment slip or contact administration.</p>
                  </div>
                ) : (
                  <div className="space-y-0.5 mt-2 text-xs">
                    <p className="font-medium text-amber-950">
                      Awaiting verification by: <strong>Hostel Management</strong>
                    </p>
                    <p className="text-[11px] text-amber-800/80">Fee deposit receipt will be confirmed upon Step 2 authorization.</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setSelectedReceipt(null)}
                >
                  Close
                </Button>
                <Button 
                  type="button" 
                  variant="primary" 
                  size="sm" 
                  icon={Receipt}
                  onClick={() => window.print()}
                >
                  Print / Save Receipt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
