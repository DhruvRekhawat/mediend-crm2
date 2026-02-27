---
name: Attendance Rules and Normalization
overview: Implement granular attendance classification with penalties, self/manager normalization, unpaid leave tracking, HR leave balance management (per-employee + bulk CSV), and display attendance stats across employee and manager dashboards.
todos:
  - id: fix-sunday
    content: Fix Sunday attendance display bug in heatmap - check attendance before Sunday
    status: completed
  - id: attendance-status
    content: Implement granular attendance classification (on-time, grace-1, grace-2, late-penalty, half-day, late-full-day) in attendance-utils.ts
    status: completed
  - id: prisma-model
    content: Add AttendanceNormalization model + enums to Prisma schema and run migration
    status: completed
  - id: enrich-api
    content: Update /api/attendance/my to return enriched data (status, penalty, isHalfDay, isNormalized) + overlay leave days
    status: completed
  - id: stats-api
    content: Create /api/attendance/stats endpoint returning monthly stats (grace counts, penalty total, half-days, normalizations used)
    status: completed
  - id: normalize-apis
    content: Create self-normalization and manager-normalization API routes with monthly limit enforcement
    status: completed
  - id: heatmap-update
    content: Update attendance-heatmap.tsx with new statuses, colors (normalized, paid-leave, unpaid-leave), fix Sunday, update legend
    status: completed
  - id: stats-ui
    content: Add attendance stats cards (grace counts, penalties, half-days, normalizations) to core-hr attendance tab
    status: completed
  - id: normalize-ui-employee
    content: Add self-normalize button/flow in employee attendance tab
    status: completed
  - id: normalize-tab-manager
    content: Add Normalization tab to my-team page with manager normalization workflow
    status: completed
  - id: leave-balance-api
    content: Create /api/hr/leave-balances API for HR to view and update leave balances per employee, with probation-aware initialization
    status: completed
  - id: leave-balance-csv
    content: Add CSV bulk upload endpoint for leave balances at /api/hr/leave-balances/bulk
    status: completed
  - id: hr-leave-balance-page
    content: Build HR Leave Balance Management page at app/hr/leave-balances/page.tsx with per-employee form + CSV upload
    status: completed
  - id: unpaid-leave
    content: Allow leave application when balance exhausted (mark as unpaid), add isUnpaid field to LeaveRequest, show on dashboard
    status: completed
  - id: leave-heatmap-overlay
    content: Overlay approved leave days on heatmap with paid=blue, unpaid=pink colors
    status: pending
  - id: dept-timings
    content: Add timing fields (shiftStart, grace1End, grace2End, lateEnd) to Department model and update HR department edit UI
    status: completed
isProject: false
---

# Attendance Rules, Penalties, Normalization, and Leave Balance Management

## Part A: Current State

- **Attendance**: Single `isLate` boolean (threshold 11:00 AM) in [lib/hrms/attendance-utils.ts](lib/hrms/attendance-utils.ts). No grace periods, penalties, or half-day logic.
- **Heatmap**: 4 statuses (present/late/absent/holiday) in [components/employee/attendance-heatmap.tsx](components/employee/attendance-heatmap.tsx). Sunday bug: always purple even if attendance exists (line 71-75).
- **Normalization**: No DB models, API routes, or UI.
- **Leave balances**: Auto-initialized with `maxDays` from `LeaveTypeMaster` via `initializeLeaveBalances()` in [lib/hrms/leave-balance-utils.ts](lib/hrms/leave-balance-utils.ts). No HR page to manually set/adjust balances per employee.
- **Probation**: 6-month probation check already exists in [app/api/leaves/apply/route.ts](app/api/leaves/apply/route.ts) (blocks leave application). But balance is still initialized at full `maxDays` -- should be 0 during probation.
- **Unpaid leave**: Not supported. When balance is exhausted, leave application is rejected ("Insufficient leave balance").
- **HR employee management**: [app/hr/users/page.tsx](app/hr/users/page.tsx) has EditEmployeeDialog with DOJ, birthday, salary, department fields. No bulk upload.

---

## Part B: Attendance System Changes

### 1. Fix Sunday Attendance Display

In [components/employee/attendance-heatmap.tsx](components/employee/attendance-heatmap.tsx), reorder status logic: check `attendanceRecord` **before** the Sunday check. Sundays with attendance show the normal attendance color; only Sundays without attendance show purple (holiday).

### 2. Department-Specific Shift Timings

Add timing fields to the `Department` model in [prisma/schema.prisma](prisma/schema.prisma):

```prisma
model Department {
  // ...existing fields...
  shiftStartHour   Int     @default(10)   // e.g., 10 for 10:00 AM, 9 for 9:30
  shiftStartMinute Int     @default(0)    // e.g., 0 for 10:00, 30 for 9:30
  grace1Minutes    Int     @default(15)   // grace period 1 duration (default 15 min)
  grace2Minutes    Int     @default(15)   // grace period 2 duration (default 15 min)  
  penaltyMinutes   Int     @default(30)   // penalty window duration (default 30 min)
  penaltyAmount    Int     @default(200)  // penalty in rupees
}
```

