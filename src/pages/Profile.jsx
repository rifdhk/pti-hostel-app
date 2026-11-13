import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  ShieldCheck, 
  Building2, 
  Bed, 
  Mail, 
  Phone, 
  MapPin, 
  Heart, 
  AlertCircle, 
  Edit3, 
  Lock, 
  CheckCircle2, 
  Calendar,
  Award,
  BookOpen,
  Download,
  KeyRound
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import ChangePasswordModal from '../components/common/ChangePasswordModal';
import AccountCredentialsCard from '../components/common/AccountCredentialsCard';
import ErrorBoundary from '../components/common/ErrorBoundary';
import AvatarRenderer from '../components/Avatars/AvatarRenderer';
import { useAuth, USER_ROLES } from '../contexts/AuthContext';
import {
  GENDER_OPTIONS,
  normalizeGender,
  getAvatarOptionsByGender,
  isAvatarValidForGender,
  getDefaultAvatarId,
  resolveUserAvatarId
} from '../constants/avatars';
import { exportIndividualProfilePDF } from '../utils/exportReports';
import { sanitizeDisplayName } from '../utils/displayName';

export default function Profile() {
  const { t } = useTranslation();
  const location = useLocation();
  const { userProfile, role, isSuperintendent, updateUserProfile } = useAuth();

  // Helper to resolve emergency contact name & phone
  const getInitialEmergency = () => {
    const rawContact = userProfile?.emergency_contact || '';
    const rawPhone = userProfile?.emergency_contact_phone || '';
    const rawName = userProfile?.emergency_contact_name || '';

    if (rawPhone) {
      return { name: rawName, phone: rawPhone };
    }
    const match = String(rawContact).match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      return { name: rawName || match[1].trim(), phone: match[2].trim() };
    }
    return { name: rawName, phone: String(rawContact).trim() };
  };

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const initialEmergency = getInitialEmergency();
  const [formData, setFormData] = useState({
    name: sanitizeDisplayName(userProfile?.name, ''),
    phone_number: userProfile?.phone_number || userProfile?.phone || '',
    emergency_contact_name: initialEmergency.name,
    emergency_contact_phone: initialEmergency.phone,
    district: userProfile?.district || '',
    upazila: userProfile?.upazila || '',
    union_ward: userProfile?.union_ward || '',
    blood_group: userProfile?.blood_group || '',
    gender: normalizeGender(userProfile?.gender),
    avatar_id: resolveUserAvatarId(userProfile),
    role: userProfile?.role || USER_ROLES.SUPERINTENDENT,
  });

  const openEditModal = () => {
    const resolvedGender = normalizeGender(userProfile?.gender);
    const em = getInitialEmergency();
    setFormData({
      name: sanitizeDisplayName(userProfile?.name, ''),
      phone_number: userProfile?.phone_number || userProfile?.phone || '',
      emergency_contact_name: em.name,
      emergency_contact_phone: em.phone,
      district: userProfile?.district || '',
      upazila: userProfile?.upazila || '',
      union_ward: userProfile?.union_ward || '',
      blood_group: userProfile?.blood_group || '',
      gender: resolvedGender,
      avatar_id: resolveUserAvatarId(userProfile),
      role: userProfile?.role || USER_ROLES.SUPERINTENDENT,
    });
    setSaveError('');
    setShowEditModal(true);
  };

  // Support direct deep-link or navbar action /profile?edit=true
  useEffect(() => {
    if (location.search.includes('edit=true')) {
      openEditModal();
    }
  }, [location.search]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveError('');
    
    try {
      const resolvedGender = normalizeGender(formData.gender);
      const emName = (formData.emergency_contact_name || '').trim();
      const emPhone = (formData.emergency_contact_phone || '').trim();
      const combinedEmergency = emPhone ? (emName ? `${emName} (${emPhone})` : emPhone) : '';

      const updates = {
        name: (formData.name || '').trim(),
        phone_number: (formData.phone_number || '').trim(),
        phone: (formData.phone_number || '').trim(),
        emergency_contact_name: emName,
        emergency_contact_phone: emPhone,
        emergency_contact: combinedEmergency,
        district: formData.district,
        upazila: formData.upazila,
        union_ward: formData.union_ward,
        blood_group: formData.blood_group,
        gender: resolvedGender,
        avatar_id: formData.avatar_id || getDefaultAvatarId(resolvedGender),
      };

      // If Superintendent, allow updating administrative role as well
      if (isSuperintendent && formData.role) {
        updates.role = formData.role;
      }

      await updateUserProfile(updates);
      setShowEditModal(false);
      setSaveSuccess('Profile contact & emergency details successfully updated!');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTierBadge = () => {
    switch (role) {
      case USER_ROLES.MASTER_ADMIN:
      case 'master_admin':
        return <Badge variant="teal" size="md">Tier 0 • Master Admin</Badge>;
      case USER_ROLES.SUPERINTENDENT:
        return <Badge variant="teal" size="md">Tier 1 • Chief Superintendent</Badge>;
      case USER_ROLES.HOSTEL_SUPER:
        return <Badge variant="info" size="md">Tier 2 • Hostel Super / Warden</Badge>;
      case USER_ROLES.HOSTEL_MONITOR:
        return <Badge variant="warning" size="md">Tier 3 • Elected Hostel Monitor</Badge>;
      case USER_ROLES.MEAL_MANAGER:
        return <Badge variant="success" size="md">Tier 4 • Student Meal Manager</Badge>;
      case USER_ROLES.BOARDER_STUDENT:
        return <Badge variant="teal" size="md">Tier 5 • Resident Boarder</Badge>;
      case USER_ROLES.NON_BOARDER_STUDENT:
        return <Badge variant="neutral" size="md">Tier 6 • Attached Non-Boarder</Badge>;
      default:
        return <Badge variant="neutral" size="md">Staff Resident</Badge>;
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 w-full mx-auto">
        
        {/* Header Notification */}
        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
            <button onClick={() => setSaveSuccess('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
          </div>
        )}

        {/* Main Profile Identity Card */}
        <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
          {/* Subtle decorative top bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-600 via-teal-500 to-emerald-500" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2">
            <div className="flex items-center gap-5">
              {/* Culturally Localized Formal SVG Avatar */}
              <AvatarRenderer
                avatarId={userProfile?.avatar_id}
                gender={userProfile?.gender}
                className="w-20 h-20 rounded-full border-2 border-white ring-4 ring-teal-500/20 shadow-md"
              />

              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {sanitizeDisplayName(userProfile?.name, 'Authorized Member').replace(/Director General/g, 'Master Admin')}
                  </h1>
                  {getTierBadge()}
                </div>

                <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                  <span>{sanitizeDisplayName(userProfile?.designation, 'Institutional Member')}</span>
                  <span>•</span>
                  <span className="font-mono text-brand-700 font-semibold">
                    {userProfile?.rollNumber ? `Class Roll: ${userProfile.rollNumber}` : `Admin ID: ${userProfile?.loginId || 'N/A'}`}
                  </span>
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-brand-600" />
                    <span className="font-semibold text-slate-800">{sanitizeDisplayName(userProfile?.hostelName, 'All Hostels')}</span>
                  </div>
                  {userProfile?.roomNumber && (
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                      <Bed className="w-3.5 h-3.5 text-teal-600" />
                      <span>Room {userProfile.roomNumber} ({userProfile.bedNumber || 'Bed 1'})</span>
                    </div>
                  )}
                  {userProfile?.blood_group && (
                    <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200 font-semibold">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      <span>Blood: {userProfile.blood_group}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-lg border border-teal-200 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    <span>Gender: {normalizeGender(userProfile?.gender)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Actions: Export Documents & Edit Profile */}
          <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportIndividualProfilePDF(userProfile)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-colors shadow-2xs cursor-pointer"
                title={t('dashboard.exportProfilePDF')}
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>{t('common.downloadPDF')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-teal-700 hover:bg-teal-50 border border-teal-300 transition-colors shadow-2xs cursor-pointer"
                title={t('nav.changePassword')}
              >
                <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                <span>{t('nav.changePassword')}</span>
              </button>
              <Button
                variant="primary"
                size="md"
                icon={Edit3}
                onClick={openEditModal}
                className="shadow-sm font-semibold"
              >
                {t('profile.editProfile')}
              </Button>
            </div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Verified Institutional Account
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Academic Identity vs Address & Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Academic & Hall Assignment Information */}
        <Card
          title={t('profile.personalIdentity')}
          subtitle="Administrative identity and enrollment record"
        >
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">User Login ID</span>
              <span className="font-mono font-bold text-slate-800">{userProfile?.loginId}</span>
            </div>
            
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Class Roll Number</span>
              <span className="font-mono font-bold text-brand-700">
                {userProfile?.rollNumber || 'Administrative Account (N/A)'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Assigned Tier / Role</span>
              <span className="font-semibold text-slate-800 uppercase tracking-wide">
                {(userProfile?.role || 'resident').replace('_', ' ')}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Gender</span>
              <span className="font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                {normalizeGender(userProfile?.gender)}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Residential Hostel</span>
              <span className="font-semibold text-slate-800">{sanitizeDisplayName(userProfile?.hostelName, 'Central Administration')}</span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Quarters / Room Allotment</span>
              <span className="font-medium text-slate-700">
                {userProfile?.roomNumber 
                  ? `Room ${userProfile.roomNumber} • ${userProfile.bedNumber || 'Bed 1'} • ${userProfile.wing || 'Main Wing'}`
                  : 'Day-Scholar / Administrative Office'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Registration Status</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Active & Enrolled
              </span>
            </div>
          </div>
        </Card>

        {/* Card 2: Address & Contact Details */}
        <Card
          title={t('profile.contactAndAddress')}
          subtitle="Personal communication information (Self-editable)"
          action={
            <button
              onClick={openEditModal}
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Update
            </button>
          }
        >
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-600" />
                Mobile Number (মোবাইল নম্বর)
              </span>
              <span className="font-bold text-slate-800 font-mono">
                {userProfile?.phone_number || userProfile?.phone || 'Not provided'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                Emergency Contact (জরুরি যোগাযোগ)
              </span>
              <span className="font-bold text-rose-700 font-mono text-right">
                {userProfile?.emergency_contact_name ? `${userProfile.emergency_contact_name} • ` : ''}
                {userProfile?.emergency_contact_phone || userProfile?.emergency_contact || 'Not provided'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                Blood Group (রক্তের গ্রুপ)
              </span>
              <span className="font-bold text-slate-800">
                {userProfile?.blood_group ? (
                  <Badge variant="danger" size="sm">{userProfile.blood_group}</Badge>
                ) : 'Unspecified'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                District (জেলা)
              </span>
              <span className="font-semibold text-slate-800">
                {userProfile?.district || 'Not provided'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                Upazila (উপজেলা)
              </span>
              <span className="font-semibold text-slate-800">
                {userProfile?.upazila || 'Not provided'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                Union / Ward (ইউনিয়ন / ওয়ার্ড)
              </span>
              <span className="font-semibold text-slate-800">
                {userProfile?.union_ward || 'Not provided'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Institutional Email
              </span>
              <span className="text-slate-600 font-mono">
                {userProfile?.email || 'N/A'}
              </span>
            </div>
          </div>
        </Card>

      </div>

      {/* Superintendent Account Credentials Bento Card */}
      {isSuperintendent && <AccountCredentialsCard />}

      {/* SELF-EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-dropdown overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-brand-600" />
                  Self-Edit Profile Information
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your contact phone numbers, emergency contact, and permanent address.
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {saveError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* STRICT RESTRICTION NOTICE */}
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[11px] uppercase tracking-wider text-amber-800">
                    Administrative Restrictions Enforced
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Students cannot alter their assigned <strong>Role</strong>, <strong>Hostel</strong>, or <strong>Class Roll Number</strong>. Those fields remain locked under institutional authority.
                  </p>
                </div>
              </div>

              {/* Read-Only Locked Preview Fields */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-100/70 border border-slate-200 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Assigned Role
                  </label>
                  <p className="font-semibold text-slate-700 capitalize mt-0.5">
                    {(userProfile?.role || 'resident').replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Assigned Hostel
                  </label>
                  <p className="font-semibold text-slate-700 mt-0.5">
                    {userProfile?.hostelName || 'Global'}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Class Roll / Login ID
                  </label>
                  <p className="font-mono font-bold text-brand-800 mt-0.5">
                    {userProfile?.rollNumber || userProfile?.loginId}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Quarters / Room
                  </label>
                  <p className="font-semibold text-slate-700 mt-0.5">
                    {userProfile?.roomNumber ? `Room ${userProfile.roomNumber}` : 'Day-Scholar / N/A'}
                  </p>
                </div>
              </div>

              {/* Editable: Full Name (Editable for all users) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Name (পূর্ণ নাম) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Administrative Role (Superintendent only) */}
              {isSuperintendent && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Administrative Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-gold font-medium"
                  >
                    <option value={USER_ROLES.SUPERINTENDENT}>Superintendent (Tier 1)</option>
                    <option value={USER_ROLES.HOSTEL_SUPER}>Hostel Super (Tier 2)</option>
                    <option value={USER_ROLES.HOSTEL_MONITOR}>Hostel Monitor (Tier 3)</option>
                    <option value={USER_ROLES.MEAL_MANAGER}>Meal Manager (Tier 4)</option>
                    <option value={USER_ROLES.BOARDER_STUDENT}>Boarder Student (Tier 5)</option>
                    <option value={USER_ROLES.NON_BOARDER_STUDENT}>Non-Boarder (Tier 6)</option>
                  </select>
                </div>
              )}

              {/* Editable: Contact Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Phone Number (মোবাইল নম্বর) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+880 1712-000000"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Editable: Emergency Contact Details (Name & Phone) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Emergency Contact Name (জরুরি যোগাযোগের নাম) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Guardian / Relative Name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Emergency Contact Phone (জরুরি যোগাযোগের ফোন নম্বর) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+880 1819-000000"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Editable: Gender & Dynamic Avatar Selection */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
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
                        avatar_id: keepCurrent ? formData.avatar_id : getDefaultAvatarId(nextGender),
                      });
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-brand-600 cursor-pointer"
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Avatar Selection
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    Select a formal institutional avatar for <span className="font-semibold text-slate-700">{normalizeGender(formData.gender)}</span> profile:
                  </p>
                  <div className="flex flex-wrap gap-3.5 py-2 px-1">
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
                          <span className={`text-[11px] font-semibold leading-tight ${
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

              {/* Editable: Blood Group */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Blood Group (রক্তের গ্রুপ - Optional)
                </label>
                <select
                  value={formData.blood_group}
                  onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                >
                  <option value="">Select Blood Group...</option>
                  <option value="A+">A Positive (A+)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B+">B Positive (B+)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="O+">O Positive (O+)</option>
                  <option value="O-">O Negative (O-)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                </select>
              </div>

              {/* Editable Address Details */}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Permanent Address Details (স্থায়ী ঠিকানা)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      District (জেলা) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dhaka"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Upazila (উপজেলা) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dhanmondi"
                      value={formData.upazila}
                      onChange={(e) => setFormData({ ...formData, upazila: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Union / Ward (ইউনিয়ন / ওয়ার্ড) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ward 15"
                      value={formData.union_ward}
                      onChange={(e) => setFormData({ ...formData, union_ward: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
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
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Universal Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => {
          setSaveSuccess('Password updated successfully!');
          setTimeout(() => setSaveSuccess(''), 4000);
        }}
      />

      </div>
    </ErrorBoundary>
  );
}
