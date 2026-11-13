import { isFirebaseConfigured, db } from '../firebase';
import { collection, doc, getDocs, setDoc, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export const COMM_KEYS = {
  NOTICES: 'pti_comm_notices',
  HOSTEL_MESSAGES: 'pti_comm_hostel_messages',
  GLOBAL_MESSAGES: 'pti_comm_global_messages',
  TICKETS: 'pti_comm_tickets',
  INIT_COMM: 'pti_comm_initialized_v1'
};

// Seed Notices (Hostel Isolated)
export const SEED_NOTICES = [
  {
    id: 'NOT-101',
    hostelId: 'hostel_01',
    title: 'Mandatory Room Inspection & Fire Safety Check',
    content: 'All boarders of Kazi Nazrul Hall are hereby notified that the Chief Warden and Hostel Super will conduct a routine safety and inventory inspection this Thursday at 19:30 hrs. Ensure rooms are tidy and all unauthorized heating appliances are unplugged.',
    category: 'Urgent',
    priority: 'high',
    authorName: 'Dr. Anand Verma',
    authorRole: 'Hostel Super (Chief Warden)',
    date: '2026-10-28',
    pinned: true
  },
  {
    id: 'NOT-102',
    hostelId: 'hostel_01',
    title: 'Dining Hall Weekend Special Feast Timing',
    content: 'The Mess Committee will serve the monthly celebratory feast this Friday evening (Kacchi Biryani & Firni). Dinner service will strictly run from 20:30 hrs to 22:00 hrs. Please register your meal preference with the Meal Manager before the cut-off.',
    category: 'Dining',
    priority: 'normal',
    authorName: 'Dr. Anand Verma',
    authorRole: 'Hostel Super (Chief Warden)',
    date: '2026-10-27',
    pinned: false
  },
  {
    id: 'NOT-103',
    hostelId: 'hostel_01',
    title: 'Water Motor Maintenance Window',
    content: 'Water supply to Block A 2nd floor will be temporarily suspended from 14:00 to 16:00 on Wednesday for plumbing valve maintenance. Residents are requested to store adequate water.',
    category: 'Maintenance',
    priority: 'normal',
    authorName: 'Prof. S. K. Choudhury',
    authorRole: 'Superintendent',
    date: '2026-10-26',
    pinned: false
  },
  // Notice for Hostel 02 (Strictly isolated)
  {
    id: 'NOT-201',
    hostelId: 'hostel_02',
    title: 'Sher-e-Bangla Hall Inter-Floor Table Tennis Tournament',
    content: 'Registration for the annual intra-hall table tennis championship is now open at the warden office. Final squad submissions close Saturday.',
    category: 'Sports',
    priority: 'normal',
    authorName: 'Prof. S. K. Choudhury',
    authorRole: 'Superintendent',
    date: '2026-10-27',
    pinned: true
  }
];

// Seed Chat Messages (Hostel Isolated & Global)
export const SEED_HOSTEL_CHAT = [
  {
    id: 'MSG-01',
    hostelId: 'hostel_01',
    senderId: 'hostel_super',
    senderName: 'Dr. Anand Verma',
    senderRole: 'Hostel Super',
    text: 'Good evening boarders. Reminder: Curfew roll-call will be conducted strictly at 21:30 hrs tonight.',
    timestamp: '18:45',
    date: 'Today'
  },
  {
    id: 'MSG-02',
    hostelId: 'hostel_01',
    senderId: 'monitor_101',
    senderName: 'Aarav Patel',
    senderRole: 'Hostel Monitor',
    text: 'Noted sir. Block A residents have been informed. Motor capacitor replacement was completed earlier today.',
    timestamp: '18:50',
    date: 'Today'
  },
  {
    id: 'MSG-03',
    hostelId: 'hostel_01',
    senderId: 'manager_102',
    senderName: 'Rohan Deshmukh',
    senderRole: 'Meal Manager',
    text: 'Tomorrow evening meal list has been updated. Please check your toggles before 8:00 PM cut-off!',
    timestamp: '19:15',
    date: 'Today'
  },
  {
    id: 'MSG-04',
    hostelId: 'hostel_01',
    senderId: 'boarder_103',
    senderName: 'Vikram Singh',
    senderRole: 'Boarder Student',
    text: 'Will dinner start on time at 20:30 tonight?',
    timestamp: '19:20',
    date: 'Today'
  }
];

export const SEED_GLOBAL_CHAT = [
  {
    id: 'GMSG-01',
    senderId: 'boarder_103',
    senderName: 'Vikram Singh',
    senderRole: 'Boarder Student',
    senderHostel: 'Kazi Nazrul Hall',
    text: 'Anyone from Automobile Engineering have the workshop safety manual for semester finals?',
    timestamp: '17:30'
  },
  {
    id: 'GMSG-02',
    senderId: 'student_201',
    senderName: 'Zubair Ahmed',
    senderRole: 'Non-Boarder',
    senderHostel: 'Day-Scholar',
    text: 'Yes Vikram, I have the PDF scanned from the central library. I can share it in the common room.',
    timestamp: '17:35'
  },
  {
    id: 'GMSG-03',
    senderId: 'admin',
    senderName: 'Prof. S. K. Choudhury',
    senderRole: 'Superintendent',
    senderHostel: 'Central Administration',
    text: 'All students are reminded that library hours are extended till 22:00 hrs during exam week.',
    timestamp: '18:00'
  }
];

// Seed Support / Complaint Tickets
export const SEED_TICKETS = [
  {
    id: 'TCK-301',
    hostelId: 'hostel_01',
    targetAuthority: 'hostel_super', // Targeted to Hostel Super
    category: 'Room Infrastructure & Electrical',
    title: 'Ceiling Fan Regulator Not Functioning in Room 103',
    description: 'The fan regulator in Room 103 speed 1-4 is sparking and stuck on high speed. Please send electrician.',
    studentId: 'boarder_103',
    studentName: 'Vikram Singh',
    studentRoll: '103',
    status: 'In Progress',
    priority: 'Medium',
    createdAt: '2026-10-28 15:20',
    updatedAt: '2026-10-28 17:00',
    replies: [
      {
        senderName: 'Dr. Anand Verma',
        role: 'Hostel Super',
        message: 'Hostel electrician has been notified. Work order dispatched with Monitor Aarav.',
        timestamp: '2026-10-28 17:00'
      }
    ]
  },
  {
    id: 'TCK-302',
    hostelId: 'hostel_01',
    targetAuthority: 'meal_manager', // Targeted to Meal Manager
    category: 'Mess Food Quality & Dietary',
    title: 'Special Low-Spice Diet Request for Medical Recovery',
    description: 'Physician at health center advised low oil/spice khichuri/boiled meal for 3 days due to gastritis.',
    studentId: 'monitor_101',
    studentName: 'Aarav Patel',
    studentRoll: '101',
    status: 'Open',
    priority: 'High',
    createdAt: '2026-10-29 08:00',
    updatedAt: '2026-10-29 08:00',
    replies: []
  },
  {
    id: 'TCK-303',
    hostelId: 'hostel_01',
    targetAuthority: 'superintendent', // Targeted to Superintendent
    category: 'Academic Leave & Disciplinary Appeal',
    title: 'Inter-Polytechnic Athletics Tournament Attendance Waiver',
    description: 'Requesting superintendent endorsement for PT drill waiver while representing the institute.',
    studentId: 'student_201',
    studentName: 'Zubair Ahmed',
    studentRoll: '201',
    status: 'Resolved',
    priority: 'Normal',
    createdAt: '2026-10-25 11:00',
    updatedAt: '2026-10-26 14:00',
    replies: [
      {
        senderName: 'Prof. S. K. Choudhury',
        role: 'Superintendent',
        message: 'Endorsed and forwarded to PTI department. Good luck for the tournament.',
        timestamp: '2026-10-26 14:00'
      }
    ]
  }
];

export const communicationService = {
  // Initialize communication stores
  init: () => {
    if (!localStorage.getItem(COMM_KEYS.INIT_COMM)) {
      localStorage.setItem(COMM_KEYS.NOTICES, JSON.stringify(SEED_NOTICES));
      localStorage.setItem(COMM_KEYS.HOSTEL_MESSAGES, JSON.stringify(SEED_HOSTEL_CHAT));
      localStorage.setItem(COMM_KEYS.GLOBAL_MESSAGES, JSON.stringify(SEED_GLOBAL_CHAT));
      localStorage.setItem(COMM_KEYS.TICKETS, JSON.stringify(SEED_TICKETS));
      localStorage.setItem(COMM_KEYS.INIT_COMM, 'true');
    }
  },

  // 1. NOTICES: Strictly isolated by hostel
  getNotices: (hostelId, isSuperintendent = false) => {
    communicationService.init();
    const raw = localStorage.getItem(COMM_KEYS.NOTICES);
    const all = raw ? JSON.parse(raw) : SEED_NOTICES;
    if (isSuperintendent && !hostelId) return all;
    return all.filter(n => n.hostelId === hostelId);
  },

  createNotice: (noticeData) => {
    const raw = localStorage.getItem(COMM_KEYS.NOTICES);
    const all = raw ? JSON.parse(raw) : [];
    const newNotice = {
      id: `NOT-${Date.now().toString().slice(-4)}`,
      ...noticeData,
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [newNotice, ...all];
    localStorage.setItem(COMM_KEYS.NOTICES, JSON.stringify(updated));
    window.dispatchEvent(new Event('pti_notices_changed'));
    return newNotice;
  },

  deleteNotice: (noticeId) => {
    const raw = localStorage.getItem(COMM_KEYS.NOTICES);
    if (!raw) return;
    const all = JSON.parse(raw);
    const updated = all.filter(n => n.id !== noticeId);
    localStorage.setItem(COMM_KEYS.NOTICES, JSON.stringify(updated));
    window.dispatchEvent(new Event('pti_notices_changed'));
  },

  // 2. CHAT: Hostel-Specific Chat vs Global Student Chat
  getHostelMessages: (hostelId) => {
    communicationService.init();
    const raw = localStorage.getItem(COMM_KEYS.HOSTEL_MESSAGES);
    const all = raw ? JSON.parse(raw) : SEED_HOSTEL_CHAT;
    return all.filter(m => m.hostelId === hostelId);
  },

  sendHostelMessage: (hostelId, message) => {
    const raw = localStorage.getItem(COMM_KEYS.HOSTEL_MESSAGES);
    const all = raw ? JSON.parse(raw) : [];
    const newMsg = {
      id: `MSG-${Date.now()}`,
      hostelId,
      ...message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today'
    };
    const updated = [...all, newMsg];
    localStorage.setItem(COMM_KEYS.HOSTEL_MESSAGES, JSON.stringify(updated));
    window.dispatchEvent(new Event('pti_chat_changed'));
    return newMsg;
  },

  getGlobalMessages: () => {
    communicationService.init();
    const raw = localStorage.getItem(COMM_KEYS.GLOBAL_MESSAGES);
    return raw ? JSON.parse(raw) : SEED_GLOBAL_CHAT;
  },

  sendGlobalMessage: (message) => {
    const raw = localStorage.getItem(COMM_KEYS.GLOBAL_MESSAGES);
    const all = raw ? JSON.parse(raw) : [];
    const newMsg = {
      id: `GMSG-${Date.now()}`,
      ...message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [...all, newMsg];
    localStorage.setItem(COMM_KEYS.GLOBAL_MESSAGES, JSON.stringify(updated));
    window.dispatchEvent(new Event('pti_chat_changed'));
    return newMsg;
  },

  // 3. DIRECT MESSAGING & COMPLAINT TICKETING SYSTEM
  getTickets: (hostelId, userRole, userId) => {
    communicationService.init();
    const raw = localStorage.getItem(COMM_KEYS.TICKETS);
    const all = raw ? JSON.parse(raw) : SEED_TICKETS;

    // If Superintendent, can see tickets targeted to 'superintendent' or all
    if (userRole === 'superintendent') {
      return all;
    }
    // If Hostel Super, see tickets for their hostel targeted to 'hostel_super'
    if (userRole === 'hostel_super') {
      return all.filter(t => t.hostelId === hostelId && (t.targetAuthority === 'hostel_super' || t.targetAuthority === 'all'));
    }
    // If Meal Manager, see tickets targeted to 'meal_manager'
    if (userRole === 'meal_manager') {
      return all.filter(t => t.hostelId === hostelId && t.targetAuthority === 'meal_manager');
    }
    // For students/monitors, see tickets THEY submitted
    return all.filter(t => t.studentId === userId || t.studentRoll === userId);
  },

  createTicket: (ticketData) => {
    const raw = localStorage.getItem(COMM_KEYS.TICKETS);
    const all = raw ? JSON.parse(raw) : [];
    const newTicket = {
      id: `TCK-${Date.now().toString().slice(-4)}`,
      ...ticketData,
      status: 'Open',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      replies: []
    };
    const updated = [newTicket, ...all];
    localStorage.setItem(COMM_KEYS.TICKETS, JSON.stringify(updated));
    window.dispatchEvent(new Event('pti_tickets_changed'));
    return newTicket;
  },

  replyTicket: (ticketId, replyData, newStatus = null) => {
    const raw = localStorage.getItem(COMM_KEYS.TICKETS);
    if (!raw) return;
    const all = JSON.parse(raw);
    const updated = all.map(t => {
      if (t.id === ticketId) {
        const replies = [
          ...t.replies,
          {
            ...replyData,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
          }
        ];
        return {
          ...t,
          status: newStatus || t.status,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          replies
        };
      }
      return t;
    });
    localStorage.setItem(COMM_KEYS.TICKETS, JSON.stringify(updated));
    window.dispatchEvent(new Event('pti_tickets_changed'));
  },

  updateTicketStatus: (ticketId, status) => {
    const raw = localStorage.getItem(COMM_KEYS.TICKETS);
    if (!raw) return;
    const all = JSON.parse(raw);
    const updated = all.map(t => t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16) } : t);
    localStorage.setItem(COMM_KEYS.TICKETS, JSON.stringify(updated));
    window.dispatchEvent(new Event('pti_tickets_changed'));
  }
};
