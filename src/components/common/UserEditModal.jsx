import React, { useState, useEffect } from 'react';
import { 
  User, 
  ShieldCheck, 
  Building2, 
  Bed, 
  Phone, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  Sparkles, 
  ArrowUpDown,
  Download
} from 'lucide-react';
import Button from './Button';
import Badge from './Badge';
import AvatarRenderer from '../Avatars/AvatarRenderer';
import {
  GENDER_OPTIONS,
  normalizeGender,
  getAvatarOptionsByGender,
  isAvatarValidForGender,
  getDefaultAvatarId,
  resolveUserAvatarId
} from '../../constants/avatars';
import { useAuth, USER_ROLES } from '../../contexts/AuthContext';
import { dbService } from '../../services/db';
import { exportIndividualProfilePDF } from '../../utils/exportReports';

export default function UserEditModal({ user, isOpen, onClose, onUserUpdated }) {
  const { isSuperintendent, isHostelSuper, effectiveHostelId, effectivePtiId, adminUpdateUser } = useAuth();

  const [hostels, setHostels] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    hostelId: '',
    roomNumber: '',
    bedNumber: '',
    phone_number: '',
    emergency_contact: '',
    district: '',
    upazila: '',
    union_ward: '',
    blood_group: ''
  });

  useEffect(() => {
    const loadHostels = () => {
      const parsed = dbService.getHostels();
      const scoped = effectivePtiId && effectivePtiId !== 'GLOBAL'
        ? parsed.filter(h => !h.pti_id || h.pti_id === effectivePtiId)
        : parsed;
      setHostels(scoped);
    };
    loadHostels();
    window.addEventListener('pti_hostels_changed', loadHostels);
    return () => window.removeEventListener('pti_hostels_changed', loadHostels);
  }, [effectivePtiId]);

  useEffect(() => {
    if (user) {
      // Normalize role: if role was stored as 'boarder', normalize to 'boarder_student'
      const normalizedRole = user.role === 'boarder' ? USER_ROLES.BOARDER_STUDENT : (user.role || USER_ROLES.BOARDER_STUDENT);
      const isUserNonBoarder = normalizedRole === USER_ROLES.NON_BOARDER_STUDENT;

      const normalizedGender = normalizeGender(user.gender);
      setFormData({
        name: user.name || '',
        role: normalizedRole,
        hostelId: isUserNonBoarder ? '' : (user.hostelId || (hostels[0]?.id || 'hostel_01')),
        roomNumber: isUserNonBoarder ? '' : (user.roomNumber || ''),
        bedNumber: isUserNonBoarder ? '' : (user.bedNumber || 'Bed 1'),
        phone_number: user.phone_number || user.phone || '',
        emergency_contact: user.emergency_contact || '',
        emergency_contact_name: user.emergency_contact_name || '',
        emergency_contact_phone: user.emergency_contact_phone || user.emergency_contact || '',
        district: user.district || '',
        upazila: user.upazila || '',
        union_ward: user.union_ward || '',
        blood_group: user.blood_group || '',
        gender: normalizedGender,
        avatar_id: resolveUserAvatarId(user)
      });
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [user, hostels]);

  if (!isOpen || !user) return null;

  // Universal Status Change: Superintendent & Hostel Super can change ANY user's role across the entire spectrum
  const canChangeRole = isSuperintendent || isHostelSuper;

  // Clean Role Options without bracketed qualifiers or promotion/demotion jargon
  const CLEAN_ROLE_SPECTRUM = [
    { value: USER_ROLES.SUPERINTENDENT, label: 'Superintendent' },
    { value: USER_ROLES.HOSTEL_SUPER, label: 'Hostel Super' },
    { value: USER_ROLES.HOSTEL_MONITOR, label: 'Hostel Monitor' },
    { value: USER_ROLES.MEAL_MANAGER, label: 'Meal Manager' },
    { value: USER_ROLES.BOARDER_STUDENT, label: 'Boarder Student' },
    { value: USER_ROLES.NON_BOARDER_STUDENT, label: 'Non-Boarder Student' },
  ];

  const getRoleOptions = () => {
    if (canChangeRole) {
      return CLEAN_ROLE_SPECTRUM;
    }
    return [{ value: user.role, label: user.role }];
  };

  const isTargetNonBoarder = formData.role === USER_ROLES.NON_BOARDER_STUDENT;
  const isTargetBoarder = [
    USER_ROLES.BOARDER_STUDENT, 
    'boarder', 
    USER_ROLES.HOSTEL_MONITOR, 
    USER_ROLES.MEAL_MANAGER
  ].includes(formData.role);

  const handleRoleChange = (newRole) => {
    if (newRole === USER_ROLES.NON_BOARDER_STUDENT) {
      setFormData(prev => ({
        ...prev,
        role: newRole,
        hostelId: '',
        roomNumber: '',
        bedNumber: ''
      }));
    } else if ([USER_ROLES.BOARDER_STUDENT, USER_ROLES.HOSTEL_MONITOR, USER_ROLES.MEAL_MANAGER].includes(newRole)) {
      setFormData(prev => ({
        ...prev,
        role: newRole,
        hostelId: prev.hostelId || user?.hostelId || effectiveHostelId || hostels[0]?.id || 'hostel_01',
        roomNumber: prev.roomNumber || user?.roomNumber || '',
        bedNumber: prev.bedNumber || user?.bedNumber || 'Bed 1'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        role: newRole
      }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Validate role permissions: Superintendent and Hostel Super can change ANY user's role across the entire spectrum
      if (formData.role !== user.role && !canChangeRole) {
        throw new Error('You do not have permission to modify this user\'s administrative role.');
      }

      // Non-Boarder to Boarder (or Monitor/Manager): MUST require Hostel and Room No before saving
      if (isTargetBoarder) {
        if (!formData.hostelId || !formData.hostelId.trim()) {
          throw new Error('Please select an Assigned Hostel for this boarder before saving.');
        }
        if (!formData.roomNumber || !String(formData.roomNumber).trim()) {
          throw new Error('Room No. is strictly required when assigning a user to a Boarder role (Boarder, Monitor, or Manager).');
        }
      }

      const updates = {
        name: formData.name,
        role: formData.role === 'boarder' ? USER_ROLES.BOARDER_STUDENT : formData.role,
        phone_number: formData.phone_number,
        phone: formData.phone_number,
        emergency_contact: formData.emergency_contact_phone || formData.emergency_contact || '',
        emergency_contact_name: formData.emergency_contact_name || '',
        emergency_contact_phone: formData.emergency_contact_phone || formData.emergency_contact || '',
        district: formData.district,
        upazila: formData.upazila,
        union_ward: formData.union_ward,
        blood_group: formData.blood_group,
        gender: normalizeGender(formData.gender),
        avatar_id: formData.avatar_id || getDefaultAvatarId(formData.gender)
      };

      if (isTargetNonBoarder) {
        // Boarder to Non-Boarder: Clear/nullify Hostel and Room No assignments in the database
        updates.hostelId = null;
        updates.hostelName = null;
        updates.roomNumber = null;
        updates.bedNumber = null;
        updates.designation = 'Non-Boarder Student';
      } else if (isTargetBoarder) {
        // Non-Boarder to Boarder: Assign specific Hostel and Room No
        updates.hostelId = formData.hostelId;
        const selectedHostel = hostels.find(h => h.id === formData.hostelId);
        updates.hostelName = selectedHostel ? selectedHostel.name : (user.hostelName || 'Assigned Hall');
        updates.roomNumber = String(formData.roomNumber).trim();
        updates.bedNumber = formData.bedNumber ? String(formData.bedNumber).trim() : 'Bed 1';

        if (formData.role === USER_ROLES.HOSTEL_MONITOR) {
          updates.designation = 'Hostel Monitor';
        } else if (formData.role === USER_ROLES.MEAL_MANAGER) {
          updates.designation = 'Meal Manager';
        } else {
          updates.designation = 'Boarder Student';
        }
      } else {
        // Administrative Tiers: Superintendent or Hostel Super
        if (formData.role === USER_ROLES.SUPERINTENDENT) {
          updates.hostelId = null;
          updates.hostelName = 'All Hostels (Global)';
          updates.roomNumber = null;
          updates.bedNumber = null;
          updates.designation = 'Hostel & PTI Superintendent';
        } else if (formData.role === USER_ROLES.HOSTEL_SUPER) {
          updates.hostelId = formData.hostelId || user.hostelId || effectiveHostelId || hostels[0]?.id;
          const selectedHostel = hostels.find(h => h.id === updates.hostelId);
          updates.hostelName = selectedHostel ? selectedHostel.name : (user.hostelName || 'Assigned Hall');
          updates.roomNumber = formData.roomNumber ? String(formData.roomNumber).trim() : 'Warden Quarters';
          updates.bedNumber = null;
          updates.designation = 'Hostel Super (Warden)';
        }
      }

      const updated = await adminUpdateUser(user.id || user.loginId || user.rollNumber, updates);
      
      if (!updated) {
        throw new Error('User record could not be located in local storage or database.');
      }

      setSuccessMsg(`User ${updated.name} updated successfully! Role is now: ${updated.role.toUpperCase()}`);
      
      if (onUserUpdated) {
        onUserUpdated(updated);
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update user record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-dropdown overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarRenderer
              avatarId={formData.avatar_id || user.avatar_id}
              gender={formData.gender}
              className="w-10 h-10 rounded-full border border-slate-200 shadow-xs"
            />
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                Edit User & Role Assignment
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {user.rollNumber ? `Class Roll: ${user.rollNumber}` : `User ID: ${user.loginId}`} • {user.hostelName || 'Assigned Hall'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* PRIMARY ROLE ASSIGNMENT FIELD */}
          <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                Administrative Tier / Role *
              </label>
              {canChangeRole ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full">
                  Role Editing Enabled
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>

            <div className="relative">
              <select
                value={formData.role}
                disabled={!canChangeRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className={`w-full text-xs p-2.5 rounded-lg border font-semibold transition-all ${
                  canChangeRole
                    ? 'border-brand-300 bg-white text-brand-950 focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer'
                    : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                }`}
              >
                {getRoleOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Permission & Status Explanatory Banners */}
            {canChangeRole && (
              <p className="text-[11px] text-brand-800 font-medium">
                Administrator Authority: You can assign this user to any of the 6 roles across the spectrum.
              </p>
            )}
            {isTargetNonBoarder && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Non-Boarder Student (Day-Scholar): Assigned hostel and room records will be cleared in the database upon saving.</span>
              </div>
            )}
            {isTargetBoarder && (
              <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Boarder Student: Must be assigned to a specific Hostel Hall and Room No. before saving.</span>
              </div>
            )}
            {!canChangeRole && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Role modifications require administrative authorization.
              </p>
            )}
          </div>

          {/* Individual Profile Export Toolbar */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Download className="w-3.5 h-3.5 text-brand-600" />
              Download User Profile:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportIndividualProfilePDF(user)}
                title="Download Certified Profile (PDF)"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>Export Profile as PDF</span>
              </button>
            </div>
          </div>

          {/* User Full Name (Technology / Trade field removed per PTI requirements) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
            />
          </div>

          {/* Quarters & Hostel Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span>Assigned Hall {isTargetBoarder && <span className="text-rose-500 font-bold">*</span>}</span>
                {isTargetBoarder && !formData.hostelId && (
                  <span className="text-[10px] text-rose-600 font-bold">Required</span>
                )}
              </label>
              {isTargetNonBoarder ? (
                <input
                  type="text"
                  disabled
                  value="N/A (Day-Scholar)"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 font-medium cursor-not-allowed"
                />
              ) : (
                <select
                  value={formData.hostelId}
                  disabled={!canChangeRole}
                  onChange={(e) => setFormData({ ...formData, hostelId: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600 font-medium cursor-pointer"
                >
                  <option value="" disabled>-- Select Hostel --</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span>Room No {isTargetBoarder && <span className="text-rose-500 font-bold">*</span>}</span>
                {isTargetBoarder && !formData.roomNumber?.trim() && (
                  <span className="text-[10px] text-rose-600 font-bold">Required</span>
                )}
              </label>
              <input
                type="text"
                disabled={isTargetNonBoarder}
                placeholder={isTargetNonBoarder ? "N/A (Day-Scholar)" : "e.g. 103"}
                value={isTargetNonBoarder ? "" : formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className={`w-full text-xs p-2.5 rounded-lg border font-mono focus:outline-none ${
                  isTargetNonBoarder
                    ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                    : !formData.roomNumber?.trim() && isTargetBoarder
                    ? "border-rose-300 bg-rose-50/30 text-slate-800 focus:border-rose-500"
                    : "border-slate-200 bg-white text-slate-800 focus:border-brand-600"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Bed No
              </label>
              <input
                type="text"
                disabled={isTargetNonBoarder}
                placeholder={isTargetNonBoarder ? "N/A" : "e.g. Bed 1"}
                value={isTargetNonBoarder ? "" : formData.bedNumber}
                onChange={(e) => setFormData({ ...formData, bedNumber: e.target.value })}
                className={`w-full text-xs p-2.5 rounded-lg border focus:outline-none ${
                  isTargetNonBoarder
                    ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "border-slate-200 bg-white text-slate-800 focus:border-brand-600"
                }`}
              />
            </div>
          </div>

          {/* Contact Numbers & Blood Group */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                placeholder="+880 1712-000000"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                placeholder="Guardian / Contact Name"
                value={formData.emergency_contact_name || ''}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="text"
                placeholder="+880 1819-000000"
                value={formData.emergency_contact_phone || formData.emergency_contact || ''}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value, emergency_contact: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Blood Group
              </label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600 font-medium"
              >
                <option value="">Unspecified</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          {/* Gender & Dynamic Avatar Selection */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Gender
              </label>
              <select
                value={normalizeGender(formData.gender)}
                onChange={(e) => {
                  const nextGender = normalizeGender(e.target.value);
                  const keepCurrent = isAvatarValidForGender(formData.avatar_id, nextGender);
                  setFormData({
                    ...formData,
                    gender: nextGender,
                    avatar_id: keepCurrent ? formData.avatar_id : getDefaultAvatarId(nextGender)
                  });
                }}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600 font-medium cursor-pointer"
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Avatar Selection
              </label>
              <div className="flex flex-wrap gap-3 py-2 px-1">
                {getAvatarOptionsByGender(formData.gender).map((opt) => {
                  const activeId = formData.avatar_id || getDefaultAvatarId(formData.gender);
                  const isSelected = activeId === opt.id;
                  return (
                    <div key={opt.id} className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar_id: opt.id })}
                        title={opt.title}
                        aria-label={opt.title}
                        className={`w-16 h-16 rounded-full border-2 border-transparent hover:border-teal-300 transition-all cursor-pointer overflow-hidden p-0.5 focus:outline-none ${
                          isSelected ? 'ring-4 ring-teal-600' : ''
                        }`}
                      >
                        <AvatarRenderer
                          avatarId={opt.id}
                          gender={formData.gender}
                          className="w-full h-full"
                        />
                      </button>
                      <span className={`text-[10px] font-semibold leading-tight ${
                        isSelected ? 'text-teal-700' : 'text-slate-600'
                      }`}>
                        {opt.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Address Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                District (জেলা)
              </label>
              <input
                type="text"
                placeholder="e.g. Dhaka"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Upazila (উপজেলা)
              </label>
              <input
                type="text"
                placeholder="e.g. Dhanmondi"
                value={formData.upazila}
                onChange={(e) => setFormData({ ...formData, upazila: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              icon={CheckCircle2}
            >
              {isSubmitting ? 'Saving Changes...' : 'Save & Update Role'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
