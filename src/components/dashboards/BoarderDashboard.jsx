import React, { useState, useEffect } from 'react';
import { 
  Bed, 
  Building2, 
  DollarSign, 
  Send, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Utensils, 
  ShieldCheck, 
  Plus, 
  Receipt,
  AlertTriangle,
  Info
} from 'lucide-react';
import Card from '../common/Card';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import AvatarRenderer from '../Avatars/AvatarRenderer';
import { normalizeGender } from '../../constants/avatars';
import NextDayMealToggle from '../common/NextDayMealToggle';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../services/db';
import { mealAutomationService } from '../../services/mealAutomationService';

export default function BoarderDashboard() {
  const { userProfile, effectiveHostelId } = useAuth();

  const [myDeposits, setMyDeposits] = useState([]);
  const [approvedBazarExpenses, setApprovedBazarExpenses] = useState([]);

  const [financials, setFinancials] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [depositSuccess, setDepositSuccess] = useState('');

  // Deposit Form State
  const [newDeposit, setNewDeposit] = useState({
    depositType: 'Mess Fee Deposit',
    amount: '',
    paymentMethod: 'bKash / Mobile Banking',
    trxId: ''
  });

  useEffect(() => {
    loadData();

    // Listen for Superintendent master switch updates & deposit approvals
    const handleSettingsChange = () => {
      loadData();
    };
    const handleDepositsChange = () => {
      loadData();
    };
    window.addEventListener('pti_settings_changed', handleSettingsChange);
    window.addEventListener('pti_deposits_changed', handleDepositsChange);
    return () => {
      window.removeEventListener('pti_settings_changed', handleSettingsChange);
      window.removeEventListener('pti_deposits_changed', handleDepositsChange);
    };
  }, [effectiveHostelId, userProfile]);

  const loadData = () => {
    const roll = userProfile?.rollNumber || '103';

    // 1. Calculate dynamic financial metrics & balances
    const fin = mealAutomationService.getStudentFinancials(roll, effectiveHostelId, 'boarder_student');
    setFinancials(fin);

    // 2. Load Deposits
    setMyDeposits(dbService.getDeposits(d => String(d.rollNumber) === String(roll) || d.studentId === userProfile?.id));

    // 3. Load Transparent Approved Bazar Expenses
    setApprovedBazarExpenses(dbService.getBazarExpenses(b => b.hostelId === effectiveHostelId));
  };

  const handleDepositSubmit = (e) => {
    e.preventDefault();
    if (!newDeposit.amount || !newDeposit.trxId) return;

    const entry = {
      id: `DEP-${Date.now().toString().slice(-4)}`,
      hostelId: effectiveHostelId,
      studentId: userProfile?.id || 'boarder_103',
      studentName: userProfile?.name || 'Vikram Singh',
      rollNumber: userProfile?.rollNumber || '103',
      userType: 'boarder_student',
      roomNumber: userProfile?.roomNumber || '103',
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
    setNewDeposit({ depositType: 'Mess Fee Deposit', amount: '', paymentMethod: 'bKash / Mobile Banking', trxId: '' });

    setDepositSuccess(`Deposit slip of ৳${entry.amount} submitted successfully. Awaiting verification by Meal Manager or Hostel Super.`);
    setTimeout(() => setDepositSuccess(''), 4500);
  };

  // Format financial figures using strict color-coding
  const formattedMess = mealAutomationService.formatFinancialDisplay(
    financials?.netMessBalance ?? 0,
    financials?.mealCalculationsEnabled
  );

  const pendingDepositsCount = myDeposits.filter(d => d.status === 'pending').length;

  return (
    <div className="space-y-6">
      
      {/* Boarder Room Badge & Welcome Banner */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <AvatarRenderer
            avatarId={userProfile?.avatar_id}
            gender={userProfile?.gender}
            className="w-16 h-16 rounded-full border-2 border-teal-100 ring-2 ring-teal-500/20 shadow-sm"
          />

          {/* Distinctive Room Badge */}
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
            <span className="text-[10px] uppercase font-semibold tracking-wider opacity-90">Room</span>
            <span className="text-xl font-extrabold leading-none">{userProfile?.roomNumber || '103'}</span>
            <span className="text-[9px] font-mono mt-0.5 opacity-90">{userProfile?.bedNumber || 'Bed 2'}</span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-600">
                Residential Boarder (Tier 5)
              </span>
              <Badge variant="teal" size="sm">Roll: {userProfile?.rollNumber || '103'}</Badge>
              <Badge variant={normalizeGender(userProfile?.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                Gender: {normalizeGender(userProfile?.gender)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 mt-0.5">
              {userProfile?.name || 'Vikram Singh'}
            </h1>
            {userProfile?.designation && (
              <p className="text-sm font-medium text-gray-500 mt-1">{userProfile.designation}</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">
              {userProfile?.hostelName || 'Kazi Nazrul Hall'} • {userProfile?.wing || 'Block A (Junior)'}
            </p>
          </div>
        </div>

        <Button variant="primary" size="md" icon={Plus} onClick={() => setShowDepositModal(true)}>
          Submit Fee Deposit
        </Button>
      </div>

      {/* Financial Master Switch Warning if disabled by Superintendent */}
      {!financials?.mealCalculationsEnabled && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Superintendent Master Control: Mess meal calculations are temporarily paused for monthly audit.</span>
          </div>
          <Badge variant="neutral" size="sm">Audit Mode</Badge>
        </div>
      )}

      {/* Financial Status Cards with BENTO-BOX LAYOUT & ELEGANT ICONS (Strictly Mess & Meals) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Card 1: Mess Balance with Soft Circular Icon */}
        <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">Mess Account Balance</p>
              <div className="mt-2.5">
                <span className={`text-3xl font-bold tracking-tight ${
                  formattedMess.isSurplus === true ? 'text-emerald-600' :
                  formattedMess.isSurplus === false ? 'text-red-600' : 'text-slate-600'
                }`}>
                  {formattedMess.text}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400 font-normal">
                {formattedMess.subtext}
              </p>
              {financials?.mealCalculationsEnabled && (
                <p className="text-[10px] text-slate-400 font-mono pt-1">
                  Deposits: ৳{financials.totalMessDeposits} • Cost: ৳{financials.calculatedMealCost}
                </p>
              )}
            </div>

            <div className={`p-3 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 ${
              formattedMess.isSurplus === true ? 'bg-emerald-50 text-emerald-600' :
              formattedMess.isSurplus === false ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Dynamic Meal Rate Calculation */}
        <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">Dynamic Meal Rate</p>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-slate-800">
                  ৳ {financials?.mealRate || 65.0}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ meal</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400 font-normal">
                Formula: Total Bazar ÷ Total Meals
              </p>
              <p className="text-[10px] text-slate-400 font-mono pt-1">
                ৳{financials?.totalBazarExpenses?.toLocaleString()} ÷ {financials?.totalConsumedMeals} Meals
              </p>
            </div>

            <div className="p-3 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105">
              <Utensils className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: My Consumed Meals count */}
        <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">My Consumed Meals</p>
              <div className="mt-2.5">
                <span className="text-3xl font-bold tracking-tight text-slate-800">
                  {financials?.studentMealsCount || 0} Meals
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400 font-normal">
                Logged across daily meal sheets
              </p>
              <p className="text-[10px] text-teal-700 font-semibold pt-1">
                {pendingDepositsCount > 0 ? `${pendingDepositsCount} Deposit slips awaiting approval` : 'All slips processed'}
              </p>
            </div>

            <div className="p-3 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

      </div>

      {depositSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{depositSuccess}</span>
        </div>
      )}

      {/* SMART NEXT-DAY MEAL TOGGLE SWITCHES (Cut-Off & Auto-Carry Rules) */}
      <NextDayMealToggle
        hostelId={effectiveHostelId}
        rollNumber={userProfile?.rollNumber || '103'}
        userName={userProfile?.name || 'Vikram Singh'}
        userRole="boarder_student"
        onUpdate={() => loadData()}
      />

      {/* Transparent Daily Mess Bazar Purchases */}
      <Card
        title="Transparent Daily Mess Bazar Purchases"
        subtitle="Complete student visibility: Verified daily grocery and food purchases entered by the Meal Manager"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Date & Voucher</th>
                <th className="pb-3">Purchased Food & Groceries</th>
                <th className="pb-3">Entered By</th>
                <th className="pb-3 text-right pr-2">Total Amount (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvedBazarExpenses.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pl-2">
                    <p className="font-bold text-slate-900">{log.date}</p>
                    <span className="text-[11px] text-slate-400 font-mono">Voucher: {log.voucherNo}</span>
                  </td>
                  <td className="py-3 text-slate-700 max-w-md">
                    {log.itemsList}
                  </td>
                  <td className="py-3 text-slate-500 font-medium">
                    {log.managerName}
                  </td>
                  <td className="py-3 text-right pr-2 font-bold font-mono text-brand-700 text-sm">
                    ৳ {Number(log.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Personal Deposit History */}
      <Card
        title="My Deposit Submissions & Receipts"
        subtitle="Verification status and official audit trail of fees submitted to hostel management"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Deposit Slip</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Method & Trx ID</th>
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
                  <td className="py-3 font-bold font-mono text-brand-700 text-sm">
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
                          Approved by: {dep.approvedBy_name || dep.approvedBy?.replace(/Approved by:\s*/i, '').split('(')[0]?.trim() || 'Warden'} ({dep.approvedBy_role || (dep.depositType === 'Mess Fee Deposit' ? 'Meal Manager' : 'Hostel Super')})
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
                          ✕ {dep.approvedBy || 'Rejected by Warden / Approver'}
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
                          ⏳ Pending {dep.depositType === 'Mess Fee Deposit' ? 'Meal Manager / Super' : 'Hostel Monitor / Super'}
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

      {/* Modal: Deposit Entry Form */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-dropdown p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Submit Fee Deposit Slip</h3>
              <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Deposit Type</label>
                <select
                  value={newDeposit.depositType}
                  onChange={(e) => setNewDeposit({ ...newDeposit, depositType: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                >
                  <option>Mess Fee Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Amount Deposited (৳)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 3000"
                  value={newDeposit.amount}
                  onChange={(e) => setNewDeposit({ ...newDeposit, amount: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Channel</label>
                <select
                  value={newDeposit.paymentMethod}
                  onChange={(e) => setNewDeposit({ ...newDeposit, paymentMethod: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                >
                  <option>bKash / Mobile Banking</option>
                  <option>Nagad</option>
                  <option>Rocket</option>
                  <option>Bank Challan / Slip</option>
                  <option>Cash at Warden Office</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Transaction ID / Bank Challan No.</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRX982736481 or CHLN-881"
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
                  OFFICIAL STUDENT FEE RECEIPT
                </span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white">{selectedReceipt.depositType}</h3>
              <p className="text-xs text-teal-200/90 mt-0.5 font-mono">
                Receipt / Voucher No: {selectedReceipt.id}
              </p>
            </div>

            {/* Receipt Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Student & Hall Information */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Trainee / Boarder</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedReceipt.studentName}</p>
                  <p className="text-slate-500 font-mono mt-0.5">Roll: {selectedReceipt.rollNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Residential Allotment</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {userProfile?.hostelName || 'Kazi Nazrul Hall'}
                  </p>
                  <p className="text-slate-500 font-mono mt-0.5">Room: {selectedReceipt.roomNumber || '103'}</p>
                </div>
              </div>

              {/* Transaction Breakdown */}
              <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                <div className="p-3 flex justify-between items-center bg-white">
                  <span className="text-slate-500">Submitted Timestamp</span>
                  <span className="font-mono text-slate-700">{selectedReceipt.submittedAt}</span>
                </div>
                <div className="p-3 flex justify-between items-center bg-white">
                  <span className="text-slate-500">Payment Channel</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.paymentMethod}</span>
                </div>
                <div className="p-3 flex justify-between items-center bg-white">
                  <span className="text-slate-500">Transaction Reference / Challan ID</span>
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
                      ✓ {selectedReceipt.approvedBy || `Approved by: ${selectedReceipt.approvedBy_name || 'Authority'} (${selectedReceipt.approvedBy_role || (selectedReceipt.depositType === 'Mess Fee Deposit' ? 'Meal Manager' : 'Hostel Super')})`}
                    </p>
                    <p className="text-[11px] text-emerald-800/80 font-mono">
                      Sanctioned On: {selectedReceipt.approvedAt || 'Official Session'}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-medium pt-1">
                      Digital Audit Stamp: Transferred to active hostel ledger and credited to trainee's balance.
                    </p>
                  </div>
                ) : selectedReceipt.status === 'rejected' ? (
                  <div className="space-y-0.5 mt-2 text-xs">
                    <p className="font-semibold text-rose-950">{selectedReceipt.approvedBy || 'Rejected by Warden / Approver'}</p>
                    <p className="text-[11px] text-rose-800/80">Please verify transaction reference with office or re-submit.</p>
                  </div>
                ) : (
                  <div className="space-y-0.5 mt-2 text-xs">
                    <p className="font-medium text-amber-950">
                      Awaiting verification by: <strong>{selectedReceipt.depositType === 'Mess Fee Deposit' ? 'Meal Manager or Hostel Super' : 'Hostel Monitor or Hostel Super'}</strong>
                    </p>
                    <p className="text-[11px] text-amber-800/80">Funds will be unlocked upon step 2 administrative authorization.</p>
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
