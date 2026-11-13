/**
 * Comprehensive Multi-Tenant SaaS Seed Data for PTI & Hostel Management System
 * Supports 67 Nationwide PTIs, Master Admin (Tier 0), 6 Distinct Institutional Tiers,
 * Multiple Hostels per PTI, Establishment Expenses, Bazar Logs, Daily Meal Sheets, and Deposits.
 */

import { MALE_AVATAR_IDS, FEMALE_AVATAR_IDS } from '../constants/avatars';

export const SEED_PTIS = [
  {
    id: 'pti_dhaka',
    pti_id: 'pti_dhaka',
    name: "Primary Teachers Training Institutes",
    shortName: 'PTI',
    district: 'Dhaka',
    division: 'Dhaka',
    code: 'PTI-DHK-01',
    superintendentId: 'admin',
    superintendentName: 'Prof. S. K. Choudhury',
    superintendentEmail: 'superintendent@institution.edu',
    superintendentPhone: '+880 1711-000001',
    totalHostels: 2,
    status: 'Active',
    createdAt: '2026-01-10',
    settings: {
      instituteName: "Primary Teachers Training Institutes",
      appTitle: "Hostel Management App",
      instituteShortName: "PTI",
      fixedEstablishmentFee: 1200,
      cutOffTime: "20:00",
      mealCalculationsEnabled: true,
      establishmentCalculationsEnabled: true,
    }
  },
  {
    id: 'pti_chattogram',
    pti_id: 'pti_chattogram',
    name: "Chattogram Govt. Primary Teachers' Training Institute",
    shortName: 'Chattogram PTI',
    district: 'Chattogram',
    division: 'Chattogram',
    code: 'PTI-CTG-02',
    superintendentId: 'super_ctg',
    superintendentName: 'Dr. M. A. Rashid',
    superintendentEmail: 'super.ctg@pti.gov.bd',
    superintendentPhone: '+880 1711-000002',
    totalHostels: 1,
    status: 'Active',
    createdAt: '2026-02-01',
    settings: {
      instituteName: "Chattogram Govt. Primary Teachers' Training Institute",
      appTitle: "Chattogram PTI - Hostel & Portal System",
      instituteShortName: "CTG PTI",
      fixedEstablishmentFee: 1100,
      cutOffTime: "20:30",
      mealCalculationsEnabled: true,
      establishmentCalculationsEnabled: true,
    }
  },
  {
    id: 'pti_rajshahi',
    pti_id: 'pti_rajshahi',
    name: "Rajshahi Divisional Primary Teachers' Training Institute",
    shortName: 'Rajshahi PTI',
    district: 'Rajshahi',
    division: 'Rajshahi',
    code: 'PTI-RAJ-03',
    superintendentId: null,
    superintendentName: null,
    superintendentEmail: null,
    superintendentPhone: null,
    totalHostels: 0,
    status: 'Active',
    createdAt: '2026-02-15',
    settings: {
      instituteName: "Rajshahi Divisional Primary Teachers' Training Institute",
      appTitle: "Rajshahi PTI - Hostel System",
      instituteShortName: "Rajshahi PTI",
      fixedEstablishmentFee: 1200,
      cutOffTime: "20:00",
      mealCalculationsEnabled: true,
      establishmentCalculationsEnabled: true,
    }
  }
];

export const SEED_HOSTELS = [
  {
    id: 'hostel_01',
    pti_id: 'pti_dhaka',
    name: 'Kazi Nazrul Hall',
    code: 'KNH',
    type: 'পুরুষ হোস্টেল (Male Hostel)',
    totalRooms: 40,
    totalBeds: 120,
    occupiedBeds: 112,
    superintendentId: 'admin',
    hostelSuperId: 'hostel_super',
    status: 'active',
  },
  {
    id: 'hostel_02',
    pti_id: 'pti_dhaka',
    name: 'Sher-e-Bangla Hall',
    code: 'SBH',
    type: 'মহিলা হোস্টেল (Female Hostel)',
    totalRooms: 35,
    totalBeds: 105,
    occupiedBeds: 94,
    superintendentId: 'admin',
    hostelSuperId: 'hostel_super_02',
    status: 'active',
  },
  {
    id: 'hostel_ctg_01',
    pti_id: 'pti_chattogram',
    name: 'Bayejid Bostami Hall',
    code: 'BBH',
    type: 'পুরুষ হোস্টেল (Male Hostel)',
    totalRooms: 30,
    totalBeds: 90,
    occupiedBeds: 45,
    superintendentId: 'super_ctg',
    hostelSuperId: null,
    status: 'active',
  }
];

