import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Mail, 
  Phone, 
  MapPin, 
  Sparkles, 
  Filter, 
  Layers, 
  ExternalLink,
  Lock,
  Globe2,
  RefreshCw,
  AlertCircle,
  PauseCircle,
  Ban,
  Trash2,
  PlayCircle,
  ChevronDown,
  AlertTriangle,
  X
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import AvatarRenderer from '../components/Avatars/AvatarRenderer';
import { GENDER_OPTIONS, normalizeGender } from '../constants/avatars';
import { useAuth, USER_ROLES } from '../contexts/AuthContext';
import { 
  getAllPtis, 
  registerNewPti, 
  appointSuperintendent, 
  updatePtiStatus,
  deletePtiCascade,
  normalizePtiStatus,
  getPtiUserCount, 
  getPtiHostelCount
} from '../services/seedService';
import { dbService } from '../services/db';

export default function MasterDashboard() {
  const { userProfile, switchDemoUser } = useAuth();
  
  const [ptis, setPtis] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Active' | 'Paused' | 'Blocked' | 'pending'
  
  // Modals & Popover Menu state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showAppointModal, setShowAppointModal] = useState(false);
  const [selectedPtiForSuper, setSelectedPtiForSuper] = useState(null);
  const [actionMenu, setActionMenu] = useState(null); // { pti, top, right }
  const [ptiPendingDelete, setPtiPendingDelete] = useState(null); // { pti, userCount, hostelCount }
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Form State for Register PTI
  const [newPtiForm, setNewPtiForm] = useState({
    name: '',
    shortName: '',
    district: '',
    division: 'Dhaka',
    code: '',
  });

  // Form State for Appoint Superintendent
  const [appointForm, setAppointForm] = useState({
    name: '',
    loginId: '',
    email: '',
    phone: '',
    gender: 'Male',
    password: 'super123',
  });

  const [notification, setNotification] = useState('');

  // Load PTIs data
  const loadPtis = () => {
    const list = getAllPtis();
    setPtis(list);
  };

  useEffect(() => {
    loadPtis();
    const handleInstitutesChanged = () => loadPtis();
    const handleUsersChanged = () => loadPtis();
    window.addEventListener('pti_institutes_changed', handleInstitutesChanged);
    window.addEventListener('pti_users_changed', handleUsersChanged);
    return () => {
      window.removeEventListener('pti_institutes_changed', handleInstitutesChanged);
      window.removeEventListener('pti_users_changed', handleUsersChanged);
    };
  }, []);

  // Close floating action menu on click outside, scroll, or Escape
  useEffect(() => {
    if (!actionMenu) return;
    const closeMenu = () => setActionMenu(null);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [actionMenu]);

  // Compute aggregated stats
  const totalPtisRegistered = ptis.length;
  const activePtisCount = useMemo(() => {
    return ptis.filter(p => normalizePtiStatus(p.status) === 'Active').length;
  }, [ptis]);

  const pausedPtisCount = useMemo(() => {
    return ptis.filter(p => normalizePtiStatus(p.status) === 'Paused').length;
  }, [ptis]);

  const blockedPtisCount = useMemo(() => {
    return ptis.filter(p => normalizePtiStatus(p.status) === 'Blocked').length;
  }, [ptis]);

  const pendingSetupCount = useMemo(() => {
    return ptis.filter(p => !p.superintendentId).length;
  }, [ptis]);

  const totalSuperintendents = ptis.filter(p => p.superintendentId).length;
  
  const totalNationwideUsers = useMemo(() => {
    return ptis.reduce((sum, p) => sum + getPtiUserCount(p.pti_id || p.id), 0);
  }, [ptis]);

  const totalNationwideHostels = useMemo(() => {
    return ptis.reduce((sum, p) => sum + getPtiHostelCount(p.pti_id || p.id), 0);
  }, [ptis]);

  // Filtered PTIs
  const filteredPtis = useMemo(() => {
    return ptis.filter(p => {
      const normalizedStatus = normalizePtiStatus(p.status);
      const matchSearch = 
        (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.shortName && p.shortName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.district && p.district.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.superintendentName && p.superintendentName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'pending' ? !p.superintendentId :
        normalizedStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [ptis, searchTerm, statusFilter]);

  const showToast = (msg, durationMs = 4500) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), durationMs);
  };

  // Handle Register PTI
  const handleRegisterSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newPtiForm.name.trim() || !newPtiForm.district.trim()) {
      // Simulate quick registration if empty
      const demoDistrict = ['Sylhet', 'Khulna', 'Barishal', 'Mymensingh', 'Rangpur'][Math.floor(Math.random() * 5)];
      const created = registerNewPti({
        name: `${demoDistrict} Govt. Primary Teachers' Training Institute`,
        shortName: `${demoDistrict} PTI`,
        district: demoDistrict,
        division: demoDistrict,
        code: `PTI-${demoDistrict.slice(0, 3).toUpperCase()}-${(ptis.length + 1).toString().padStart(2, '0')}`
      });
      loadPtis();
      setShowRegisterModal(false);
      showToast(`Institute "${created.name}" registered successfully with ID: ${created.pti_id}`, 4000);
      return;
    }

    try {
      const created = registerNewPti(newPtiForm);
      loadPtis();
      setShowRegisterModal(false);
      setNewPtiForm({ name: '', shortName: '', district: '', division: 'Dhaka', code: '' });
      showToast(`Institute "${created.name}" registered successfully with ID: ${created.pti_id}`, 4000);
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  // Quick simulate institute registration directly from the Bento button
  const handleSimulateNewPti = () => {
    const districts = ['Barishal', 'Khulna', 'Mymensingh', 'Rangpur', 'Sylhet', 'Bogura', 'Comilla'];
    const chosen = districts[Math.floor(Math.random() * districts.length)];
    const code = `PTI-${chosen.slice(0, 3).toUpperCase()}-${(ptis.length + 1).toString().padStart(2, '0')}`;
    const newInst = registerNewPti({
      name: `${chosen} Govt. Primary Teachers' Training Institute`,
      shortName: `${chosen} PTI`,
      district: chosen,
      division: chosen,
      code
    });
    loadPtis();
    showToast(`Simulated registration: "${newInst.name}" (${newInst.code}) created successfully!`);
  };

  // Open Appoint Modal
  const openAppointModal = (pti) => {
    setSelectedPtiForSuper(pti);
    const suggestedLogin = `super.${(pti.shortName || pti.district || 'inst').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    setAppointForm({
      name: '',
      loginId: suggestedLogin,
      email: `${suggestedLogin}@pti.gov.bd`,
      phone: '+880 1711-000000',
      gender: 'Male',
      password: 'super123',
    });
    setShowAppointModal(true);
  };

  // Handle Appoint Superintendent
  const handleAppointSubmit = (e) => {
    e.preventDefault();
    if (!selectedPtiForSuper) return;
    if (!appointForm.name.trim() || !appointForm.loginId.trim()) {
      alert('Superintendent Name and Login ID are required.');
      return;
    }

    try {
      const result = appointSuperintendent(selectedPtiForSuper.pti_id || selectedPtiForSuper.id, appointForm);
      loadPtis();
      setShowAppointModal(false);
      showToast(`Superintendent ${result.superintendent.name} appointed to ${selectedPtiForSuper.name}! Login ID: ${result.superintendent.loginId}`, 5000);
    } catch (err) {
      alert(`Appointment failed: ${err.message}`);
    }
  };

  // Update PTI Status ('Active' | 'Paused' | 'Blocked')
  const handleUpdatePtiStatus = (pti, newStatus) => {
    try {
      const ptiId = pti.pti_id || pti.id;
      updatePtiStatus(ptiId, newStatus);
      loadPtis();
      setActionMenu(null);
      if (newStatus === 'Active') {
        showToast(`"${pti.name}" has been reactivated. All authorized users may sign in.`);
      } else {
        showToast(`"${pti.name}" status changed to ${newStatus}. All T1–T6 logins for this institute are now suspended.`);
      }
    } catch (err) {
      alert(`Failed to update PTI status: ${err.message}`);
    }
  };

  // Open Strict Delete Confirmation Modal
  const openDeleteConfirmationModal = (pti) => {
    const ptiId = pti.pti_id || pti.id;
    setActionMenu(null);
    setDeleteConfirmText('');
    setPtiPendingDelete({
      pti,
      userCount: getPtiUserCount(ptiId),
      hostelCount: getPtiHostelCount(ptiId),
    });
  };

  // Confirm Permanent Cascade Deletion
  const handleConfirmDeletePti = (e) => {
    e.preventDefault();
    if (!ptiPendingDelete) return;
    const expectedCode = String(ptiPendingDelete.pti.code || ptiPendingDelete.pti.pti_id || '').trim().toUpperCase();
    const typed = deleteConfirmText.trim().toUpperCase();
    if (typed !== 'DELETE' && typed !== expectedCode) {
      return;
    }

    try {
      const ptiId = ptiPendingDelete.pti.pti_id || ptiPendingDelete.pti.id;
      const ptiName = ptiPendingDelete.pti.name;
      deletePtiCascade(ptiId);
      setPtiPendingDelete(null);
      setDeleteConfirmText('');
      loadPtis();
      showToast(`Permanently deleted "${ptiName}" (${ptiId}) and cascaded removal of all its users, hostels, and financial records.`, 5500);
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  // Open Floating Row Action Menu
  const toggleRowActionMenu = (e, pti) => {
    e.stopPropagation();
    const ptiId = pti.pti_id || pti.id;
    if (actionMenu && (actionMenu.pti.pti_id || actionMenu.pti.id) === ptiId) {
      setActionMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 250;
    const openUpward = window.innerHeight - rect.bottom < menuHeight;
    setActionMenu({
      pti,
      top: openUpward ? Math.max(12, rect.top - menuHeight) : rect.bottom + 6,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  };

  // Quick switch into Superintendent account for live inspection
  const handleInspectAsSuper = async (pti) => {
    const status = normalizePtiStatus(pti.status);
    if (status !== 'Active') {
      showToast(`Cannot inspect "${pti.name}" while status is ${status}. Activate the account first.`);
      return;
    }
    if (!pti.superintendentId) {
      openAppointModal(pti);
      return;
    }
    const users = dbService.getUsers();
    const superUser = users.find(u => u.id === pti.superintendentId || (u.pti_id === pti.pti_id && u.role === USER_ROLES.SUPERINTENDENT));
    if (superUser) {
      await switchDemoUser(superUser.loginId || superUser.username || superUser.id);
      window.location.href = '/';
    } else {
      alert('Superintendent account not found. Please re-appoint a Superintendent for this PTI.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button 
            onClick={() => setNotification('')}
            className="text-xs text-teal-600 hover:text-teal-800 font-bold px-2 py-1 rounded-md"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* Top Header: "Central Master Admin Dashboard" */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <AvatarRenderer
            avatarId={userProfile?.avatar_id}
            gender={userProfile?.gender}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-teal-100 ring-2 ring-teal-500/20 shadow-sm mt-0.5"
          />
          <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold tracking-wider uppercase bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Tier 0 • Master Admin
            </span>
            <span className="text-[11px] font-bold tracking-wider uppercase bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-slate-500" /> Multi-Tenant Central Admin
            </span>
            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              ● Central Oversight (pti_id: GLOBAL)
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
              normalizeGender(userProfile?.gender) === 'Female'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-sky-50 text-sky-800 border-sky-200'
            }`}>
              Gender: {normalizeGender(userProfile?.gender)}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-2.5">
            Central Master Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Central governance across 67 nationwide Primary Teachers' Training Institutes with strict tenant data isolation.
          </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-brand-gold hover:bg-yellow-600 shadow-sm hover:shadow transition-all duration-200 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Register New PTI
          </button>
        </div>
      </div>

      {/* Bento Grid: Featuring the requested [Register New PTI] Button Card & [Active PTIs: X] Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: [Active PTIs: 1] (Metric Card) */}
        <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500 truncate">Active PTIs</p>
              <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-bold tracking-tight text-slate-800">
                  Active PTIs: {activePtisCount}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {totalPtisRegistered} Total Registered / 67 National Target
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              ● {activePtisCount} Active
            </span>
            <span className="text-amber-600 font-semibold">
              {pausedPtisCount} Paused • <span className="text-rose-600">{blockedPtisCount} Blocked</span>
            </span>
          </div>
        </div>

        {/* Card 2: [Register New PTI] (Action / Simulation Bento Card) */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl sm:rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between text-white group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold tracking-wider uppercase bg-white/20 px-2.5 py-0.5 rounded-full">
                Quick Action
              </span>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
            <h3 className="text-lg font-bold">Register New PTI</h3>
            <p className="text-xs text-teal-100 mt-1">
              Provision a new isolated institute partition with automatic credentials.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex-1 py-2 px-3 bg-white text-teal-800 font-bold text-xs rounded-xl hover:bg-teal-50 transition-colors shadow-xs text-center"
            >
              Open Form
            </button>
            <button
              onClick={handleSimulateNewPti}
              className="py-2 px-3 bg-teal-800/60 hover:bg-teal-800 text-teal-100 font-semibold text-xs rounded-xl transition-colors text-center"
              title="Instant simulate creating a new institute"
            >
              Simulate (+1)
            </button>
          </div>
        </div>

        {/* Card 3: Appointed Superintendents */}
        <StatCard
          title="Appointed Superintendents"
          value={totalSuperintendents}
          subtitle="Tier 1 Institutional Leaders"
          icon={ShieldCheck}
          accentColor="emerald"
          change={`${totalPtisRegistered - totalSuperintendents} Pending Setup`}
          changeType="neutral"
        />

        {/* Card 4: Enrolled Users & Hostels */}
        <StatCard
          title="Enrolled Users & Hostels"
          value={totalNationwideUsers.toLocaleString()}
          subtitle={`${totalNationwideHostels} Active Halls Monitored`}
          icon={Users}
          accentColor="violet"
          change="Nationwide Partitioning"
          changeType="positive"
        />
      </div>

      {/* PTI Registry & Global Overview */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 shadow-sm space-y-5">
        
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              Registered Institutes Directory (Global Overview)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Partitioned database records by unique <code className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded font-mono text-[11px]">pti_id</code>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Bar */}
            <div className="relative flex-1 sm:w-64 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search institute or district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-teal-500 transition-colors shrink-0"
            >
              <option value="all">All Institutes ({ptis.length})</option>
              <option value="Active">Active ({activePtisCount})</option>
              <option value="Paused">Paused ({pausedPtisCount})</option>
              <option value="Blocked">Blocked ({blockedPtisCount})</option>
              <option value="pending">Pending T1 ({pendingSetupCount})</option>
            </select>
          </div>
        </div>

        {/* Global Overview Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Code & Institute Name</th>
                <th className="py-3 px-4">Region / District</th>
                <th className="py-3 px-4">Appointed Superintendent (T1)</th>
                <th className="py-3 px-4 text-center">Users</th>
                <th className="py-3 px-4 text-center">Hostels</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Central Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPtis.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-medium">
                    No registered institutes match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredPtis.map((pti) => {
                  const ptiId = pti.pti_id || pti.id;
                  const userCount = getPtiUserCount(ptiId);
                  const hostelCount = getPtiHostelCount(ptiId);
                  const hasSuper = Boolean(pti.superintendentId);
                  const ptiStatus = normalizePtiStatus(pti.status);
                  const isMenuOpen = actionMenu && (actionMenu.pti.pti_id || actionMenu.pti.id) === ptiId;

                  return (
                    <tr key={ptiId} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200">
                            {pti.shortName?.slice(0, 2) || pti.name?.slice(0, 2) || 'PT'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <span>{pti.name}</span>
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {pti.code || ptiId}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-teal-600">
                              id: {ptiId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* District & Division */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold">{pti.district || 'N/A'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 ml-5">{pti.division || 'Bangladesh'}</span>
                      </td>

                      {/* Appointed Superintendent */}
                      <td className="py-3.5 px-4">
                        {hasSuper ? (
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{pti.superintendentName || 'Prof. Superintendent'}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                              {pti.superintendentEmail && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-400" /> {pti.superintendentEmail}
                                </span>
                              )}
                              {pti.superintendentPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" /> {pti.superintendentPhone}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>No Superintendent Appointed</span>
                          </div>
                        )}
                      </td>

                      {/* User Count */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[11px]">
                          {userCount} Users
                        </span>
                      </td>

                      {/* Hostel Count */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[11px]">
                          {hostelCount} Halls
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          {ptiStatus === 'Active' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              ● Active
                            </span>
                          )}
                          {ptiStatus === 'Paused' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                              <PauseCircle className="w-3 h-3" /> Paused
                            </span>
                          )}
                          {ptiStatus === 'Blocked' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                              <Ban className="w-3 h-3" /> Blocked
                            </span>
                          )}
                          {!hasSuper && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50/70 px-2 py-0.5 rounded-md border border-amber-100">
                              Pending T1
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Central Admin Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!hasSuper && (
                            <button
                              type="button"
                              onClick={() => openAppointModal(pti)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                              title="Appoint first Superintendent"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Appoint
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => toggleRowActionMenu(e, pti)}
                            aria-expanded={Boolean(isMenuOpen)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              isMenuOpen
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <span>Action</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: REGISTER NEW PTI */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Register New PTI Institute</h3>
                  <p className="text-[11px] text-slate-500">Creates isolated multi-tenant partition with unique pti_id</p>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Institute Official Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sylhet Govt. Primary Teachers' Training Institute"
                  value={newPtiForm.name}
                  onChange={(e) => setNewPtiForm({ ...newPtiForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Short Name / Display Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sylhet PTI"
                    value={newPtiForm.shortName}
                    onChange={(e) => setNewPtiForm({ ...newPtiForm, shortName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sylhet"
                    value={newPtiForm.district}
                    onChange={(e) => setNewPtiForm({ ...newPtiForm, district: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Division
                  </label>
                  <select
                    value={newPtiForm.division}
                    onChange={(e) => setNewPtiForm({ ...newPtiForm, division: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:border-teal-500"
                  >
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chattogram">Chattogram</option>
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Khulna">Khulna</option>
                    <option value="Barishal">Barishal</option>
                    <option value="Sylhet">Sylhet</option>
                    <option value="Rangpur">Rangpur</option>
                    <option value="Mymensingh">Mymensingh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Institute Code
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank (e.g. PTI-SYL-04)"
                    value={newPtiForm.code}
                    onChange={(e) => setNewPtiForm({ ...newPtiForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 font-mono font-medium"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-[11px] leading-relaxed">
                <strong>Automatic Multi-Tenant Isolation:</strong> Upon saving, the system creates a brand-new tenant partition with its own isolated users, hostels, meal ledgers, and white-label settings.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-brand-gold hover:bg-yellow-600 transition-colors shadow-xs"
                >
                  Register PTI Institute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: APPOINT SUPERINTENDENT */}
      {showAppointModal && selectedPtiForSuper && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Appoint Superintendent (Tier 1)</h3>
                  <p className="text-[11px] text-slate-500">
                    Target: <span className="font-bold text-slate-800">{selectedPtiForSuper.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAppointModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAppointSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Tenant Binding ID</span>
                  <span className="font-mono font-bold text-teal-700">{selectedPtiForSuper.pti_id || selectedPtiForSuper.id}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Location</span>
                  <span className="font-semibold text-slate-800">{selectedPtiForSuper.district}, {selectedPtiForSuper.division}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Superintendent Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Md. Rafiqul Islam"
                  value={appointForm.name}
                  onChange={(e) => setAppointForm({ ...appointForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Login ID / Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. super.sylhet"
                    value={appointForm.loginId}
                    onChange={(e) => setAppointForm({ ...appointForm, loginId: e.target.value.toLowerCase().trim() })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Default: super123"
                    value={appointForm.password}
                    onChange={(e) => setAppointForm({ ...appointForm, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 font-mono font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Email
                  </label>
                  <input
                    type="email"
                    placeholder="super.sylhet@pti.gov.bd"
                    value={appointForm.email}
                    onChange={(e) => setAppointForm({ ...appointForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+880 1711-000000"
                    value={appointForm.phone}
                    onChange={(e) => setAppointForm({ ...appointForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gender *
                </label>
                <select
                  value={appointForm.gender}
                  onChange={(e) => setAppointForm({ ...appointForm, gender: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 font-semibold bg-white text-slate-800 cursor-pointer"
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] leading-relaxed">
                <strong>Tenant Authority:</strong> This account will have full Tier 1 authority to administer hostels, create boarder records, manage establishment budgets, and configure white-label branding strictly inside <strong>{selectedPtiForSuper.name}</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAppointModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-brand-gold hover:bg-yellow-600 transition-colors shadow-xs"
                >
                  Appoint Superintendent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING CENTRAL ADMIN ACTION MENU */}
      {actionMenu && (() => {
        const pti = actionMenu.pti;
        const ptiStatus = normalizePtiStatus(pti.status);
        const hasSuper = Boolean(pti.superintendentId);

        return (
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{ top: `${actionMenu.top}px`, right: `${actionMenu.right}px` }}
            className="fixed z-50 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3.5 py-2 border-b border-slate-100">
              <p className="font-bold text-slate-800 truncate">{pti.shortName || pti.name}</p>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                {pti.pti_id || pti.id} • Status: {ptiStatus}
              </p>
            </div>

            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setActionMenu(null);
                  openAppointModal(pti);
                }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-teal-50 hover:text-teal-700 font-medium flex items-center gap-2 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{hasSuper ? 'Reassign Superintendent' : 'Appoint Superintendent'}</span>
              </button>

              {hasSuper && ptiStatus === 'Active' && (
                <button
                  type="button"
                  onClick={() => {
                    setActionMenu(null);
                    handleInspectAsSuper(pti);
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Inspect Portal</span>
                </button>
              )}
            </div>

            <div className="border-t border-slate-100 py-1">
              {ptiStatus !== 'Active' && (
                <button
                  type="button"
                  onClick={() => handleUpdatePtiStatus(pti, 'Active')}
                  className="w-full px-3.5 py-2 text-left text-emerald-700 hover:bg-emerald-50 font-semibold flex items-center gap-2 transition-colors"
                >
                  <PlayCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Activate Account</span>
                </button>
              )}

              {ptiStatus !== 'Paused' && (
                <button
                  type="button"
                  onClick={() => handleUpdatePtiStatus(pti, 'Paused')}
                  className="w-full px-3.5 py-2 text-left text-amber-700 hover:bg-amber-50 font-semibold flex items-center gap-2 transition-colors"
                >
                  <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pause Account</span>
                </button>
              )}

              {ptiStatus !== 'Blocked' && (
                <button
                  type="button"
                  onClick={() => handleUpdatePtiStatus(pti, 'Blocked')}
                  className="w-full px-3.5 py-2 text-left text-orange-700 hover:bg-orange-50 font-semibold flex items-center gap-2 transition-colors"
                >
                  <Ban className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Block Account</span>
                </button>
              )}
            </div>

            <div className="border-t border-slate-100 pt-1">
              <button
                type="button"
                onClick={() => openDeleteConfirmationModal(pti)}
                className="w-full px-3.5 py-2 text-left text-rose-700 hover:bg-rose-50 font-bold flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Delete PTI</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: STRICT DELETE PTI CONFIRMATION */}
      {ptiPendingDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-rose-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-950 text-sm">Delete PTI &amp; Cascade Data</h3>
                  <p className="text-[11px] text-rose-700">Irreversible multi-tenant purge action</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPtiPendingDelete(null)}
                className="w-7 h-7 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 flex items-center justify-center text-sm transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeletePti} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">{ptiPendingDelete.pti.name}</p>
                <p className="text-[11px] font-mono text-slate-500">
                  Code: {ptiPendingDelete.pti.code || ptiPendingDelete.pti.pti_id} • ID: {ptiPendingDelete.pti.pti_id || ptiPendingDelete.pti.id}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900 space-y-1.5 leading-relaxed">
                <p className="font-bold">Warning: Permanent Cascading Deletion</p>
                <p>
                  This will permanently remove this institute along with{' '}
                  <strong>{ptiPendingDelete.userCount}</strong> user account(s),{' '}
                  <strong>{ptiPendingDelete.hostelCount}</strong> hostel(s), room allocations,
                  meal sheets, bazar ledgers, fee deposits, establishment expenses, and white-label settings.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Type <code className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono">DELETE</code> to confirm permanent deletion:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPtiPendingDelete(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    deleteConfirmText.trim().toUpperCase() !== 'DELETE' &&
                    deleteConfirmText.trim().toUpperCase() !== String(ptiPendingDelete.pti.code || ptiPendingDelete.pti.pti_id || '').trim().toUpperCase()
                  }
                  className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed transition-colors shadow-xs inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete PTI Permanently
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
