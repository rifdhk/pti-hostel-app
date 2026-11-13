import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2, 
  Users, 
  CheckSquare, 
  Bed, 
  Check, 
  X, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileCheck,
  UserCheck,
  FileSpreadsheet,
  Download,
  Utensils,
  Wrench,
  Edit3,
  Calendar,
  Search,
  Filter,
  ShieldCheck,
  Trash2,
  Receipt
} from 'lucide-react';
import Card from '../common/Card';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import AvatarRenderer from '../Avatars/AvatarRenderer';
import { normalizeGender } from '../../constants/avatars';
import UserEditModal from '../common/UserEditModal';
import UserDeleteConfirmModal from '../common/UserDeleteConfirmModal';
import UserProfileModal from '../common/UserProfileModal';
import NextDayMealToggle from '../common/NextDayMealToggle';
import FeeDepositModal from '../common/FeeDepositModal';
import { useAuth, USER_ROLES } from '../../contexts/AuthContext';
import { dbService } from '../../services/db';
import { mealAutomationService } from '../../services/mealAutomationService';
import {
  exportMealFinancialReportExcel,
  exportMealFinancialReportPDF,
  exportEstablishmentLedgerExcel,
  exportEstablishmentLedgerPDF,
  exportDepositLedgerExcel,
  exportDepositLedgerPDF,
  exportUserDirectoryExcel,
  exportUserDirectoryPDF,
  exportMealLedgerMatrixExcel,
  exportMealLedgerMatrixPDF,
  getUserFinancialStatus
} from '../../utils/exportReports';