export const USER_ROLES = {
  MASTER_ADMIN: 'master_admin',
  SUPERINTENDENT: 'superintendent',
  HOSTEL_SUPER: 'hostel_super',
  HOSTEL_MONITOR: 'hostel_monitor',
  MEAL_MANAGER: 'meal_manager',
  BOARDER_STUDENT: 'boarder_student',
  NON_BOARDER_STUDENT: 'non_boarder_student',
};

export const SEED_USERS = [
  // Tier 0: Master Admin (Central Admin across all 67 PTIs)
  {
    id: 'master_admin',
    loginId: 'master',
    username: 'master',
    rollNumber: null,
    password: '123456',
    role: USER_ROLES.MASTER_ADMIN,
    name: 'Master Admin',
    gender: 'Male',
    avatar_id: MALE_AVATAR_IDS[0],
    designation: 'Master Admin',
    pti_id: 'GLOBAL', // As this role oversees all institutes
    hostelId: null,
    hostelName: 'Central Admin (67 PTIs)',
    email: 'master@pti.gov.bd',
    phone: '+880 1700-000000',
    phone_number: '+880 1700-000000',
    district: 'Dhaka',
    upazila: 'Shahbagh',
    union_ward: 'Secretariat',
    blood_group: 'O+',
    emergency_contact: '+880 1700-000001',
    status: 'active',
  },

  // Tier 1: Superintendent (Dhaka Central PTI)
  {
    id: 'admin',
    loginId: 'admin',
    username: 'admin',
    username_changes_left: 3,
    rollNumber: null,
    password: '123456',
    role: USER_ROLES.SUPERINTENDENT,
    name: 'Prof. S. K. Choudhury',
    gender: 'Male',
    avatar_id: MALE_AVATAR_IDS[0],
    designation: 'Chief Hostel Superintendent & Academic Head',
    pti_id: 'pti_dhaka',
    hostelId: null, // Global access in Dhaka PTI
    hostelName: 'All Hostels (Dhaka PTI)',
    email: 'superintendent@institution.edu',
    phone: '+880 1711-000001',
    phone_number: '+880 1711-000001',
    district: 'Dhaka',
    upazila: 'Dhanmondi',
    union_ward: 'Ward 15',
    blood_group: 'A+',
    emergency_contact: '+880 1819-000001',
    status: 'active',
  },

  // Tier 2: Hostel Super (Nazrul Hall Authority - Dhaka PTI)
  {
    id: 'hostel_super',
    loginId: 'hostel_super',
    rollNumber: null,
    password: '123456',
    role: USER_ROLES.HOSTEL_SUPER,
    name: 'Dr. Anand Verma',
    gender: 'Male',
    avatar_id: MALE_AVATAR_IDS[1],
    designation: 'Hostel Super (Chief Warden)',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    hostelName: 'Kazi Nazrul Hall',
    email: 'hostel.super@nazrulhall.edu',
    phone: '+880 1712-000002',
    phone_number: '+880 1712-000002',
    district: 'Mymensingh',
    upazila: 'Sadar',
    union_ward: 'Ward 03',
    blood_group: 'O+',
    emergency_contact: '+880 1819-000002',
    status: 'active',
  },

  // Tier 3: Hostel Monitor (Student Monitor in Nazrul Hall - Dhaka PTI)
  {
    id: 'monitor_101',
    loginId: 'monitor_101',
    rollNumber: '101',
    password: '123456',
    role: USER_ROLES.HOSTEL_MONITOR,
    name: 'Aarav Patel',
    gender: 'Male',
    avatar_id: MALE_AVATAR_IDS[2],
    designation: 'Hostel Monitor',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    hostelName: 'Kazi Nazrul Hall',
    roomNumber: '101',
    bedNumber: 'Bed 1',
    email: 'aarav.monitor@nazrulhall.edu',
    phone: '+880 1713-101101',
    phone_number: '+880 1713-101101',
    district: 'Bogura',
    upazila: 'Sadar',
    union_ward: 'Ward 07',
    blood_group: 'B+',
    emergency_contact: '+880 1819-101101',
    status: 'active',
  },

  // Tier 4: Meal Manager (Student Mess Manager in Nazrul Hall - Dhaka PTI)
  {
    id: 'manager_102',
    loginId: 'manager_102',
    rollNumber: '102',
    password: '123456',
    role: USER_ROLES.MEAL_MANAGER,
    name: 'Rohan Deshmukh',
    gender: 'Male',
    avatar_id: MALE_AVATAR_IDS[4],
    designation: 'Meal Manager',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    hostelName: 'Kazi Nazrul Hall',
    roomNumber: '102',
    bedNumber: 'Bed 1',
    email: 'rohan.mess@nazrulhall.edu',
    phone: '+880 1714-102102',
    phone_number: '+880 1714-102102',
    district: 'Rajshahi',
    upazila: 'Boalia',
    union_ward: 'Ward 12',
    blood_group: 'AB+',
    emergency_contact: '+880 1819-102102',
    status: 'active',
  },

  // Tier 5: Boarder Student (Resident taking meals in Nazrul Hall - Dhaka PTI)
  {
    id: 'boarder_103',
    loginId: '103',
    rollNumber: '103',
    password: '123456',
    role: USER_ROLES.BOARDER_STUDENT,
    name: 'Vikram Singh',
    gender: 'Male',
    avatar_id: MALE_AVATAR_IDS[1],
    designation: 'Boarder Student',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    hostelName: 'Kazi Nazrul Hall',
    wing: 'Block A (Junior)',
    roomNumber: '103',
    bedNumber: 'Bed 2',
    email: 'vikram.103@cadet.institution.edu',
    phone: '+880 1715-103103',
    phone_number: '+880 1715-103103',
    district: 'Rangpur',
    upazila: 'Mithapukur',
    union_ward: 'Union 05',
    blood_group: 'B+',
    emergency_contact: '+880 1819-103103',
    depositBalance: 4500,
    messDue: 850,
    status: 'active',
  },

  // Tier 6: Non-Boarder Student (Day-Scholar - Dhaka PTI)
  {
    id: 'student_201',
    loginId: '201',
    rollNumber: '201',
    password: '123456',
    role: USER_ROLES.NON_BOARDER_STUDENT,
    name: 'Zubair Ahmed',
    gender: 'Male',
    avatar_id: MALE_AVATAR_IDS[3],
    designation: 'Non-Boarder Student',
    pti_id: 'pti_dhaka',
    hostelId: null,
    hostelName: null,
    email: 'zubair.201@cadet.institution.edu',
    phone: '+880 1716-201201',
    phone_number: '+880 1716-201201',
    district: 'Chattogram',
    upazila: 'Kotwali',
    union_ward: 'Ward 22',
    blood_group: 'O+',
    emergency_contact: '+880 1819-201201',
    establishmentBalance: 1200,
    status: 'active',
  },

  // Sample User from Hostel 02 (Dhaka PTI)
  {
    id: 'boarder_301',
    loginId: '301',
    rollNumber: '301',
    password: '123456',
    role: USER_ROLES.BOARDER_STUDENT,
    name: 'Nusrat Jahan',
    gender: 'Female',
    avatar_id: FEMALE_AVATAR_IDS[0],
    designation: 'Boarder Student',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_02',
    hostelName: 'Sher-e-Bangla Hall',
    wing: 'East Block',
    roomNumber: '204',
    bedNumber: 'Bed 1',
    email: 'nusrat.301@sherbangla.edu',
    phone: '+880 1717-301301',
    phone_number: '+880 1717-301301',
    district: 'Cumilla',
    upazila: 'Sadar South',
    union_ward: 'Ward 08',
    blood_group: 'A-',
    emergency_contact: '+880 1819-301301',
    depositBalance: 3200,
    messDue: 400,
    status: 'active',
  },

  // Sample Appointed Superintendent for Chattogram PTI (Multi-Tenant Isolation Demo)
  {
    id: 'super_ctg',
    loginId: 'super_ctg',
    username: 'super_ctg',
    username_changes_left: 3,
    rollNumber: null,
    password: '123456',
    role: USER_ROLES.SUPERINTENDENT,
    name: 'Dr. M. A. Rashid',
    gender: 'Male',
    avatar_id: MALE_AVATAR_IDS[3],
    designation: 'Hostel Superintendent & Academic Head',
    pti_id: 'pti_chattogram',
    hostelId: null,
    hostelName: 'All Hostels (Chattogram PTI)',
    email: 'super.ctg@pti.gov.bd',
    phone: '+880 1711-000002',
    phone_number: '+880 1711-000002',
    district: 'Chattogram',
    upazila: 'Kotwali',
    union_ward: 'Ward 10',
    blood_group: 'B+',
    emergency_contact: '+880 1819-000002',
    status: 'active',
  },

  // Sample Boarder in Chattogram PTI (Multi-Tenant Isolation Demo)
  {
    id: 'boarder_ctg_1',
    loginId: 'ctg_501',
    rollNumber: '501',
    password: '123456',
    role: USER_ROLES.BOARDER_STUDENT,
    name: 'Kamrul Islam',
    gender: 'Male',
    avatar_id: MALE_AVATAR_IDS[4],
    designation: 'Boarder Student',
    pti_id: 'pti_chattogram',
    hostelId: 'hostel_ctg_01',
    hostelName: 'Bayejid Bostami Hall',
    wing: 'North Block',
    roomNumber: '101',
    bedNumber: 'Bed 1',
    email: 'kamrul.501@cadet.institution.edu',
    phone: '+880 1718-501501',
    phone_number: '+880 1718-501501',
    district: 'Chattogram',
    upazila: 'Panchlaish',
    union_ward: 'Ward 08',
    blood_group: 'A+',
    emergency_contact: '+880 1819-501501',
    depositBalance: 2500,
    messDue: 0,
    status: 'active',
  }
];

