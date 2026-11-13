import React, { useState, useEffect } from 'react';
import { FileText, Plus, Check, X, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useAuth, USER_ROLES } from '../contexts/AuthContext';
import { SEED_LEAVE_REQUESTS } from '../services/seedData';

export default function LeaveRequests() {
  const { userProfile, role, isStudent, isSuperintendent, isHostelSuper } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newLeave, setNewLeave] = useState({
    type: 'Weekend Out-Pass',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  useEffect(() => {
    const raw = localStorage.getItem('pti_db_leave_requests');
    if (raw) {
      setLeaves(JSON.parse(raw));
    } else {
      setLeaves(SEED_LEAVE_REQUESTS);
    }
  }, []);

  const saveLeaves = (updated) => {
    setLeaves(updated);
    localStorage.setItem('pti_db_leave_requests', JSON.stringify(updated));
  };

  const handleAction = (id, newStatus) => {
    const updated = leaves.map(l => l.id === id ? { 
      ...l, 
      status: newStatus,
      approvedBy: newStatus === 'Approved' ? `${userProfile?.name} (${role})` : null
    } : l);
    saveLeaves(updated);
  };

  const handleCreateLeave = (e) => {
    e.preventDefault();
    const item = {
      id: `LV-${Math.floor(100 + Math.random() * 900)}`,
      cadetId: userProfile?.id || 'student_101',
      cadetName: userProfile?.name || 'Aarav Patel',
      rollNumber: userProfile?.rollNumber || '101',
      wing: userProfile?.wing || 'Block A (Junior)',
      roomNumber: userProfile?.roomNumber || '101',
      type: newLeave.type,
      fromDate: newLeave.fromDate,
      toDate: newLeave.toDate,
      reason: newLeave.reason,
      guardianApproval: 'Applied via Cadet Portal',
      status: 'Pending Superintendent Approval',
      appliedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    saveLeaves([item, ...leaves]);
    setShowNewModal(false);
    setNewLeave({ type: 'Weekend Out-Pass', fromDate: '', toDate: '', reason: '' });
  };

  // Filter leaves if student is logged in
  const visibleLeaves = isStudent
    ? leaves.filter(l => l.rollNumber === userProfile?.rollNumber)
    : leaves;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isStudent ? 'My Out-Pass & Leave History' : 'Leave & Out-Pass Approvals'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isStudent 
              ? 'Track the status of your campus leaves, gate passes, and sports duties.'
              : 'Institutional authorization portal for student gate passes and medical leaves.'}
          </p>
        </div>
        <Button variant="primary" size="md" icon={Plus} onClick={() => setShowNewModal(true)}>
          New Out-Pass Application
        </Button>
      </div>

      <Card 
        title={isStudent ? 'Submitted Applications' : 'Cadet Out-Pass Applications Queue'} 
        subtitle="Verification and authorization records"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Cadet Profile</th>
                <th className="pb-3">Pass Type</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Reason / Details</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right pr-2">
                  {isStudent ? 'Sign-Off' : 'Superintendent Decision'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLeaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 pl-2">
                    <p className="font-semibold text-slate-900">{leave.cadetName}</p>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Roll: {leave.rollNumber} • {leave.wing}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-slate-700">{leave.type}</td>
                  <td className="py-3 text-slate-500 font-mono text-[11px]">
                    {leave.fromDate} to {leave.toDate}
                  </td>
                  <td className="py-3 text-slate-600 max-w-xs truncate" title={leave.reason}>
                    {leave.reason}
                  </td>
                  <td className="py-3 text-center">
                    <Badge 
                      variant={
                        leave.status === 'Approved' ? 'teal' :
                        leave.status === 'Rejected' ? 'danger' : 'warning'
                      } 
                      size="sm"
                    >
                      {leave.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right pr-2 space-x-1">
                    {leave.status.includes('Pending') && !isStudent ? (
                      <>
                        <button
                          onClick={() => handleAction(leave.id, 'Approved')}
                          className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded text-[11px] font-semibold transition-colors shadow-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(leave.id, 'Rejected')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded text-[11px] font-semibold transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {leave.approvedBy ? `Signed by ${leave.approvedBy}` : 'Pending review'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal for creating a new leave */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-dropdown p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">New Out-Pass Application</h3>
              <button 
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Pass Category</label>
                <select
                  value={newLeave.type}
                  onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                >
                  <option>Weekend Out-Pass</option>
                  <option>Official Sports Duty</option>
                  <option>Medical Leave</option>
                  <option>Emergency Home Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">From Date</label>
                  <input 
                    type="date" 
                    required
                    value={newLeave.fromDate}
                    onChange={(e) => setNewLeave({ ...newLeave, fromDate: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">To Date</label>
                  <input 
                    type="date" 
                    required
                    value={newLeave.toDate}
                    onChange={(e) => setNewLeave({ ...newLeave, toDate: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  required
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  placeholder="Provide precise reason for leave / out-pass..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowNewModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Submit Out-Pass
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
