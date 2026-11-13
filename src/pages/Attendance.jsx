import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Check, X, Clock, ShieldAlert, Calendar, Search, CheckCircle2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { SEED_USERS } from '../services/seedData';

export default function Attendance() {
  const [sessionType, setSessionType] = useState('pti_morning'); // 'pti_morning' | 'hostel_curfew'
  const [cadets, setCadets] = useState([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('pti_db_users');
    const all = raw ? JSON.parse(raw) : SEED_USERS;
    const studentList = all.filter(u => u.role === 'student');

    setCadets(studentList.map(c => ({
      cadetId: c.id,
      name: c.name,
      rollNumber: c.rollNumber,
      wing: c.wing,
      roomNumber: c.roomNumber,
      bedNumber: c.bedNumber,
      status: 'present'
    })));
  }, []);

  const handleStatusChange = (cadetId, newStatus) => {
    setCadets(prev => prev.map(c => c.cadetId === cadetId ? { ...c, status: newStatus } : c));
  };

  const handleMarkAll = (status) => {
    setCadets(prev => prev.map(c => ({ ...c, status })));
  };

  const handleSaveRoster = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const presentCount = cadets.filter(c => c.status === 'present').length;
  const absentCount = cadets.filter(c => c.status === 'absent').length;
  const excusedCount = cadets.filter(c => c.status === 'excused').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Muster & Attendance System</h1>
          <p className="text-sm text-slate-500 mt-0.5">Physical muster for morning drills & nightly hostel curfew roll-call.</p>
        </div>
        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Roster Submitted & Archived
            </span>
          )}
          <Button variant="primary" size="md" icon={ClipboardCheck} onClick={handleSaveRoster}>
            Submit Attendance Record
          </Button>
        </div>
      </div>

      {/* Mode Switcher & Summary Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Roster:</span>
          <button
            onClick={() => setSessionType('pti_morning')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              sessionType === 'pti_morning'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            PTI Morning Physical Muster (06:00 AM)
          </button>
          <button
            onClick={() => setSessionType('hostel_curfew')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              sessionType === 'hostel_curfew'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hostel Night Curfew Verification (21:30 PM)
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600">Present: <strong className="text-slate-900">{presentCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span className="text-slate-600">Absent: <strong className="text-slate-900">{absentCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-slate-600">Excused: <strong className="text-slate-900">{excusedCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Cadet Attendance Roster Table */}
      <Card 
        title={sessionType === 'pti_morning' ? 'Morning Field Drill Muster Roster' : 'Evening Quarters Curfew Check'} 
        subtitle="Mark attendance status for each cadet"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMarkAll('present')}
              className="text-[11px] text-brand-700 font-semibold bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded transition-colors"
            >
              Mark All Present
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Cadet Profile</th>
                <th className="pb-3">Class Roll No.</th>
                <th className="pb-3">Quarters Allotment</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right pr-2">Quick Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cadets.map((cadet) => (
                <tr key={cadet.cadetId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pl-2">
                    <p className="font-semibold text-slate-900">{cadet.name}</p>
                    <span className="text-[11px] text-slate-400">{cadet.cadetId}</span>
                  </td>
                  <td className="py-3 font-mono font-bold text-brand-700">
                    {cadet.rollNumber}
                  </td>
                  <td className="py-3 text-slate-600 font-medium">
                    {cadet.wing} • Room {cadet.roomNumber} ({cadet.bedNumber})
                  </td>
                  <td className="py-3 text-center">
                    <Badge 
                      variant={
                        cadet.status === 'present' ? 'teal' : 
                        cadet.status === 'absent' ? 'danger' : 'warning'
                      } 
                      size="sm"
                    >
                      {cadet.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 text-right pr-2 space-x-1">
                    <button
                      onClick={() => handleStatusChange(cadet.cadetId, 'present')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        cadet.status === 'present' 
                          ? 'bg-brand-600 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => handleStatusChange(cadet.cadetId, 'absent')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        cadet.status === 'absent' 
                          ? 'bg-rose-600 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Absent
                    </button>
                    <button
                      onClick={() => handleStatusChange(cadet.cadetId, 'excused')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        cadet.status === 'excused' 
                          ? 'bg-amber-600 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Excused
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