For a department with 10:00 AM start: grace1 = 10:00-10:15, grace2 = 10:15-10:30, penalty = 10:30-11:00, half-day = 11:00+.
For a department with 9:30 AM start: grace1 = 9:30-9:45, grace2 = 9:45-10:00, penalty = 10:00-10:30, half-day = 10:30+.

The thresholds are derived at runtime: `shiftStart + grace1 + grace2 + penalty`. No hardcoded times.

Update the HR department edit UI ([app/hr/departments/page.tsx](app/hr/departments/page.tsx) and/or `[id]/page.tsx`) to include these timing fields.

### 3. Granular Attendance Status Classification

Add to [lib/hrms/attendance-utils.ts](lib/hrms/attendance-utils.ts):

```typescript
type AttendanceStatus = 
  | 'on-time'       // before shift start, >= 9h
  | 'grace-1'       // shift start to +grace1Minutes, >= 9h
  | 'grace-2'       // +grace1 to +grace2, >= 9h
  | 'late-penalty'  // +grace2 to +penaltyMinutes (Rs penalty)
  | 'half-day'      // beyond penalty window (always), OR any time with <9h

interface DepartmentTiming {
  shiftStartHour: number
  shiftStartMinute: number
  grace1Minutes: number
  grace2Minutes: number
  penaltyMinutes: number
  penaltyAmount: number
}
```

The `classifyAttendance(punchTime, workHours, timing)` function takes `DepartmentTiming` as a parameter instead of hardcoded values. All time comparisons use existing UTC getters (no timezone changes). The default timing (10:00 AM start) applies when an employee has no department.

Classification rules (using default 10:00 AM example):

- Before 10:00, >= 9h => `on-time`, penalty 0
- Before 10:00, < 9h => `half-day`, penalty 0
- 10:00-10:15, >= 9h => `grace-1`, penalty 0
- 10:15-10:30, >= 9h => `grace-2`, penalty 0
- 10:30-11:00, any hours => `late-penalty`, penalty 200
- 11:00+ => `half-day`, penalty 0 (always half-day regardless of hours worked)

Key rule: **After the penalty window ends (shift start + grace1 + grace2 + penalty), it is always a half-day -- no amount of hours can make it a full day.** The 9-hour minimum applies only to entries within or before the penalty window.

Replace `WORK_START_HOUR = 11` and `isLateArrival()` with `classifyAttendance()`. Keep `isLate` boolean for backward compat.

### 3. Database: AttendanceNormalization Model

Add to [prisma/schema.prisma](prisma/schema.prisma):

```prisma
model AttendanceNormalization {
  id            String              @id @default(cuid())
  employeeId    String
  employee      Employee            @relation(fields: [employeeId], references: [id])
  date          DateTime
  type          NormalizationType   // SELF or MANAGER
  requestedById String
  requestedBy   Employee            @relation("NormalizationRequester", ...)
  approvedById  String?
  approvedBy    Employee?           @relation("NormalizationApprover", ...)
  status        NormalizationStatus @default(APPROVED)
  reason        String?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  @@unique([employeeId, date])
}
```

Limits: Self = max 3/month, Manager = max 5/month/employee.

### 4. API Routes

**New routes:**

- **POST /api/attendance/normalize** -- Self-normalization (auto-approved, 3/month limit)
- **GET /api/attendance/normalize/my** -- Employee's normalization records for the month
- **POST /api/attendance/normalize/manager** -- Manager normalizes subordinate (5/month/employee limit)
- **GET /api/attendance/normalize/team** -- Manager views team normalizations
- **GET /api/attendance/stats** -- Monthly stats: grace-1 count, grace-2 count, late-penalty count, half-day count, total penalties, normalizations used

**Modified routes:**

- [app/api/attendance/my/route.ts](app/api/attendance/my/route.ts) -- Fetch the employee's department timing, join with AttendanceNormalization + approved leaves. Pass timing to `classifyAttendance()`. Return enriched data with `status`, `penalty`, `isHalfDay`, `isNormalized`, and leave overlay info.
- [app/api/attendance/route.ts](app/api/attendance/route.ts) (HR view) -- Also fetch department timings per employee for correct classification.

### 5. Heatmap Updates

[components/employee/attendance-heatmap.tsx](components/employee/attendance-heatmap.tsx) new colors:

- On-time: `bg-green-500`
- Grace 1: `bg-green-400`
- Grace 2: `bg-amber-400`
- Late with Penalty: `bg-orange-500`
- Half Day: `bg-red-400`
- Late Full Day (9h+): `bg-orange-500`
- Normalized: `bg-blue-500`
- Paid Leave: `bg-blue-400`
- Unpaid Leave: `bg-rose-400`
- Absent: `bg-gray-200`
- Holiday (Sunday, no attendance): `bg-purple-300`

Update `AttendanceDay` interface and legend.

### 6. Attendance Stats Section

