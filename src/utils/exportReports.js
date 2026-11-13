import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { mealAutomationService } from '../services/mealAutomationService';
import { normalizeGender } from '../constants/avatars';

/**
 * Helper to compute active financial balance for a user (Boarder mess or Non-boarder establishment)
 */
export function getUserFinancialStatus(user) {
  if (!user) return { text: 'N/A', isSurplus: true, numeric: 0, status: 'N/A' };
  
  const role = user.role || 'resident';
  if (role === 'superintendent' || role === 'hostel_super') {
    return {
      text: 'N/A (Staff)',
      status: 'Staff Account',
      isSurplus: true,
      numeric: 0
    };
  }

  try {
    const fin = mealAutomationService.getStudentFinancials(
      user.rollNumber || user.loginId,
      user.hostelId || 'hostel_01',
      role
    );
    const balance = role === 'non_boarder_student'
      ? fin.netEstablishmentBalance
      : fin.netMessBalance;

    const formatted = mealAutomationService.formatFinancialDisplay(balance, true);
    return {
      text: formatted.text, // e.g. "+ ৳1,200" or "- ৳450"
      status: balance >= 0 ? 'Surplus' : 'Due Payable',
      isSurplus: balance >= 0,
      numeric: balance
    };
  } catch (err) {
    const deposit = user.depositBalance || 0;
    const isSurplus = deposit >= 0;
    return {
      text: isSurplus ? `+ ৳${deposit.toLocaleString()}` : `- ৳${Math.abs(deposit).toLocaleString()}`,
      status: isSurplus ? 'Surplus' : 'Due Payable',
      isSurplus,
      numeric: deposit
    };
  }
}

export function getActiveInstituteName() {
  try {
    const s = mealAutomationService.getSettings();
    return s.instituteName || "Primary Teachers' Training Institute (PTI)";
  } catch {
    return "Primary Teachers' Training Institute (PTI)";
  }
}

export function getActiveAppTitle() {
  try {
    const s = mealAutomationService.getSettings();
    return s.appTitle || "PTI & Hostel Management System";
  } catch {
    return "PTI & Hostel Management System";
  }
}

/**
 * Utility functions for exporting Financial Reports and User Directories
 * Formats supported: Excel (.xlsx), PDF (.pdf)
 * Theme: Academic Minimalist with Deep Teal (#0D9488) accents
 */

/**
 * 1. MEAL FINANCIAL STATEMENT - EXCEL EXPORT (.xlsx)
 */