export const SEED_ROOMS = [
  { id: 'R101', pti_id: 'pti_dhaka', hostelId: 'hostel_01', roomNumber: '101', wing: 'Block A', floor: 1, capacity: 3, occupied: 3, status: 'Full', residents: ['Aarav Patel (101)', 'Cadet M1', 'Cadet M2'] },
  { id: 'R102', pti_id: 'pti_dhaka', hostelId: 'hostel_01', roomNumber: '102', wing: 'Block A', floor: 1, capacity: 3, occupied: 2, status: 'Available', residents: ['Rohan Deshmukh (102)', 'Cadet E1'] },
  { id: 'R103', pti_id: 'pti_dhaka', hostelId: 'hostel_01', roomNumber: '103', wing: 'Block A', floor: 1, capacity: 3, occupied: 2, status: 'Available', residents: ['Vikram Singh (103)', 'Cadet A1'] },
  { id: 'R104', pti_id: 'pti_dhaka', hostelId: 'hostel_01', roomNumber: '104', wing: 'Block A', floor: 1, capacity: 4, occupied: 4, status: 'Full', residents: ['Cadet B1', 'Cadet B2', 'Cadet B3', 'Cadet B4'] },
  
  // Rooms in Hostel 02 (Dhaka PTI)
  { id: 'R204_H2', pti_id: 'pti_dhaka', hostelId: 'hostel_02', roomNumber: '204', wing: 'East Block', floor: 2, capacity: 2, occupied: 1, status: 'Available', residents: ['Tanvir Hasan (301)'] },

  // Rooms in Chattogram PTI
  { id: 'R101_CTG', pti_id: 'pti_chattogram', hostelId: 'hostel_ctg_01', roomNumber: '101', wing: 'North Block', floor: 1, capacity: 3, occupied: 1, status: 'Available', residents: ['Kamrul Islam (501)'] }
];

