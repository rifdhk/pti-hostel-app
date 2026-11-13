# PTI & Hostel Management System

A production-grade, full-stack React (Vite) + Tailwind CSS web application built for institutional **Physical Training Instructor (PTI)** departments and **Hostel / Residential Quarters** administration.

## Architectural Highlights

### 1. Clean Academic Minimalist Design System
- **Slate Background:** `#F8FAFC` (`bg-academic-bg`)
- **Pure White Cards:** `#FFFFFF` (`bg-white` / `.academic-card`)
- **Deep Teal Accent:** `#0D9488` (`brand-600`) with matching variants
- **Strict Financial Color-Coding:**
  - Surplus balances ($\ge 0$): **Emerald Green (`#10B981`)** with mandatory plus `+ ৳Amount`
  - Due / Deficit balances ($< 0$): **Crimson Red (`#EF4444`)** with mandatory minus `- ৳Amount`

---

### 2. The 6 Administrative & Student Tiers

| Tier | Role Key | Test Account ID | Password | Scope & Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Superintendent** | `superintendent` | `admin` | `123456` | Global authority, hostel creation, cross-campus user management, master financial calculation switches. |
| **Tier 2: Hostel Super** | `hostel_super` | `hostel_super` | `123456` | Hall-specific warden, room allocation, **Two-Step Establishment Approval Queue** (approving fee deposits & monitor expenses). |
| **Tier 3: Hostel Monitor** | `hostel_monitor` | `monitor_101` (Roll: `101`) | `123456` | Establishment maintenance expense logging with automatic `'pending'` status, floor supervision. |
| **Tier 4: Meal Manager** | `meal_manager` | `manager_102` (Roll: `102`) | `123456` | Daily mess bazar market log, **Daily Meal Sheet Lock & Approval Table**, dynamic meal rate computation. |
| **Tier 5: Boarder Student** | `boarder_student` | `103` (Roll: `103`) | `123456` | Prominent Room Badge, Next-Day Meal Toggles (Cut-Off & Auto-Carry Forward rules), fee deposit slips, transparent hall expense view. |
| **Tier 6: Non-Boarder Student** | `non_boarder_student` | `201` (Roll: `201`) | `123456` | Attached day-scholar trainee, establishment deposit entry, transparent institutional expense view. |

---

### 3. Two-Step Establishment Approval Queue
1. **Student Fee Deposit Queue:** Student submits deposit slip with transaction ID / challan number (`pending`). Hostel Super verifies and sanctions (`approved`), updating the student's credit balance.
2. **Monitor Maintenance Queue:** Hostel Monitor enters repair/utility bill (`pending`). Hostel Super inspects memo and sanctions (`approved`), publishing to the transparent public log.

---

### 4. Smart Meal Automation & Financial Engine
- **Next-Day Meal Toggles:** Boarders set Breakfast, Lunch, Dinner for the next day.
- **Cut-Off Time Rule:** Configured to `20:00 (8:00 PM)`. Locks toggles once cut-off passes or once the Meal Manager locks the day's meal sheet.
- **Auto-Carry Forward Rule:** If a student does not update before cut-off, previous day's choices are copied automatically with an audit badge.
- **Dynamic Meal Rate:**
  $$\text{Meal Rate} = \frac{\text{Total Approved Bazar Purchases}}{\text{Total Consumed Meals}}$$
- **Superintendent Master Control Switches:**
  - `Meal Calculations [ON/OFF]`
  - `Establishment Calculations [ON/OFF]`
  - Dynamically masks balance figures on student dashboards with an audit pause banner when toggled OFF.

---

### 5. Multi-Channel Communication Systems
- **Isolated Notice Board:** Separate boards per hostel. Only Superintendent and respective Hostel Super can post/delete. Non-boarders are restricted from private hall circulars.
- **Multi-Room Chatbox:**
  - **Private Hall Room:** Restricted to boarders, monitors, managers, and warden of that specific hall.
  - **Global Student Common Room:** Connects all boarders across all halls plus non-boarder day scholars.
- **Direct Messaging & Ticket Support:**
  - Students and monitors file complaint tickets targeted to specific authorities (`Hostel Super`, `Meal Manager`, or `Superintendent`).
  - Authorities change status (`Open`, `In Progress`, `Resolved`) and post official signed replies.

---

## Getting Started

### 1. Run Development Server
```bash
npm run dev
```

### 2. Configure Firebase (Optional)
Fill credentials in `.env` based on `.env.example`. When configured, data syncs with Firestore collections (`app_users`, `rooms`, `hostels`, `deposits`, `establishment_expenses`, `bazar_expenses`, `daily_meal_sheets`, `tickets`, `notices`). Without credentials, the system runs with local persistence.
