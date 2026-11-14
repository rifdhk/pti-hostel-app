import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Plus, 
  Filter, 
  DollarSign, 
  CheckCircle, 
  Search, 
  UserPlus, 
  GraduationCap, 
  KeyRound,
  Sliders,
  Utensils,
  Wrench,
  Clock,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Download,
  Calendar,
  Edit3,
  Trash2,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import Card from '../common/Card';
import StatCard from '../common/StatCard';
import Button from '../common/Button';
import Badge from '../common/Badge';
import AvatarRenderer from '../Avatars/AvatarRenderer';
import UserEditModal from '../common/UserEditModal';
import UserDeleteConfirmModal from '../common/UserDeleteConfirmModal';
import UserProfileModal from '../common/UserProfileModal';
import NextDayMealToggle from '../common/NextDayMealToggle';
import FeeDepositModal from '../common/FeeDepositModal';
import {
  GENDER_OPTIONS,
  normalizeGender,
  getDefaultAvatarId
} from '../../constants/avatars';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../services/db';
import {
  createHostelHall,
  updateHostelHall,
  deleteHostelCascade
} from '../../services/seedService';
import { USER_ROLES } from '../../services/seedData';
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
  getUserFinancialStatus
} from '../../utils/exportReports';

export default function SuperintendentDashboard() {
  const { t } = useTranslation();
  const { userProfile, adminDeleteUser, effectivePtiId } = useAuth();

  const ROLE_DEFINITIONS = [
    { id: USER_ROLES.SUPERINTENDENT, label: t('roles.superintendent') },
    { id: USER_ROLES.HOSTEL_SUPER, label: t('roles.hostel_super') },
    { id: USER_ROLES.HOSTEL_MONITOR, label: t('roles.hostel_monitor') },
    { id: USER_ROLES.MEAL_MANAGER, label: t('roles.meal_manager') },
    { id: USER_ROLES.BOARDER_STUDENT, label: t('roles.boarder_student') },
    { id: USER_ROLES.NON_BOARDER_STUDENT, label: t('roles.non_boarder_student') },
  ];

  const [hostels, setHostels] = useState([]);
  const [users, setUsers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [bazarExpenses, setBazarExpenses] = useState([]);
  const [mealSheets, setMealSheets] = useState([]);

  // Selected hostel for financial reporting
  const [selectedReportHostelId, setSelectedReportHostelId] = useState('hostel_01');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');

  // Dynamic fee deposit for Superintendent
  const currentMonth = mealAutomationService.getCurrentMonth();
  const monthDisplayName = mealAutomationService.getMonthDisplayName(currentMonth);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Master Global Settings (Scoped to tenant pti_id)
  const [settings, setSettings] = useState(() => mealAutomationService.getSettings(effectivePtiId));
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Modals & Category State
  const [showHostelModal, setShowHostelModal] = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [hostelPendingDelete, setHostelPendingDelete] = useState(null);
  const [isSavingHostel, setIsSavingHostel] = useState(false);
  const [isDeletingHostel, setIsDeletingHostel] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
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
      loadAllData();
      setExportSuccessMsg(`User ${deletedName} deleted from system.`);
      setTimeout(() => setExportSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Delete error in Superintendent dashboard:', err);
      alert('Failed to delete user: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');

  // Default Categories & Dynamic Category Management
  const [hostelCategories, setHostelCategories] = useState(() => {
    const saved = localStorage.getItem('pti_hostel_categories');
    return saved ? JSON.parse(saved) : ['পুরুষ হোস্টেল (Male Hostel)', 'মহিলা হোস্টেল (Female Hostel)'];
  });
  const [showCustomCatInput, setShowCustomCatInput] = useState(false);
  const [customCatName, setCustomCatName] = useState('');

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

  // New Hostel Form State
  const [newHostel, setNewHostel] = useState({
    name: '',
    code: '',
    type: 'পুরুষ হোস্টেল (Male Hostel)',
    totalRooms: 30,
    totalBeds: 90,
  });

  // New User Form State
  const [newUser, setNewUser] = useState({
    loginId: '',
    name: '',
    rollNumber: '',
    role: USER_ROLES.BOARDER_STUDENT,
    gender: 'Male',
    hostelId: 'hostel_01',
    password: '123456',
    email: '',
    roomNumber: '101'
  });

  useEffect(() => {
    loadAllData();
    const handleUsersChanged = () => loadAllData();
    const handleHostelsChanged = () => loadAllData();
    const handleSettingsChanged = () => {
      setSettings(mealAutomationService.getSettings(effectivePtiId));
    };

    window.addEventListener('pti_users_changed', handleUsersChanged);
    window.addEventListener('pti_hostels_changed', handleHostelsChanged);
    window.addEventListener('pti_settings_changed', handleSettingsChanged);

    return () => {
      window.removeEventListener('pti_users_changed', handleUsersChanged);
      window.removeEventListener('pti_hostels_changed', handleHostelsChanged);
      window.removeEventListener('pti_settings_changed', handleSettingsChanged);
    };
  }, [effectivePtiId]);

  const loadAllData = () => {
    const tenantPtiId = effectivePtiId || userProfile?.pti_id || 'pti_dhaka';

    const filteredHostels = dbService.getHostels(h => !tenantPtiId || h.pti_id === tenantPtiId);
    setHostels(filteredHostels);
    if (filteredHostels.length > 0 && !filteredHostels.some(h => h.id === selectedReportHostelId)) {
      setSelectedReportHostelId(filteredHostels[0].id);
    }

    setUsers(dbService.getUsers(u => (!tenantPtiId || u.pti_id === tenantPtiId) && u.role !== USER_ROLES.MASTER_ADMIN));
    setExpenses(dbService.getEstablishmentExpenses(e => !tenantPtiId || e.pti_id === tenantPtiId));
    setDeposits(dbService.getDeposits(d => !tenantPtiId || d.pti_id === tenantPtiId));
    setBazarExpenses(dbService.getBazarExpenses(b => !tenantPtiId || b.pti_id === tenantPtiId));
    setMealSheets(dbService.getMealSheets(m => !tenantPtiId || m.pti_id === tenantPtiId));
  };

  // Financial Report Export Handlers & Date Filtering
  const currentReportHostel = hostels.find(h => h.id === selectedReportHostelId) || hostels[0] || { name: 'Kazi Nazrul Hall', id: 'hostel_01' };
  const targetHostelBazar = bazarExpenses.filter(b => b.hostelId === currentReportHostel.id);
  const targetHostelMeals = mealSheets.filter(m => m.hostelId === currentReportHostel.id);
  const targetHostelUsers = users.filter(u => u.hostelId === currentReportHostel.id || (!u.hostelId && u.role === USER_ROLES.SUPERINTENDENT));
  const targetHostelRate = mealAutomationService.calculateHostelMealRate(currentReportHostel.id);
  const targetHostelExpenses = expenses.filter(e => e.hostelId === currentReportHostel.id);

  const filterByDateRange = (items, dateExtractor) => {
    return items.filter(item => {
      const dStr = dateExtractor(item);
      if (!dStr) return true;
      const itemDate = dStr.substring(0, 10);
      if (reportStartDate && itemDate < reportStartDate) return false;
      if (reportEndDate && itemDate > reportEndDate) return false;
      return true;
    });
  };

  const getFinancialDateRangeLabel = () => {
    if (reportStartDate && reportEndDate) {
      return `Financial Report from ${reportStartDate} to ${reportEndDate}`;
    }
    if (reportStartDate) {
      return `Financial Report from ${reportStartDate} onwards`;
    }
    if (reportEndDate) {
      return `Financial Report up to ${reportEndDate}`;
    }
    return 'Academic Term 2026-2027 (All Time)';
  };

  const getFilteredMealData = () => {
    const filteredBazar = filterByDateRange(targetHostelBazar, b => b.date);
    const filteredMeals = filterByDateRange(targetHostelMeals, m => m.date);

    let totalBazar = filteredBazar.reduce((acc, curr) => acc + (Number(curr.totalCost) || 0), 0);
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
      mealRate: totalMeals > 0 ? parseFloat((totalBazar / safeMeals).toFixed(2)) : targetHostelRate.mealRate
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
      currentReportHostel.name,
      dateRangeLabel,
      filteredBazar,
      filteredMeals,
      targetHostelUsers,
      dynamicRate
    );
    setExportSuccessMsg(`Downloaded Meal Financial Statement (.xlsx) for ${currentReportHostel.name}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportMealPDF = () => {
    const { filteredBazar, filteredMeals, dynamicRate, dateRangeLabel } = getFilteredMealData();
    exportMealFinancialReportPDF(
      currentReportHostel.name,
      dateRangeLabel,
      filteredBazar,
      filteredMeals,
      targetHostelUsers,
      dynamicRate
    );
    setExportSuccessMsg(`Downloaded Meal Financial Statement (.pdf) for ${currentReportHostel.name}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportEstablishmentExcel = () => {
    const filteredExpenses = filterByDateRange(targetHostelExpenses, e => e.enteredAt || e.date);
    const dateRangeLabel = reportStartDate && reportEndDate 
      ? `Establishment Expense Ledger from ${reportStartDate} to ${reportEndDate}`
      : (reportStartDate ? `Establishment Expense Ledger from ${reportStartDate} onwards` : (reportEndDate ? `Establishment Expense Ledger up to ${reportEndDate}` : 'Fiscal Year 2026 (All Time)'));

    exportEstablishmentLedgerExcel(
      currentReportHostel.name,
      dateRangeLabel,
      filteredExpenses
    );
    setExportSuccessMsg(`Downloaded Establishment Expense Ledger (.xlsx) for ${currentReportHostel.name}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportEstablishmentPDF = () => {
    const filteredExpenses = filterByDateRange(targetHostelExpenses, e => e.enteredAt || e.date);
    const dateRangeLabel = reportStartDate && reportEndDate 
      ? `Establishment Expense Ledger from ${reportStartDate} to ${reportEndDate}`
      : (reportStartDate ? `Establishment Expense Ledger from ${reportStartDate} onwards` : (reportEndDate ? `Establishment Expense Ledger up to ${reportEndDate}` : 'Fiscal Year 2026 (All Time)'));

    exportEstablishmentLedgerPDF(
      currentReportHostel.name,
      dateRangeLabel,
      filteredExpenses
    );
    setExportSuccessMsg(`Downloaded Establishment Expense Ledger (.pdf) for ${currentReportHostel.name}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportDepositsExcel = () => {
    const targetHostelDeposits = deposits.filter(d => d.hostelId === currentReportHostel.id);
    const filteredDeposits = filterByDateRange(targetHostelDeposits, d => d.submittedAt);
    const dateRangeLabel = reportStartDate && reportEndDate 
      ? `Student Deposits Ledger from ${reportStartDate} to ${reportEndDate}`
      : (reportStartDate ? `Student Deposits Ledger from ${reportStartDate} onwards` : (reportEndDate ? `Student Deposits Ledger up to ${reportEndDate}` : 'Academic Term (All Time)'));

    exportDepositLedgerExcel(
      currentReportHostel.name,
      dateRangeLabel,
      filteredDeposits
    );
    setExportSuccessMsg(`Downloaded Student Deposits Ledger (.xlsx) for ${currentReportHostel.name}`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportDepositsPDF = () => {
    const targetHostelDeposits = deposits.filter(d => d.hostelId === currentReportHostel.id);
    const filteredDeposits = filterByDateRange(targetHostelDeposits, d => d.submittedAt);
    const dateRangeLabel = reportStartDate && reportEndDate 
      ? `Student Deposits Ledger from ${reportStartDate} to ${reportEndDate}`
      : (reportStartDate ? `Student Deposits Ledger from ${reportStartDate} onwards` : (reportEndDate ? `Student Deposits Ledger up to ${reportEndDate}` : 'Academic Term (All Time)'));

    exportDepositLedgerPDF(
      currentReportHostel.name,
      dateRangeLabel,
      filteredDeposits
    );
    setExportSuccessMsg(`Downloaded Student Deposits Ledger (.pdf) for ${currentReportHostel.name}`);
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

  // User Directory Export Handlers (incorporating active multi-checkbox filter)
  const getDirectoryExportScope = () => {
    if (isAllRolesSelected) {
      return 'Central PTI Directory (All Roles)';
    }
    const roleLabels = selectedRoles.map(r => r.replace('_', ' ').toUpperCase());
    return `Central PTI Directory (${roleLabels.join(', ') || 'No Roles Selected'})`;
  };

  const handleExportUserExcel = () => {
    if (filteredUsers.length === 0) {
      alert('Please check at least one role checkbox to export user records.');
      return;
    }
    const scope = getDirectoryExportScope();
    exportUserDirectoryExcel(filteredUsers, scope);
    setExportSuccessMsg(`Downloaded PTI User Directory (.xlsx) [${filteredUsers.length} records]`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  const handleExportUserPDF = () => {
    if (filteredUsers.length === 0) {
      alert('Please check at least one role checkbox to export user records.');
      return;
    }
    const scope = getDirectoryExportScope();
    exportUserDirectoryPDF(filteredUsers, scope);
    setExportSuccessMsg(`Downloaded PTI User Directory (.pdf) [${filteredUsers.length} records]`);
    setTimeout(() => setExportSuccessMsg(''), 3500);
  };

  // Toggle Master Switches (Scoped to tenant pti_id)
  const handleToggleMaster = (key, value) => {
    const updated = mealAutomationService.updateSettings({ [key]: value }, effectivePtiId);
    setSettings(updated);
    setSettingsSuccess(`Master Control Updated: ${key} is now ${value ? 'ENABLED (ON)' : 'DISABLED (OFF)'}`);
    setTimeout(() => setSettingsSuccess(''), 3000);
  };

  const handleAddCustomCategory = () => {
    if (!customCatName.trim()) return;
    const newCat = customCatName.trim();
    if (!hostelCategories.includes(newCat)) {
      const updated = [...hostelCategories, newCat];
      setHostelCategories(updated);
      localStorage.setItem('pti_hostel_categories', JSON.stringify(updated));
    }
    setNewHostel({ ...newHostel, type: newCat });
    if (editingHostel) {
      setEditingHostel({ ...editingHostel, type: newCat });
    }
    setCustomCatName('');
    setShowCustomCatInput(false);
  };

  const handleCreateHostel = async (e) => {
    e.preventDefault();
    const tenantPtiId = effectivePtiId || userProfile?.pti_id || 'pti_dhaka';
    setIsSavingHostel(true);
    try {
      const created = await createHostelHall(
        {
          ...newHostel,
          superintendentId: userProfile?.id || 'admin',
        },
        tenantPtiId
      );
      loadAllData();
      setShowHostelModal(false);
      setNewHostel({ name: '', code: '', type: 'পুরুষ হোস্টেল (Male Hostel)', totalRooms: 30, totalBeds: 90 });
      setSettingsSuccess(`Hostel hall "${created.name}" created successfully.`);
      setTimeout(() => setSettingsSuccess(''), 3500);
    } catch (err) {
      alert(err.message || 'Failed to create hostel hall.');
    } finally {
      setIsSavingHostel(false);
    }
  };

  const handleEditHostel = (hostel) => {
    setEditingHostel({
      ...hostel,
      type: hostel.type || hostel.category || hostelCategories[0] || 'পুরুষ হোস্টেল (Male Hostel)',
      category: hostel.category || hostel.type || hostelCategories[0] || 'পুরুষ হোস্টেল (Male Hostel)',
      totalRooms: hostel.totalRooms ?? 30,
      totalBeds: hostel.totalBeds ?? 90,
    });
  };

  const handleSaveEditedHostel = async (e) => {
    e.preventDefault();
    if (!editingHostel) return;
    const tenantPtiId = effectivePtiId || userProfile?.pti_id || 'pti_dhaka';
    setIsSavingHostel(true);
    try {
      const updated = await updateHostelHall(
        editingHostel.id,
        {
          name: editingHostel.name,
          code: editingHostel.code,
          type: editingHostel.type,
          category: editingHostel.type,
          totalRooms: Number(editingHostel.totalRooms),
          totalBeds: Number(editingHostel.totalBeds),
        },
        tenantPtiId
      );
      loadAllData();
      setEditingHostel(null);
      setSettingsSuccess(`Hostel hall "${updated.name}" updated across your institute.`);
      setTimeout(() => setSettingsSuccess(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to update hostel hall.');
    } finally {
      setIsSavingHostel(false);
    }
  };

  const openDeleteHostelModal = (hostel) => {
    const revertibleRoles = new Set([
      USER_ROLES.BOARDER_STUDENT,
      USER_ROLES.MEAL_MANAGER,
      USER_ROLES.HOSTEL_MONITOR,
      'boarder_student',
      'meal_manager',
      'hostel_monitor',
      'boarder'
    ]);
    const affectedStudentsCount = users.filter(
      (u) => (u.hostelId === hostel.id || u.hostel_id === hostel.id) && revertibleRoles.has(u.role)
    ).length;

    setHostelPendingDelete({
      ...hostel,
      affectedStudentsCount,
    });
  };

  const handleConfirmDeleteHostel = async () => {
    if (!hostelPendingDelete) return;
    const tenantPtiId = effectivePtiId || userProfile?.pti_id || 'pti_dhaka';
    const targetId = hostelPendingDelete.id;
    const targetName = hostelPendingDelete.name;
    setIsDeletingHostel(true);

    try {
      const result = await deleteHostelCascade(targetId, tenantPtiId);
      loadAllData();

      if (selectedReportHostelId === targetId) {
        setSelectedReportHostelId(result.remainingHostels[0]?.id || '');
      }
      if (newUser.hostelId === targetId) {
        setNewUser((prev) => ({ ...prev, hostelId: result.remainingHostels[0]?.id || '' }));
      }

      setHostelPendingDelete(null);
      const unassignedNote =
        result.revertedStudentsCount > 0
          ? ` ${result.revertedStudentsCount} assigned student(s) reverted to Non-Boarder Student.`
          : '';
      setSettingsSuccess(`Hostel "${targetName}" has been permanently deleted.${unassignedNote}`);
      setTimeout(() => setSettingsSuccess(''), 5000);
    } catch (err) {
      alert(err.message || 'Failed to delete hostel hall.');
    } finally {
      setIsDeletingHostel(false);
    }
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    const tenantPtiId = effectivePtiId || userProfile?.pti_id || 'pti_dhaka';
    const resolvedGender = normalizeGender(newUser.gender);
    const created = {
      id: `user_${Date.now()}`,
      pti_id: tenantPtiId,
      loginId: newUser.loginId || newUser.rollNumber,
      rollNumber: newUser.rollNumber || null,
      name: newUser.name,
      role: newUser.role,
      gender: resolvedGender,
      avatar_id: getDefaultAvatarId(resolvedGender),
      hostelId: newUser.hostelId,
      hostelName: hostels.find(h => h.id === newUser.hostelId)?.name || 'Nazrul Hall',
      password: newUser.password || '123456',
      email: newUser.email || `${newUser.loginId}@institution.edu`,
      roomNumber: newUser.roomNumber || null,
      status: 'active'
    };
    dbService.insertUser(created);
    setUsers(dbService.getUsers(u => (!tenantPtiId || u.pti_id === tenantPtiId) && u.role !== USER_ROLES.MASTER_ADMIN));
    setShowUserModal(false);
    setNewUser({ loginId: '', name: '', rollNumber: '', role: USER_ROLES.BOARDER_STUDENT, gender: 'Male', hostelId: 'hostel_01', password: '123456', email: '', roomNumber: '101' });
  };

  // Filtered users respecting multi-checkbox selected roles and search keyword
  const filteredUsers = users.filter(u => {
    const matchesRole = selectedRoles.includes(u.role) || (selectedRoles.includes(USER_ROLES.BOARDER_STUDENT) && u.role === 'boarder');
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.loginId && u.loginId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.rollNumber && String(u.rollNumber).includes(searchTerm));
    return matchesRole && matchesSearch;
  });

  const totalBeds = hostels.reduce((sum, h) => sum + (h.totalBeds || 0), 0);
  const totalOccupied = hostels.reduce((sum, h) => sum + (h.occupiedBeds || 0), 0);
  const totalEstExpenses = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalPendingEst = expenses.filter(e => e.status === 'pending').length;

  // Dynamic Meal Rate for primary hostel
  const dynamicMealRate = mealAutomationService.calculateHostelMealRate('hostel_01');

  return (
    <div className="space-y-6">
      
      {/* Executive Banner */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <AvatarRenderer
            avatarId={userProfile?.avatar_id}
            gender={userProfile?.gender}
            className="w-16 h-16 rounded-full border-2 border-teal-200 ring-2 ring-teal-500/20 shadow-sm"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 font-heading">
                Superintendent (Tier 1)
              </span>
              <Badge variant="teal" size="sm">Central Administration</Badge>
              <Badge variant={normalizeGender(userProfile?.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                Gender: {normalizeGender(userProfile?.gender)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 mt-0.5 font-heading">
              {userProfile?.name || 'Dr. Anwar Hossain'}
            </h1>
            {userProfile?.designation && (
              <p className="text-sm font-medium text-gray-500 mt-1">{userProfile.designation}</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">
              Primary Teachers Training Institutes • Global Institutional Oversight & Approvals
            </p>
          </div>
        </div>

        <div className="flex flex-row gap-3 sm:gap-4 items-center flex-wrap sm:flex-nowrap">
          {/* Submit Fee Deposit */}
          <button
            type="button"
            onClick={() => setShowDepositModal(true)}
            title="Submit personal fee deposit slip"
            className="px-4 py-2 text-sm font-medium rounded-md font-heading inline-flex items-center gap-2 bg-brand-gold hover:bg-yellow-600 text-white transition-all shadow-sm"
          >
            <Receipt className="w-4 h-4" />
            <span>Submit Fee Deposit</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUserModal(true)}
            className="px-4 py-2 text-sm font-medium rounded-md font-heading inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>{t('dashboard.addUser')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHostelModal(true)}
            className="px-4 py-2 text-sm font-medium rounded-md font-heading inline-flex items-center gap-2 bg-brand-navy hover:bg-slate-800 text-white shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('dashboard.createHostel')}</span>
          </button>
        </div>
      </div>

      {/* Global Metrics */}
      {(() => {
        const myPersonalMeals = mealAutomationService.getUserPersonalConsumedMeals(userProfile);
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="My Consumed Meals"
                value={`${myPersonalMeals} Meals`}
                subtitle="Executive dining attendance"
                change="Executive Tier"
                changeType="positive"
                icon={Utensils}
              />
              <StatCard
                title={t('dashboard.dynamicMealRate')}
                value={`৳ ${dynamicMealRate.mealRate} / meal`}
                subtitle={`৳ ${dynamicMealRate.totalBazarExpenses.toLocaleString()} Bazar ÷ ${dynamicMealRate.totalConsumedMeals} Meals`}
                change={t('dashboard.smartRealTimeRate')}
                changeType="positive"
                icon={DollarSign}
              />
              <StatCard
                title={t('dashboard.totalDirectory')}
                value={`${users.length} Enrolled`}
                subtitle="Across all 6 administrative tiers"
                change="Synchronized"
                changeType="positive"
                icon={Users}
              />
              <StatCard
                title={t('dashboard.capacityOccupancy')}
                value={`${totalOccupied} / ${totalBeds}`}
                subtitle="Beds occupied across all halls"
                change={`${Math.round((totalOccupied / (totalBeds || 1)) * 100)}% Occupancy`}
                changeType="neutral"
                icon={ShieldCheck}
              />
              <StatCard
                title={t('dashboard.approvedExpenses')}
                value={`৳ ${totalEstExpenses.toLocaleString()}`}
                subtitle={`${totalPendingEst} Pending approvals`}
                change="Audited"
                changeType="positive"
                icon={DollarSign}
              />
            </div>

            {/* Universal Daily Meal Choice Bento Card (T1 Superintendent) with Hostel Selector */}
            <NextDayMealToggle
              isSuperintendent={true}
              rollNumber={userProfile?.rollNumber || userProfile?.loginId || 'admin'}
              userName={userProfile?.name || 'Dr. Anwar Hossain'}
              userRole="superintendent"
              onUpdate={() => loadAllData()}
            />
          </>
        );
      })()}

      {settingsSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{settingsSuccess}</span>
        </div>
      )}

      {exportSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
          <button onClick={() => setExportSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* PROMINENT FINANCIAL REPORTS & AUDIT EXPORT CARD */}
      <Card
        title={t('dashboard.financialAuditTitle')}
        subtitle={t('dashboard.financialAuditSubtitle')}
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">{t('dashboard.reportScope')}</span>
            <select
              value={selectedReportHostelId}
              onChange={(e) => setSelectedReportHostelId(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-brand-900 font-bold focus:outline-none cursor-pointer"
            >
              {hostels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        }
      >
        {/* Date Range Picker Bar */}
        <div className="mb-4 p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span>{t('common.filterDateRange')}:</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-slate-500">{t('common.fromDate')}</label>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-slate-500">{t('common.toDate')}</label>
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
                {t('common.clearDates')}
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
              <span>{t('common.showingAllTime')}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Report 1: Meal Financial Statement */}
          <div className="p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-teal-50/30 space-y-4 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="teal" size="sm">REPORT 01</Badge>
                <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-brand-600" />
                  {t('dashboard.mealStatement')}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {t('dashboard.mealStatementDesc')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
              <button
                onClick={handleExportMealExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 transition-all shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('common.downloadExcel')}</span>
              </button>
              <button
                onClick={handleExportMealPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-all shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>{t('common.downloadPDF')}</span>
              </button>
            </div>
          </div>

          {/* Report 2: Establishment Expense Ledger */}
          <div className="p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/60 space-y-4 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="neutral" size="sm">REPORT 02</Badge>
                <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-brand-600" />
                  {t('dashboard.establishmentLedger')}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {t('dashboard.establishmentLedgerDesc')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
              <button
                onClick={handleExportEstablishmentExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 transition-all shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('common.downloadExcel')}</span>
              </button>
              <button
                onClick={handleExportEstablishmentPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-all shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>{t('common.downloadPDF')}</span>
              </button>
            </div>
          </div>

          {/* Report 3: Student Fee Deposit Audit Ledger */}
          <div className="p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-emerald-50/20 space-y-4 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="success" size="sm">REPORT 03</Badge>
                <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Student Deposit Ledger
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Itemized audit ledger of student fee deposits featuring transaction IDs, approval status, and verified "Approved By" audit trail.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
              <button
                onClick={handleExportDepositsExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 transition-all shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('common.downloadExcel')}</span>
              </button>
              <button
                onClick={handleExportDepositsPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-all shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>{t('common.downloadPDF')}</span>
              </button>
            </div>
          </div>

        </div>
      </Card>

      {/* SUPERINTENDENT GLOBAL MASTER CONTROL SWITCHES */}
      <Card
        title="Superintendent Master Financial Control Panel"
        subtitle="Global master switches dynamically dictate whether financial numbers and balances are visible to students"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Master Switch 1: Meal Calculations */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-brand-600" />
                  Meal Calculations Switch
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Master toggle for mess balances and dynamic meal rate display on Boarder dashboards.
                </p>
              </div>
              <Badge variant={settings.mealCalculationsEnabled ? 'success' : 'danger'} size="sm">
                {settings.mealCalculationsEnabled ? 'ACTIVE (ON)' : 'MUTED (OFF)'}
              </Badge>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">
                {settings.mealCalculationsEnabled ? 'Student balances visible' : 'Balances hidden for audit'}
              </span>
              <button
                type="button"
                onClick={() => handleToggleMaster('mealCalculationsEnabled', !settings.mealCalculationsEnabled)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  settings.mealCalculationsEnabled ? 'bg-brand-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    settings.mealCalculationsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Master Switch 2: Establishment Calculations */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-brand-600" />
                  Establishment Calculations Switch
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Master toggle for establishment fee calculations on Non-Boarder & Boarder portals.
                </p>
              </div>
              <Badge variant={settings.establishmentCalculationsEnabled ? 'success' : 'danger'} size="sm">
                {settings.establishmentCalculationsEnabled ? 'ACTIVE (ON)' : 'MUTED (OFF)'}
              </Badge>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">
                {settings.establishmentCalculationsEnabled ? 'Establishment figures on' : 'Hidden for review'}
              </span>
              <button
                type="button"
                onClick={() => handleToggleMaster('establishmentCalculationsEnabled', !settings.establishmentCalculationsEnabled)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  settings.establishmentCalculationsEnabled ? 'bg-brand-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    settings.establishmentCalculationsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Cut-off Configuration & Testing Rule Switch */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-600" />
                  Cut-Off Rule Simulator
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Daily cut-off: <strong>{settings.cutOffTime} (8:00 PM)</strong>. Toggle simulation to test locked state.
                </p>
              </div>
              <Badge variant={settings.simulateCutOffExpired ? 'danger' : 'teal'} size="sm">
                {settings.simulateCutOffExpired ? 'LOCKED' : 'OPEN'}
              </Badge>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">
                Simulate Cut-Off Expired:
              </span>
              <button
                type="button"
                onClick={() => handleToggleMaster('simulateCutOffExpired', !settings.simulateCutOffExpired)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  settings.simulateCutOffExpired ? 'bg-rose-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    settings.simulateCutOffExpired ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

        </div>
      </Card>

      {/* Hostels Management Section */}
      <Card
        title={t('dashboard.hostelRegistryTitle')}
        subtitle={t('dashboard.hostelRegistrySubtitle')}
        action={
          <Button variant="ghost" size="sm" className="text-brand-600 font-semibold" onClick={() => setShowHostelModal(true)}>
            {t('dashboard.addHostelBtn')}
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hostels.length === 0 ? (
            <div className="md:col-span-2 p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 space-y-2">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No hostel halls registered for this institute.</p>
              <p className="text-xs text-slate-500">Create a hall to manage room allocations and student boarders.</p>
            </div>
          ) : (
            hostels.map((h) => {
              const hRate = mealAutomationService.calculateHostelMealRate(h.id);
              return (
                <div key={h.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-all space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{h.name}</h3>
                        <Badge variant="teal" size="sm">{h.code}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{h.category || h.type}</p>
                    </div>
                    <Badge variant={h.status === 'active' ? 'success' : 'neutral'} size="sm" className="shrink-0">
                      {(h.status || 'active').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-center">
                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('hostels.rooms')}</p>
                      <p className="text-sm font-bold text-slate-800">{h.totalRooms}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('hostels.beds')}</p>
                      <p className="text-sm font-bold text-slate-800">{h.totalBeds}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('dashboard.dynamicMealRate')}</p>
                      <p className="text-sm font-bold text-brand-700">৳ {hRate.mealRate}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditHostel(h)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Hall</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteHostelModal(h)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Hall</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Cross-Tier User Management Section */}
      <Card
        title={t('dashboard.userDirectoryTitle')}
        subtitle={t('dashboard.userDirectorySubtitle')}
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
        {/* Multi-Checkbox Filter & Advanced Export Panel */}
        <div className="p-3.5 mb-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-brand-600" />
                {t('dashboard.filterAndExport')}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                ({filteredUsers.length} {t('dashboard.recordsSelected')})
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
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">{t('dashboard.userAndId')}</th>
                <th className="pb-3">{t('dashboard.assignedTier')}</th>
                <th className="pb-3">Gender</th>
                <th className="pb-3">{t('dashboard.assignedHostel')}</th>
                <th className="pb-3">{t('dashboard.roomContact')}</th>
                <th className="pb-3">{t('dashboard.financialBalance')}</th>
                <th className="pb-3 text-center">{t('common.status')}</th>
                <th className="pb-3 text-right pr-2">{t('common.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-6 text-center text-slate-400 italic">
                    No users found matching the selected role filter or search keyword.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const fin = getUserFinancialStatus(u);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-2">
                        <button
                          type="button"
                          onClick={() => setViewingUserId(u.id || u.rollNumber || u.loginId)}
                          className="group cursor-pointer flex items-center gap-3 text-left"
                          title="View complete member profile & financial ledger"
                        >
                          <AvatarRenderer
                            avatarId={u.avatar_id}
                            gender={u.gender}
                            className="w-9 h-9 rounded-full border border-slate-200 shadow-2xs"
                          />
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{u.name}</p>
                            <span className="text-[11px] text-slate-400 group-hover:text-slate-600 font-mono transition-colors">
                              ID: {u.loginId} {u.rollNumber ? `• Roll: ${u.rollNumber}` : ''}
                            </span>
                          </div>
                        </button>
                      </td>
                      <td className="py-3">
                        <Badge 
                          variant={
                            u.role === USER_ROLES.SUPERINTENDENT ? 'teal' :
                            u.role === USER_ROLES.HOSTEL_SUPER ? 'info' :
                            u.role === USER_ROLES.HOSTEL_MONITOR ? 'warning' :
                            u.role === USER_ROLES.MEAL_MANAGER ? 'success' : 'neutral'
                          } 
                          size="sm"
                        >
                          {u.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={normalizeGender(u.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                          {normalizeGender(u.gender)}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-600 font-medium">
                        {u.hostelName || (u.hostelId ? hostels.find(h => h.id === u.hostelId)?.name : 'Global / All')}
                      </td>
                      <td className="py-3 text-slate-500">
                        {u.roomNumber ? `Room ${u.roomNumber}` : 'Office'} • {u.phone || 'N/A'}
                      </td>
                      <td className="py-3">
                        {u.role === USER_ROLES.SUPERINTENDENT || u.role === USER_ROLES.HOSTEL_SUPER ? (
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
                      <td className="py-3 text-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                        <span className="text-slate-700 capitalize font-medium">{u.status}</span>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="px-3 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors border border-teal-200 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{t('dashboard.changeRole')}</span>
                          </button>
                          {u.id !== userProfile?.id && u.loginId !== userProfile?.loginId && (
                            <button
                              type="button"
                              onClick={() => setDeletingUser(u)}
                              title="Delete User"
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

      {/* Modal: Create Hostel */}
      {showHostelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-dropdown p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Register New Hostel Hall</h3>
              <button onClick={() => setShowHostelModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateHostel} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hostel Hall Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shaheed Titumir Hall"
                  value={newHostel.name}
                  onChange={(e) => setNewHostel({ ...newHostel, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hall Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STH"
                    value={newHostel.code}
                    onChange={(e) => setNewHostel({ ...newHostel, code: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 uppercase focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600 uppercase">Hostel Category</label>
                    <button
                      type="button"
                      onClick={() => setShowCustomCatInput(!showCustomCatInput)}
                      className="text-[10px] text-brand-600 hover:text-brand-800 font-bold hover:underline cursor-pointer"
                    >
                      + Add Custom Category
                    </button>
                  </div>
                  {showCustomCatInput ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Type new category..."
                        value={customCatName}
                        onChange={(e) => setCustomCatName(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-brand-300 bg-brand-50/30 text-slate-800 focus:outline-none focus:border-brand-600"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCategory}
                        className="px-2.5 py-2 text-xs font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700 cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomCatInput(false)}
                        className="p-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={newHostel.type}
                      onChange={(e) => setNewHostel({ ...newHostel, type: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600 cursor-pointer"
                    >
                      {hostelCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Total Rooms</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newHostel.totalRooms}
                    onChange={(e) => setNewHostel({ ...newHostel, totalRooms: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Total Bed Capacity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newHostel.totalBeds}
                    onChange={(e) => setNewHostel({ ...newHostel, totalBeds: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowHostelModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm">Register Hall</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Hostel Hall */}
      {editingHostel && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-dropdown overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Edit Hostel Hall</h3>
                  <p className="text-[11px] text-slate-500">Updates hall details across your institute immediately</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingHostel(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/70 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedHostel} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hall Name</label>
                <input
                  type="text"
                  required
                  value={editingHostel.name}
                  onChange={(e) => setEditingHostel({ ...editingHostel, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hall Code</label>
                  <input
                    type="text"
                    required
                    value={editingHostel.code}
                    onChange={(e) => setEditingHostel({ ...editingHostel, code: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 uppercase focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Category</label>
                  <select
                    value={editingHostel.type || editingHostel.category || ''}
                    onChange={(e) => setEditingHostel({ ...editingHostel, type: e.target.value, category: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer"
                  >
                    {Array.from(new Set([...hostelCategories, ...(editingHostel.type ? [editingHostel.type] : [])])).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Total Rooms</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingHostel.totalRooms}
                    onChange={(e) => setEditingHostel({ ...editingHostel, totalRooms: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Total Bed Capacity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingHostel.totalBeds}
                    onChange={(e) => setEditingHostel({ ...editingHostel, totalBeds: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditingHostel(null)} disabled={isSavingHostel}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={isSavingHostel}>
                  {isSavingHostel ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Strict Red Warning Delete Hostel Hall */}
      {hostelPendingDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-rose-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-950 text-sm">Delete Hostel Hall</h3>
                  <p className="text-[11px] text-rose-700 font-medium">Critical Administrative Warning</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHostelPendingDelete(null)}
                disabled={isDeletingHostel}
                className="text-rose-400 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-sm font-bold text-rose-900 leading-relaxed">
                Are you sure you want to delete {hostelPendingDelete.name}? This action cannot be undone.
              </p>

              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900 space-y-1.5 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  Automatic Resident Cascade &amp; Unassignment
                </p>
                <p>
                  {hostelPendingDelete.affectedStudentsCount > 0 ? (
                    <>
                      <strong>{hostelPendingDelete.affectedStudentsCount}</strong> assigned trainee(s) (Boarder Student / Meal Manager / Hostel Monitor) will have their <code className="px-1 py-0.5 rounded bg-rose-100 font-mono text-[11px]">hostel_id</code> and <code className="px-1 py-0.5 rounded bg-rose-100 font-mono text-[11px]">room_no</code> cleared to <code className="px-1 py-0.5 rounded bg-rose-100 font-mono text-[11px]">null</code> and automatically revert to <strong>Non-Boarder Student</strong>.
                    </>
                  ) : (
                    <>
                      All rooms registered under <strong>{hostelPendingDelete.name}</strong> ({hostelPendingDelete.code}) will be permanently removed, and any linked student allocations will revert to <strong>Non-Boarder Student</strong>.
                    </>
                  )}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setHostelPendingDelete(null)}
                  disabled={isDeletingHostel}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  loading={isDeletingHostel}
                  onClick={handleConfirmDeleteHostel}
                >
                  {isDeletingHostel ? 'Deleting...' : 'Delete Hall'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create User */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-dropdown p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Enroll New User Across 6 Tiers</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shakil Ahmed"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Administrative Tier</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-brand-600"
                  >
                    <option value={USER_ROLES.SUPERINTENDENT}>Superintendent</option>
                    <option value={USER_ROLES.HOSTEL_SUPER}>Hostel Super</option>
                    <option value={USER_ROLES.HOSTEL_MONITOR}>Hostel Monitor</option>
                    <option value={USER_ROLES.MEAL_MANAGER}>Meal Manager</option>
                    <option value={USER_ROLES.BOARDER_STUDENT}>Boarder Student</option>
                    <option value={USER_ROLES.NON_BOARDER_STUDENT}>Non-Boarder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Assigned Hostel</label>
                  <select
                    value={newUser.hostelId}
                    onChange={(e) => setNewUser({ ...newUser, hostelId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-brand-600"
                  >
                    {hostels.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">User ID / Login ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. shakil_105"
                    value={newUser.loginId}
                    onChange={(e) => setNewUser({ ...newUser, loginId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Class Roll (if student)</label>
                  <input
                    type="text"
                    placeholder="e.g. 105"
                    value={newUser.rollNumber}
                    onChange={(e) => setNewUser({ ...newUser, rollNumber: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Gender</label>
                <select
                  value={normalizeGender(newUser.gender)}
                  onChange={(e) => setNewUser({ ...newUser, gender: normalizeGender(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-brand-600"
                >
                  {GENDER_OPTIONS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowUserModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm">Enroll User</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User & Change Role */}
      <UserEditModal
        user={editingUser}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onUserUpdated={() => loadAllData()}
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
        effectiveHostelId={selectedReportHostelId || 'hostel_01'}
        effectivePtiId={effectivePtiId}
        targetMonth={currentMonth}
        onSuccess={(entry, updated) => {
          setDeposits(updated);
          setSettingsSuccess(`Personal deposit of ৳${entry.amount} submitted successfully for ${entry.hostelName || 'Hostel'}.`);
          setTimeout(() => setSettingsSuccess(''), 4500);
        }}
      />

    </div>
  );
}
