import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Building2, 
  Globe, 
  Lock, 
  CheckCircle2, 
  ShieldCheck, 
  Utensils, 
  Wrench, 
  GraduationCap 
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useAuth, USER_ROLES } from '../contexts/AuthContext';
import { communicationService } from '../services/communicationService';
import { dbService } from '../services/db';

export default function CommunicationHub() {
  const { userProfile, role, isSuperintendent, isHostelSuper, isNonBoarder, effectiveHostelId } = useAuth();
  
  const [activeTab, setActiveTab] = useState('hostel'); // 'hostel' | 'global'
  const [hostelMessages, setHostelMessages] = useState([]);
  const [globalMessages, setGlobalMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [hostels, setHostels] = useState([]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChatData();
    const loadHostels = () => {
      setHostels(dbService.getHostels());
    };
    loadHostels();

    const handleChatUpdate = () => loadChatData();
    window.addEventListener('pti_chat_changed', handleChatUpdate);
    window.addEventListener('pti_hostels_changed', loadHostels);
    return () => {
      window.removeEventListener('pti_chat_changed', handleChatUpdate);
      window.removeEventListener('pti_hostels_changed', loadHostels);
    };
  }, [effectiveHostelId, activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [hostelMessages, globalMessages, activeTab]);

  const loadChatData = () => {
    setHostelMessages(communicationService.getHostelMessages(effectiveHostelId));
    setGlobalMessages(communicationService.getGlobalMessages());
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (activeTab === 'hostel') {
      communicationService.sendHostelMessage(effectiveHostelId, {
        senderId: userProfile?.id || userProfile?.loginId,
        senderName: userProfile?.name || 'Cadet',
        senderRole: userProfile?.designation || role.replace('_', ' ').toUpperCase(),
        text: inputText.trim()
      });
    } else {
      const myHostelName = userProfile?.hostelName || (isNonBoarder ? 'Day-Scholar' : 'Nazrul Hall');
      communicationService.sendGlobalMessage({
        senderId: userProfile?.id || userProfile?.loginId,
        senderName: userProfile?.name || 'Student',
        senderRole: role.replace('_', ' ').toUpperCase(),
        senderHostel: myHostelName,
        text: inputText.trim()
      });
    }

    setInputText('');
  };

  const currentHallName = hostels.find(h => h.id === effectiveHostelId)?.name || 'Kazi Nazrul Hall';

  const getRoleBadgeVariant = (senderRole = '') => {
    const lower = senderRole.toLowerCase();
    if (lower.includes('superintendent')) return 'teal';
    if (lower.includes('super') || lower.includes('warden')) return 'info';
    if (lower.includes('monitor')) return 'warning';
    if (lower.includes('manager')) return 'success';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-600"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600">
              Institutional Communications Hub
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 mt-1">
            Realtime Multi-Room Chat System
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized messaging: Isolated hall dormitory discussion & Institute-wide student common room.
          </p>
        </div>

        {/* Room Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('hostel')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'hostel'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-teal-600" />
            <span>Hall Group Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('global')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'global'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 text-sky-600" />
            <span>Global Student Common</span>
          </button>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col h-[600px] overflow-hidden">
        
        {/* Chat Room Banner */}
        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {activeTab === 'hostel' ? (
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700">
                <Building2 className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                <Globe className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {activeTab === 'hostel' ? `${currentHallName} (Private Hall Room)` : 'Global Student Common Room'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {activeTab === 'hostel' 
                  ? 'Boarders, Monitors, Meal Managers, and Warden of this hall only'
                  : 'Open campus room connecting all boarders & non-boarder students'}
              </p>
            </div>
          </div>

          <Badge variant={activeTab === 'hostel' ? 'teal' : 'info'} size="sm">
            {activeTab === 'hostel' ? 'Hall Isolated' : 'Cross-Hostel'}
          </Badge>
        </div>

        {/* Message Thread Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30">
          
          {/* Check isolation rule: Non-boarders cannot enter Hall private chat */}
          {activeTab === 'hostel' && isNonBoarder ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Private Hall Chatbox Restricted</h4>
              <p className="text-xs text-slate-500 max-w-md">
                As a Non-Boarder (Day Scholar), you are not assigned to residential dormitory quarters. 
                Please switch to the <strong>Global Student Common Room</strong> tab to chat with all classmates.
              </p>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('global')}>
                Switch to Global Common
              </Button>
            </div>
          ) : (
            <>
              {/* Render Messages */}
              {(activeTab === 'hostel' ? hostelMessages : globalMessages).map((msg) => {
                const isMe = msg.senderId === userProfile?.id || msg.senderId === userProfile?.loginId;
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-xl ${isMe ? 'ml-auto' : 'mr-auto'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="font-bold text-slate-900 text-xs">{msg.senderName}</span>
                      <Badge variant={getRoleBadgeVariant(msg.senderRole)} size="sm">
                        {msg.senderRole}
                      </Badge>
                      {msg.senderHostel && (
                        <span className="text-[10px] text-slate-400 font-medium">({msg.senderHostel})</span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                    </div>

                    <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isMe 
                        ? 'bg-brand-600 text-white rounded-tr-none shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-card'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}

        </div>

        {/* Input Bar (Hidden if non-boarder on private room) */}
        {!(activeTab === 'hostel' && isNonBoarder) && (
          <form onSubmit={handleSendMessage} className="p-3.5 border-t border-slate-200 bg-white flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={activeTab === 'hostel' ? `Message ${currentHallName}...` : 'Message student common room...'}
              className="flex-1 text-xs px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white transition-all"
            />
            <Button type="submit" variant="primary" size="md" icon={Send} disabled={!inputText.trim()}>
              Send
            </Button>
          </form>
        )}

      </div>

    </div>
  );
}