Add stats cards above heatmap in [app/employee/dashboard/core-hr/page.tsx](app/employee/dashboard/core-hr/page.tsx): Grace 1 count, Grace 2 count, Late (penalty) count, Half Days, Total Penalties (Rs), Normalizations Used (X/3).

### 7. Manager Normalization Tab

Add "Normalization" tab in [app/employee/my-team/page.tsx](app/employee/my-team/page.tsx): select employee, pick date, normalize (5/month limit), view history.

---

## Part C: Leave Balance Management

### 8. HR Leave Balance Management Page

**New page**: `app/hr/leave-balances/page.tsx`

Features:

- Table listing all employees with their leave balances per leave type (CL, SL, EL, etc.)
- "Edit Balance" dialog per employee: HR can set allocated/used/remaining for each leave type
- Probation indicator: employees within 6 months of DOJ shown with a badge; their balances should be 0
- CSV bulk upload: upload a CSV with columns `employeeCode, leaveType, allocated, used` to bulk-set balances
- Add sidebar navigation entry under "HR Management" section

### 9. API Routes for Leave Balance Management

**New routes:**

- **GET /api/hr/leave-balances** -- List all employees with leave balances (HR only)
- **PATCH /api/hr/leave-balances** -- Update leave balance for a specific employee+leaveType (HR only)
- **POST /api/hr/leave-balances/bulk** -- Bulk upload CSV to set balances (HR only)

### 10. Probation-Aware Balance Initialization

Update [lib/hrms/leave-balance-utils.ts](lib/hrms/leave-balance-utils.ts):

- `initializeLeaveBalances()` should check employee's DOJ. If within 6 months of joining, set `allocated = 0, remaining = 0` instead of `maxDays`.
- When HR manually sets a balance via the new page, that takes precedence over auto-initialization.

### 11. Unpaid Leave Support

Modify the leave application flow:

- In [app/api/leaves/apply/route.ts](app/api/leaves/apply/route.ts): when `validateLeaveBalance()` fails due to insufficient balance, instead of rejecting, allow the application but mark it as unpaid (`isUnpaid: true`).
- Add `isUnpaid Boolean @default(false)` field to `LeaveRequest` model in Prisma schema.
- When an unpaid leave is approved, do NOT deduct from balance (since balance is 0). Track it separately.
- On the employee dashboard leave balance cards ([components/hrms/LeaveBalanceCard.tsx](components/hrms/LeaveBalanceCard.tsx)), show an "Unpaid Leave" section if any unpaid leaves exist.

### 12. Leave Days on Heatmap

Overlay approved leave days on the attendance heatmap:

- Fetch approved leaves for the date range alongside attendance data in `/api/attendance/my`.
- In the heatmap, for dates that are approved leaves:
  - Paid leave (isUnpaid = false): Blue (`bg-blue-400`)
  - Unpaid leave (isUnpaid = true): Pink/Rose (`bg-rose-400`)
- Leave days take priority over absent status but not over attendance records (if someone has attendance on a leave day, show attendance).

---

## File Change Summary

**Existing files to modify:**

- `prisma/schema.prisma` -- Add timing fields to Department, AttendanceNormalization model, enums, isUnpaid on LeaveRequest
- `lib/hrms/attendance-utils.ts` -- Replace isLateArrival() with classifyAttendance(punchTime, workHours, timing), add DepartmentTiming interface
- `lib/hrms/leave-balance-utils.ts` -- Make initializeLeaveBalances() probation-aware
- `lib/hrms/leave-utils.ts` -- Update validateLeaveBalance() to support unpaid leave path
- `components/employee/attendance-heatmap.tsx` -- Fix Sunday, add all new statuses/colors/leave overlay, update legend
- `components/hrms/LeaveBalanceCard.tsx` -- Show unpaid leave section
- `app/employee/dashboard/core-hr/page.tsx` -- Add stats cards, normalize button
- `app/api/attendance/my/route.ts` -- Fetch dept timing, enrich response with status/penalty/normalization/leaves
- `app/api/attendance/route.ts` -- Fetch dept timings per employee for correct classification
- `app/api/leaves/apply/route.ts` -- Allow unpaid leave when balance exhausted
- `app/employee/my-team/page.tsx` -- Add Normalization tab
- `app/hr/departments/page.tsx` (and/or `[id]/page.tsx`) -- Add shift timing fields to department edit form
- `components/app-sidebar.tsx` -- Add "Leave Balances" link in HR Management section

**New files to create:**

- `app/api/attendance/normalize/route.ts` -- Self-normalization
- `app/api/attendance/normalize/my/route.ts` -- Own normalization records
- `app/api/attendance/normalize/manager/route.ts` -- Manager normalization
- `app/api/attendance/normalize/team/route.ts` -- Team normalization records
- `app/api/attendance/stats/route.ts` -- Monthly attendance stats
- `app/api/hr/leave-balances/route.ts` -- HR leave balance CRUD
- `app/api/hr/leave-balances/bulk/route.ts` -- CSV bulk upload
- `app/hr/leave-balances/page.tsx` -- HR Leave Balance Management page

