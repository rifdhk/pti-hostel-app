import React, { useState } from 'react';
import { 
  Building2, 
  Sliders, 
  ShieldCheck, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  FileSpreadsheet, 
  FileText, 
  Sparkles,
  Utensils,
  Wrench,
  Clock
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import AccountCredentialsCard from '../components/common/AccountCredentialsCard';
import { useAuth } from '../contexts/AuthContext';
import { mealAutomationService, DEFAULT_SETTINGS } from '../services/mealAutomationService';

export default function InstituteSettings() {
  const { isSuperintendent, effectivePtiId, instituteSettings, updateInstituteSettings } = useAuth();

  const [formData, setFormData] = useState({
    instituteName: instituteSettings.instituteName || "Primary Teachers' Training Institute (PTI)",
    appTitle: instituteSettings.appTitle || 'PTI & Hostel Management System',
    instituteShortName: instituteSettings.instituteShortName || 'PTI',
  });

  const [masterSettings, setMasterSettings] = useState(() => mealAutomationService.getSettings(effectivePtiId));
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isSuperintendent) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-card">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">Only the Chief Superintendent (Tier 1) can modify global white-label settings.</p>
      </div>
    );
  }

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    updateInstituteSettings({
      instituteName: formData.instituteName.trim(),
      appTitle: formData.appTitle.trim(),
      instituteShortName: formData.instituteShortName.trim(),
    });

    setIsSaving(false);
    setSuccessMsg('Global Institute Settings & White-label branding successfully saved! All headers and exported reports are updated.');
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset institute name and branding to default PTI settings?')) {
      const defaults = {
        instituteName: DEFAULT_SETTINGS.instituteName,
        appTitle: DEFAULT_SETTINGS.appTitle,
        instituteShortName: DEFAULT_SETTINGS.instituteShortName,
      };
      setFormData(defaults);
      updateInstituteSettings(defaults);
      setSuccessMsg('Restored default PTI institute configuration.');
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  const handleToggleMaster = (key, value) => {
    const updated = mealAutomationService.updateSettings({ [key]: value }, effectivePtiId);
    setMasterSettings(updated);
    setSuccessMsg(`Master control updated: ${key} is now ${value ? 'ACTIVE' : 'MUTED'}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6 w-full mx-auto">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Institute & Global Settings</h1>
            <Badge variant="teal" size="sm">Superintendent Tier 1 Authority</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure institutional white-labeling, application headers, export branding, and financial switches.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form: Institute Branding Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="White-label Institute Branding"
            subtitle="Custom institute identity rendered across the web interface and generated PDF/Excel reports"
          >
            <form onSubmit={handleSave} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. Official Institute Name (প্রতিষ্ঠানের নাম)
                </label>
                <input
                  type="text"
                  required
                  value={formData.instituteName}
                  onChange={(e) => setFormData({ ...formData, instituteName: e.target.value })}
                  placeholder="e.g. Primary Teachers' Training Institute (PTI), Dhaka"
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all shadow-2xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Appears in Top Navbar, Sidebar, and printed PDF / Excel document headers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    2. App Title (সিস্টেম শিরোনাম)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.appTitle}
                    onChange={(e) => setFormData({ ...formData, appTitle: e.target.value })}
                    placeholder="e.g. PTI & Hostel Management System"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Browser tab title & sidebar system label.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    3. Institute Acronym (সংক্ষিপ্ত নাম)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.instituteShortName}
                    onChange={(e) => setFormData({ ...formData, instituteShortName: e.target.value })}
                    placeholder="e.g. PTI"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all shadow-2xs uppercase"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Short badge displayed in mobile views.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={Save}
                  loading={isSaving}
                  className="font-bold shadow-sm"
                >
                  Save Institute Settings
                </Button>
              </div>
            </form>
          </Card>

          {/* Master Global Financial Controls */}
          <Card
            title="Superintendent Master Financial Switches"
            subtitle="Global master switches that dynamically dictate financial visibility for students"
          >
            <div className="space-y-4 text-xs">
              
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-teal-600" />
                    Meal Calculations Switch
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Toggle mess calculations and rate display on Boarder dashboards.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleMaster('mealCalculationsEnabled', !masterSettings.mealCalculationsEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                    masterSettings.mealCalculationsEnabled ? 'bg-teal-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      masterSettings.mealCalculationsEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-teal-600" />
                    Establishment Calculations Switch
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Toggle establishment calculations on Non-Boarder student portals.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleMaster('establishmentCalculationsEnabled', !masterSettings.establishmentCalculationsEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                    masterSettings.establishmentCalculationsEnabled ? 'bg-teal-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      masterSettings.establishmentCalculationsEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

            </div>
          </Card>

          <AccountCredentialsCard />
        </div>

        {/* Right Side: Live Branding Preview */}
        <div className="space-y-6">
          <Card
            title="Live Branding Preview"
            subtitle="How your branding appears across the application"
          >
            <div className="space-y-4">
              
              {/* Navbar Preview */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Top Header / Navbar</span>
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {formData.instituteName || 'Primary Teachers\' Training Institute'}
                  </span>
                </div>
              </div>

              {/* Document Header Preview */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Official Report Header (.pdf & .xlsx)</span>
                <div className="p-3 bg-teal-700 text-white rounded-lg text-center space-y-0.5 shadow-2xs">
                  <p className="text-xs font-bold uppercase tracking-wider">{formData.instituteName}</p>
                  <p className="text-[10px] text-teal-100">Official Trainee & Hostel Directory Roster</p>
                </div>
              </div>

              {/* Browser Tab Preview */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Browser Page Title</span>
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-xs font-mono text-slate-700 truncate">
                  📄 {formData.appTitle}
                </div>
              </div>

            </div>
          </Card>
        </div>

      </div>

    </div>
  );
}
