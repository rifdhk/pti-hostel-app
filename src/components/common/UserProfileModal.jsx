import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  User,
  Mail,
  Phone,
  MapPin,
  Bed,
  Building2,
  GraduationCap,
  Utensils,
  DollarSign,
  CheckCircle2,
  ShieldCheck,
  Droplet,
  X
} from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import AvatarRenderer from '../Avatars/AvatarRenderer';
import { normalizeGender } from '../../constants/avatars';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../services/db';
import { mealAutomationService } from '../../services/mealAutomationService';
import { exportComprehensiveUserProfilePDF } from '../../utils/exportReports';

/**
 * Shared profile body rendered inside both the UserProfileModal overlay
 * and the fallback /user/:userId route page.
 */
export function UserProfileContent({ userId, mode = 'modal', onClose, onBack }) {
  const { effectiveHostelId, userProfile: currentUser } = useAuth();
  const isAdmin = Boolean(currentUser && ['superintendent', 'hostel_super', 'hostel_monitor', 'admin'].includes(currentUser.role?.toLowerCase()));

  const [user, setUser] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [messDeposits, setMessDeposits] = useState([]);
  const [estDeposits, setEstDeposits] = useState([]);
  const [mealLogs, setMealLogs] = useState([]);
  const [totalMealsCount, setTotalMealsCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState('');

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }

    const loadUserData = () => {
      const allUsers = dbService.getUsers();

      const target = allUsers.find(
        (u) =>
          String(u.id) === String(userId) ||
          String(u.rollNumber) === String(userId) ||
          String(u.loginId) === String(userId)
      );

      if (!target) {
        setUser(null);
        return;
      }

      setUser(target);

      const roll = target.rollNumber || target.loginId || '103';
      const targetHostel = target.hostelId || effectiveHostelId || 'hostel_01';
      const userRole = target.role || 'boarder_student';

      const fin = mealAutomationService.getStudentFinancials(roll, targetHostel, userRole);
      setFinancials(fin);

      const meals = mealAutomationService.getUserPersonalConsumedMeals(target, targetHostel);
      setTotalMealsCount(meals);

      const allDeposits = dbService.getDeposits();

      const userDeposits = allDeposits.filter(
        (d) =>
          String(d.rollNumber) === String(roll) ||
          d.studentId === target.id ||
          d.studentId === target.loginId
      );

      const messList = userDeposits.filter((d) =>
        (d.depositType || '').toLowerCase().includes('mess')
      );
      const estList = userDeposits.filter((d) =>
        (d.depositType || '').toLowerCase().includes('establishment')
      );

      setMessDeposits(
        messList.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
      );
      setEstDeposits(
        estList.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
      );

      // Extract date-wise meal attendance logs for this user
      const allSheets = dbService.getMealSheets();
      const userNameLower = (target.name || '').toLowerCase();
      const dateEntries = [];

      allSheets.forEach((sheet) => {
        if (target.hostelId && sheet.hostelId && sheet.hostelId !== target.hostelId) return;
        if (!Array.isArray(sheet.records)) return;
        const rec = sheet.records.find(
          (r) =>
            (target.rollNumber && String(r.rollNumber) === String(target.rollNumber)) ||
            (target.loginId && (String(r.rollNumber) === String(target.loginId) || r.studentId === target.loginId)) ||
            (target.id && r.studentId === target.id) ||
            (userNameLower && r.name && r.name.toLowerCase() === userNameLower)
        );
        if (rec) {
          const total = (rec.breakfast ? 1 : 0) + (rec.lunch ? 1 : 0) + (rec.dinner ? 1 : 0);
          dateEntries.push({
            date: sheet.date || 'N/A',
            breakfast: Boolean(rec.breakfast),
            lunch: Boolean(rec.lunch),
            dinner: Boolean(rec.dinner),
            total,
            locked: Boolean(sheet.locked),
          });
        }
      });

      dateEntries.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      setMealLogs(dateEntries);
    };

    loadUserData();

    window.addEventListener('pti_deposits_changed', loadUserData);
    window.addEventListener('pti_meals_changed', loadUserData);
    window.addEventListener('pti_users_changed', loadUserData);
    return () => {
      window.removeEventListener('pti_deposits_changed', loadUserData);
      window.removeEventListener('pti_meals_changed', loadUserData);
      window.removeEventListener('pti_users_changed', loadUserData);
    };
  }, [userId, effectiveHostelId]);

  const handleDownloadFullReport = () => {
    if (!user) return;
    setIsExporting(true);

    const formattedMess = mealAutomationService.formatFinancialDisplay(
      financials?.netMessBalance ?? 0,
      financials?.mealCalculationsEnabled
    );
    const formattedEst = mealAutomationService.formatFinancialDisplay(
      financials?.netEstablishmentBalance ?? 0,
      financials?.establishmentCalculationsEnabled
    );

    const exportFin = {
      messText: formattedMess.text,
      isMessSurplus: formattedMess.isSurplus,
      estText: formattedEst.text,
      isEstSurplus: formattedEst.isSurplus,
      totalMealsCount
    };

    try {
      exportComprehensiveUserProfilePDF(user, exportFin, messDeposits, estDeposits);
      setExportNotice(`Comprehensive report for ${user.name} exported successfully (.pdf)`);
      setTimeout(() => setExportNotice(''), 3500);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('Failed to generate PDF report: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          {mode === 'page' && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Directory</span>
            </button>
          ) : (
            <div />
          )}
          {mode === 'modal' && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Resident Record Not Found</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            No member record matches identifier <strong className="font-mono text-slate-700">{userId}</strong>. The user may have been relocated or removed.
          </p>
          {onClose && mode === 'modal' && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Close Overlay
            </button>
          )}
        </div>
      </div>
    );
  }

  const isStaff = user.role === 'superintendent' || user.role === 'hostel_super';
  const formattedMess = mealAutomationService.formatFinancialDisplay(
    financials?.netMessBalance ?? 0,
    financials?.mealCalculationsEnabled
  );
  const formattedEst = mealAutomationService.formatFinancialDisplay(
    financials?.netEstablishmentBalance ?? 0,
    financials?.establishmentCalculationsEnabled
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Bar with Compact PDF Export & Close Icon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {mode === 'page' && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs flex items-center justify-center cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {user.name}
              </h1>
              <Badge
                variant={
                  user.role?.includes('superintendent') ? 'teal' :
                  user.role?.includes('super') ? 'teal' :
                  user.role?.includes('manager') ? 'success' :
                  user.role?.includes('monitor') ? 'warning' : 'neutral'
                }
                size="sm"
              >
                {(user.role || 'Resident').replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive User Profile, Audit Balances &amp; Date-Wise Ledgers
            </p>
          </div>
        </div>

        {/* Top-Right Compact PDF Download & Close Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleDownloadFullReport}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Generate and download full PDF report"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating...' : 'Download Full Report (PDF)'}</span>
          </button>

          {mode === 'modal' && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportNotice}</span>
          </div>
          <button type="button" onClick={() => setExportNotice('')} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. PROFILE OVERVIEW CARD (BENTO MINIMALIST DESIGN) */}
      <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5 pb-5 border-b border-slate-200/80">
          <AvatarRenderer
            avatarId={user.avatar_id}
            gender={user.gender}
            className="w-20 h-20 rounded-full border-2 border-white ring-4 ring-teal-500/20 shadow-md"
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-lg">
                Roll: {user.rollNumber || user.loginId || 'Staff'}
              </span>
              <Badge variant={normalizeGender(user.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                Gender: {normalizeGender(user.gender)}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {user.hostelName || 'Assigned Hall'}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-slate-400" />
                {user.roomNumber ? `Room ${user.roomNumber} (${user.bedNumber || 'Bed 1'})` : 'Office / Day-Scholar'}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{user.email || 'N/A'}</span>
              </span>
            </p>
          </div>
        </div>

        {/* Detailed Attribute Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-5 text-xs">
          <div className="p-3 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
              <User className="w-3 h-3 text-teal-600" />
              Gender
            </span>
            <div>
              <Badge variant={normalizeGender(user.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                {normalizeGender(user.gender)}
              </Badge>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
              <Phone className="w-3 h-3 text-slate-400" />
              Primary Phone
            </span>
            <p className="font-bold text-slate-800 font-mono text-xs truncate">
              {user.phone_number || user.phone || 'N/A'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
              <Phone className="w-3 h-3 text-rose-500" />
              Emergency Contact
            </span>
            <p className="font-bold text-slate-800 font-mono text-xs truncate">
              {user.emergency_contact_name ? `${user.emergency_contact_name}: ` : ''}
              {user.emergency_contact_phone || user.emergency_contact || 'N/A'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
              <MapPin className="w-3 h-3 text-teal-600" />
              District &amp; Upazila
            </span>
            <p className="font-bold text-slate-800 text-xs">
              {user.district || 'N/A'}
              {user.upazila ? `, ${user.upazila}` : ''}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
              <Droplet className="w-3 h-3 text-rose-600" />
              Blood Group
            </span>
            <div>
              {user.blood_group ? (
                <Badge variant="danger" size="sm">{user.blood_group}</Badge>
              ) : (
                <span className="font-medium text-slate-400">Unspecified</span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
              <GraduationCap className="w-3 h-3 text-teal-600" />
              Class Roll / ID
            </span>
            <p className="font-bold text-teal-800 font-mono text-xs">
              {user.rollNumber || user.loginId || 'Staff'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200/70 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Status
            </span>
            <div>
              <Badge variant="success" size="sm">
                {(user.status || 'Active').toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FINANCIAL & MEAL SUMMARY CARDS */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mess Balance</span>
              <div className="mt-2">
                {isStaff ? (
                  <span className="text-xl font-bold text-slate-600">Staff Account</span>
                ) : (
                  <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
                    formattedMess.isSurplus === true ? 'text-emerald-600' :
                    formattedMess.isSurplus === false ? 'text-rose-600' : 'text-slate-600'
                  }`}>
                    {formattedMess.text}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-500 font-medium">
                {isStaff ? 'Exempt from student mess fee calculations' : formattedMess.subtext}
              </p>
              {!isStaff && financials?.mealCalculationsEnabled && (
                <p className="text-[10px] text-slate-400 font-mono pt-1">
                  Deposited: ৳{financials.totalMessDeposits} • Cost: ৳{financials.calculatedMealCost}
                </p>
              )}
            </div>
            <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
              isStaff ? 'bg-slate-100 text-slate-500' :
              formattedMess.isSurplus ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
              'bg-rose-50 text-rose-600 border border-rose-100'
            }`}>
              <Utensils className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Establishment Balance exclusively visible to Admins (Tier 1, 2, 3) */}
        {isAdmin && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Establishment Balance</span>
                <div className="mt-2">
                  {isStaff ? (
                    <span className="text-xl font-bold text-slate-600">Staff Account</span>
                  ) : (
                    <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
                      formattedEst.isSurplus === true ? 'text-emerald-600' :
                      formattedEst.isSurplus === false ? 'text-rose-600' : 'text-slate-600'
                    }`}>
                      {formattedEst.text}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-500 font-medium">
                  {isStaff ? 'Exempt from hostel establishment dues' : formattedEst.subtext}
                </p>
                {!isStaff && financials?.establishmentCalculationsEnabled && (
                  <p className="text-[10px] text-slate-400 font-mono pt-1">
                    Paid: ৳{financials.totalEstDeposits} • Fixed Fee: ৳{financials.fixedEstFee}
                  </p>
                )}
              </div>
              <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
                isStaff ? 'bg-slate-100 text-slate-500' :
                formattedEst.isSurplus ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                'bg-rose-50 text-rose-600 border border-rose-100'
              }`}>
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Consumed Meals</span>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                  {totalMealsCount} Meals
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 font-medium">
                Cumulative logged attendance across hostel meal sheets
              </p>
              <p className="text-[10px] text-teal-700 font-semibold pt-1">
                Active in current semester session
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. DETAILED TRANSACTION & DATE-WISE LEDGERS */}
      <div className="space-y-5">
        {/* Table A: Mess Fee Ledger */}
        <Card
          title="Table A: Mess Fee Deposit Ledger"
          subtitle="Date-wise audit log of verified and pending mess advance deposit slips"
          action={<Badge variant="teal" size="sm">{messDeposits.length} Records Logged</Badge>}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="pb-3 pl-2">Submission Date</th>
                  <th className="pb-3">Slip ID</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Payment Channel</th>
                  <th className="pb-3">Transaction / Challan</th>
                  <th className="pb-3">Audit Status</th>
                  <th className="pb-3 text-right pr-2">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                      No mess deposit transactions found for this resident.
                    </td>
                  </tr>
                ) : (
                  messDeposits.map((dep) => (
                    <tr key={dep.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 pl-2 font-mono text-slate-700">{dep.submittedAt || 'N/A'}</td>
                      <td className="py-2.5 font-mono font-bold text-slate-800">{dep.id}</td>
                      <td className="py-2.5 font-mono font-bold text-emerald-700 text-sm">
                        ৳ {Number(dep.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-slate-700 font-medium">{dep.paymentMethod || 'Mobile Banking'}</td>
                      <td className="py-2.5 font-mono text-slate-600 text-[11px]">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {dep.trxId || 'N/A'}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant={
                            dep.status === 'approved' ? 'success' :
                            dep.status === 'rejected' ? 'danger' : 'warning'
                          }
                          size="sm"
                        >
                          {(dep.status || 'pending').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right pr-2 text-[11px] text-slate-600">
                        {dep.approvedBy ? (
                          <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {dep.approvedBy}
                          </span>
                        ) : dep.status === 'rejected' ? (
                          <span className="text-rose-600 italic">Rejected</span>
                        ) : (
                          <span className="text-amber-700 italic">Awaiting Meal Manager Audit</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Table B: Establishment Fee Ledger - Exclusively visible to Admins (Tier 1, 2, 3) */}
        {isAdmin && (
          <Card
            title="Table B: Establishment Fee Deposit Ledger"
            subtitle="Date-wise audit log of hostel establishment, maintenance, and common-room fee deposits"
            action={<Badge variant="teal" size="sm">{estDeposits.length} Records Logged</Badge>}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="pb-3 pl-2">Submission Date</th>
                    <th className="pb-3">Slip ID</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Payment Channel</th>
                    <th className="pb-3">Transaction / Challan</th>
                    <th className="pb-3">Audit Status</th>
                    <th className="pb-3 text-right pr-2">Approved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estDeposits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                        No establishment deposit transactions found for this resident.
                      </td>
                    </tr>
                  ) : (
                    estDeposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 pl-2 font-mono text-slate-700">{dep.submittedAt || 'N/A'}</td>
                        <td className="py-2.5 font-mono font-bold text-slate-800">{dep.id}</td>
                        <td className="py-2.5 font-mono font-bold text-emerald-700 text-sm">
                          ৳ {Number(dep.amount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 text-slate-700 font-medium">{dep.paymentMethod || 'Bank Challan'}</td>
                        <td className="py-2.5 font-mono text-slate-600 text-[11px]">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {dep.trxId || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <Badge
                            variant={
                              dep.status === 'approved' ? 'success' :
                              dep.status === 'rejected' ? 'danger' : 'warning'
                            }
                            size="sm"
                          >
                            {(dep.status || 'pending').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right pr-2 text-[11px] text-slate-600">
                          {dep.approvedBy ? (
                            <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {dep.approvedBy}
                            </span>
                          ) : dep.status === 'rejected' ? (
                            <span className="text-rose-600 italic">Rejected</span>
                          ) : (
                            <span className="text-amber-700 italic">Awaiting Hostel Monitor / Super Audit</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Table C: Date-Wise Meal Attendance Ledger */}
        <Card
          title="Table C: Date-Wise Meal Attendance Ledger"
          subtitle="Daily breakfast, lunch, and dinner consumption breakdown recorded in hostel meal sheets"
          action={<Badge variant="teal" size="sm">{mealLogs.length} Days Recorded</Badge>}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3 text-center">Breakfast</th>
                  <th className="pb-3 text-center">Lunch</th>
                  <th className="pb-3 text-center">Dinner</th>
                  <th className="pb-3 text-center">Daily Total</th>
                  <th className="pb-3 text-right pr-2">Sheet Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mealLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                      No individual daily meal sheet entries logged yet for this account.
                    </td>
                  </tr>
                ) : (
                  mealLogs.map((entry) => (
                    <tr key={entry.date} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 pl-2 font-mono font-semibold text-slate-800">{entry.date}</td>
                      <td className="py-2.5 text-center">{entry.breakfast ? '✓' : '—'}</td>
                      <td className="py-2.5 text-center">{entry.lunch ? '✓' : '—'}</td>
                      <td className="py-2.5 text-center">{entry.dinner ? '✓' : '—'}</td>
                      <td className="py-2.5 text-center font-mono font-bold text-teal-800">{entry.total}</td>
                      <td className="py-2.5 text-right pr-2">
                        <Badge variant={entry.locked ? 'success' : 'neutral'} size="sm">
                          {entry.locked ? 'LOCKED' : 'OPEN'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Large centered overlay modal displaying the comprehensive user profile,
 * financial balances, consumed meals, date-wise ledgers, and compact PDF export.
 */
export default function UserProfileModal({ userId, isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !userId) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] w-11/12 max-w-5xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <UserProfileContent userId={userId} mode="modal" onClose={onClose} />
      </div>
    </div>
  );
}