/**
 * Two-Step Approval Establishment Expenses:
 * Submitted by Hostel Monitor with status 'pending' -> Approved/Rejected by Hostel Super
 */
export const SEED_ESTABLISHMENT_EXPENSES = [
  {
    id: 'EXP-101',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    title: 'Water Pump Capacitor & Plumbing Repair',
    category: 'Plumbing & Utilities',
    amount: 3200,
    vendor: 'City Electric & Motor Works',
    voucherNo: 'V-2026-881',
    enteredBy: 'Aarav Patel (Monitor)',
    enteredById: 'monitor_101',
    enteredAt: '2026-10-28 14:30',
    status: 'pending', // Awaiting Hostel Super Approval
    approvedBy: null,
    approvedAt: null,
    notes: 'Urgent replacement of block water motor starter capacitor.'
  },
  {
    id: 'EXP-102',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    title: 'Corridor & Dining Hall LED Tube Lights',
    category: 'Electrical Supplies',
    amount: 1850,
    vendor: 'National Hardware & Lighting',
    voucherNo: 'V-2026-879',
    enteredBy: 'Aarav Patel (Monitor)',
    enteredById: 'monitor_101',
    enteredAt: '2026-10-27 10:15',
    status: 'pending', // Awaiting Hostel Super Approval
    approvedBy: null,
    approvedAt: null,
    notes: '10 units of 20W LED fixtures for 2nd floor corridor.'
  },
  {
    id: 'EXP-099',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    title: 'Monthly Sanitization & Disinfectant Supplies',
    category: 'Sanitation',
    amount: 4500,
    vendor: 'CleanCare Enterprise',
    voucherNo: 'V-2026-850',
    enteredBy: 'Aarav Patel (Monitor)',
    enteredById: 'monitor_101',
    enteredAt: '2026-10-20 09:00',
    status: 'approved', // Approved in step 2
    approvedBy: 'Dr. Anand Verma (Hostel Super)',
    approvedAt: '2026-10-21 11:00',
    notes: 'Routine sanitation for toilets and common study rooms.'
  },
  // Expense belonging to Hostel 02 (Dhaka PTI)
  {
    id: 'EXP-H2-01',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_02',
    title: 'Hostel 02 Study Room Fan Rewinding',
    category: 'Electrical Supplies',
    amount: 2100,
    vendor: 'Sher-e-Bangla Electricals',
    voucherNo: 'SBH-019',
    enteredBy: 'Monitor H2',
    enteredById: 'monitor_h2',
    enteredAt: '2026-10-26 11:30',
    status: 'pending',
    approvedBy: null,
    approvedAt: null,
    notes: 'Study room ceiling fan bearing and coil replacement.'
  }
];

