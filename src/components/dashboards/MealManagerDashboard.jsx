import React, { useState, useEffect, useMemo } from 'react';
import { 
  Utensils, 
  ShoppingBag, 
  Lock, 
  Unlock, 
  Plus, 
  Check, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  Users, 
  AlertCircle,
  X,
  Receipt,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  Coffee,
  Sun,
  Moon,
  Sparkles,
  Send,
  Sliders
} from 'lucide-react';
import Card from '../common/Card';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import AvatarRenderer from '../Avatars/AvatarRenderer';
import { normalizeGender } from '../../constants/avatars';
import NextDayMealToggle from '../common/NextDayMealToggle';
import FeeDepositModal from '../common/FeeDepositModal';
import ConsumedMealsCard from '../common/ConsumedMealsCard';
import MealValueConfigModal from '../common/MealValueConfigModal';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../services/db';
import { mealAutomationService } from '../../services/mealAutomationService';
import {
  exportMealLedgerMatrixExcel,
  exportMealLedgerMatrixPDF,
  exportMealFinancialReportExcel,
  exportMealFinancialReportPDF
} from '../../utils/exportReports';

export default function MealManagerDashboard() {
  const { userProfile, effectiveHostelId, effectivePtiId, isSuperintendent, isHostelSuper } = useAuth();
  const role = (userProfile?.role || '').toLowerCase();
  const isSuper = isSuperintendent || isHostelSuper || role.includes('superintendent') || role.includes('hostel_super') || role === 'admin';
  const currentMonth = mealAutomationService.getCurrentMonth();

  const [bazarLogs, setBazarLogs] = useState([]);
  const [mealSheet, setMealSheet] = useState(null);
  const [allMealSheets, setAllMealSheets] = useState([]);
  const [hostelUsers, setHostelUsers] = useState([]);
  const [dynamicRate, setDynamicRate] = useState({ mealRate: 65, totalBazarExpenses: 0, totalConsumedMeals: 0 });
  const [pendingMessDeposits, setPendingMessDeposits] = useState([]);
  const [depositActionMessage, setDepositActionMessage] = useState('');
  const [showBazarModal, setShowBazarModal] = useState(false);
  const [lockNotice, setLockNotice] = useState('');
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');

  // Date Range Filtering for Matrix Export
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // New Bazar Entry Form State
  const [newBazar, setNewBazar] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    itemsList: '',
    voucherNo: ''
  });

  // Self Fee Deposit Modal State
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState('');

  // Dynamic Meal Value Configuration Modal State (Tier 4)
  const [showValueConfigModal, setShowValueConfigModal] = useState(false);

  // Dynamic fee deposit opt-in status
  const [isOptedIn, setIsOptedIn] = useState(() => mealAutomationService.hasSuperOptedInToMeals(userProfile, currentMonth));

  useEffect(() => {
    loadMealData();

    const handleDepositsUpdated = () => {
      loadMealData();
    };
    const handleMealsUpdated = () => {
      loadMealData();
      setIsOptedIn(mealAutomationService.hasSuperOptedInToMeals(userProfile, currentMonth));
    };

    window.addEventListener('pti_deposits_changed', handleDepositsUpdated);
    window.addEventListener('pti_meals_changed', handleMealsUpdated);
    window.addEventListener('pti_meal_values_changed', handleMealsUpdated);
    window.addEventListener('pti_super_opt_in_changed', handleMealsUpdated);

    return () => {
      window.removeEventListener('pti_deposits_changed', handleDepositsUpdated);
      window.removeEventListener('pti_meals_changed', handleMealsUpdated);
      window.removeEventListener('pti_meal_values_changed', handleMealsUpdated);
      window.removeEventListener('pti_super_opt_in_changed', handleMealsUpdated);
    };
  }, [effectiveHostelId, userProfile, currentMonth]);

  const loadMealData = () => {
    // 1. Dynamic rate calculation
    const rateCalc = mealAutomationService.calculateHostelMealRate(effectiveHostelId);
    setDynamicRate(rateCalc);

    // 2. Load Bazar Expenses isolated by hostel
    setBazarLogs(dbService.getBazarExpenses(b => b.hostelId === effectiveHostelId));

    // 3. Load Daily Meal Sheet and all Sheets isolated by hostel
    const allM = dbService.getMealSheets();
    const hostelSheets = allM.filter(m => m.hostelId === effectiveHostelId);
    setAllMealSheets(hostelSheets);
    const todaySheet = hostelSheets.find(m => m.date === new Date().toISOString().split('T')[0]) || hostelSheets[0] || allM[0];
    setMealSheet(todaySheet);

    // 4. Load hostel users for matrix exports
    setHostelUsers(dbService.getUsers(u => u.hostelId === effectiveHostelId));

    // 5. Load Pending Mess Fee Deposits for this hostel (ONLY Meal Manager and Hostel Super authorized)
    setPendingMessDeposits(dbService.getDeposits(d =>
      d.hostelId === effectiveHostelId &&
      d.depositType === 'Mess Fee Deposit' &&
      d.status === 'pending'
    ));

    // 6. Update opt-in status
    setIsOptedIn(mealAutomationService.hasSuperOptedInToMeals(userProfile, currentMonth));
  };

  const handleMessDepositDecision = (id, decision) => {
    const { updated } = dbService.updateDepositDecision(id, decision, {
      id: userProfile?.id || userProfile?.loginId || 'manager_102',
      name: userProfile?.name || 'Rohan Deshmukh',
      role: 'Meal Manager'
    });
    setPendingMessDeposits(updated.filter(d => 
      d.hostelId === effectiveHostelId && 
      d.depositType === 'Mess Fee Deposit' && 
      d.status === 'pending'
    ));

    setDepositActionMessage(`Mess Deposit ${id} has been ${decision.toUpperCase()} by Meal Manager.`);
    setTimeout(() => setDepositActionMessage(''), 3500);
  };

  const handleDepositSuccess = (entry, updated) => {
    const pending = (updated || dbService.getDeposits()).filter(d => 
      d.hostelId === effectiveHostelId && 
      d.depositType === 'Mess Fee Deposit' && 
      d.status === 'pending'
    );
    setPendingMessDeposits(pending);

    const approvers = entry.depositType === 'Mess Fee Deposit'
      ? 'Meal Manager or Hostel Super'
      : 'Hostel Monitor or Hostel Super';
    setDepositSuccess(`Deposit slip of ৳${entry.amount} (${entry.depositType}) submitted successfully under ${entry.studentName}. Awaiting verification by ${approvers}.`);
    setTimeout(() => setDepositSuccess(''), 5000);
  };

  const handleToggleMeal = (rollNumber, mealKey) => {
    if (mealSheet?.locked) return; // Prevent modifying locked meal sheet

    const effective = mealAutomationService.getEffectiveMealValues(mealSheet.date, mealSheet.hostelId || effectiveHostelId);

    const updatedRecords = mealSheet.records.map(r => {
      if (r.rollNumber === rollNumber) {
        const updatedMeal = { ...r, [mealKey]: !r[mealKey] };
        const b = updatedMeal.breakfast ? effective.breakfastValue : 0;
        const l = updatedMeal.lunch ? 1.0 : 0;
        const d = updatedMeal.dinner ? effective.dinnerValue : 0;
        const total = parseFloat((b + l + d).toFixed(2));
        return { ...updatedMeal, total };
      }
      return r;
    });

    const newTotalMeals = parseFloat(updatedRecords.reduce((sum, r) => sum + r.total, 0).toFixed(2));
    const updatedSheet = {
      ...mealSheet,
      records: updatedRecords,
      totalMealsCount: newTotalMeals,
    };

    setMealSheet(updatedSheet);
    dbService.updateMealSheet(updatedSheet);

    // Refresh rate
    const rateCalc = mealAutomationService.calculateHostelMealRate(effectiveHostelId);
    setDynamicRate(rateCalc);
  };

  // Matrix Exports Handlers
  const myPersonalMeals = mealAutomationService.getUserPersonalConsumedMeals(userProfile, effectiveHostelId);

  // Dynamic Date-Wise Meal Ledger calculation for on-screen table
  const ledgerData = useMemo(() => {
    let filteredSheets = (allMealSheets || []).filter(sheet => {
      if (!sheet?.date) return false;
      if (reportStartDate && sheet.date < reportStartDate) return false;
      if (reportEndDate && sheet.date > reportEndDate) return false;
      return true;
    });

    if (filteredSheets.length === 0 && allMealSheets && allMealSheets.length > 0) {
      filteredSheets = allMealSheets;
    }

    const uniqueDates = Array.from(new Set(filteredSheets.map(s => s.date))).sort();
    if (uniqueDates.length === 0) {
      uniqueDates.push(new Date().toISOString().split('T')[0]);
    }

    const boarderMap = new Map();

    // Add residents from roster
    (hostelUsers || []).forEach(u => {
      const roll = String(u.rollNumber || u.loginId || u.id);
      boarderMap.set(roll, {
        rollNumber: roll,
        name: u.name || 'Resident',
        role: u.role || 'resident',
        room: u.roomNumber ? `Room ${u.roomNumber}` : 'Hall'
      });
    });

    // Check if Superintendent has selected this hostel
    const superintendentHostel = localStorage.getItem('pti_superintendent_chosen_hostel');
    const nextMeals = dbService.getNextDayMealsMap();
    const superKey = `${effectiveHostelId}_admin_${mealAutomationService.getNextDayDate()}`;
    const superKeyStaff = `${effectiveHostelId}_STAFF-T1_${mealAutomationService.getNextDayDate()}`;

    if (superintendentHostel === effectiveHostelId || nextMeals[superKey] || nextMeals[superKeyStaff]) {
      boarderMap.set('STAFF-T1', {
        rollNumber: 'STAFF-T1',
        name: 'Dr. Anwar Hossain (Superintendent)',
        role: 'superintendent',
        room: 'Executive Suite'
      });
    }

    // Add anyone in sheets
    filteredSheets.forEach(sheet => {
      (sheet.records || []).forEach(r => {
        const roll = String(r.rollNumber || r.studentId);
        if (!boarderMap.has(roll)) {
          boarderMap.set(roll, {
            rollNumber: roll,
            name: r.name || 'Resident',
            role: r.role || 'boarder',
            room: r.room ? `Room ${r.room}` : 'Quarters'
          });
        }
      });
    });

    const eatersList = Array.from(boarderMap.values()).sort((a, b) => {
      if (a.role === 'superintendent') return -1;
      if (b.role === 'superintendent') return 1;
      const numA = parseInt(a.rollNumber, 10);
      const numB = parseInt(b.rollNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.rollNumber.localeCompare(b.rollNumber);
    });

    const dateRollMap = {};
    filteredSheets.forEach(sheet => {
      const d = sheet.date;
      if (!dateRollMap[d]) dateRollMap[d] = {};
      const effective = mealAutomationService.getEffectiveMealValues(sheet.date, sheet.hostelId || effectiveHostelId);
      (sheet.records || []).forEach(r => {
        const roll = String(r.rollNumber || r.studentId);
        const b = r.breakfast ? effective.breakfastValue : 0;
        const l = r.lunch ? 1.0 : 0;
        const dVal = r.dinner ? effective.dinnerValue : 0;
        let count = parseFloat((b + l + dVal).toFixed(2));
        dateRollMap[d][roll] = count;
      });
    });

    const targetDate = mealAutomationService.getNextDayDate();
    if (nextMeals[superKey] && uniqueDates.includes(targetDate)) {
      if (!dateRollMap[targetDate]) dateRollMap[targetDate] = {};
      const sm = nextMeals[superKey];
      const effectiveNext = mealAutomationService.getEffectiveMealValues(targetDate, effectiveHostelId);
      const b = sm.breakfast ? effectiveNext.breakfastValue : 0;
      const l = sm.lunch ? 1.0 : 0;
      const dVal = sm.dinner ? effectiveNext.dinnerValue : 0;
      dateRollMap[targetDate]['STAFF-T1'] = parseFloat((b + l + dVal).toFixed(2));
    }

    const rows = eatersList.map(eater => {
      let totalMeals = 0;
      const dateCounts = {};
      uniqueDates.forEach(date => {
        let count = dateRollMap[date]?.[eater.rollNumber];
        if (count === undefined) {
          count = eater.role === 'superintendent' ? 2 : (eater.role === 'non_boarder_student' ? 0 : 3);
        }
        dateCounts[date] = count;
        totalMeals += count;
      });
      return {
        ...eater,
        dateCounts,
        totalMeals: parseFloat(totalMeals.toFixed(2))
      };
    });

    const columnTotals = {};
    let grandTotal = 0;
    uniqueDates.forEach(date => {
      let colSum = 0;
      rows.forEach(r => {
        colSum += (r.dateCounts[date] || 0);
      });
      columnTotals[date] = parseFloat(colSum.toFixed(2));
      grandTotal += colSum;
    });

    return {
      dates: uniqueDates,
      rows,
      columnTotals,
      grandTotal: parseFloat(grandTotal.toFixed(2))
    };
  }, [allMealSheets, hostelUsers, reportStartDate, reportEndDate, effectiveHostelId]);

  const handleExportMealMatrixExcel = () => {
    exportMealLedgerMatrixExcel(
      userProfile?.hostelName || 'Kazi Nazrul Hall',
      { startDate: reportStartDate, endDate: reportEndDate },
      allMealSheets.length > 0 ? allMealSheets : (mealSheet ? [mealSheet] : []),
      hostelUsers
    );
    setExportSuccessMsg('Downloaded Date-Wise Meal Ledger Matrix (.xlsx)');
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportMealMatrixPDF = () => {
    exportMealLedgerMatrixPDF(
      userProfile?.hostelName || 'Kazi Nazrul Hall',
      { startDate: reportStartDate, endDate: reportEndDate },
      allMealSheets.length > 0 ? allMealSheets : (mealSheet ? [mealSheet] : []),
      hostelUsers
    );
    setExportSuccessMsg('Downloaded Date-Wise Meal Ledger Matrix (.pdf)');
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleLockMealSheet = () => {
    if (!mealSheet) return;
    const locked = {
      ...mealSheet,
      locked: true,
      lockedBy: `${userProfile?.name} (Meal Manager)`,
      lockedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setMealSheet(locked);
    dbService.updateMealSheet(locked);

    setLockNotice("Daily meal sheet has been LOCKED and approved for today. Meal count and cut-off finalized.");
    setTimeout(() => setLockNotice(''), 3500);
  };

  const handleCreateBazar = (e) => {
    e.preventDefault();
    if (!newBazar.amount || !newBazar.itemsList) return;

    const entry = {
      id: `BAZ-${Date.now().toString().slice(-4)}`,
      hostelId: effectiveHostelId,
      date: newBazar.date,
      amount: Number(newBazar.amount),
      managerName: `${userProfile?.name} (${userProfile?.rollNumber || '102'})`,
      managerId: userProfile?.id || 'manager_102',
      itemsList: newBazar.itemsList,
      voucherNo: newBazar.voucherNo || `V-MK-${Date.now().toString().slice(-4)}`,
      status: 'approved'
    };

    const updated = dbService.insertBazarExpense(entry);
    setBazarLogs(updated.filter(b => b.hostelId === effectiveHostelId));
    setShowBazarModal(false);
    setNewBazar({ date: new Date().toISOString().split('T')[0], amount: '', itemsList: '', voucherNo: '' });

    // Recalculate dynamic rate
    const rateCalc = mealAutomationService.calculateHostelMealRate(effectiveHostelId);
    setDynamicRate(rateCalc);
  };

  const totalBazarSpent = bazarLogs.reduce((sum, b) => sum + Number(b.amount || 0), 0);

  // Dynamic calculations for today's summary with effective meal values
  const effectiveToday = mealAutomationService.getEffectiveMealValues(mealSheet?.date, effectiveHostelId);
  const todayTotalMeals = parseFloat((mealSheet?.records || []).reduce((sum, r) => {
    const b = r.breakfast ? effectiveToday.breakfastValue : 0;
    const l = r.lunch ? 1.0 : 0;
    const d = r.dinner ? effectiveToday.dinnerValue : 0;
    return sum + (b + l + d);
  }, 0).toFixed(2));

  const todayBreakfastCount = (mealSheet?.records || []).filter(r => r.breakfast).length;
  const todayLunchCount = (mealSheet?.records || []).filter(r => r.lunch).length;
  const todayDinnerCount = (mealSheet?.records || []).filter(r => r.dinner).length;
  const todayActiveBoarders = (mealSheet?.records || []).filter(r => r.breakfast || r.lunch || r.dinner).length;

  const todayBreakfastMeals = parseFloat((todayBreakfastCount * effectiveToday.breakfastValue).toFixed(2));
  const todayLunchMeals = todayLunchCount; // strictly 1.0
  const todayDinnerMeals = parseFloat((todayDinnerCount * effectiveToday.dinnerValue).toFixed(2));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <AvatarRenderer
            avatarId={userProfile?.avatar_id}
            gender={userProfile?.gender}
            className="w-16 h-16 rounded-full border-2 border-emerald-200 ring-2 ring-teal-500/20 shadow-sm"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 font-heading">
                Meal & Mess Management (Tier 4)
              </span>
              <Badge variant="teal" size="sm">Hall: {userProfile?.hostelName || 'Kazi Nazrul Hall'}</Badge>
              <Badge variant="neutral" size="sm">Roll: {userProfile?.rollNumber || '102'}</Badge>
              <Badge variant={normalizeGender(userProfile?.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                Gender: {normalizeGender(userProfile?.gender)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 mt-0.5 font-heading">
              {userProfile?.name || 'Fatima Zahra'}
            </h1>
            {userProfile?.designation && (
              <p className="text-sm font-medium text-gray-500 mt-1">{userProfile.designation}</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned Hall: <strong>{userProfile?.hostelName || 'Kazi Nazrul Hall'}</strong> • Bazar Log & Daily Meal Attendance
            </p>
          </div>
        </div>

        {/* Action Buttons: Redesigned smaller, smarter, and perfectly aligned in a single horizontal row */}
        <div className="flex flex-row gap-3 items-center justify-end shrink-0 w-full md:w-auto">
          {/* Meal Value Config (Tier 4 Fractional Meal Values) */}
          <button
            type="button"
            onClick={() => setShowValueConfigModal(true)}
            title="Configure dynamic meal values (0.5 or 1.0) with carry-on logic"
            className="px-4 py-2 text-sm font-medium rounded-md font-heading inline-flex items-center justify-center gap-2 bg-brand-navy hover:bg-slate-900 text-white transition-all shadow-sm cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-teal-400" />
            <span>Meal Value Config</span>
          </button>

          {/* Submit Fee Deposit */}
          <button
            type="button"
            onClick={() => setShowDepositModal(true)}
            title="Submit personal fee deposit slip"
            className="px-4 py-2 text-sm font-medium rounded-md font-heading inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-yellow-600 text-white transition-all shadow-sm"
          >
            <Receipt className="w-4 h-4" />
            <span>Submit Fee Deposit</span>
          </button>

          {/* Record Daily Bazar */}
          <button
            type="button"
            onClick={() => setShowBazarModal(true)}
            className="px-4 py-2 text-sm font-medium rounded-md font-heading inline-flex items-center justify-center gap-2 bg-brand-teal hover:bg-teal-700 text-white transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Daily Bazar</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <ConsumedMealsCard
          userProfile={userProfile}
          hostelId={effectiveHostelId}
        />
        <StatCard
          title="Dynamic Meal Rate"
          value={`৳ ${dynamicRate.mealRate} / meal`}
          subtitle="Formula: Total Bazar ÷ Total Meals"
          change="Real-time calculated"
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Hall Consumed Meals"
          value={`${dynamicRate.totalConsumedMeals} Meals`}
          subtitle="Across all hall meal records"
          change="Hall Total"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Total Bazar Purchases"
          value={`৳ ${totalBazarSpent.toLocaleString()}`}
          subtitle={`${bazarLogs.length} Market purchase entries`}
          change="Audited"
          changeType="positive"
          icon={ShoppingBag}
        />
        <StatCard
          title="Meal Sheet Status"
          value={mealSheet?.locked ? "Locked" : "Editable"}
          subtitle={mealSheet?.locked ? `By ${mealSheet?.lockedBy}` : "Pending final evening lock"}
          change={mealSheet?.locked ? "Approved" : "Action Pending"}
          changeType={mealSheet?.locked ? "positive" : "negative"}
          icon={mealSheet?.locked ? Lock : Unlock}
        />
      </div>

      {/* Universal Daily Meal Choice Card (T4 Meal Manager) */}
      <NextDayMealToggle
        hostelId={effectiveHostelId}
        rollNumber={userProfile?.rollNumber || '102'}
        userName={userProfile?.name || 'Rohan Deshmukh'}
        userRole="meal_manager"
        isOptedIn={isOptedIn}
        setIsOptedIn={setIsOptedIn}
        onUpdate={() => loadMealData()}
      />

      {lockNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{lockNotice}</span>
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

      {/* DEDICATED SECTION: PENDING MESS DEPOSITS APPROVAL QUEUE (Tier 4 Authority) */}
      <Card
        title={`Pending Mess Deposits Approval Queue (${pendingMessDeposits.length})`}
        subtitle="Tier 4 & Tier 2 exclusive authorization to audit and approve boarder meal advance deposits"
        action={
          <Badge variant={pendingMessDeposits.length > 0 ? "warning" : "success"} size="sm">
            {pendingMessDeposits.length} Awaiting Verification
          </Badge>
        }
      >
        {pendingMessDeposits.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">All Mess Deposits Verified</p>
            <p className="text-slate-500 text-xs mt-0.5">No pending mess fee deposit slips requiring approval in this hostel.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingMessDeposits.map((dep) => (
              <div key={dep.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{dep.studentName}</span>
                    <Badge variant="teal" size="sm">Roll: {dep.rollNumber}</Badge>
                    <Badge variant="neutral" size="sm">Room {dep.roomNumber || 'Quarters'}</Badge>
                    <span className="text-sm font-bold font-mono text-emerald-700">
                      ৳ {Number(dep.amount).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-800">{dep.depositType}</strong> • Channel: {dep.paymentMethod} • <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">Trx: {dep.trxId}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Slip ID: <span className="font-mono">{dep.id}</span> • Submitted: {dep.submittedAt}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleMessDepositDecision(dep.id, 'rejected')}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMessDepositDecision(dep.id, 'approved')}
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

      {exportSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
          <button onClick={() => setExportSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 font-bold">✕</button>
        </div>
      )}

      {/* PROMINENT BENTO-STYLE SUMMARY CARD: TOTAL MEALS FOR TODAY */}
      <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
                Daily Dietary Live Summary
              </span>
              <span className="text-[11px] bg-teal-800/80 text-teal-100 px-2.5 py-0.5 rounded-full border border-teal-700/60 font-mono">
                {mealSheet?.date || 'Today'}
              </span>
              <button
                type="button"
                onClick={() => setShowValueConfigModal(true)}
                title="Configure or override meal values for this date"
                className="text-[11px] bg-teal-800/90 hover:bg-teal-700 text-teal-100 px-2.5 py-0.5 rounded-full border border-teal-600 font-mono flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Sliders className="w-3 h-3 text-teal-300" />
                <span>B: {effectiveToday.breakfastValue} • L: 1.0 • D: {effectiveToday.dinnerValue} (Edit)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-baseline gap-2.5">
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Total Meals for Today:
              </h3>
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-300 font-mono tracking-tight">
                {todayTotalMeals}
              </span>
              <span className="text-sm font-semibold text-teal-200">Meals (Fractional)</span>
            </div>

            <p className="text-xs text-teal-100/80 max-w-xl">
              Dynamically calculated sum of breakfast ({effectiveToday.breakfastValue}), lunch (1.0), and dinner ({effectiveToday.dinnerValue}) attendance across {todayActiveBoarders} active boarders enrolled in today's sheet.
            </p>
          </div>

          {/* Quick Meal Breakdown Badges */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
              <div className="text-[11px] font-semibold text-teal-200 uppercase tracking-wide flex items-center justify-center gap-1">
                <Coffee className="w-3.5 h-3.5" />
                Breakfast
              </div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {todayBreakfastCount}
              </div>
              <div className="text-[10px] text-teal-300/90 mt-0.5 font-medium">
                = {todayBreakfastMeals} meals ({effectiveToday.breakfastValue === 0.5 ? 'Half' : 'Full'})
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
              <div className="text-[11px] font-semibold text-teal-200 uppercase tracking-wide flex items-center justify-center gap-1">
                <Sun className="w-3.5 h-3.5" />
                Lunch
              </div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {todayLunchCount}
              </div>
              <div className="text-[10px] text-teal-300/90 mt-0.5 font-medium">
                = {todayLunchMeals} meals (Full)
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
              <div className="text-[11px] font-semibold text-teal-200 uppercase tracking-wide flex items-center justify-center gap-1">
                <Moon className="w-3.5 h-3.5" />
                Dinner
              </div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {todayDinnerCount}
              </div>
              <div className="text-[10px] text-teal-300/90 mt-0.5 font-medium">
                = {todayDinnerMeals} meals ({effectiveToday.dinnerValue === 0.5 ? 'Half' : 'Full'})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ON-SCREEN DATE-WISE MEAL LEDGER TABLE & PRE-DOWNLOAD VERIFICATION */}
      <Card
        title="Date-Wise Meal Ledger"
        subtitle="Dynamic on-screen matrix showing user names, rolls, daily consumed meals (0-3), and grand totals"
      >
        <div className="space-y-4">
          {/* Date Range Picker Bar */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>Date Range Filter:</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-medium text-slate-500">From:</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-medium text-slate-500">To:</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                />
              </div>
              {(reportStartDate || reportEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setReportStartDate('');
                    setReportEndDate('');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-200/80 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Clear Dates
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              {reportStartDate && reportEndDate ? (
                <span className="text-teal-700 font-semibold">Active Period: {reportStartDate} to {reportEndDate}</span>
              ) : reportStartDate ? (
                <span className="text-teal-700 font-semibold">From {reportStartDate} onwards</span>
              ) : reportEndDate ? (
                <span className="text-teal-700 font-semibold">Up to {reportEndDate}</span>
              ) : (
                <span>All recorded dates displayed ({ledgerData.dates.length} days)</span>
              )}
            </div>
          </div>

          {/* Dynamic On-Screen Matrix Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">User Name</th>
                  <th className="py-3 px-2">Roll / ID</th>
                  {ledgerData.dates.map((date) => (
                    <th key={date} className="py-3 px-2 text-center font-mono">
                      {date.slice(5)}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right">Total Meals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={3 + ledgerData.dates.length} className="py-8 text-center text-slate-400">
                      No meal records found for this date range.
                    </td>
                  </tr>
                ) : (
                  ledgerData.rows.map((row) => (
                    <tr key={row.rollNumber} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{row.name}</span>
                          {row.role === 'superintendent' && (
                            <Badge variant="teal" size="sm">Superintendent</Badge>
                          )}
                          {row.role === 'meal_manager' && (
                            <Badge variant="success" size="sm">Manager</Badge>
                          )}
                          {row.role === 'hostel_monitor' && (
                            <Badge variant="warning" size="sm">Monitor</Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">{row.room}</span>
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold text-teal-800">
                        {row.rollNumber}
                      </td>
                      {ledgerData.dates.map((date) => {
                        const count = row.dateCounts[date] ?? 0;
                        const cellColor = 
                          count === 3 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          count === 2 ? 'bg-teal-50 text-teal-800 border-teal-200' :
                          count === 1 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-slate-50 text-slate-400 border-slate-200';
                        return (
                          <td key={date} className="py-2.5 px-2 text-center">
                            <span className={`inline-block w-6 h-6 leading-6 rounded-md font-mono text-xs font-bold border ${cellColor}`}>
                              {count}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                        {row.totalMeals}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {ledgerData.rows.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-900">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 uppercase text-[11px] text-slate-600">
                      Daily Consumed Totals:
                    </td>
                    {ledgerData.dates.map((date) => (
                      <td key={date} className="py-3 px-2 text-center font-mono text-teal-800">
                        {ledgerData.columnTotals[date] || 0}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-mono text-sm text-teal-900 font-extrabold">
                      {ledgerData.grandTotal}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Post-Table Export Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Verify matrix values on screen above before downloading formal cross-tabulated reports.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportMealMatrixExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                title="Export Date-Wise Matrix to Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleExportMealMatrixPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-colors shadow-2xs cursor-pointer"
                title="Export Date-Wise Matrix to PDF"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>Export PDF (.pdf)</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Daily Meal Sheet Lock & Approval Table */}
      <Card
        title={`Daily Meal Sheet (${mealSheet?.date || 'Today'})`}
        subtitle="Mark individual breakfast, lunch, and dinner attendance, then lock the sheet to finalize meal rates"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportMealMatrixExcel}
              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-emerald-600 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer"
              title="Download Date-Wise Matrix as Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleExportMealMatrixPDF}
              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 transition-colors cursor-pointer"
              title="Download Date-Wise Matrix as PDF (.pdf)"
            >
              <Download className="w-4 h-4" />
            </button>
            {mealSheet?.locked ? (
              <Badge variant="success" size="md" className="flex items-center gap-1 font-semibold">
                <Lock className="w-3.5 h-3.5" />
                Sheet Locked & Approved
              </Badge>
            ) : (
              <Button variant="primary" size="sm" icon={Lock} onClick={handleLockMealSheet}>
                Lock & Finalize Today's Sheet
              </Button>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Boarder Student</th>
                <th className="pb-3">Room</th>
                <th className="pb-3 text-center">Breakfast</th>
                <th className="pb-3 text-center">Lunch</th>
                <th className="pb-3 text-center">Dinner</th>
                <th className="pb-3 text-center">Total Meals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mealSheet?.records?.map((record) => (
                <tr key={record.rollNumber} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pl-2">
                    <p className="font-bold text-slate-900">{record.name}</p>
                    <span className="text-[11px] text-slate-400 font-mono">Roll: {record.rollNumber}</span>
                  </td>
                  <td className="py-3 text-slate-600 font-medium">Room {record.room}</td>
                  
                  {/* Breakfast Checkbox */}
                  <td className="py-3 text-center">
                    <button
                      onClick={() => handleToggleMeal(record.rollNumber, 'breakfast')}
                      disabled={mealSheet?.locked}
                      className={`w-9 h-9 min-h-[36px] min-w-[36px] rounded-lg font-bold text-xs inline-flex items-center justify-center transition-all cursor-pointer ${
                        record.breakfast 
                          ? 'bg-teal-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      } ${mealSheet?.locked ? 'cursor-not-allowed opacity-90' : ''}`}
                    >
                      {record.breakfast ? '✓' : '—'}
                    </button>
                  </td>

                  {/* Lunch Checkbox */}
                  <td className="py-3 text-center">
                    <button
                      onClick={() => handleToggleMeal(record.rollNumber, 'lunch')}
                      disabled={mealSheet?.locked}
                      className={`w-9 h-9 min-h-[36px] min-w-[36px] rounded-lg font-bold text-xs inline-flex items-center justify-center transition-all cursor-pointer ${
                        record.lunch 
                          ? 'bg-teal-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      } ${mealSheet?.locked ? 'cursor-not-allowed opacity-90' : ''}`}
                    >
                      {record.lunch ? '✓' : '—'}
                    </button>
                  </td>

                  {/* Dinner Checkbox */}
                  <td className="py-3 text-center">
                    <button
                      onClick={() => handleToggleMeal(record.rollNumber, 'dinner')}
                      disabled={mealSheet?.locked}
                      className={`w-9 h-9 min-h-[36px] min-w-[36px] rounded-lg font-bold text-xs inline-flex items-center justify-center transition-all cursor-pointer ${
                        record.dinner 
                          ? 'bg-teal-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      } ${mealSheet?.locked ? 'cursor-not-allowed opacity-90' : ''}`}
                    >
                      {record.dinner ? '✓' : '—'}
                    </button>
                  </td>

                  <td className="py-3 text-center font-bold text-slate-800 font-mono text-sm">
                    {record.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {mealSheet?.locked && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Verified & Signed off by: <strong className="text-slate-800">{mealSheet.lockedBy}</strong></span>
            <span className="font-mono text-slate-400">Total meals recorded: {mealSheet.totalMealsCount}</span>
          </div>
        )}
      </Card>

      {/* Bazar Expense Entries Log */}
      <Card
        title="Bazar Purchase History (Mess Market Spend)"
        subtitle="Transparent record of fresh food, grains, meat, and condiments"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Date & Voucher</th>
                <th className="pb-3">Purchased Items Breakdown</th>
                <th className="pb-3">Entered By</th>
                <th className="pb-3 text-right pr-2">Amount (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bazarLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pl-2">
                    <p className="font-bold text-slate-900">{log.date}</p>
                    <span className="text-[11px] text-slate-400 font-mono">Voucher: {log.voucherNo}</span>
                  </td>
                  <td className="py-3 text-slate-700 max-w-md">
                    {log.itemsList}
                  </td>
                  <td className="py-3 text-slate-500">
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

      {/* Modal: Add Bazar Entry */}
      {showBazarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-dropdown p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Record Daily Mess Bazar</h3>
              <button onClick={() => setShowBazarModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateBazar} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Purchase Date</label>
                <input
                  type="date"
                  required
                  value={newBazar.date}
                  onChange={(e) => setNewBazar({ ...newBazar, date: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Total Bazar Expense (৳)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 4200"
                  value={newBazar.amount}
                  onChange={(e) => setNewBazar({ ...newBazar, amount: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Items Breakdown (Detailed)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Rice 50kg, Chicken 14kg, Potatoes 10kg, Spices, Mustard oil 5L..."
                  value={newBazar.itemsList}
                  onChange={(e) => setNewBazar({ ...newBazar, itemsList: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Receipt / Voucher Number</label>
                <input
                  type="text"
                  placeholder="e.g. MK-905"
                  value={newBazar.voucherNo}
                  onChange={(e) => setNewBazar({ ...newBazar, voucherNo: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowBazarModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm">Save Bazar Record</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fee Deposit (Dynamic Super Logic & Hostel Picker) */}
      <FeeDepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        userProfile={userProfile}
        effectiveHostelId={effectiveHostelId}
        effectivePtiId={effectivePtiId}
        targetMonth={currentMonth}
        onSuccess={handleDepositSuccess}
      />

      {/* Modal: Dynamic Meal Value Config (Tier 4 Fractional Value System) */}
      <MealValueConfigModal
        isOpen={showValueConfigModal}
        onClose={() => setShowValueConfigModal(false)}
        hostelId={effectiveHostelId}
        hostelName={userProfile?.hostelName || 'Kazi Nazrul Hall'}
        userProfile={userProfile}
        onConfigSaved={() => loadMealData()}
      />

    </div>
  );
}
