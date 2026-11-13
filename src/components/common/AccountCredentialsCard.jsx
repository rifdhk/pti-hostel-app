import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Save
} from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import { useAuth } from '../../contexts/AuthContext';

export default function AccountCredentialsCard() {
  const {
    userProfile,
    isSuperintendent,
    updateSuperintendentUsername,
    changePassword,
  } = useAuth();

  if (!isSuperintendent || !userProfile) {
    return null;
  }

  const currentUsername = userProfile.username || userProfile.loginId || '';
  const changesLeft =
    typeof userProfile.username_changes_left === 'number'
      ? userProfile.username_changes_left
      : 3;
  const isUsernameLocked = changesLeft <= 0;

  // Username form state
  const [usernameInput, setUsernameInput] = useState(currentUsername);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  // Keep input synced when profile reloads or updates reactively
  useEffect(() => {
    setUsernameInput(currentUsername);
  }, [currentUsername]);

  // Password form state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');

    if (isUsernameLocked) {
      setUsernameError('Maximum username change limit reached.');
      return;
    }

    setUsernameSaving(true);
    try {
      const updated = await updateSuperintendentUsername(usernameInput);
      const remaining =
        typeof updated?.username_changes_left === 'number'
          ? updated.username_changes_left
          : Math.max(0, changesLeft - 1);
      setUsernameSuccess(
        remaining > 0
          ? `Username updated to "${updated?.username || usernameInput}". You can change your username ${remaining} more time(s).`
          : `Username updated to "${updated?.username || usernameInput}". Maximum username change limit reached.`
      );
      setTimeout(() => setUsernameSuccess(''), 5000);
    } catch (err) {
      setUsernameError(err.message || 'Failed to update username.');
    } finally {
      setUsernameSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('All password fields are required.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('New password and confirmation do not match.');
      return;
    }

    setPwdSaving(true);
    try {
      await changePassword(currentPwd, newPwd);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdSuccess('Password updated successfully! Use your new password on your next sign-in.');
      setTimeout(() => setPwdSuccess(''), 5000);
    } catch (err) {
      setPwdError(err.message || 'Failed to update password.');
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <Card
      title="Account Credentials"
      subtitle="Manage your Superintendent login username limit and update your account password"
      action={
        <Badge variant={isUsernameLocked ? 'danger' : 'teal'} size="sm">
          {isUsernameLocked
            ? 'Username Quota Exhausted (0 left)'
            : `${changesLeft} Username Change${changesLeft === 1 ? '' : 's'} Left`}
        </Badge>
      }
    >
      <div className="space-y-6">
        {/* Section 1: Username Edit with Remaining Change Counter */}
        <form onSubmit={handleUsernameSubmit} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="super-username-input"
              className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-teal-600" />
              Username
            </label>
            <span className="text-[11px] font-mono text-slate-500">
              Current ID: <strong className="text-slate-800">{currentUsername}</strong>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              id="super-username-input"
              type="text"
              value={usernameInput}
              disabled={isUsernameLocked || usernameSaving}
              onChange={(e) => {
                setUsernameInput(e.target.value);
                if (usernameError) setUsernameError('');
              }}
              placeholder="Enter new username"
              className={`flex-1 text-xs font-mono px-3 py-2.5 rounded-xl border transition-colors focus:outline-none ${
                isUsernameLocked
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-500'
              }`}
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={
                isUsernameLocked ||
                usernameSaving ||
                !usernameInput.trim() ||
                usernameInput.trim().toLowerCase() === currentUsername.toLowerCase()
              }
              icon={Save}
              className="shrink-0"
            >
              {usernameSaving ? 'Saving...' : 'Save Username'}
            </Button>
          </div>

          {/* Strict Dynamic Helper Text */}
          {isUsernameLocked ? (
            <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Maximum username change limit reached.</span>
            </p>
          ) : (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>
                You can change your username <strong className="text-slate-700">{changesLeft}</strong> more time(s).
              </span>
            </p>
          )}

          {usernameError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{usernameError}</span>
            </div>
          )}

          {usernameSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{usernameSuccess}</span>
            </div>
          )}
        </form>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Section 2: Change Password Form */}
        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-teal-600" />
                Change Password
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Replace your Central Admin-issued default password with a private passphrase.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {showPasswords ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  Show
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="super-current-password"
                className="block text-[11px] font-semibold text-slate-600 mb-1"
              >
                Current Password
              </label>
              <input
                id="super-current-password"
                type={showPasswords ? 'text' : 'password'}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label
                htmlFor="super-new-password"
                className="block text-[11px] font-semibold text-slate-600 mb-1"
              >
                New Password
              </label>
              <input
                id="super-new-password"
                type={showPasswords ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Min 4 characters"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label
                htmlFor="super-confirm-password"
                className="block text-[11px] font-semibold text-slate-600 mb-1"
              >
                Confirm New Password
              </label>
              <input
                id="super-confirm-password"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Re-enter password"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {pwdError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{pwdSuccess}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
              icon={Lock}
            >
              {pwdSaving ? 'Updating...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