/**
 * Two-Step Approval Student Fee Deposits:
 * Submitted by Student (Boarder / Non-Boarder) with status 'pending' -> Approved by Hostel Super
 */
export const SEED_DEPOSITS = [
  {
    id: 'DEP-501',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    studentId: 'boarder_103',
    studentName: 'Vikram Singh',
    rollNumber: '103',
    userType: 'boarder_student',
    roomNumber: '103',
    depositType: 'Mess Fee Deposit',
    amount: 3000,
    paymentMethod: 'bKash / Mobile Banking',
    trxId: 'TRX982736481',
    submittedAt: '2026-10-28 16:40',
    status: 'pending', // Awaiting Hostel Super Verification
    approvedBy: null,
    approvedAt: null
  },
  {
    id: 'DEP-502',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    studentId: 'student_201',
    studentName: 'Zubair Ahmed',
    rollNumber: '201',
    userType: 'non_boarder_student',
    roomNumber: 'Day-Scholar',
    depositType: 'Establishment Fee Deposit',
    amount: 1200,
    paymentMethod: 'Bank Challan (Sonali Bank)',
    trxId: 'CHLN-2026-0912',
    submittedAt: '2026-10-29 09:15',
    status: 'pending', // Awaiting Hostel Super Verification
    approvedBy: null,
    approvedAt: null
  },
  {
    id: 'DEP-490',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    studentId: 'boarder_103',
    studentName: 'Vikram Singh',
    rollNumber: '103',
    userType: 'boarder_student',
    roomNumber: '103',
    depositType: 'Establishment Fee Deposit',
    amount: 1500,
    paymentMethod: 'Cash Receipt',
    trxId: 'REC-08129',
    submittedAt: '2026-10-15 11:00',
    status: 'approved',
    approvedBy: 'Approved by: Aarav Patel (Hostel Monitor)',
    approvedBy_id: 'monitor_101',
    approvedBy_name: 'Aarav Patel',
    approvedBy_role: 'Hostel Monitor',
    approvedAt: '2026-10-15 14:30'
  },
  {
    id: 'DEP-480',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    studentId: 'boarder_103',
    studentName: 'Vikram Singh',
    rollNumber: '103',
    userType: 'boarder_student',
    roomNumber: '103',
    depositType: 'Mess Fee Deposit',
    amount: 2500,
    paymentMethod: 'bKash / Mobile Banking',
    trxId: 'TRX77192801',
    submittedAt: '2026-10-12 10:15',
    status: 'approved',
    approvedBy: 'Approved by: Rohan Deshmukh (Meal Manager)',
    approvedBy_id: 'manager_102',
    approvedBy_name: 'Rohan Deshmukh',
    approvedBy_role: 'Meal Manager',
    approvedAt: '2026-10-12 11:45'
  },
  // Deposit for Hostel 02 (Dhaka PTI)
  {
    id: 'DEP-H2-01',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_02',
    studentId: 'boarder_301',
    studentName: 'Tanvir Hasan',
    rollNumber: '301',
    userType: 'boarder_student',
    roomNumber: '204',
    depositType: 'Mess Fee Deposit',
    amount: 2500,
    paymentMethod: 'Nagad',
    trxId: 'NGD-998822',
    submittedAt: '2026-10-28 12:00',
    status: 'pending',
    approvedBy: null,
    approvedAt: null
  }
];

