import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Send, 
  DollarSign, 
  FileText, 
  Building2, 
  AlertCircle,
  Check,
  X,
  Receipt,
  Utensils
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

export default function HostelMonitorDashboard() {
  const { userProfile, effectiveHostelId } = useAuth();
  
  const [expenses, setExpenses] = useState([]);
  const [pendingEstDeposits, setPendingEstDeposits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [depositActionMessage, setDepositActionMessage] = useState('');

  // Establishment Expense Entry Form State (Defaults to 'pending')
  const [newExpense, setNewExpense] = useState({
    title: '',
    category: 'Plumbing & Utilities',
    amount: '',
    vendor: '',
    voucherNo: '',
    notes: '',
  });

  // Self Fee Deposit Modal State (T3 Hostel Monitor pays personal boarder fees)
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState('');
  const [newDeposit, setNewDeposit] = useState({
    depositType: 'Establishment Fee Deposit',
    amount: '',
    paymentMethod: 'bKash / Mobile Banking',
    trxId: ''
  });

  useEffect(() => {
    loadHostelData();

    const handleDepositsChanged = () => {
      loadHostelData();
    };
    window.addEventListener('pti_deposits_changed', handleDepositsChanged);
    return () => window.removeEventListener('pti_deposits_changed', handleDepositsChanged);
  }, [effectiveHostelId]);

  const loadHostelData = () => {
    // 1. Load establishment expenses
    setExpenses(dbService.getEstablishmentExpenses(e => e.hostelId === effectiveHostelId));

    // 2. Load Pending Establishment Fee Deposits for this hostel (ONLY Hostel Monitor and Hostel Super authorized)
    setPendingEstDeposits(dbService.getDeposits(d =>
      d.hostelId === effectiveHostelId &&
      d.depositType === 'Establishment Fee Deposit' &&
      d.status === 'pending'
    ));
  };

  const handleEstDepositDecision = (id, decision) => {
    const { updated } = dbService.updateDepositDecision(id, decision, {
      id: userProfile?.id || userProfile?.loginId || 'monitor_101',
      name: userProfile?.name || 'Aarav Patel',
      role: 'Hostel Monitor'
    });
    setPendingEstDeposits(updated.filter(d => 
      d.hostelId === effectiveHostelId && 
      d.depositType === 'Establishment Fee Deposit' && 
      d.status === 'pending'
    ));

    setDepositActionMessage(`Establishment Deposit ${id} has been ${decision.toUpperCase()} by Hostel Monitor.`);
    setTimeout(() => setDepositActionMessage(''), 3500);
  };

  const handleDepositSubmit = (e) => {
    e.preventDefault();
    if (!newDeposit.amount || !newDeposit.trxId) return;

    const entry = {
      id: `DEP-${Date.now().toString().slice(-4)}`,
      hostelId: effectiveHostelId,
      studentId: userProfile?.id || userProfile?.loginId || 'monitor_101',
      studentName: userProfile?.name || 'Aarav Patel',
      rollNumber: userProfile?.rollNumber || '101',
      userType: 'hostel_monitor',
      roomNumber: userProfile?.roomNumber || '101',
      depositType: newDeposit.depositType,
      amount: Number(newDeposit.amount),
      paymentMethod: newDeposit.paymentMethod,
      trxId: newDeposit.trxId,
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending',
      approvedBy: null,
      approvedAt: null
    };

    const updated = dbService.insertDeposit(entry);

    // Refresh pending establishment deposits in state if Establishment Fee Deposit
    const pending = updated.filter(d => 
      d.hostelId === effectiveHostelId && 
      d.depositType === 'Establishment Fee Deposit' && 
      d.status === 'pending'
    );
    setPendingEstDeposits(pending);

    setShowDepositModal(false);
    setNewDeposit({ depositType: 'Establishment Fee Deposit', amount: '', paymentMethod: 'bKash / Mobile Banking', trxId: '' });

    const approvers = entry.depositType === 'Establishment Fee Deposit'
      ? 'Hostel Monitor (You may self-approve below) or Hostel Super'
      : 'Meal Manager or Hostel Super';
    setDepositSuccess(`Deposit slip of ৳${entry.amount} (${entry.depositType}) submitted successfully under Roll ${entry.rollNumber}. Awaiting verification by ${approvers}.`);
    setTimeout(() => setDepositSuccess(''), 5000);
  };

  const handleSubmitExpense = (e) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;

    const entry = {
      id: `EXP-${Date.now().toString().slice(-4)}`,
      hostelId: effectiveHostelId,
      title: newExpense.title,
      category: newExpense.category,
      amount: Number(newExpense.amount),
      vendor: newExpense.vendor || 'Local Vendor',
      voucherNo: newExpense.voucherNo || `V-${Date.now().toString().slice(-4)}`,
      notes: newExpense.notes,
      enteredBy: `${userProfile?.name} (Monitor)`,
      enteredById: userProfile?.id || 'monitor_101',
      enteredAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending', // Explicit 'pending' status for Step 2 approval by Hostel Super
      approvedBy: null,
      approvedAt: null
    };

    const updated = dbService.insertEstablishmentExpense(entry);
    setExpenses(updated.filter(exp => exp.hostelId === effectiveHostelId));

    setSuccessMessage(`Expense entry "${entry.title}" submitted successfully with PENDING status. Forwarded to Hostel Super for Step 2 authorization.`);
    setShowForm(false);
    setNewExpense({ title: '', category: 'Plumbing & Utilities', amount: '', vendor: '', voucherNo: '', notes: '' });
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const approvedTotal = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <AvatarRenderer
            avatarId={userProfile?.avatar_id}
            gender={userProfile?.gender}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-200 ring-2 ring-teal-500/20 shadow-sm"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Hostel Monitor Operations (Tier 3)
              </span>
              <Badge variant="teal" size="sm">Hall: {userProfile?.hostelName || 'Kazi Nazrul Hall'}</Badge>
              <Badge variant={normalizeGender(userProfile?.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                Gender: {normalizeGender(userProfile?.gender)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 mt-1">
              Hostel Maintenance & Establishment Logs
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as Elected Monitor <strong>{userProfile?.name}</strong> (Roll: {userProfile?.rollNumber || '101'})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button 
            variant="secondary" 
            size="md" 
            icon={Plus} 
            onClick={() => setShowDepositModal(true)}
          >
            Submit Fee Deposit
          </Button>
          <Button 
            variant="primary" 
            size="md" 
            icon={Plus} 
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Close Entry Form' : 'New Establishment Expense'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {(() => {
        const myPersonalMeals = mealAutomationService.getUserPersonalConsumedMeals(userProfile, effectiveHostelId);
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="My Consumed Meals"
                value={`${myPersonalMeals} Meals`}
                subtitle="Hall Monitor dining attendance"
                change="Personal Account"
                changeType="positive"
                icon={Utensils}
              />
              <StatCard
                title="Pending Approvals"
                value={`${pendingCount} Vouchers`}
                subtitle="Awaiting Hostel Super approval"
                change="Pending Step 2"
                changeType={pendingCount > 0 ? "negative" : "positive"}
                icon={Clock}
              />
              <StatCard
                title="Sanctioned Total"
                value={`৳ ${approvedTotal.toLocaleString()}`}
                subtitle="Approved establishment funds"
                change="Approved by Super"
                changeType="positive"
                icon={DollarSign}
              />
              <StatCard
                title="All Submissions"
                value={`${expenses.length} Records`}
                subtitle="In this assigned hostel hall"
                change="Isolated to Hall"
                changeType="neutral"
                icon={FileText}
              />
              <StatCard
                title="Assigned Quarters"
                value={`Room ${userProfile?.roomNumber || '101'}`}
                subtitle="Monitor residential station"
                change="Active Duty"
                changeType="positive"
                icon={Building2}
              />
            </div>

            {/* Universal Daily Meal Choice Bento Card (T3 Hostel Monitor) */}
            <NextDayMealToggle
              hostelId={effectiveHostelId}
              rollNumber={userProfile?.rollNumber || '101'}
              userName={userProfile?.name || 'Aarav Patel (Hostel Monitor)'}
              userRole="hostel_monitor"
              onUpdate={() => loadHostelExpenses()}
            />
          </>
        );
      })()}

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {depositActionMessage && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span>{depositActionMessage}</span>
        </div>
      )}

      {depositSuccess && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span>{depositSuccess}</span>
        </div>
      )}

      {/* DEDICATED SECTION: PENDING ESTABLISHMENT DEPOSITS APPROVAL QUEUE (Tier 3 Authority) */}
      <Card
        title={`Pending Establishment Deposits Queue (${pendingEstDeposits.length})`}
        subtitle="Tier 3 & Tier 2 exclusive authorization to audit and verify student maintenance and hostel fee deposits"
        action={
          <Badge variant={pendingEstDeposits.length > 0 ? "warning" : "success"} size="sm">
            {pendingEstDeposits.length} Awaiting Verification
          </Badge>
        }
      >
        {pendingEstDeposits.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">All Establishment Deposits Verified</p>
            <p className="text-slate-500 text-xs mt-0.5">No pending establishment deposit slips awaiting verification in this hall.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingEstDeposits.map((dep) => (
              <div key={dep.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{dep.studentName}</span>
                    <Badge variant="teal" size="sm">Roll: {dep.rollNumber}</Badge>
                    <Badge variant="neutral" size="sm">
                      {dep.userType === 'boarder_student' ? `Room ${dep.roomNumber || 'Quarters'}` : 'Non-Boarder Day Scholar'}
                    </Badge>
                    <span className="text-sm font-bold font-mono text-emerald-700">
                      ৳ {Number(dep.amount).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-800">{dep.depositType}</strong> • Method: {dep.paymentMethod} • <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">Trx: {dep.trxId}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Slip ID: <span className="font-mono">{dep.id}</span> • Submitted: {dep.submittedAt}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleEstDepositDecision(dep.id, 'rejected')}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEstDepositDecision(dep.id, 'approved')}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    Verify & Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Establishment Expense Entry Form (Explicit 'pending' status) */}
      {showForm && (
        <Card
          title="Log Establishment Maintenance Expense"
          subtitle="Entries are automatically registered with 'pending' status for Hostel Super's verification"
        >
          <form onSubmit={handleSubmitExpense} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Expense Title / Item</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dining Hall Water Filter Candle Replacement"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Maintenance Category</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                >
                  <option>Plumbing & Utilities</option>
                  <option>Electrical Supplies</option>
                  <option>Sanitation & Cleaning</option>
                  <option>Carpentry & Furniture</option>
                  <option>Wi-Fi & Network Hardware</option>
                  <option>Miscellaneous Emergency Repair</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Total Amount (৳)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 1500"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Vendor / Store Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bismillah Hardware"
                  value={newExpense.vendor}
                  onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Memo / Cash Voucher No.</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MEMO-9912"
                  value={newExpense.voucherNo}
                  onChange={(e) => setNewExpense({ ...newExpense, voucherNo: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:border-brand-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Detailed Work Notes / Justification</label>
              <textarea
                rows={2}
                required
                placeholder="Explain the necessity of this expenditure for the hostel quarters..."
                value={newExpense.notes}
                onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-amber-700 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Will be submitted with <strong>'pending'</strong> status for Hostel Super's sign-off.
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" icon={Send}>
                  Submit Expense for Approval
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Submitted Expenses Log with Status */}
      <Card
        title="Hostel Establishment Expense History"
        subtitle="Transparent audit log of all repair, maintenance, and utility claims"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Voucher ID & Description</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Vendor / Memo</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3 text-center">Approval Status</th>
                <th className="pb-3 text-right pr-2">Sanctioned By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pl-2">
                    <p className="font-bold text-slate-900">{exp.title}</p>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {exp.id} • Submitted: {exp.enteredAt}
                    </span>
                  </td>
                  <td className="py-3">
                    <Badge variant="teal" size="sm">{exp.category}</Badge>
                  </td>
                  <td className="py-3 text-slate-600">
                    {exp.vendor} <span className="text-slate-400 font-mono text-[11px]">({exp.voucherNo})</span>
                  </td>
                  <td className="py-3 font-bold font-mono text-slate-900">
                    ৳ {Number(exp.amount).toLocaleString()}
                  </td>
                  <td className="py-3 text-center">
                    <Badge 
                      variant={
                        exp.status === 'approved' ? 'success' :
                        exp.status === 'rejected' ? 'danger' : 'warning'
                      } 
                      size="sm"
                    >
                      {exp.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 text-right pr-2 text-slate-500 text-[11px]">
                    {exp.approvedBy ? (
                      <span className="text-emerald-700 font-medium">✓ {exp.approvedBy}</span>
                    ) : (
                      <span className="text-amber-700 font-medium">⏳ Awaiting Hostel Super</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Submit Fee Deposit Slip (T3 Hostel Monitor Pays Personal Fees) */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-dropdown p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Submit Fee Deposit Slip</h3>
                <p className="text-xs text-slate-500">Boarder Fee Deposit for {userProfile?.name} (Roll: {userProfile?.rollNumber || '101'})</p>
              </div>
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
                  <option>Establishment Fee Deposit</option>
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

    </div>
  );
}
