import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  Plus, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  ShieldCheck, 
  Utensils, 
  Building2, 
  Check, 
  ChevronRight,
  Filter
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useAuth, USER_ROLES } from '../contexts/AuthContext';
import { communicationService } from '../services/communicationService';

export default function TicketSupport() {
  const { userProfile, role, isSuperintendent, isHostelSuper, isMealManager, effectiveHostelId } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [toastNotice, setToastNotice] = useState('');

  // Form state
  const [newTicket, setNewTicket] = useState({
    targetAuthority: 'hostel_super',
    category: 'Room Infrastructure & Electrical',
    priority: 'Medium',
    title: '',
    description: ''
  });

  const isStaffAuthority = isSuperintendent || isHostelSuper || isMealManager;

  useEffect(() => {
    loadTickets();
    const handleUpdate = () => loadTickets();
    window.addEventListener('pti_tickets_changed', handleUpdate);
    return () => window.removeEventListener('pti_tickets_changed', handleUpdate);
  }, [effectiveHostelId, role, userProfile]);

  const loadTickets = () => {
    const list = communicationService.getTickets(
      effectiveHostelId, 
      role, 
      userProfile?.id || userProfile?.rollNumber
    );
    setTickets(list);
    if (selectedTicket) {
      const fresh = list.find(t => t.id === selectedTicket.id);
      if (fresh) setSelectedTicket(fresh);
    } else if (list.length > 0) {
      setSelectedTicket(list[0]);
    }
  };

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!newTicket.title || !newTicket.description) return;

    communicationService.createTicket({
      hostelId: effectiveHostelId,
      targetAuthority: newTicket.targetAuthority,
      category: newTicket.category,
      priority: newTicket.priority,
      title: newTicket.title,
      description: newTicket.description,
      studentId: userProfile?.id || userProfile?.loginId,
      studentName: userProfile?.name || 'Student',
      studentRoll: userProfile?.rollNumber || userProfile?.loginId,
    });

    setShowCreateModal(false);
    setNewTicket({ targetAuthority: 'hostel_super', category: 'Room Infrastructure & Electrical', priority: 'Medium', title: '', description: '' });
    setToastNotice('Complaint ticket successfully forwarded to designated authority.');
    setTimeout(() => setToastNotice(''), 3000);
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    communicationService.replyTicket(selectedTicket.id, {
      senderName: userProfile?.name,
      role: userProfile?.designation || role.replace('_', ' ').toUpperCase(),
      message: replyMessage.trim()
    });

    setReplyMessage('');
    setToastNotice('Reply sent on ticket.');
    setTimeout(() => setToastNotice(''), 2500);
  };

  const handleStatusChange = (status) => {
    if (!selectedTicket) return;
    communicationService.updateTicketStatus(selectedTicket.id, status);
    setToastNotice(`Ticket marked as ${status.toUpperCase()}`);
    setTimeout(() => setToastNotice(''), 2500);
  };

  const getAuthorityBadge = (auth) => {
    switch (auth) {
      case 'superintendent':
        return <Badge variant="teal" size="sm">Superintendent</Badge>;
      case 'hostel_super':
        return <Badge variant="info" size="sm">Hostel Super (Warden)</Badge>;
      case 'meal_manager':
        return <Badge variant="success" size="sm">Meal Manager</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Administration</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
        return <Badge variant="success" size="sm">RESOLVED</Badge>;
      case 'In Progress':
        return <Badge variant="warning" size="sm">IN PROGRESS</Badge>;
      default:
        return <Badge variant="danger" size="sm">OPEN</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-600"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Support & Accountability System
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Direct Inquiries & Complaint Tickets
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStaffAuthority 
              ? 'Review and resolve inquiries submitted by hall residents, monitors, and cadets.'
              : 'Directly file maintenance complaints, dining feedback, or appeals to specific authorities.'}
          </p>
        </div>

        <Button variant="primary" size="md" icon={Plus} onClick={() => setShowCreateModal(true)}>
          New Inquiry / Ticket
        </Button>
      </div>

      {toastNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Two Column Ticket Layout: Ticket List (Left) + Ticket Thread & Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Tickets Queue */}
        <div className="lg:col-span-1 space-y-3">
          <div className="px-1 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {isStaffAuthority ? 'Incoming Tickets Queue' : 'My Inquiries & Tickets'} ({tickets.length})
            </h3>
          </div>

          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {tickets.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
                <LifeBuoy className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                No active tickets found.
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTicket?.id === t.id
                      ? 'bg-brand-50/70 border-brand-300 shadow-sm'
                      : 'bg-white border-slate-200/90 hover:bg-slate-50 shadow-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs truncate max-w-[180px]">{t.title}</span>
                    {getStatusBadge(t.status)}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{t.description}</p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                    <span>{t.id} • {t.studentName}</span>
                    <span>{t.createdAt.split(' ')[0]}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Ticket Thread & Replies */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card p-6 flex flex-col h-[640px]">
              
              {/* Ticket Header */}
              <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-brand-700">{selectedTicket.id}</span>
                    {getStatusBadge(selectedTicket.status)}
                    <span className="text-xs text-slate-400 font-medium">Target:</span>
                    {getAuthorityBadge(selectedTicket.targetAuthority)}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1">{selectedTicket.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Category: <strong>{selectedTicket.category}</strong> • Submitted by: <strong>{selectedTicket.studentName}</strong> (Roll: {selectedTicket.studentRoll})
                  </p>
                </div>

                {/* Status Toggle buttons for Staff Authorities */}
                {isStaffAuthority && (
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => handleStatusChange('Open')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                        selectedTicket.status === 'Open' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleStatusChange('In Progress')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                        selectedTicket.status === 'In Progress' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange('Resolved')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                        selectedTicket.status === 'Resolved' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Resolved
                    </button>
                  </div>
                )}
              </div>

              {/* Original Description */}
              <div className="py-3.5 bg-slate-50 rounded-xl p-4 my-3 text-xs text-slate-700 border border-slate-100">
                <p className="font-semibold text-slate-900 mb-1">Issue Description:</p>
                {selectedTicket.description}
                <div className="text-[10px] text-slate-400 mt-2 font-mono">Logged at: {selectedTicket.createdAt}</div>
              </div>

              {/* Replies Thread */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Responses & Action Log ({selectedTicket.replies?.length || 0})</p>
                {selectedTicket.replies?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No responses yet. Write a message below to communicate.</p>
                ) : (
                  selectedTicket.replies?.map((rep, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-white space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span>{rep.senderName}</span>
                          <span className="text-[11px] text-brand-700 font-medium">({rep.role})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{rep.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-700 pt-0.5">{rep.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Post official inquiry response / update..."
                  className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-brand-600 focus:bg-white"
                />
                <Button type="submit" variant="primary" size="md" icon={Send} disabled={!replyMessage.trim()}>
                  Reply
                </Button>
              </form>

            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card p-12 text-center text-slate-400 text-xs h-[640px] flex flex-col items-center justify-center">
              <LifeBuoy className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Select a ticket from the left queue to view details</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal: New Ticket Submission */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-dropdown p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Submit Direct Inquiry or Complaint</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Authority</label>
                <select
                  value={newTicket.targetAuthority}
                  onChange={(e) => setNewTicket({ ...newTicket, targetAuthority: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-brand-600"
                >
                  <option value="hostel_super">Hostel Super (Warden: Room, Water, Noise, Sanitation)</option>
                  <option value="meal_manager">Meal Manager (Mess Food Quality, Meal Rate, Dietary)</option>
                  <option value="superintendent">Superintendent (Executive Appeal, Fees, Leaves)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Issue Category</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  >
                    <option>Room Infrastructure & Electrical</option>
                    <option>Water & Plumbing Problem</option>
                    <option>Mess Food Quality & Dietary</option>
                    <option>Disciplinary & Noise Conflict</option>
                    <option>Fee Payment / Challan Dispute</option>
                    <option>General Institutional Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Urgency Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High Urgency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Subject / Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Washroom tap leaking on 1st floor Block A"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide precise details of the problem..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" icon={Send}>
                  Submit Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