/**
 * Meal Manager Bazar Expenses:
 * Daily market purchases for the mess
 */
export const SEED_BAZAR_EXPENSES = [
  {
    id: 'BAZ-201',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    date: '2026-10-29',
    amount: 4250,
    managerName: 'Rohan Deshmukh (102)',
    managerId: 'manager_102',
    itemsList: 'Miniket Rice (50kg), Farm Fresh Chicken (12kg), Potatoes (15kg), Onion, Green Chilies, Ginger',
    voucherNo: 'MK-901',
    status: 'approved'
  },
  {
    id: 'BAZ-200',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    date: '2026-10-28',
    amount: 3890,
    managerName: 'Rohan Deshmukh (102)',
    managerId: 'manager_102',
    itemsList: 'Rui Fish (14kg), Mustard Oil (5L), Turmeric, Lentils (Daal 10kg), Seasonal Veggies',
    voucherNo: 'MK-899',
    status: 'approved'
  },
  {
    id: 'BAZ-199',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    date: '2026-10-27',
    amount: 4120,
    managerName: 'Rohan Deshmukh (102)',
    managerId: 'manager_102',
    itemsList: 'Egg crates (6 crates / 180 eggs), Soyabean Oil, Potatoes, Garlic, Spices',
    voucherNo: 'MK-895',
    status: 'approved'
  }
];

/**
 * Daily Meal Sheets:
 * Locked and finalized by the Meal Manager
 */
export const SEED_MEAL_SHEETS = [
  {
    id: 'MEAL-2026-10-29',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    date: '2026-10-29',
    locked: false, // In progress today
    lockedBy: null,
    records: [
      { studentId: 'monitor_101', name: 'Aarav Patel', rollNumber: '101', room: '101', breakfast: true, lunch: true, dinner: true, total: 3 },
      { studentId: 'manager_102', name: 'Rohan Deshmukh', rollNumber: '102', room: '102', breakfast: true, lunch: true, dinner: true, total: 3 },
      { studentId: 'boarder_103', name: 'Vikram Singh', rollNumber: '103', room: '103', breakfast: true, lunch: true, dinner: false, total: 2 },
    ],
    totalMealsCount: 8,
    estimatedDailyCost: 4250,
    mealRate: 68.5
  },
  {
    id: 'MEAL-2026-10-28',
    pti_id: 'pti_dhaka',
    hostelId: 'hostel_01',
    date: '2026-10-28',
    locked: true, // Finalized and locked
    lockedBy: 'Rohan Deshmukh (Meal Manager)',
    records: [
      { studentId: 'monitor_101', name: 'Aarav Patel', rollNumber: '101', room: '101', breakfast: true, lunch: true, dinner: true, total: 3 },
      { studentId: 'manager_102', name: 'Rohan Deshmukh', rollNumber: '102', room: '102', breakfast: true, lunch: true, dinner: true, total: 3 },
      { studentId: 'boarder_103', name: 'Vikram Singh', rollNumber: '103', room: '103', breakfast: true, lunch: true, dinner: true, total: 3 },
    ],
    totalMealsCount: 9,
    estimatedDailyCost: 3890,
    mealRate: 65.0
  }
];