export default function HostelSuperDashboard() {
  const { t } = useTranslation();
  const { userProfile, effectiveHostelId, effectivePtiId, adminDeleteUser } = useAuth();

  const currentMonth = mealAutomationService.getCurrentMonth();
  const monthDisplayName = mealAutomationService.getMonthDisplayName(currentMonth);
  const [isOptedIn, setIsOptedIn] = useState(() => mealAutomationService.hasSuperOptedInToMeals(userProfile, currentMonth));
  const [showDepositModal, setShowDepositModal] = useState(false);
  const isDepositDisabled = !isOptedIn;

  const handleToggleOptIn = () => {
    const next = !isOptedIn;
    mealAutomationService.setSuperMealOptIn(userProfile, next, currentMonth);
    setIsOptedIn(next);
    setDecisionSuccess(next 
      ? `Hostel Super dining activated for ${monthDisplayName}. "Submit Fee Deposit" button is now ACTIVE.`
      : `Hostel Super dining paused for ${monthDisplayName}. "Submit Fee Deposit" button is now DISABLED.`
    );
    setTimeout(() => setDecisionSuccess(''), 4500);
  };

  const ROLE_DEFINITIONS = [
    { id: USER_ROLES.SUPERINTENDENT, label: t('roles.superintendent') },
    { id: USER_ROLES.HOSTEL_SUPER, label: t('roles.hostel_super') },
    { id: USER_ROLES.HOSTEL_MONITOR, label: t('roles.hostel_monitor') },
    { id: USER_ROLES.MEAL_MANAGER, label: t('roles.meal_manager') },
    { id: USER_ROLES.BOARDER_STUDENT, label: t('roles.boarder_student') },
    { id: USER_ROLES.NON_BOARDER_STUDENT, label: t('roles.non_boarder_student') },
  ];
  
  // State for hostel-specific collections
  const [hostelInfo, setHostelInfo] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [hostelUsers, setHostelUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-Checkbox Role Filter & Export State
  const ALL_ROLE_KEYS = [
    USER_ROLES.SUPERINTENDENT,
    USER_ROLES.HOSTEL_SUPER,
    USER_ROLES.HOSTEL_MONITOR,
    USER_ROLES.MEAL_MANAGER,
    USER_ROLES.BOARDER_STUDENT,
    USER_ROLES.NON_BOARDER_STUDENT,
  ];
  const [selectedRoles, setSelectedRoles] = useState(ALL_ROLE_KEYS);
  const [expenses, setExpenses] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [bazarExpenses, setBazarExpenses] = useState([]);
  const [mealSheets, setMealSheets] = useState([]);
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      if (adminDeleteUser) {
        await adminDeleteUser(deletingUser.id || deletingUser.rollNumber || deletingUser.loginId);
      }
      const deletedName = deletingUser.name;
      setDeletingUser(null);
      loadHostelData();
      setExportSuccessMsg(`Resident ${deletedName} successfully removed.`);
      setTimeout(() => setExportSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Delete error in Hostel Super:', err);
      alert('Failed to delete resident: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Date Range Filtering for Financial Reports
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Active queue tab: 'deposits' | 'expenses'
  const [activeQueueTab, setActiveQueueTab] = useState('deposits');
  const [depositFilterType, setDepositFilterType] = useState('all'); // 'all' | 'mess' | 'establishment'
  const [decisionSuccess, setDecisionSuccess] = useState('');

  useEffect(() => {
    loadHostelData();
    const handleUsersChanged = () => loadHostelData();
    const handleDepositsChanged = () => loadHostelData();
    const handleHostelsChanged = () => loadHostelData();
    const handleMealsChanged = () => {
      setIsOptedIn(mealAutomationService.hasSuperOptedInToMeals(userProfile, currentMonth));
    };

    window.addEventListener('pti_users_changed', handleUsersChanged);
    window.addEventListener('pti_deposits_changed', handleDepositsChanged);
    window.addEventListener('pti_hostels_changed', handleHostelsChanged);
    window.addEventListener('pti_meals_changed', handleMealsChanged);
    window.addEventListener('pti_super_opt_in_changed', handleMealsChanged);

    return () => {
      window.removeEventListener('pti_users_changed', handleUsersChanged);
      window.removeEventListener('pti_deposits_changed', handleDepositsChanged);
      window.removeEventListener('pti_hostels_changed', handleHostelsChanged);
      window.removeEventListener('pti_meals_changed', handleMealsChanged);
      window.removeEventListener('pti_super_opt_in_changed', handleMealsChanged);
    };
  }, [effectiveHostelId, userProfile, currentMonth]);

  const loadHostelData = () => {
    // 1. Load Hostels & pick this assigned hostel
    const allH = dbService.getHostels();
    setHostelInfo(allH.find(h => h.id === effectiveHostelId) || allH[0]);

    // 2. Load Rooms isolated by hostelId
    setRooms(dbService.getRooms(r => r.hostelId === effectiveHostelId));

    // 3. Load Users isolated by hostelId
    setHostelUsers(dbService.getUsers(u => u.hostelId === effectiveHostelId));

    // 4. Load Establishment Expenses isolated by hostelId
    setExpenses(dbService.getEstablishmentExpenses(e => e.hostelId === effectiveHostelId));

    // 5. Load Deposits isolated by hostelId
    setDeposits(dbService.getDeposits(d => d.hostelId === effectiveHostelId));

    // 6. Load Bazar & Meals for financial statements
    setBazarExpenses(dbService.getBazarExpenses(b => b.hostelId === effectiveHostelId));
    setMealSheets(dbService.getMealSheets(m => m.hostelId === effectiveHostelId));

    // 7. Update Super meal opt-in status
    setIsOptedIn(mealAutomationService.hasSuperOptedInToMeals(userProfile, currentMonth));
  };

  // Dynamic calculations for reporting
  const currentRate = mealAutomationService.calculateHostelMealRate(effectiveHostelId);
  const currentHallName = hostelInfo?.name || 'Assigned Hall';

  const filterByDateRange = (items, dateGetter = (item) => item.date || item.enteredAt) => {
    if (!reportStartDate && !reportEndDate) return items;
    return items.filter(item => {
      const rawDate = dateGetter(item);
      if (!rawDate) return true;
      const dateStr = String(rawDate).substring(0, 10);
      if (reportStartDate && dateStr < reportStartDate) return false;
      if (reportEndDate && dateStr > reportEndDate) return false;
      return true;
    });
  };

  const getFinancialDateRangeLabel = () => {
    if (reportStartDate && reportEndDate) return `Financial Report from ${reportStartDate} to ${reportEndDate}`;
    if (reportStartDate) return `Financial Report from ${reportStartDate} onwards`;
    if (reportEndDate) return `Financial Report up to ${reportEndDate}`;
    return 'Financial Report - Full Academic Session (All Time)';
  };

  const getFilteredMealData = () => {
    const filteredBazar = filterByDateRange(bazarExpenses, b => b.date || b.enteredAt);
    const filteredMeals = filterByDateRange(mealSheets, m => m.date);

    const totalBazar = filteredBazar.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    let totalMeals = 0;
    filteredMeals.forEach(sheet => {
      if (sheet.records && Array.isArray(sheet.records)) {
        sheet.records.forEach(r => {
          totalMeals += (r.breakfast ? 1 : 0) + (r.lunch ? 1 : 0) + (r.dinner ? 1 : 0);
        });
      } else {
        totalMeals += Number(sheet.totalMealsCount || 0);
      }
    });

    const safeMeals = Math.max(totalMeals, 1);
    const dynamicRate = {
      totalBazarExpenses: totalBazar,
      totalConsumedMeals: totalMeals,
      mealRate: totalMeals > 0 ? parseFloat((totalBazar / safeMeals).toFixed(2)) : currentRate.mealRate
    };

    return {
      filteredBazar,
      filteredMeals,
      dynamicRate,
      dateRangeLabel: getFinancialDateRangeLabel()
    };
  };

  const handleExportMealExcel = () => {
    const { filteredBazar, filteredMeals, dynamicRate, dateRangeLabel } = getFilteredMealData();
    exportMealFinancialReportExcel(
      currentHallName,
      dateRangeLabel,
      filteredBazar,
      filteredMeals,
      hostelUsers,
      dynamicRate
    );
    setExportSuccessMsg(`Downloaded Meal Financial Statement (.xlsx) for ${currentHallName}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportMealPDF = () => {
    const { filteredBazar, filteredMeals, dynamicRate, dateRangeLabel } = getFilteredMealData();
    exportMealFinancialReportPDF(
      currentHallName,
      dateRangeLabel,
      filteredBazar,
      filteredMeals,
      hostelUsers,
      dynamicRate
    );
    setExportSuccessMsg(`Downloaded Meal Financial Statement (.pdf) for ${currentHallName}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportEstablishmentExcel = () => {
    const filteredExpenses = filterByDateRange(expenses, e => e.enteredAt || e.date);
    const dateRangeLabel = reportStartDate && reportEndDate 
      ? `Establishment Expense Ledger from ${reportStartDate} to ${reportEndDate}`
      : (reportStartDate ? `Establishment Expense Ledger from ${reportStartDate} onwards` : (reportEndDate ? `Establishment Expense Ledger up to ${reportEndDate}` : 'Current Fiscal Session (All Time)'));

    exportEstablishmentLedgerExcel(
      currentHallName,
      dateRangeLabel,
      filteredExpenses
    );
    setExportSuccessMsg(`Downloaded Establishment Expense Ledger (.xlsx) for ${currentHallName}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportEstablishmentPDF = () => {
    const filteredExpenses = filterByDateRange(expenses, e => e.enteredAt || e.date);
    const dateRangeLabel = reportStartDate && reportEndDate 
      ? `Establishment Expense Ledger from ${reportStartDate} to ${reportEndDate}`
      : (reportStartDate ? `Establishment Expense Ledger from ${reportStartDate} onwards` : (reportEndDate ? `Establishment Expense Ledger up to ${reportEndDate}` : 'Current Fiscal Session (All Time)'));

    exportEstablishmentLedgerPDF(
      currentHallName,
      dateRangeLabel,
      filteredExpenses
    );
    setExportSuccessMsg(`Downloaded Establishment Expense Ledger (.pdf) for ${currentHallName}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportDepositsExcel = () => {
    const filteredDeposits = filterByDateRange(deposits, d => d.submittedAt);
    const dateRangeLabel = reportStartDate && reportEndDate 
      ? `Student Deposits Ledger from ${reportStartDate} to ${reportEndDate}`
      : (reportStartDate ? `Student Deposits Ledger from ${reportStartDate} onwards` : (reportEndDate ? `Student Deposits Ledger up to ${reportEndDate}` : 'Academic Term (All Time)'));

    exportDepositLedgerExcel(
      currentHallName,
      dateRangeLabel,
      filteredDeposits
    );
    setExportSuccessMsg(`Downloaded Student Deposits Audit Ledger (.xlsx) for ${currentHallName}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportDepositsPDF = () => {
    const filteredDeposits = filterByDateRange(deposits, d => d.submittedAt);
    const dateRangeLabel = reportStartDate && reportEndDate 
      ? `Student Deposits Ledger from ${reportStartDate} to ${reportEndDate}`
      : (reportStartDate ? `Student Deposits Ledger from ${reportStartDate} onwards` : (reportEndDate ? `Student Deposits Ledger up to ${reportEndDate}` : 'Academic Term (All Time)'));

    exportDepositLedgerPDF(
      currentHallName,
      dateRangeLabel,
      filteredDeposits
    );
    setExportSuccessMsg(`Downloaded Student Deposits Audit Ledger (.pdf) for ${currentHallName}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportMealMatrixExcel = () => {
    exportMealLedgerMatrixExcel(
      currentHallName,
      { startDate: reportStartDate, endDate: reportEndDate },
      mealSheets,
      hostelUsers
    );
    setExportSuccessMsg(`Downloaded Date-Wise Meal Ledger Matrix (.xlsx) for ${currentHallName}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportMealMatrixPDF = () => {
    exportMealLedgerMatrixPDF(
      currentHallName,
      { startDate: reportStartDate, endDate: reportEndDate },
      mealSheets,
      hostelUsers
    );
    setExportSuccessMsg(`Downloaded Date-Wise Meal Ledger Matrix (.pdf) for ${currentHallName}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  // Multi-Checkbox Role Sync Handlers
  const isAllRolesSelected = ALL_ROLE_KEYS.every(r => selectedRoles.includes(r));

  const handleToggleAllRoles = () => {
    if (isAllRolesSelected) {
      setSelectedRoles([]);
    } else {
      setSelectedRoles(ALL_ROLE_KEYS);
    }
  };

  const handleToggleRole = (roleKey) => {
    if (selectedRoles.includes(roleKey)) {
      setSelectedRoles(selectedRoles.filter(r => r !== roleKey));
    } else {
      setSelectedRoles([...selectedRoles, roleKey]);
    }
  };

  // Filtered resident directory for active hall respecting multi-checkbox selected roles
  const filteredHostelUsers = hostelUsers.filter(u => {
    const uRole = u?.role || '';
    const matchesRole = selectedRoles.includes(uRole) || (selectedRoles.includes(USER_ROLES.BOARDER_STUDENT) && uRole === 'boarder');
    const uName = (u?.name || '').toLowerCase();
    const uLogin = (u?.loginId || '').toLowerCase();
    const uRoll = (u?.rollNumber != null ? String(u.rollNumber) : '').toLowerCase();
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch = uName.includes(term) || uLogin.includes(term) || uRoll.includes(term);
    return matchesRole && matchesSearch;
  });

  const getDirectoryExportScope = () => {
    if (isAllRolesSelected) return `${currentHallName} (All Roles)`;
    const roleLabels = selectedRoles.map(r => r.replace('_', ' ').toUpperCase());
    return `${currentHallName} (${roleLabels.join(', ') || 'No Roles'})`;
  };

  // Directory Export Handlers (Excel & PDF with Role Filter & Financials)
  const handleExportUserExcel = () => {
    if (filteredHostelUsers.length === 0) {
      alert('Please check at least one role checkbox to export records.');
      return;
    }
    const scope = getDirectoryExportScope();
    exportUserDirectoryExcel(filteredHostelUsers, scope);
    setExportSuccessMsg(`Exported ${filteredHostelUsers.length} residents to Excel (.xlsx)`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportUserPDF = () => {
    if (filteredHostelUsers.length === 0) {
      alert('Please check at least one role checkbox to export records.');
      return;
    }
    const scope = getDirectoryExportScope();
    exportUserDirectoryPDF(filteredHostelUsers, scope);
    setExportSuccessMsg(`Exported ${filteredHostelUsers.length} residents to PDF (.pdf)`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  // Two-Step Approval Handler: Student Deposits (Master Override for both Mess & Establishment Queues)
  const handleDepositDecision = (id, decision) => {
    const { updated } = dbService.updateDepositDecision(id, decision, {
      id: userProfile?.id || userProfile?.loginId || 'hostel_super',
      name: userProfile?.name || 'Dr. Anand Verma',
      role: 'Hostel Super'
    });
    setDeposits(updated.filter(d => d.hostelId === effectiveHostelId));

    setDecisionSuccess(`Deposit slip ${id} marked as ${decision.toUpperCase()} by Hostel Super.`);
    setTimeout(() => setDecisionSuccess(''), 2500);
  };

  // Two-Step Approval Handler: Monitor Expense Entries
  const handleExpenseDecision = (id, decision) => {
    const { updated } = dbService.updateEstablishmentExpenseDecision(
      id,
      decision,
      `${userProfile?.name} (Hostel Super)`
    );
    setExpenses(updated.filter(e => e.hostelId === effectiveHostelId));
    setDecisionSuccess(`Establishment Expense ${id} marked as ${decision.toUpperCase()}`);
    setTimeout(() => setDecisionSuccess(''), 2500);
  };

  // Pending counts for two-step queue
  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const pendingExpenses = expenses.filter(e => e.status === 'pending');

  const totalOccupiedBeds = rooms.reduce((sum, r) => sum + (r.occupied || 0), 0);
  const totalBedsCapacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header with strict isolation badge */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <AvatarRenderer
            avatarId={userProfile?.avatar_id}
            gender={userProfile?.gender}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-teal-200 ring-2 ring-teal-500/20 shadow-sm"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-600">
                Hostel Super Administration (Tier 2)
              </span>
              <Badge variant="teal" size="sm">Strict Isolation: {hostelInfo?.name || 'Assigned Hall'}</Badge>
              <Badge variant={normalizeGender(userProfile?.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                Gender: {normalizeGender(userProfile?.gender)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 mt-1">
              {hostelInfo?.name || 'Hall Operations Command'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Overseeing residential allocations, student fee verification, and monitor establishment expense authorizations.
            </p>
          </div>
        </div>

        <div className="flex flex-row gap-4 items-center flex-wrap sm:flex-nowrap">
          {/* Submit Fee Deposit - Dynamic for Super */}
          <button
            type="button"
            disabled={isDepositDisabled}
            onClick={() => setShowDepositModal(true)}
            title={isDepositDisabled ? `Fee deposit is disabled: You have not opted in to eat meals for ${monthDisplayName}.` : "Submit personal fee deposit slip"}
            className={`px-4 py-2 text-sm font-medium rounded-md font-heading inline-flex items-center gap-2 transition-all shadow-sm ${
              isDepositDisabled
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : 'bg-brand-gold hover:bg-yellow-600 text-white'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Submit Fee Deposit</span>
          </button>

          {/* Monthly Meal Status Opt-In Toggle */}
          <button
            type="button"
            onClick={handleToggleOptIn}
            title={isOptedIn ? `Currently opted in for ${monthDisplayName} meals. Click to pause dining.` : `Click to opt in and start meals for ${monthDisplayName}.`}
            className={`px-4 py-2 text-sm font-medium rounded-md font-heading inline-flex items-center gap-2 transition-all shadow-sm border ${
              isOptedIn
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Utensils className="w-4 h-4 text-brand-teal" />
            <span>{isOptedIn ? `Dining Active (${monthDisplayName})` : `Start Meals (${monthDisplayName})`}</span>
          </button>
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
                subtitle="Hostel Super dining attendance"
                change="Hall Super"
                changeType="positive"
                icon={Utensils}
              />
              <StatCard
                title="Two-Step Pending Queue"
                value={`${pendingDeposits.length + pendingExpenses.length} Action Items`}
                subtitle={`${pendingDeposits.length} Deposits • ${pendingExpenses.length} Expenses`}
                change="Action Required"
                changeType={pendingDeposits.length + pendingExpenses.length > 0 ? "negative" : "positive"}
                icon={CheckSquare}
              />
              <StatCard
                title="Hall Room Occupancy"
                value={`${totalOccupiedBeds} / ${totalBedsCapacity} Beds`}
                subtitle={`${totalBedsCapacity - totalOccupiedBeds} Vacant beds available`}
                change="Real-time count"
                changeType="neutral"
                icon={Bed}
              />
              <StatCard
                title="Enrolled Hall Residents"
                value={`${hostelUsers.length} Students`}
                subtitle="Monitors, Managers & Boarders"
                change="Assigned to Hall"
                changeType="positive"
                icon={Users}
              />
              <StatCard
                title="Verified Deposits"
                value={`৳ ${deposits.filter(d => d?.status === 'approved').reduce((s, d) => s + (Number(d?.amount) || 0), 0).toLocaleString()}`}
                subtitle="Total approved student funds"
                change="Step 2 Verified"
                changeType="positive"
                icon={DollarSign}
              />
            </div>

            {/* Universal Daily Meal Choice Bento Card (T2 Hostel Super) */}
            <NextDayMealToggle
              hostelId={effectiveHostelId}
              rollNumber={userProfile?.rollNumber || userProfile?.loginId || 'hostel_super'}
              userName={userProfile?.name || 'Dr. Anand (Hostel Super)'}
              userRole="hostel_super"
              onUpdate={() => loadHostelData()}
            />
          </>
        );
      })()}

      {decisionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{decisionSuccess}</span>
        </div>
      )}

      {exportSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{exportSuccessMsg}</span>
          </div>
          <button onClick={() => setExportSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* PROMINENT HOSTEL FINANCIAL REPORTS EXPORT */}
      <Card
        title="Hall Financial Management & Audit Reports Export"
        subtitle={`Official financial statements and establishment expenditure ledgers for ${currentHallName}`}
      >
        {/* Date Range Picker Bar */}
        <div className="mb-4 p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span>Report Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-slate-500">From:</label>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-slate-500">To:</label>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50/50"
              />
            </div>
            {(reportStartDate || reportEndDate) && (
              <button
                onClick={() => {
                  setReportStartDate('');
                  setReportEndDate('');
                }}
                className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Clear Dates
              </button>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {reportStartDate && reportEndDate ? (
              <span className="text-brand-700 font-semibold">Filtering: {reportStartDate} to {reportEndDate}</span>
            ) : reportStartDate ? (
              <span className="text-brand-700 font-semibold">Filtering from {reportStartDate}</span>
            ) : reportEndDate ? (
              <span className="text-brand-700 font-semibold">Filtering up to {reportEndDate}</span>
            ) : (
              <span>Showing all-time records (Select dates to filter reports)</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Report 1: Meal Financial Statement & Matrix */}
          <div className="p-4 md:p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-teal-50/20 space-y-3.5 flex flex-col justify-between">
            <div>
              <Badge variant="teal" size="sm">REPORT 01</Badge>
              <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-brand-600" />
                Meal Financial Statement & Matrix
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Total Meals: <strong>{currentRate.totalConsumedMeals}</strong> • Bazar: <strong>৳ {currentRate.totalBazarExpenses.toLocaleString()}</strong> • Live Rate: <strong>৳ {currentRate.mealRate}</strong> / meal.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/80">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportMealExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 transition-all shadow-2xs cursor-pointer"
                  title="Download Summary & Itemized Financials"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Financial Excel</span>
                </button>
                <button
                  onClick={handleExportMealPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-all shadow-2xs cursor-pointer"
                  title="Download Summary & Itemized Financials"
                >
                  <Download className="w-3.5 h-3.5 text-rose-600" />
                  <span>Financial PDF</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportMealMatrixExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-300 transition-all shadow-2xs cursor-pointer"
                  title="Export Date-Wise Boarder Meal Consumption Matrix in Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
                  <span>Meal Matrix (.xlsx)</span>
                </button>
                <button
                  onClick={handleExportMealMatrixPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300 transition-all shadow-2xs cursor-pointer"
                  title="Export Date-Wise Boarder Meal Consumption Matrix in PDF"
                >
                  <Download className="w-3.5 h-3.5 text-rose-700" />
                  <span>Meal Matrix (.pdf)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Report 2: Establishment Expense Ledger */}
          <div className="p-4 md:p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/60 space-y-3.5 flex flex-col justify-between">
            <div>
              <Badge variant="neutral" size="sm">REPORT 02</Badge>
              <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-brand-600" />
                Establishment Expense Ledger
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Itemized approved maintenance & repair expenditures with voucher numbers and warden verification notes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
              <button
                onClick={handleExportEstablishmentExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 transition-all shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download Excel (.xlsx)</span>
              </button>
              <button
                onClick={handleExportEstablishmentPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-all shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>Download PDF (.pdf)</span>
              </button>
            </div>
          </div>

          {/* Report 3: Student Fee Deposit Audit Ledger */}
          <div className="p-4 md:p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-emerald-50/20 space-y-3.5 flex flex-col justify-between">
            <div>
              <Badge variant="success" size="sm">REPORT 03</Badge>
              <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Student Fee Deposit Ledger
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Itemized audit ledger of student fee deposits featuring transaction IDs, approval status, and verified "Approved By" audit trail.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
              <button
                onClick={handleExportDepositsExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 transition-all shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download Excel (.xlsx)</span>
              </button>
              <button
                onClick={handleExportDepositsPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-all shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>Download PDF (.pdf)</span>
              </button>
            </div>
          </div>

        </div>
      </Card>

      {/* Two-Step Establishment Approval Queue Section */}
      <Card
        title="Two-Step Establishment Approval Queue"
        subtitle="Step 2 Verification & Sanction: Approve student fee deposits and Hostel Monitor's expense entries"
        action={
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveQueueTab('deposits')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeQueueTab === 'deposits'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Student Deposits ({pendingDeposits.length})
            </button>
            <button
              onClick={() => setActiveQueueTab('expenses')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeQueueTab === 'expenses'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monitor Expenses ({pendingExpenses.length})
            </button>
          </div>
        }
      >
        {activeQueueTab === 'deposits' ? (
          /* TAB 1: STUDENT DEPOSITS APPROVAL QUEUE */
          <div className="space-y-3">
            {/* Master Dual-Queue Filter Buttons (Mess & Establishment) */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Filter Queue:</span>
              <button
                onClick={() => setDepositFilterType('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  depositFilterType === 'all'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Slips ({pendingDeposits.length})
              </button>
              <button
                onClick={() => setDepositFilterType('mess')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  depositFilterType === 'mess'
                    ? 'bg-teal-700 text-white font-bold'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                }`}
              >
                Mess Deposits ({pendingDeposits.filter(d => d.depositType === 'Mess Fee Deposit').length})
              </button>
              <button
                onClick={() => setDepositFilterType('establishment')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  depositFilterType === 'establishment'
                    ? 'bg-amber-700 text-white font-bold'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Establishment Deposits ({pendingDeposits.filter(d => d.depositType === 'Establishment Fee Deposit').length})
              </button>
            </div>

            {pendingDeposits.filter(d => {
              if (depositFilterType === 'mess') return d.depositType === 'Mess Fee Deposit';
              if (depositFilterType === 'establishment') return d.depositType === 'Establishment Fee Deposit';
              return true;
            }).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="font-semibold text-slate-700">All student deposits verified</p>
                <p className="text-[11px] mt-0.5">No pending deposit slips matching this view in this hall's queue.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingDeposits.filter(d => {
                  if (depositFilterType === 'mess') return d.depositType === 'Mess Fee Deposit';
                  if (depositFilterType === 'establishment') return d.depositType === 'Establishment Fee Deposit';
                  return true;
                }).map((dep) => (
                  <div key={dep.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{dep.studentName}</span>
                        <Badge variant="teal" size="sm">Roll: {dep.rollNumber}</Badge>
                        <Badge variant="neutral" size="sm">{dep.userType === 'boarder_student' ? 'Boarder' : 'Non-Boarder'}</Badge>
                        <span className="text-xs font-semibold text-brand-700">৳ {Number(dep.amount).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        <strong>{dep.depositType}</strong> • Method: {dep.paymentMethod} • <span className="font-mono text-slate-600">Trx: {dep.trxId}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Submitted: {dep.submittedAt} • Room: {dep.roomNumber}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDepositDecision(dep.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleDepositDecision(dep.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Verify & Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: MONITOR EXPENSES APPROVAL QUEUE */
          <div className="space-y-3">
            {pendingExpenses.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="font-semibold text-slate-700">All Monitor expense vouchers verified</p>
                <p className="text-[11px] mt-0.5">No pending repair or utility bills in this hall's queue.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingExpenses.map((exp) => (
                  <div key={exp.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{exp.title}</span>
                        <Badge variant="warning" size="sm">{exp.category}</Badge>
                        <span className="text-xs font-bold text-slate-800">৳ {Number(exp.amount).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 italic">
                        "{exp.notes}"
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        Vendor: {exp.vendor} • Voucher: {exp.voucherNo} • Logged by: {exp.enteredBy} ({exp.enteredAt})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleExpenseDecision(exp.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject Voucher
                      </button>
                      <button
                        onClick={() => handleExpenseDecision(exp.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Sanction Expense
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Room Allocation & Hall Bed Capacity */}
      <Card
        title={`Room Allocation in ${hostelInfo?.name}`}
        subtitle="Manage bed capacities, occupant allotments, and floor vacancies"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const isFull = room.occupied >= room.capacity;
            return (
              <div key={room.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-card space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs">
                      {room.roomNumber}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">Room {room.roomNumber}</h4>
                      <p className="text-[10px] text-slate-400">{room.wing} • Floor {room.floor}</p>
                    </div>
                  </div>
                  <Badge variant={isFull ? 'neutral' : 'teal'} size="sm">
                    {isFull ? 'Full' : 'Vacant'}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Allotment:</span>
                    <span className="font-bold text-slate-700">{room.occupied} / {room.capacity} Beds</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: room.capacity }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${i < room.occupied ? 'bg-brand-600' : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>

                  {room.residents && (
                    <p className="text-[10px] text-slate-500 truncate mt-2">
                      {room.residents.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Hall Enrolled Users List */}
      <Card
        title={`Resident Directory (${hostelInfo?.name})`}
        subtitle="Monitors, Meal Managers, and Boarder Students assigned to this hall"
        action={
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('common.search') + '...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-600 shadow-2xs"
            />
          </div>
        }
      >
        {/* Multi-Checkbox Filter & Resident Directory Export Panel */}
        <div className="p-3.5 mb-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-brand-600" />
                {t('dashboard.filterAndExport')}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                ({filteredHostelUsers.length} {t('dashboard.recordsInView')})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportUserExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('common.exportExcel')}</span>
              </button>
              <button
                type="button"
                onClick={handleExportUserPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>{t('common.exportPDF')}</span>
              </button>
            </div>
          </div>

          {/* Multi-Checkbox Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
            {/* All Users Checkbox */}
            <label className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer select-none transition-all ${
              isAllRolesSelected 
                ? 'bg-brand-600 text-white border-brand-700 shadow-2xs' 
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}>
              <input
                type="checkbox"
                checked={isAllRolesSelected}
                onChange={handleToggleAllRoles}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5 cursor-pointer accent-brand-600"
              />
              <span>{t('common.allUsers')}</span>
            </label>

            {/* Individual Role Checkboxes */}
            {ROLE_DEFINITIONS.map((r) => {
              const isChecked = selectedRoles.includes(r.id);
              return (
                <label 
                  key={r.id} 
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-teal-50 text-brand-900 border-teal-300 font-semibold shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleRole(r.id)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5 cursor-pointer accent-brand-600"
                  />
                  <span>{r.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Student Name</th>
                <th className="pb-3">Class Roll</th>
                <th className="pb-3">Gender</th>
                <th className="pb-3">Hostel Role</th>
                <th className="pb-3">Room Allotment</th>
                <th className="pb-3">Financial Balance</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHostelUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-400 italic">
                    No residents found matching the selected role or search keyword.
                  </td>
                </tr>
              ) : (
                filteredHostelUsers.map((u) => {
                  const fin = getUserFinancialStatus(u);
                  const uRole = u?.role || 'resident';
                  return (
                    <tr key={u.id || u.loginId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-2">
                        <button
                          type="button"
                          onClick={() => setViewingUserId(u.id || u.rollNumber || u.loginId)}
                          className="font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer inline-flex items-center gap-2.5 text-left"
                          title="View complete member profile & ledgers"
                        >
                          <AvatarRenderer
                            avatarId={u.avatar_id}
                            gender={u.gender}
                            className="w-8 h-8 rounded-full border border-slate-200 shadow-2xs"
                          />
                          <span>{u?.name || 'Resident'}</span>
                        </button>
                      </td>
                      <td className="py-3 font-mono font-bold text-brand-700">{u?.rollNumber || u?.loginId || 'Staff'}</td>
                      <td className="py-3">
                        <Badge variant={normalizeGender(u?.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                          {normalizeGender(u?.gender)}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={uRole.includes('monitor') ? 'warning' : uRole.includes('manager') ? 'success' : 'teal'} size="sm">
                          {uRole.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-600 font-medium">
                        {u?.roomNumber ? `Room ${u.roomNumber} (${u?.bedNumber || 'Bed 1'})` : 'Office'}
                      </td>
                      <td className="py-3">
                        {uRole === 'hostel_super' ? (
                          <span className="text-slate-400 font-mono text-[11px]">Staff</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className={`font-bold font-mono text-xs ${fin.isSurplus ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {fin.text}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{fin.status}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="px-3 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors border border-teal-200 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Change Role / Room</span>
                          </button>
                          {u.id !== userProfile?.id && u.loginId !== userProfile?.loginId && (
                            <button
                              type="button"
                              onClick={() => setDeletingUser(u)}
                              title="Delete Resident"
                              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Edit User & Change Role */}
      <UserEditModal
        user={editingUser}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onUserUpdated={() => loadHostelData()}
      />

      {/* Modal: Confirm Delete User */}
      <UserDeleteConfirmModal
        user={deletingUser}
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Modal: Comprehensive User Profile Overlay */}
      <UserProfileModal
        userId={viewingUserId}
        isOpen={Boolean(viewingUserId)}
        onClose={() => setViewingUserId(null)}
      />

      {/* Modal: Fee Deposit (Dynamic Super Logic & Hostel Selector) */}
      <FeeDepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        userProfile={userProfile}
        effectiveHostelId={effectiveHostelId}
        effectivePtiId={effectivePtiId}
        targetMonth={currentMonth}
        onSuccess={(entry, updated) => {
          setDeposits(updated.filter(d => d.hostelId === effectiveHostelId));
          setDecisionSuccess(`Personal deposit of ৳${entry.amount} submitted successfully for ${entry.hostelName || 'Hostel'}.`);
          setTimeout(() => setDecisionSuccess(''), 4500);
        }}
      />

    </div>
  );
}
