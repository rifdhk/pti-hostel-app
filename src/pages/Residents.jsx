import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  Bed, 
  Award, 
  GraduationCap,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  MapPin,
  Edit3,
  Filter,
  Trash2
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import UserEditModal from '../components/common/UserEditModal';
import UserDeleteConfirmModal from '../components/common/UserDeleteConfirmModal';
import UserProfileModal from '../components/common/UserProfileModal';
import AvatarRenderer from '../components/Avatars/AvatarRenderer';
import { normalizeGender } from '../constants/avatars';
import { useAuth, USER_ROLES } from '../contexts/AuthContext';
import { dbService } from '../services/db';
import {
  exportUserDirectoryExcel,
  exportUserDirectoryPDF,
  getUserFinancialStatus
} from '../utils/exportReports';

export default function Residents() {
  const { t } = useTranslation();
  const { isSuperintendent, isHostelSuper, effectiveHostelId, effectivePtiId, userProfile, adminDeleteUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const ROLE_DEFINITIONS = [
    { id: USER_ROLES.SUPERINTENDENT, label: t('roles.superintendent') },
    { id: USER_ROLES.HOSTEL_SUPER, label: t('roles.hostel_super') },
    { id: USER_ROLES.HOSTEL_MONITOR, label: t('roles.hostel_monitor') },
    { id: USER_ROLES.MEAL_MANAGER, label: t('roles.meal_manager') },
    { id: USER_ROLES.BOARDER_STUDENT, label: t('roles.boarder_student') },
    { id: USER_ROLES.NON_BOARDER_STUDENT, label: t('roles.non_boarder_student') },
  ];

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

  useEffect(() => {
    loadUsers();
    
    const handleUsersChanged = () => {
      loadUsers();
    };
    window.addEventListener('pti_users_changed', handleUsersChanged);
    return () => window.removeEventListener('pti_users_changed', handleUsersChanged);
  }, [effectiveHostelId]);

  const loadUsers = () => {
    const all = dbService.getUsers();
    const tenantPtiId = effectivePtiId || userProfile?.pti_id || 'pti_dhaka';
    const tenantUsers = all.filter(u => (!tenantPtiId || u.pti_id === tenantPtiId) && u.role !== USER_ROLES.MASTER_ADMIN);

    if (!isSuperintendent) {
      // Strict data isolation
      setUsers(tenantUsers.filter(u => u.hostelId === effectiveHostelId));
    } else {
      setUsers(effectiveHostelId ? tenantUsers.filter(u => u.hostelId === effectiveHostelId || !u.hostelId) : tenantUsers);
    }
  };

  const filtered = users.filter(c => {
    const matchesRole = selectedRoles.includes(c.role) || (selectedRoles.includes(USER_ROLES.BOARDER_STUDENT) && c.role === 'boarder');
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.rollNumber && c.rollNumber.includes(search)) ||
      (c.loginId && c.loginId.toLowerCase().includes(search.toLowerCase())) ||
      (c.role && c.role.toLowerCase().includes(search.toLowerCase())) ||
      (c.district && c.district.toLowerCase().includes(search.toLowerCase())) ||
      (c.upazila && c.upazila.toLowerCase().includes(search.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const baseScope = isSuperintendent ? 'PTI Central - All Hostels' : (userProfile?.hostelName || 'Assigned Hall');
  const scopeTitle = isAllRolesSelected 
    ? baseScope 
    : `${baseScope} (${selectedRoles.map(r => r.replace('_', ' ').toUpperCase()).join(', ') || 'No Roles'})`;

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      if (adminDeleteUser) {
        await adminDeleteUser(deletingUser.id || deletingUser.rollNumber || deletingUser.loginId);
      }
      const deletedName = deletingUser.name;
      setDeletingUser(null);
      loadUsers();
      setExportSuccess(`User ${deletedName} successfully removed.`);
      setTimeout(() => setExportSuccess(''), 3500);
    } catch (err) {
      console.error('Delete user error:', err);
      alert('Failed to delete user: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      alert('Please check at least one role checkbox to export records.');
      return;
    }
    exportUserDirectoryExcel(filtered, scopeTitle);
    setExportSuccess(`Exported ${filtered.length} users to Excel (.xlsx)`);
    setTimeout(() => setExportSuccess(''), 3500);
  };

  const handleExportPDF = () => {
    if (filtered.length === 0) {
      alert('Please check at least one role checkbox to export records.');
      return;
    }
    exportUserDirectoryPDF(filtered, scopeTitle);
    setExportSuccess(`Exported ${filtered.length} users to PDF (.pdf)`);
    setTimeout(() => setExportSuccess(''), 3500);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hostel Resident & User Registry</h1>
            {!isSuperintendent ? (
              <Badge variant="teal" size="sm">Strict Isolation: {userProfile?.hostelName || 'My Hall'}</Badge>
            ) : (
              <Badge variant="teal" size="sm">Superintendent Central Scope</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Enrolled trainees, student monitors, mess managers, and staff directory.</p>
        </div>
      </div>

      {exportSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
          <button onClick={() => setExportSuccess('')} className="text-emerald-600 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* Search & Multi-Checkbox Role Filter Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, roll number, district, or role..."
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white transition-all"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('common.exportExcel')}</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>{t('common.exportPDF')}</span>
            </button>
          </div>
        </div>

        {/* Multi-Checkbox Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-brand-600" />
            {t('common.filterByRole')}:
          </span>

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

          <span className="text-xs text-slate-500 ml-auto font-medium">
            Enrolled in View: <strong>{filtered.length}</strong>
          </span>
        </div>
      </div>

      <Card title="Hall Resident Records" subtitle="Isolated student and monitor records for this hall">

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">User Profile</th>
                <th className="pb-3">Class Roll No.</th>
                <th className="pb-3">Role / Tier</th>
                <th className="pb-3">Gender</th>
                <th className="pb-3">Quarters Allotment</th>
                <th className="pb-3">Phone & Emergency</th>
                <th className="pb-3">Financial Balance</th>
                <th className="pb-3">District & Upazila</th>
                <th className="pb-3 text-center">Blood</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const isTargetBoarder = c.role === USER_ROLES.BOARDER_STUDENT || c.role === 'boarder' || c.role === USER_ROLES.HOSTEL_MONITOR || c.role === USER_ROLES.MEAL_MANAGER;
                const canEditThisUser = isSuperintendent || (isHostelSuper && isTargetBoarder && (!c.hostelId || c.hostelId === effectiveHostelId));
                const canDeleteThisUser = (isSuperintendent || (isHostelSuper && (!c.hostelId || c.hostelId === effectiveHostelId))) && c.id !== userProfile?.id && c.loginId !== userProfile?.loginId;
                const fin = getUserFinancialStatus(c);

                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 pl-2">
                      <button
                        type="button"
                        onClick={() => setViewingUserId(c.id || c.rollNumber || c.loginId)}
                        className="flex items-center gap-2.5 group cursor-pointer text-left"
                        title="Click to view detailed member profile and financial ledger"
                      >
                        <AvatarRenderer
                          avatarId={c.avatar_id}
                          gender={c.gender}
                          className="w-9 h-9 rounded-full border border-teal-200 group-hover:border-teal-400 transition-colors shadow-2xs"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                            {c.name}
                          </p>
                          <span className="text-[11px] text-slate-400 group-hover:text-slate-600 font-mono transition-colors">
                            {c.email}
                          </span>
                        </div>
                      </button>
                    </td>
                    <td className="py-3 font-mono font-bold text-brand-700">
                      {c.rollNumber || c.loginId || 'Staff'}
                    </td>
                    <td className="py-3">
                      <Badge variant={c.role?.includes('monitor') ? 'warning' : c.role?.includes('manager') ? 'success' : 'teal'} size="sm">
                        {c.role?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={normalizeGender(c.gender) === 'Female' ? 'warning' : 'info'} size="sm">
                        {normalizeGender(c.gender)}
                      </Badge>
                    </td>
                    <td className="py-3 text-slate-600 font-medium">
                      {c.roomNumber ? `Room ${c.roomNumber} (${c.bedNumber || 'Bed 1'})` : 'Office / Day-Scholar'}
                    </td>
                    <td className="py-3 text-slate-700 font-mono text-[11px]">
                      <div>{c.phone_number || c.phone || 'N/A'}</div>
                      {c.emergency_contact && (
                        <div className="text-slate-400 text-[10px]">Emg: {c.emergency_contact}</div>
                      )}
                    </td>
                    <td className="py-3">
                      {c.role === USER_ROLES.SUPERINTENDENT || c.role === USER_ROLES.HOSTEL_SUPER ? (
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
                    <td className="py-3 text-slate-600">
                      <div className="font-medium text-slate-800">{c.district || 'N/A'}</div>
                      <div className="text-slate-400 text-[10px]">{c.upazila || ''} {c.union_ward ? `• ${c.union_ward}` : ''}</div>
                    </td>
                    <td className="py-3 text-center">
                      {c.blood_group ? (
                        <Badge variant="danger" size="sm">{c.blood_group}</Badge>
                      ) : (
                        <span className="text-slate-300 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEditThisUser ? (
                          <button
                            onClick={() => setEditingUser(c)}
                            className="px-3 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors border border-teal-200 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Change Role</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Locked</span>
                        )}
                        {canDeleteThisUser && (
                          <button
                            type="button"
                            onClick={() => setDeletingUser(c)}
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
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Edit & Role Assignment Modal */}
      <UserEditModal
        user={editingUser}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onUserUpdated={() => loadUsers()}
      />

      {/* User Delete Confirmation Modal */}
      <UserDeleteConfirmModal
        user={deletingUser}
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* User Comprehensive Profile Overlay Modal */}
      <UserProfileModal
        userId={viewingUserId}
        isOpen={Boolean(viewingUserId)}
        onClose={() => setViewingUserId(null)}
      />
    </div>
  );
}