export const SEED_EQUIPMENT = [
  { id: 'EQ-01', pti_id: 'pti_dhaka', name: 'Standard Footballs (Size 5)', category: 'Athletics', totalQty: 25, availableQty: 18, condition: 'Good', inCharge: 'Capt. R. Sharma' },
  { id: 'EQ-02', pti_id: 'pti_dhaka', name: 'Cricket Batting Kits & Pads', category: 'Cricket', totalQty: 12, availableQty: 8, condition: 'Good', inCharge: 'Coach Dev' },
  { id: 'EQ-03', pti_id: 'pti_dhaka', name: 'Basketballs (Spalding Regulation)', category: 'Athletics', totalQty: 15, availableQty: 14, condition: 'Good', inCharge: 'Capt. R. Sharma' },
  { id: 'EQ-04', pti_id: 'pti_dhaka', name: 'Table Tennis Blades & Nets', category: 'Indoor Sports', totalQty: 20, availableQty: 16, condition: 'Fair', inCharge: 'Subedar M. Khan' },
  { id: 'EQ-05', pti_id: 'pti_dhaka', name: 'Parade Marching Side-Drums', category: 'Parade & Drill', totalQty: 6, availableQty: 6, condition: 'Excellent', inCharge: 'Capt. R. Sharma' },
  { id: 'EQ-06', pti_id: 'pti_dhaka', name: 'Cross-Country Running Stopwatches', category: 'Field Athletics', totalQty: 10, availableQty: 10, condition: 'Excellent', inCharge: 'Capt. R. Sharma' },
];

export const SEED_DRILLS = [
  { id: 'D-01', pti_id: 'pti_dhaka', title: 'Morning Conditioning & 5KM Field Run', time: '06:00 AM - 07:15 AM', location: 'Main Athletic Grounds', instructor: 'Capt. R. Sharma', status: 'Completed', targetGroup: 'All Cadets' },
  { id: 'D-02', pti_id: 'pti_dhaka', title: 'Obstacle Course & Calisthenics Drill', time: '04:45 PM - 06:00 PM', location: 'Obstacle Ground #2', instructor: 'Subedar M. Khan', status: 'Scheduled', targetGroup: 'Junior Wings' },
  { id: 'D-03', pti_id: 'pti_dhaka', title: 'Inter-Hostel Football League Practice', time: '06:15 PM - 07:30 PM', location: 'Stadium Pitch', instructor: 'Coach Dev', status: 'Active', targetGroup: 'Hostel Squads' },
];

export const SEED_LEAVE_REQUESTS = [
  { 
    id: 'LV-401', 
    pti_id: 'pti_dhaka',
    cadetId: 'boarder_103', 
    cadetName: 'Vikram Singh', 
    rollNumber: '103', 
    wing: 'Block A (Junior)', 
    roomNumber: '103', 
    type: 'Weekend Out-Pass', 
    fromDate: '2026-10-31', 
    toDate: '2026-11-01', 
    reason: 'Family wedding ceremony', 
    guardianApproval: 'Verified via Phone', 
    status: 'Pending Superintendent Approval',
    appliedAt: '2026-10-29 08:30'
  },
  { 
    id: 'LV-402', 
    pti_id: 'pti_dhaka',
    cadetId: 'student_201', 
    cadetName: 'Zubair Ahmed', 
    rollNumber: '201', 
    wing: 'Day-Scholar', 
    roomNumber: 'Non-Boarder', 
    type: 'Official Sports Duty', 
    fromDate: '2026-11-02', 
    toDate: '2026-11-04', 
    reason: 'Representing institute in State Level Football Tournament', 
    guardianApproval: 'Recommended by PTI Head', 
    status: 'Approved',
    approvedBy: 'Prof. S. K. Choudhury (Superintendent)',
    appliedAt: '2026-10-27 14:00'
  }
];

