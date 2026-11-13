import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Pin, 
  Filter, 
  AlertTriangle, 
  Lock, 
  Building2, 
  CheckCircle2, 
  Calendar,
  Send,
  UserCheck
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useAuth, USER_ROLES } from '../contexts/AuthContext';
import { communicationService } from '../services/communicationService';
import { dbService } from '../services/db';

export default function NoticeBoard() {
  const { userProfile, role, isSuperintendent, isHostelSuper, isNonBoarder, effectiveHostelId } = useAuth();
  
  const [notices, setNotices] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Notice form
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    category: 'Urgent',
    priority: 'high',
    pinned: false
  });

  // Permission check: ONLY Superintendent and respective Hostel Super can author/delete notices
  const canManageNotices = isSuperintendent || isHostelSuper;

  useEffect(() => {
    loadNotices();
    const loadHostels = () => {
      setHostels(dbService.getHostels());
    };
    loadHostels();

    const handleUpdate = () => loadNotices();
    window.addEventListener('pti_notices_changed', handleUpdate);
    window.addEventListener('pti_hostels_changed', loadHostels);
    return () => {
      window.removeEventListener('pti_notices_changed', handleUpdate);
      window.removeEventListener('pti_hostels_changed', loadHostels);
    };
  }, [effectiveHostelId, isSuperintendent]);

  const loadNotices = () => {
    const list = communicationService.getNotices(effectiveHostelId, isSuperintendent);
    setNotices(list);
  };

  const handleCreateNotice = (e) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.content) return;

    communicationService.createNotice({
      hostelId: effectiveHostelId,
      title: newNotice.title,
      content: newNotice.content,
      category: newNotice.category,
      priority: newNotice.priority,
      pinned: newNotice.pinned,
      authorName: userProfile?.name || 'Authority',
      authorRole: isSuperintendent ? 'Superintendent' : 'Hostel Super (Chief Warden)'
    });

    setShowCreateModal(false);
    setNewNotice({ title: '', content: '', category: 'Urgent', priority: 'high', pinned: false });
    setSuccessToast('Official notice posted to hall notice board.');
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleDeleteNotice = (id) => {
    communicationService.deleteNotice(id);
    setSuccessToast('Notice archived and removed.');
    setTimeout(() => setSuccessToast(''), 2500);
  };

  // Rule 1: Non-Boarders cannot view hostel-specific residential notices (strict isolation)
  if (isNonBoarder) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-card text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Residential Notice Board Access Restricted
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            You are enrolled as an attached <strong>Non-Boarder Student (Day Scholar)</strong>. 
            Hostel residential dormitory circulars, floor maintenance, and dining bulletins are strictly isolated to enrolled hall boarders.
          </p>
          <div className="pt-2">
            <Badge variant="neutral" size="md">
              Strict Hostel-Level Data Isolation Enforced
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  const currentHallName = hostels.find(h => h.id === effectiveHostelId)?.name || 'Kazi Nazrul Hall';

  const filteredNotices = notices.filter(n => {
    if (selectedCategory === 'all') return true;
    return n.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-600"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Hostel Residential Bulletin
            </span>
            <Badge variant="teal" size="sm">Hall: {currentHallName}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Official Hall Notice Board
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {canManageNotices 
              ? 'Authorized Warden & Superintendent publishing channel. Circulars are strictly isolated to this hostel.'
              : 'Official residential notices, dining updates, and routine advisories for hall boarders.'}
          </p>
        </div>

        {canManageNotices && (
          <Button variant="primary" size="md" icon={Plus} onClick={() => setShowCreateModal(true)}>
            Publish Hall Notice
          </Button>
        )}
      </div>

      {successToast && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter:</span>
          {['all', 'Urgent', 'Dining', 'Maintenance', 'Sports'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedCategory === cat 
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Bulletins' : cat}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400">
          Showing <strong className="text-slate-800">{filteredNotices.length}</strong> official circulars
        </span>
      </div>

      {/* Notices Grid */}
      <div className="space-y-4">
        {filteredNotices.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No notices in this category</p>
            <p className="text-[11px] mt-0.5">Check back later for official announcements from the Warden.</p>
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <div 
              key={notice.id}
              className={`bg-white border rounded-xl p-5 shadow-card transition-all ${
                notice.pinned ? 'border-brand-300 ring-1 ring-brand-100' : 'border-slate-200/90'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {notice.pinned ? (
                    <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 shrink-0">
                      <Pin className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight">{notice.title}</h3>
                      {notice.pinned && <Badge variant="teal" size="sm">PINNED</Badge>}
                      <Badge variant={notice.category === 'Urgent' ? 'danger' : notice.category === 'Dining' ? 'warning' : 'neutral'} size="sm">
                        {notice.category}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-4xl pt-1">
                      {notice.content}
                    </p>

                    <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400">
                      <span>Posted by: <strong className="text-slate-700 font-semibold">{notice.authorName}</strong> ({notice.authorRole})</span>
                      <span>•</span>
                      <span className="font-mono">{notice.date}</span>
                    </div>
                  </div>
                </div>

                {/* Delete button only visible to Superintendent and Hostel Super */}
                {canManageNotices && (
                  <button
                    onClick={() => handleDeleteNotice(notice.id)}
                    title="Delete notice"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Publish Notice */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-dropdown p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Publish Official Hall Notice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Notice Heading</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mandatory Curfew Check Timing Revision"
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Notice Category</label>
                  <select
                    value={newNotice.category}
                    onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  >
                    <option>Urgent</option>
                    <option>Dining</option>
                    <option>Maintenance</option>
                    <option>Sports</option>
                    <option>General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Priority Level</label>
                  <select
                    value={newNotice.priority}
                    onChange={(e) => setNewNotice({ ...newNotice, priority: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                  >
                    <option value="high">High (Red Tag)</option>
                    <option value="normal">Standard Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Bulletin Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Draft the official notification details..."
                  value={newNotice.content}
                  onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={newNotice.pinned}
                  onChange={(e) => setNewNotice({ ...newNotice, pinned: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="pinCheck" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Pin this notice to top of notice board
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" icon={Send}>
                  Publish Bulletin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