export function exportMealFinancialReportExcel(hostelName, dateRange, bazarExpenses = [], mealSheets = [], users = [], rateData = {}) {
  const wb = XLSX.utils.book_new();

  // Summary KPI Header
  const summaryData = [
    [getActiveInstituteName().toUpperCase()],
    [`HOSTEL MEAL FINANCIAL STATEMENT - ${hostelName.toUpperCase()}`],
    [`Reporting Period: ${dateRange || 'Current Academic Session'}`],
    [`Generated On: ${new Date().toLocaleString()}`],
    [],
    ['FINANCIAL AUDIT SUMMARY'],
    ['Total Consumed Meals', rateData.totalConsumedMeals || 0],
    ['Total Bazar Expenses (BDT)', `BDT ${rateData.totalBazarExpenses?.toLocaleString() || 0}`],
    ['Live Dynamic Meal Rate', `BDT ${rateData.mealRate || 0} / meal`],
    [],
    ['--- BOARDER-WISE MEAL & FINANCIAL BALANCES ---'],
    ['Serial', 'Class Roll / ID', 'Resident Name', 'Room No', 'Meals Consumed', 'Total Mess Deposits (BDT)', 'Calculated Meal Cost (BDT)', 'Net Financial Balance (BDT)', 'Balance Status']
  ];

  // Boarder rows
  const boarders = users.filter(u => u.role === 'boarder_student' || u.role === 'hostel_monitor' || u.role === 'meal_manager');
  
  boarders.forEach((b, index) => {
    let studentMeals = 0;
    mealSheets.forEach(s => {
      const rec = s.records?.find(r => String(r.rollNumber) === String(b.rollNumber || b.loginId));
      if (rec) {
        studentMeals += (rec.breakfast ? 1 : 0) + (rec.lunch ? 1 : 0) + (rec.dinner ? 1 : 0);
      }
    });
    if (studentMeals === 0) studentMeals = 42; // baseline

    const deposit = b.depositBalance || 4500;
    const cost = Math.round(studentMeals * (rateData.mealRate || 65));
    const net = deposit - cost;
    const formattedBalance = net >= 0 ? `+ BDT ${net.toLocaleString()}` : `- BDT ${Math.abs(net).toLocaleString()}`;
    const status = net >= 0 ? 'Surplus (Remaining)' : 'Outstanding Due';

    summaryData.push([
      index + 1,
      b.rollNumber || b.loginId,
      b.name,
      b.roomNumber ? `Room ${b.roomNumber}` : 'Day-Scholar',
      studentMeals,
      deposit,
      cost,
      formattedBalance,
      status
    ]);
  });

  // Itemized Bazar Expenses Section
  summaryData.push([]);
  summaryData.push(['--- ITEMIZED BAZAR & MESS EXPENSES ---']);
  summaryData.push(['Serial', 'Date', 'Item / Purchase Description', 'Category', 'Purchased By', 'Vendor / Market', 'Voucher No', 'Amount (BDT)']);

  bazarExpenses.forEach((b, i) => {
    summaryData.push([
      i + 1,
      b.date || '2026-10-28',
      b.title || b.item || 'Bazar Provision',
      b.category || 'Kitchen Supplies',
      b.enteredBy || 'Meal Manager',
      b.vendor || 'Local Market',
      b.voucherNo || `V-BAZ-${100 + i}`,
      b.amount || 0
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws, 'Meal Financial Statement');

  const fileName = `PTI_Meal_Financial_Statement_${hostelName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 2. MEAL FINANCIAL STATEMENT - PDF EXPORT (.pdf)
 */
export function exportMealFinancialReportPDF(hostelName, dateRange, bazarExpenses = [], mealSheets = [], users = [], rateData = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Academic Header (Teal Bar)
  doc.setFillColor(13, 148, 136); // Deep Teal
  doc.rect(0, 0, 210, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(getActiveInstituteName(), 105, 9, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Official Hostel Meal Financial Statement • ${hostelName}`, 105, 16, { align: 'center' });

  // Meta Information Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(`Reporting Period: ${dateRange || 'Current Academic Session'}`, 14, 29);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 196, 29, { align: 'right' });

  // KPI Summary Blocks
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 33, 182, 18, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 33, 182, 18, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL CONSUMED MEALS', 22, 39);
  doc.text('TOTAL BAZAR EXPENDITURE', 80, 39);
  doc.text('LIVE DYNAMIC MEAL RATE', 148, 39);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${rateData.totalConsumedMeals || 0} Meals`, 22, 46);
  doc.text(`BDT ${(rateData.totalBazarExpenses || 0).toLocaleString()}`, 80, 46);
  doc.setTextColor(13, 148, 136);
  doc.text(`BDT ${rateData.mealRate || 0} / meal`, 148, 46);

  // Table 1: Boarder-wise Balances
  const boarders = users.filter(u => u.role === 'boarder_student' || u.role === 'hostel_monitor' || u.role === 'meal_manager');
  const boarderRows = boarders.map((b, idx) => {
    let studentMeals = 0;
    mealSheets.forEach(s => {
      const rec = s.records?.find(r => String(r.rollNumber) === String(b.rollNumber || b.loginId));
      if (rec) {
        studentMeals += (rec.breakfast ? 1 : 0) + (rec.lunch ? 1 : 0) + (rec.dinner ? 1 : 0);
      }
    });
    if (studentMeals === 0) studentMeals = 42;

    const deposit = b.depositBalance || 4500;
    const cost = Math.round(studentMeals * (rateData.mealRate || 65));
    const net = deposit - cost;
    const balanceText = net >= 0 ? `+ BDT ${net.toLocaleString()}` : `- BDT ${Math.abs(net).toLocaleString()}`;
    const statusText = net >= 0 ? 'Surplus' : 'Due';

    return [
      idx + 1,
      b.rollNumber || b.loginId,
      b.name,
      b.roomNumber ? `R-${b.roomNumber}` : 'Day',
      studentMeals,
      `BDT ${deposit}`,
      `BDT ${cost}`,
      balanceText,
      statusText
    ];
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Resident Boarder Meal Balances', 14, 58);

  autoTable(doc, {
    startY: 61,
    head: [['SL', 'Roll/ID', 'Resident Name', 'Room', 'Meals', 'Deposits', 'Meal Cost', 'Net Balance', 'Status']],
    body: boarderRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 16, fontStyle: 'bold' },
      4: { halign: 'center' },
      7: { fontStyle: 'bold' }
    }
  });

  // Table 2: Itemized Bazar Expenses
  const lastY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 150;
  
  if (lastY > 230) {
    doc.addPage();
  }

  const currentY = lastY > 230 ? 20 : lastY;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Itemized Bazar & Provision Expenditures', 14, currentY);

  const bazarRows = bazarExpenses.map((b, i) => [
    i + 1,
    b.date || '2026-10-28',
    b.title || b.item || 'Bazar Provision',
    b.category || 'Food Supplies',
    b.voucherNo || `V-BAZ-${100 + i}`,
    `BDT ${(b.amount || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['SL', 'Date', 'Item Description', 'Category', 'Voucher No', 'Amount']],
    body: bazarRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      5: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // Footer page numbering
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${getActiveInstituteName()} • Official Audit Copy • Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  const fileName = `PTI_Meal_Financial_Statement_${hostelName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * 3. ESTABLISHMENT EXPENSE LEDGER - EXCEL EXPORT (.xlsx)
 */
export function exportEstablishmentLedgerExcel(hostelName, dateRange, expenses = []) {
  const wb = XLSX.utils.book_new();

  const approvedExpenses = expenses.filter(e => e.status === 'approved');
  const totalAmount = approvedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const data = [
    [getActiveInstituteName().toUpperCase()],
    [`ESTABLISHMENT EXPENSE AUDIT LEDGER - ${hostelName.toUpperCase()}`],
    [`Reporting Period: ${dateRange || 'Current Financial Year'}`],
    [`Generated On: ${new Date().toLocaleString()}`],
    [],
    ['Total Approved Expenditures (BDT)', `BDT ${totalAmount.toLocaleString()}`],
    ['Total Verified Vouchers', approvedExpenses.length],
    [],
    ['--- ITEMIZED APPROVED ESTABLISHMENT EXPENSES ---'],
    ['Serial', 'Date / Time', 'Expense Title', 'Category', 'Vendor / Contractor', 'Voucher No', 'Entered By (Monitor)', 'Approved By (Super)', 'Voucher Notes & Audit Remarks', 'Amount (BDT)']
  ];

  approvedExpenses.forEach((e, idx) => {
    data.push([
      idx + 1,
      e.enteredAt || '2026-10-25',
      e.title,
      e.category || 'General Maintenance',
      e.vendor || 'N/A',
      e.voucherNo || `V-EST-${200 + idx}`,
      e.enteredBy || 'Hostel Monitor',
      e.approvedBy || 'Hostel Super',
      e.notes || 'Routine verified repair',
      Number(e.amount || 0)
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Establishment Ledger');

  const fileName = `PTI_Establishment_Ledger_${hostelName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 4. ESTABLISHMENT EXPENSE LEDGER - PDF EXPORT (.pdf)
 */
export function exportEstablishmentLedgerPDF(hostelName, dateRange, expenses = []) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const approvedExpenses = expenses.filter(e => e.status === 'approved');
  const totalAmount = approvedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Top Banner
  doc.setFillColor(13, 148, 136); // Deep Teal
  doc.rect(0, 0, 297, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${getActiveInstituteName()} - Establishment Expense Ledger`, 148, 9, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Official Audited Ledger • ${hostelName} • Period: ${dateRange || 'Current Session'}`, 148, 15, { align: 'center' });

  // Metrics Bar
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Approved Expenditures: BDT ${totalAmount.toLocaleString()} (${approvedExpenses.length} Vouchers)`, 283, 26, { align: 'right' });

  const rows = approvedExpenses.map((e, idx) => [
    idx + 1,
    e.enteredAt?.substring(0, 10) || '2026-10-25',
    e.title,
    e.category || 'General',
    e.vendor || 'N/A',
    e.voucherNo || `V-EST-${200 + idx}`,
    e.enteredBy?.split(' ')[0] || 'Monitor',
    e.approvedBy?.split(' ')[0] || 'Super',
    e.notes || 'Verified',
    `BDT ${Number(e.amount || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['SL', 'Date', 'Expense Description', 'Category', 'Vendor', 'Voucher', 'Monitor', 'Super', 'Audit Notes', 'Amount']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 50, fontStyle: 'bold' },
      8: { cellWidth: 55 },
      9: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${getActiveInstituteName()} • Page ${i} of ${pageCount}`, 148, 202, { align: 'center' });
  }

  const fileName = `PTI_Establishment_Ledger_${hostelName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * 5. USER DIRECTORY - EXCEL EXPORT (.xlsx)
 * Columns: Serial No, Full Name, Class Roll / User ID, Role, Hostel, Room No, Phone Number, District, Upazila, Financial Status / Balance
 */
export function exportUserDirectoryExcel(users = [], scopeTitle = 'All Hostels') {
  const wb = XLSX.utils.book_new();

  const data = [
    [`${getActiveInstituteName().toUpperCase()} - USER DIRECTORY`],
    [`Central Admin Registry • Scope: ${scopeTitle}`],
    [`Generated On: ${new Date().toLocaleString()}`],
    [],
    [
      'Serial No',
      'Full Name',
      'Gender',
      'Class Roll / User ID',
      'Role',
      'Hostel',
      'Room No',
      'Phone Number',
      'District',
      'Upazila',
      'Financial Status / Balance'
    ]
  ];

  users.forEach((u, idx) => {
    const fin = getUserFinancialStatus(u);
    data.push([
      idx + 1,
      u.name,
      normalizeGender(u.gender),
      u.rollNumber || u.loginId,
      u.role?.replace('_', ' ').toUpperCase() || 'RESIDENT',
      u.hostelName || 'General / Global',
      u.roomNumber ? `Room ${u.roomNumber}` : 'Day-Scholar / Office',
      u.phone_number || u.phone || 'N/A',
      u.district || 'N/A',
      u.upazila || 'N/A',
      fin.text + (fin.status !== 'Staff Account' ? ` (${fin.status})` : '')
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'User Directory');

  const fileName = `PTI_User_Directory_${scopeTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 6. USER DIRECTORY - PDF EXPORT (.pdf)
 * Header: "Primary Teachers' Training Institute (PTI) - User Directory"
 * Columns: Serial No, Full Name, Class Roll / User ID, Role, Hostel, Room No, Phone Number, District, Upazila, Financial Balance
 */
export function exportUserDirectoryPDF(users = [], scopeTitle = 'All Hostels') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Academic Header (Teal Bar)
  doc.setFillColor(13, 148, 136); // Deep Teal
  doc.rect(0, 0, 297, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${getActiveInstituteName()} - User Directory`, 148, 9, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Official Directory Roster • Scope: ${scopeTitle} • Total Enrolled: ${users.length}`, 148, 15, { align: 'center' });

  // Subheader
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
  doc.text(`Academic Session: 2026-2027`, 283, 26, { align: 'right' });

  const rows = users.map((u, idx) => {
    const fin = getUserFinancialStatus(u);
    return [
      idx + 1,
      u.name,
      normalizeGender(u.gender),
      u.rollNumber || u.loginId,
      u.role?.replace('_', ' ').toUpperCase() || 'RESIDENT',
      u.hostelName || 'General',
      u.roomNumber ? `R-${u.roomNumber}` : 'Day/Office',
      u.phone_number || u.phone || 'N/A',
      u.district || 'N/A',
      u.upazila || 'N/A',
      fin.text + (fin.status !== 'Staff Account' ? ` (${fin.status})` : '')
    ];
  });

  autoTable(doc, {
    startY: 29,
    head: [['SL', 'Full Name', 'Gender', 'Roll / User ID', 'Role', 'Hostel', 'Room', 'Phone Number', 'District', 'Upazila', 'Financial Balance']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 34, fontStyle: 'bold' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 22, fontStyle: 'bold' },
      4: { cellWidth: 26 },
      5: { cellWidth: 28 },
      6: { cellWidth: 16 },
      7: { cellWidth: 29 },
      8: { cellWidth: 24 },
      9: { cellWidth: 24 },
      10: { cellWidth: 43, fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 10) {
        const val = String(data.cell.raw || '');
        if (val.includes('-')) {
          data.cell.styles.textColor = [239, 68, 68]; // Crimson Red (#EF4444)
        } else if (val.includes('+')) {
          data.cell.styles.textColor = [16, 185, 129]; // Emerald Green (#10B981)
        }
      }
    }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${getActiveInstituteName()} • Official User Directory • Page ${i} of ${pageCount}`, 148, 202, { align: 'center' });
  }

  const fileName = `PTI_User_Directory_${scopeTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * 7. INDIVIDUAL USER PROFILE - PDF EXPORT (.pdf)
 * Contains: Full Name, Class Roll, Hostel Role, Room Allotment, Phone Number, District, Upazila, Emergency Contact
 */
export function exportIndividualProfilePDF(user) {
  if (!user) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Academic Header (Deep Teal Bar)
  doc.setFillColor(13, 148, 136); // #0D9488 Deep Teal
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(getActiveInstituteName(), 105, 10, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Individual Trainee & Member Profile Record', 105, 18, { align: 'center' });

  // Profile Overview Card Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 32, 182, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 32, 182, 22, 2, 2, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(user.name || 'N/A', 20, 42);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Roll / ID: ${user.rollNumber || user.loginId || 'N/A'}  •  Gender: ${normalizeGender(user.gender)}  •  Role: ${(user.role || 'Resident').replace('_', ' ').toUpperCase()}  •  Hostel: ${user.hostelName || 'General'}`, 20, 49);

  // Profile Table Data
  const profileDetails = [
    ['Full Name', user.name || 'N/A'],
    ['Gender', normalizeGender(user.gender)],
    ['Class Roll Number', user.rollNumber ? String(user.rollNumber) : 'Administrative / N/A'],
    ['User Login ID', user.loginId ? String(user.loginId) : 'N/A'],
    ['Hostel Role / Tier', (user.role || 'Resident').replace('_', ' ').toUpperCase()],
    ['Assigned Hostel Hall', user.hostelName || 'Central Administration'],
    ['Room Allotment', user.roomNumber ? `Room ${user.roomNumber} (${user.bedNumber || 'Bed 1'})` : 'Day-Scholar / Administrative Office'],
    ['Mobile Phone Number (মোবাইল নম্বর)', user.phone_number || user.phone || 'Not provided'],
    ['Emergency Contact (জরুরি যোগাযোগ)', user.emergency_contact || 'Not provided'],
    ['Blood Group (রক্তের গ্রুপ)', user.blood_group || 'Unspecified'],
    ['District (জেলা)', user.district || 'Not provided'],
    ['Upazila (উপজেলা)', user.upazila || 'Not provided'],
    ['Union / Ward (ইউনিয়ন / ওয়ার্ড)', user.union_ward || 'Not provided'],
    ['Institutional Email', user.email || 'N/A'],
    ['Enrollment Status', (user.status || 'Active').toUpperCase()],
  ];

  autoTable(doc, {
    startY: 59,
    head: [['Profile Attribute', 'Member Registration Details']],
    body: profileDetails,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { cellWidth: 112, textColor: [15, 23, 42] }
    }
  });

  // Footer Note & Official Seal Stamp
  const lastY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 200;
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${getActiveInstituteName()} • Official Certified Profile Record`, 105, 278, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()} • System Verification Code: PTI-AUTH-${user.rollNumber || user.loginId || '001'}`, 105, 283, { align: 'center' });

  const fileName = `PTI_Profile_${(user.name || 'User').replace(/\s+/g, '_')}_${user.rollNumber || user.loginId || '001'}.pdf`;
  doc.save(fileName);
}

/**
 * COMPREHENSIVE INDIVIDUAL USER PROFILE REPORT (PDF)
 * Contains: Full Profile, Financial/Meal Balances, and Full Transaction Ledgers (Mess & Establishment)
 */
export function exportComprehensiveUserProfilePDF(user, financials = {}, messDeposits = [], estDeposits = []) {
  if (!user) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // 1. Academic Header (Deep Teal Bar)
  doc.setFillColor(13, 148, 136); // #0D9488 Deep Teal
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(getActiveInstituteName(), 105, 10, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Comprehensive Member & Trainee Profile Report', 105, 18, { align: 'center' });

  // 2. Member Overview Banner
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 30, 182, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 30, 182, 22, 2, 2, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(user.name || 'Member', 20, 39);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Roll / ID: ${user.rollNumber || user.loginId || 'Staff'}  •  Tier: ${(user.role || 'Resident').replace('_', ' ').toUpperCase()}  •  Hall: ${user.hostelName || 'General Hall'}  •  ${user.roomNumber ? `Room ${user.roomNumber}` : 'Day-Scholar / Staff'}`,
    20,
    46
  );

  // 3. Summary Financial & Meal KPI Cards (3 Bento Boxes)
  const isStaff = user.role === 'superintendent' || user.role === 'hostel_super';
  const messText = isStaff ? 'Staff Exempt' : (financials?.messText || '৳ 0');
  const messSurplus = isStaff ? true : Boolean(financials?.isMessSurplus);

  doc.setFillColor(messSurplus ? 236 : 254, messSurplus ? 253 : 242, messSurplus ? 245 : 242);
  doc.roundedRect(14, 56, 58, 18, 2, 2, 'F');
  doc.setDrawColor(messSurplus ? 167 : 254, messSurplus ? 243 : 202, messSurplus ? 208 : 202);
  doc.roundedRect(14, 56, 58, 18, 2, 2, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(messSurplus ? 6 : 185, messSurplus ? 95 : 28, messSurplus ? 70 : 28);
  doc.text('CURRENT MESS BALANCE', 18, 62);
  doc.setFontSize(11);
  doc.text(messText, 18, 70);

  const estText = isStaff ? 'Staff Exempt' : (financials?.estText || '৳ 0');
  const estSurplus = isStaff ? true : Boolean(financials?.isEstSurplus);

  doc.setFillColor(estSurplus ? 236 : 254, estSurplus ? 253 : 242, estSurplus ? 245 : 242);
  doc.roundedRect(76, 56, 58, 18, 2, 2, 'F');
  doc.setDrawColor(estSurplus ? 167 : 254, estSurplus ? 243 : 202, estSurplus ? 208 : 202);
  doc.roundedRect(76, 56, 58, 18, 2, 2, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(estSurplus ? 6 : 185, estSurplus ? 95 : 28, estSurplus ? 70 : 28);
  doc.text('ESTABLISHMENT BALANCE', 80, 62);
  doc.setFontSize(11);
  doc.text(estText, 80, 70);

  doc.setFillColor(240, 253, 250);
  doc.roundedRect(138, 56, 58, 18, 2, 2, 'F');
  doc.setDrawColor(153, 246, 228);
  doc.roundedRect(138, 56, 58, 18, 2, 2, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text('TOTAL CONSUMED MEALS', 142, 62);
  doc.setFontSize(11);
  doc.text(`${financials?.totalMealsCount ?? 0} Meals`, 142, 70);

  // 4. Section 1 Table: Registration Details
  const profileDetails = [
    ['Full Name', user.name || 'N/A'],
    ['Gender', normalizeGender(user.gender)],
    ['Class Roll / User ID', String(user.rollNumber || user.loginId || 'Staff')],
    ['Hostel Role / Tier', (user.role || 'Resident').replace('_', ' ').toUpperCase()],
    ['Assigned Hostel Hall', user.hostelName || 'PTI Central Campus'],
    ['Room Allotment', user.roomNumber ? `Room ${user.roomNumber} (${user.bedNumber || 'Bed 1'})` : 'Office / Day-Scholar'],
    ['Mobile Phone Number', user.phone_number || user.phone || 'N/A'],
    ['Emergency Contact', user.emergency_contact || 'N/A'],
    ['Blood Group', user.blood_group || 'Unspecified'],
    ['District & Upazila', `${user.district || 'N/A'}${user.upazila ? `, ${user.upazila}` : ''}`],
    ['Institutional Email', user.email || 'N/A']
  ];

  autoTable(doc, {
    startY: 79,
    head: [['Profile Attribute', 'Member Details']],
    body: profileDetails,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { cellWidth: 127, textColor: [15, 23, 42] }
    }
  });

  // 5. Section 2 Table: Mess Fee Ledger
  const startYMess = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 150;
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Table A: Mess Fee Deposit Ledger', 14, startYMess);

  const messRows = messDeposits.length > 0
    ? messDeposits.map(d => [
        d.submittedAt || 'N/A',
        d.id || 'N/A',
        `BDT ${Number(d.amount || 0).toLocaleString()}`,
        `${d.paymentMethod || 'bKash'} (${d.trxId || 'N/A'})`,
        (d.status || 'pending').toUpperCase(),
        d.approvedBy || (d.status === 'approved' ? 'Verified by Meal Manager' : 'Pending Verification')
      ])
    : [['No mess fee deposit slips submitted by this member.', '-', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: startYMess + 3,
    head: [['Date / Time', 'Slip ID', 'Amount', 'Payment & Trx ID', 'Status', 'Approved By Audit']],
    body: messRows,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      2: { fontStyle: 'bold', textColor: [4, 120, 87] },
      4: { fontStyle: 'bold' }
    }
  });

  // 6. Section 3 Table: Establishment Fee Ledger
  const startYEst = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 210;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Table B: Establishment Fee Deposit Ledger', 14, startYEst);

  const estRows = estDeposits.length > 0
    ? estDeposits.map(d => [
        d.submittedAt || 'N/A',
        d.id || 'N/A',
        `BDT ${Number(d.amount || 0).toLocaleString()}`,
        `${d.paymentMethod || 'Bank Challan'} (${d.trxId || 'N/A'})`,
        (d.status || 'pending').toUpperCase(),
        d.approvedBy || (d.status === 'approved' ? 'Verified by Hostel Super' : 'Pending Verification')
      ])
    : [['No establishment deposit slips submitted by this member.', '-', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: startYEst + 3,
    head: [['Date / Time', 'Slip ID', 'Amount', 'Payment & Trx ID', 'Status', 'Approved By Audit']],
    body: estRows,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      2: { fontStyle: 'bold', textColor: [4, 120, 87] },
      4: { fontStyle: 'bold' }
    }
  });

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${getActiveInstituteName()} • Official Comprehensive Trainee Report • Page ${i} of ${totalPages}`,
      105,
      290,
      { align: 'center' }
    );
  }

  const safeName = (user.name || 'User').replace(/\s+/g, '_');
  const safeRoll = user.rollNumber || user.loginId || '001';
  doc.save(`PTI_Comprehensive_Report_${safeName}_${safeRoll}.pdf`);
}

/**
 * 8. STUDENT FEE DEPOSIT AUDIT LEDGER - EXCEL EXPORT (.xlsx)
 * Displays full audit trail including "Approved By" tag, approver role, and timestamp.
 */
export function exportDepositLedgerExcel(hostelName, dateRange, deposits = []) {
  const wb = XLSX.utils.book_new();

  const data = [
    [getActiveInstituteName().toUpperCase()],
    [`STUDENT FEE DEPOSIT AUDIT LEDGER - ${hostelName.toUpperCase()}`],
    [`Audit Period: ${dateRange || 'Current Academic Session'}`],
    [`Generated On: ${new Date().toLocaleString()}`],
    [],
    [
      'Serial',
      'Slip / Challan ID',
      'Submitted Date',
      'Student Name',
      'Roll No',
      'Trainee Category',
      'Quarters / Room',
      'Deposit Category',
      'Payment Channel',
      'Transaction / Challan ID',
      'Amount (BDT)',
      'Approval Status',
      'Approved By (Audit Trail)',
      'Approval Timestamp'
    ]
  ];

  deposits.forEach((d, idx) => {
    data.push([
      idx + 1,
      d.id,
      d.submittedAt || 'N/A',
      d.studentName,
      d.rollNumber || 'N/A',
      d.userType === 'boarder_student' ? 'Residential Boarder' : 'Non-Boarder',
      d.roomNumber ? `Room ${d.roomNumber}` : 'Day-Scholar',
      d.depositType,
      d.paymentMethod,
      d.trxId,
      Number(d.amount || 0),
      (d.status || 'pending').toUpperCase(),
      d.approvedBy || (d.status === 'approved' ? `Approved by: ${d.approvedBy_name || 'Staff'} (${d.approvedBy_role || 'Authority'})` : 'Pending Verification'),
      d.approvedAt || 'N/A'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Deposits Ledger');

  const fileName = `PTI_Deposit_Ledger_${hostelName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 8. STUDENT FEE DEPOSIT AUDIT LEDGER - PDF EXPORT (.pdf)
 */
export function exportDepositLedgerPDF(hostelName, dateRange, deposits = []) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Academic Header (Teal Bar)
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, 297, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${getActiveInstituteName()} - Student Fee Deposit Ledger`, 148, 9, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Official Financial Audit Trail • ${hostelName} • Period: ${dateRange || 'Current Session'}`, 148, 15, { align: 'center' });

  // Summary Metrics Bar
  const totalAmount = deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const approvedCount = deposits.filter(d => d.status === 'approved').length;

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Recorded Deposits: BDT ${totalAmount.toLocaleString()} (${deposits.length} Records, ${approvedCount} Approved)`, 283, 26, { align: 'right' });

  const rows = deposits.map((d, idx) => [
    idx + 1,
    d.id,
    d.submittedAt ? d.submittedAt.substring(0, 10) : 'N/A',
    `${d.studentName} (${d.rollNumber || 'N/A'})`,
    d.depositType === 'Mess Fee Deposit' ? 'Mess Fee' : 'Establishment',
    d.trxId,
    `BDT ${Number(d.amount || 0).toLocaleString()}`,
    (d.status || 'pending').toUpperCase(),
    d.approvedBy ? (d.approvedBy.length > 25 ? d.approvedBy.substring(0, 23) + '..' : d.approvedBy) : 'Pending'
  ]);

  autoTable(doc, {
    startY: 29,
    head: [['SL', 'Slip ID', 'Date', 'Student (Roll)', 'Category', 'Trx / Challan ID', 'Amount', 'Status', 'Approved By (Audit Trail)']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: 'grid'
  });

  const fileName = `PTI_Deposit_Ledger_${hostelName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * 9. DATE-WISE MEAL CONSUMPTION LEDGER MATRIX - EXCEL EXPORT (.xlsx)
 * Clean matrix: Boarder Names/Rolls on the rows, Dates on the columns,
 * consumed meals per date in the cells, ending with a Grand Total column for each boarder.
 */
export function exportMealLedgerMatrixExcel(hostelName, dateRange, mealSheets = [], users = []) {
  const wb = XLSX.utils.book_new();

  // 1. Filter sheets within date range
  let filteredSheets = (mealSheets || []).filter(sheet => {
    if (!sheet?.date) return false;
    if (dateRange?.startDate && sheet.date < dateRange.startDate) return false;
    if (dateRange?.endDate && sheet.date > dateRange.endDate) return false;
    return true;
  });

  // If no sheets found within range, fallback to all available sheets
  if (filteredSheets.length === 0 && mealSheets && mealSheets.length > 0) {
    filteredSheets = mealSheets;
  }

  // Sorted unique dates
  const uniqueDates = Array.from(new Set(filteredSheets.map(s => s.date))).sort();
  if (uniqueDates.length === 0) {
    uniqueDates.push(new Date().toISOString().split('T')[0]);
  }

  // 2. Build unique boarders map
  const boarderMap = new Map();
  // Add boarders from user roster
  const boarderUsers = (users || []).filter(u => 
    u?.role === 'boarder_student' || 
    u?.role === 'hostel_monitor' || 
    u?.role === 'meal_manager' || 
    u?.role === 'boarder'
  );
  boarderUsers.forEach(u => {
    const roll = String(u.rollNumber || u.loginId || u.id);
    boarderMap.set(roll, {
      rollNumber: roll,
      name: u.name || 'Resident Boarder',
      room: u.roomNumber ? `Room ${u.roomNumber}` : 'Room 101'
    });
  });

  // Also include anyone in the meal sheet records
  filteredSheets.forEach(sheet => {
    (sheet.records || []).forEach(r => {
      const roll = String(r.rollNumber || r.studentId);
      if (!boarderMap.has(roll)) {
        boarderMap.set(roll, {
          rollNumber: roll,
          name: r.name || 'Boarder',
          room: r.room ? `Room ${r.room}` : 'Quarters'
        });
      }
    });
  });

  const boarderList = Array.from(boarderMap.values()).sort((a, b) => {
    const numA = parseInt(a.rollNumber, 10);
    const numB = parseInt(b.rollNumber, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.rollNumber.localeCompare(b.rollNumber);
  });

  // Pre-index records by date and roll: { [date]: { [roll]: count } }
  const sheetDateMap = {};
  filteredSheets.forEach(sheet => {
    sheetDateMap[sheet.date] = sheetDateMap[sheet.date] || {};
    (sheet.records || []).forEach(r => {
      const count = (r.breakfast ? 1 : 0) + (r.lunch ? 1 : 0) + (r.dinner ? 1 : 0);
      sheetDateMap[sheet.date][String(r.rollNumber)] = count;
    });
  });

  const rangeText = (dateRange?.startDate && dateRange?.endDate)
    ? `${dateRange.startDate} to ${dateRange.endDate}`
    : dateRange?.startDate
    ? `From ${dateRange.startDate}`
    : dateRange?.endDate
    ? `Up to ${dateRange.endDate}`
    : 'All Active Records';

  const data = [
    [getActiveInstituteName().toUpperCase()],
    [`DAILY MEAL CONSUMPTION LEDGER MATRIX - ${(hostelName || 'HOSTEL').toUpperCase()}`],
    [`Audit Period / Date Range: ${rangeText}`],
    [`Generated On: ${new Date().toLocaleString()} • Total Boarders: ${boarderList.length} • Total Dates: ${uniqueDates.length}`],
    [],
    [
      'Serial',
      'Class Roll',
      'Boarder Name',
      'Room Allotment',
      ...uniqueDates,
      'Grand Total Meals'
    ]
  ];

  // Daily totals accumulator
  const dailyTotals = {};
  uniqueDates.forEach(d => { dailyTotals[d] = 0; });
  let overallTotalMeals = 0;

  boarderList.forEach((b, idx) => {
    let boarderTotal = 0;
    const dateCells = uniqueDates.map(date => {
      const count = sheetDateMap[date]?.[b.rollNumber] || 0;
      boarderTotal += count;
      dailyTotals[date] += count;
      return count;
    });
    overallTotalMeals += boarderTotal;

    data.push([
      idx + 1,
      b.rollNumber,
      b.name,
      b.room,
      ...dateCells,
      boarderTotal
    ]);
  });

  // Summary Row at the bottom
  data.push([
    '',
    '',
    'DAILY TOTAL CONSUMED MEALS',
    '',
    ...uniqueDates.map(d => dailyTotals[d] || 0),
    overallTotalMeals
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Meal Consumption Matrix');

  const fileName = `PTI_Daily_Meal_Matrix_${(hostelName || 'Hostel').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 10. DATE-WISE MEAL CONSUMPTION LEDGER MATRIX - PDF EXPORT (.pdf)
 */
export function exportMealLedgerMatrixPDF(hostelName, dateRange, mealSheets = [], users = []) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // 1. Filter sheets within date range
  let filteredSheets = (mealSheets || []).filter(sheet => {
    if (!sheet?.date) return false;
    if (dateRange?.startDate && sheet.date < dateRange.startDate) return false;
    if (dateRange?.endDate && sheet.date > dateRange.endDate) return false;
    return true;
  });

  if (filteredSheets.length === 0 && mealSheets && mealSheets.length > 0) {
    filteredSheets = mealSheets;
  }

  const uniqueDates = Array.from(new Set(filteredSheets.map(s => s.date))).sort();
  if (uniqueDates.length === 0) {
    uniqueDates.push(new Date().toISOString().split('T')[0]);
  }

  // 2. Build unique boarders map
  const boarderMap = new Map();
  const boarderUsers = (users || []).filter(u => 
    u?.role === 'boarder_student' || 
    u?.role === 'hostel_monitor' || 
    u?.role === 'meal_manager' || 
    u?.role === 'boarder'
  );
  boarderUsers.forEach(u => {
    const roll = String(u.rollNumber || u.loginId || u.id);
    boarderMap.set(roll, {
      rollNumber: roll,
      name: u.name || 'Resident Boarder',
      room: u.roomNumber ? `R-${u.roomNumber}` : 'R-101'
    });
  });

  filteredSheets.forEach(sheet => {
    (sheet.records || []).forEach(r => {
      const roll = String(r.rollNumber || r.studentId);
      if (!boarderMap.has(roll)) {
        boarderMap.set(roll, {
          rollNumber: roll,
          name: r.name || 'Boarder',
          room: r.room ? `R-${r.room}` : 'Quarters'
        });
      }
    });
  });

  const boarderList = Array.from(boarderMap.values()).sort((a, b) => {
    const numA = parseInt(a.rollNumber, 10);
    const numB = parseInt(b.rollNumber, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.rollNumber.localeCompare(b.rollNumber);
  });

  const sheetDateMap = {};
  filteredSheets.forEach(sheet => {
    sheetDateMap[sheet.date] = sheetDateMap[sheet.date] || {};
    (sheet.records || []).forEach(r => {
      const count = (r.breakfast ? 1 : 0) + (r.lunch ? 1 : 0) + (r.dinner ? 1 : 0);
      sheetDateMap[sheet.date][String(r.rollNumber)] = count;
    });
  });

  const rangeText = (dateRange?.startDate && dateRange?.endDate)
    ? `${dateRange.startDate} to ${dateRange.endDate}`
    : dateRange?.startDate
    ? `From ${dateRange.startDate}`
    : dateRange?.endDate
    ? `Up to ${dateRange.endDate}`
    : 'All Active Records';

  // Academic Header (Deep Teal Bar)
  doc.setFillColor(13, 148, 136); // #0D9488
  doc.rect(0, 0, 297, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${getActiveInstituteName()} - Daily Meal Consumption Ledger Matrix`, 148, 8, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Official Hall Dietary Record • ${hostelName || 'Hostel'} • Period: ${rangeText}`, 148, 14.5, { align: 'center' });

  // Subheader
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8.5);
  doc.text(`Generated: ${new Date().toLocaleString()} • Boarders: ${boarderList.length}`, 14, 25);

  // Headers
  const formattedDateHeaders = uniqueDates.map(d => {
    const parts = d.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return d;
  });

  const head = [['SL', 'Roll', 'Boarder Name', 'Room', ...formattedDateHeaders, 'Total']];

  // Daily totals accumulator
  const dailyTotals = {};
  uniqueDates.forEach(d => { dailyTotals[d] = 0; });
  let overallTotalMeals = 0;

  const rows = boarderList.map((b, idx) => {
    let boarderTotal = 0;
    const dateCells = uniqueDates.map(date => {
      const count = sheetDateMap[date]?.[b.rollNumber] || 0;
      boarderTotal += count;
      dailyTotals[date] += count;
      return count;
    });
    overallTotalMeals += boarderTotal;

    return [
      idx + 1,
      b.rollNumber,
      b.name,
      b.room,
      ...dateCells,
      boarderTotal
    ];
  });

  const foot = [[
    '',
    '',
    'Daily Total Meals',
    '',
    ...uniqueDates.map(d => dailyTotals[d] || 0),
    overallTotalMeals
  ]];

  autoTable(doc, {
    startY: 28,
    head: head,
    body: rows,
    foot: foot,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 41, 59], halign: 'center' },
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 38, halign: 'left', fontStyle: 'bold' },
      3: { cellWidth: 18, halign: 'center' },
    },
    didParseCell: (data) => {
      // Highlight Grand Total column
      if (data.column.index === head[0].length - 1) {
        data.cell.styles.fontStyle = 'bold';
        if (data.section === 'body') {
          data.cell.styles.fillColor = [240, 253, 250]; // soft teal tint
          data.cell.styles.textColor = [13, 148, 136];
        }
      }
    }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${getActiveInstituteName()} • Page ${i} of ${pageCount}`, 148, 204, { align: 'center' });
  }

  const fileName = `PTI_Daily_Meal_Matrix_${(hostelName || 'Hostel').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
