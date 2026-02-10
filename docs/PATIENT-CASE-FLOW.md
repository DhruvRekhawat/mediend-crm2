# Patient / Case Flow Documentation

This document describes the end-to-end flow of an insurance patient case in the Mediend CRM, including **Pipeline Stages**, **Case Stages**, and the **PL** and **Outstanding** stages.

---

## 1. Two Axes: Pipeline Stage vs Case Stage

Each lead has two independent stage concepts:

| Concept | Purpose | Values |
|--------|---------|--------|
| **Pipeline Stage** | High-level business pipeline (SALES → INSURANCE → PL → COMPLETED / LOST) | `SALES`, `INSURANCE`, `PL`, `COMPLETED`, `LOST` |
| **Case Stage** | Granular workflow state for the insurance case (KYP → Pre-Auth → Admitted → Discharged, etc.) | See Case Stage enum below |

- **Pipeline stage** drives which dashboard the case appears on (Sales, Insurance, P/L) and reporting.
- **Case stage** drives which actions are allowed (e.g. “Raise Pre-Auth”, “Mark Admitted”) and permissions.

---

## 2. Case Stage Enum (Full List)

| Case Stage | Description |
|------------|-------------|
| `NEW_LEAD` | Lead created; no KYP yet |
| `KYP_PENDING` | BD has submitted KYP; Insurance must add details (hospitals, room types, TPA) |
| `KYP_COMPLETE` | Insurance has added KYP details; BD can raise pre-auth |
| `PREAUTH_RAISED` | BD has raised pre-auth (hospital + room + disease); Insurance must approve/reject |
| `PREAUTH_COMPLETE` | Insurance has approved pre-auth; BD can mark patient admitted |
| `INITIATED` | BD has marked patient admitted (admission details recorded) |
| `ADMITTED` | Used in filters/reporting (logically same as INITIATED in current flow) |
| `DISCHARGED` | BD has marked patient discharged; Insurance can fill discharge sheet |
| `IPD_DONE` | Used in dashboards for “IPD Done” classification |
| `PL_PENDING` | Case is in P/L (profit & loss) pipeline; used in reporting |
| `OUTSTANDING` | Case has outstanding payments / follow-up; used in reporting |

**Note:** Transitions to `INITIATED`, `DISCHARGED`, and the pre-auth/KYP stages are driven by the APIs below. `ADMITTED`, `IPD_DONE`, `PL_PENDING`, and `OUTSTANDING` are used in the schema and UI for filtering/reporting; they may be set by other flows or manual updates.

---

## 3. Pipeline Stage Enum

| Pipeline Stage | When It’s Set | Who Cares |
|----------------|---------------|-----------|
| `SALES` | Default when lead is created | BD, Team Lead, Sales |
| `INSURANCE` | When case is in insurance workflow (e.g. Insurance dashboard filter) | Insurance team |
| `PL` | When discharge sheet is created (auto), or “Create PNL” from discharge sheet, or Insurance case approved | PL team |
| `COMPLETED` | Manual or other business logic | Reporting, MD |
| `LOST` | Manual or other business logic | Reporting |

---

## 4. End-to-End Case Flow (Step by Step)

### 4.1 Lead creation (SALES, NEW_LEAD)

- Lead is created with `pipelineStage = SALES`, `caseStage = NEW_LEAD`.
- BD/Team Lead owns the lead.

### 4.2 BD: Start KYP

- **Who:** BD (or ADMIN).
- **When:** No KYP submission exists for the lead.
- **Action:** “Start KYP” → open **KYP Form** (on patient page, KYP tab).
- **Result:** KYP submission created; **case stage → `KYP_PENDING`**. Insurance is notified.

**KYP Form (BD):** At least one of: Aadhar, PAN, Insurance Card, Disease, Location, Remark, or any document (Aadhar/PAN/Insurance/Other). All fields optional as long as at least one is filled.

### 4.3 Insurance: Add KYP Details

- **Who:** Insurance (INSURANCE_HEAD) or ADMIN.
- **When:** `caseStage === KYP_PENDING`.
- **Action:** “Add KYP Details” → go to **Pre-Auth page** → **PreAuth Form** (Add KYP Details).
- **Result:** Pre-auth data saved (sum insured, hospitals, room types, TPA, etc.); **case stage → `KYP_COMPLETE`**.

**PreAuth Form (Insurance – Add KYP Details):**  
- Required: Sum Insured; at least one Suggested Hospital; at least one Room Type.  
- Optional: Insurance, TPA, Room Rent, ICU, Capping, Copay, Notes.

### 4.4 BD: Raise Pre-Auth

- **Who:** BD (or ADMIN).
- **When:** `caseStage === KYP_COMPLETE`.
- **Action:** “Raise Pre-Auth” → **PreAuth Raise Form** (hospital + room + disease + optional docs).
- **Result:** **case stage → `PREAUTH_RAISED`**. Insurance is notified.

**PreAuth Raise Form (BD):**  
- Required: Hospital, Room Type, Disease Description.  
- Optional: Expected Admission/Surgery dates, Disease Images.

### 4.5 Insurance: Complete Pre-Auth (Approve / Reject)

- **Who:** Insurance (INSURANCE_HEAD) or ADMIN.
- **When:** `caseStage === PREAUTH_RAISED`.
- **Action:** “Complete Pre-Auth” → **PreAuth Approval Modal**: Approve or Reject.
- **Result:**  
  - **Approve:** **case stage → `PREAUTH_COMPLETE`**; BD can mark admitted.  
  - **Reject:** Stays `PREAUTH_RAISED`; Rejection Reason required.

**Complete Pre-Auth (Insurance):**  
- Approve: no extra fields.  
- Reject: **Rejection Reason** required.

### 4.6 BD: Mark Admitted (Initiate)

- **Who:** BD (or ADMIN).
- **When:** `caseStage === PREAUTH_COMPLETE`.
- **Action:** “Mark Admitted” → **Mark Admitted** modal on patient page.
- **Result:** Admission record created; **case stage → `INITIATED`**; hospital name updated; Insurance notified.

**Mark Admitted form (BD):**  
- Required: Admission Date, Admitting Hospital.  
- Optional: Admission Time, Expected Surgery Date, Notes.

### 4.7 BD: Mark Discharged

- **Who:** BD (or ADMIN).
- **When:** `caseStage === INITIATED` or `ADMITTED`.
- **Action:** “Mark Discharged” → confirmation dialog (no form fields).
- **Result:** **case stage → `DISCHARGED`**; Insurance notified; Insurance can fill discharge sheet.

### 4.8 Insurance: Fill Discharge Form

- **Who:** Insurance (INSURANCE_HEAD) or ADMIN.
- **When:** `caseStage === DISCHARGED`.
- **Action:** “Fill Discharge Form” / “View / Edit Discharge Sheet” → **Discharge Sheet** page → **DischargeSheet Form**.
- **Result:** Discharge sheet created/updated. On **create**: PL record is auto-created and **pipeline stage → `PL`**; PL team is notified.

**Discharge Sheet Form (Insurance):**  
- Required: Discharge Date, Hospital Bill Amount.  
- Optional: Surgery Date, Hospital Name, Status, Payment Type, Approved/Cash, Total Amount, Cash Paid, Settled Amount, cost breakdown (Referral, CAB, Implant, D&C, Doctor), revenue split (Hospital/Mediend % and amounts, Net Profit), Remarks, Upload documents.

---

## 5. Pre-Auth Q&A (Insurance ↔ BD)

- **Where:** Pre-Auth page → Q&A tab.
- **Who:** Insurance can raise queries; BD can answer (via query list).
- **Query Form:** One required field: **Question**.

---

## 6. Generate PDF (Insurance)

- **Who:** Insurance or ADMIN.
- **When:** `caseStage === PREAUTH_COMPLETE`.
- **Action:** “Generate PDF” (from patient page or pre-auth page). No form; button triggers PDF generation.

---

## 7. PL Stage and P/L Dashboard

### 7.1 When does a case enter the PL pipeline?

- **Automatically:** When Insurance **creates** a **Discharge Sheet** for a lead:
  - A **PL Record** is created from the discharge sheet.
  - Lead’s **pipeline stage** is set to **`PL`**.
  - PL team (PL_HEAD, ADMIN) gets a notification.

- **Manually:** Insurance or PL_HEAD can call **Create PNL** from an existing discharge sheet (e.g. if the auto-create was skipped). That also creates a PL Record and sets **pipeline stage → `PL`**.

### 7.2 P/L Dashboard

- **Who:** PL_HEAD, ADMIN (and any role with access to `/pl/dashboard`).
- **What:** Shows leads with **pipeline stage `PL` or `COMPLETED`** (with date filter). Displays PL records, payout status (hospital, doctor, mediend invoice), net profit, etc.
- **Actions:** Update PL record (payout status, amounts, etc.) via lead PATCH; no separate “case stage” transition for PL in the patient flow—**PL is primarily a pipeline stage**, and the case stage may remain `DISCHARGED` or progress to `IPD_DONE` / `PL_PENDING` in reporting.

### 7.3 Case stages used in PL context

- **`PL_PENDING`** and **`IPD_DONE`** are **case stages** used in the schema and dashboards (e.g. Insurance dashboard “IPD Done”, BD dashboard filters). They are not automatically set by the current patient-page APIs; they can be used for classification or future automation.
- **Pipeline stage `PL`** is what moves the case into the P/L dashboard and PL team’s scope.

---

## 8. Outstanding Stage and Outstanding Cases

### 8.1 What is “Outstanding”?

- **Outstanding** in this system refers to **Outstanding Cases**: cases where payments/settlements are still pending (e.g. hospital share, doctor share, mediend invoice). It is **not** the same as pipeline stage “PL” or case stage “OUTSTANDING” alone.

### 8.2 OutstandingCase model

- **OutstandingCase** is a separate entity linked to a lead. It holds: bill amount, settlement amount, cash paid by patient, hospital/mediend share, **outstanding days** (days since date of service), remarks, etc.
- Used to track and follow up on unpaid or partially paid cases.

### 8.3 How do Outstanding Cases get created/updated?

- **Sync API:** `POST /api/outstanding/sync` (PL_HEAD, FINANCE_HEAD, or ADMIN).
- Sync reads **PL Records** (from discharge/PNL flow) and creates or updates **OutstandingCase** records for the corresponding leads. Outstanding days are calculated from date of service (e.g. surgery date) to today.
- So: **PL Record exists** → sync runs → **OutstandingCase** created/updated. Lead can be considered “in Outstanding” for reporting when it has an OutstandingCase (and optionally `caseStage === OUTSTANDING` if that is set elsewhere).

### 8.4 Case stage OUTSTANDING

- **`OUTSTANDING`** is a **case stage** in the enum, used in filters and badges (e.g. Insurance/BD dashboards). It is not set automatically by the patient-page flow; it can be used to flag cases that need follow-up. The **operational** “outstanding” view is driven by the **OutstandingCase** entity and the sync process.

---

## 9. Role Summary: Who Can Do What (Patient Page & Related)

| Role | Main actions on patient flow |
|------|------------------------------|
| **BD** | Start KYP, Raise Pre-Auth, Mark Admitted, Mark Discharged |
| **INSURANCE_HEAD** | Add KYP Details, Complete Pre-Auth (approve/reject), Generate PDF, Fill/Edit Discharge Form, Raise Queries (Q&A) |
| **PL_HEAD** | View P/L dashboard, create PNL from discharge sheet, sync Outstanding cases, update PL records |
| **ADMIN** | All of the above (can act as BD or Insurance); access to all dashboards |
| **TEAM_LEAD** | Same as BD for pipeline/KYP; can update lead (e.g. pipeline stage to INSURANCE in some flows) |

---

## 10. Stage Transition Summary (Case Stage)

| From | To | Trigger (API / Action) |
|------|----|------------------------|
| NEW_LEAD | KYP_PENDING | BD submits KYP (`POST /api/kyp/submit`) |
| KYP_PENDING | KYP_COMPLETE | Insurance adds KYP details (`POST /api/kyp/pre-auth`) |
| KYP_COMPLETE | PREAUTH_RAISED | BD raises pre-auth (`POST /api/leads/:id/raise-preauth`) |
| PREAUTH_RAISED | PREAUTH_COMPLETE | Insurance approves pre-auth (`POST /api/pre-auth/:kypSubmissionId/approve`) |
| PREAUTH_COMPLETE | INITIATED | BD marks admitted (`POST /api/leads/:id/initiate`) |
| INITIATED or ADMITTED | DISCHARGED | BD marks discharged (`POST /api/leads/:id/discharge`) |

Pipeline stage **SALES → INSURANCE** can be set manually (e.g. lead update) or by other flows. **→ PL** is set when discharge sheet is created (or Create PNL / Insurance case approved, depending on flow).

---

## 11. Forms Quick Reference (Required vs Optional)

| Form | Role | Required fields | Optional fields |
|------|------|-----------------|-----------------|
| **KYP Form** | BD | At least one of: Aadhar, PAN, Insurance Card, Disease, Location, Remark, or any file | All others |
| **PreAuth Form** (Add KYP Details) | Insurance | Sum Insured; ≥1 Hospital; ≥1 Room Type | Insurance, TPA, Room Rent, ICU, Capping, Copay, Notes |
| **PreAuth Raise Form** | BD | Hospital, Room Type, Disease Description | Expected Admission/Surgery dates, Disease Images |
| **Complete Pre-Auth** | Insurance | — (Approve) or Rejection Reason (Reject) | — |
| **Mark Admitted** | BD | Admission Date, Admitting Hospital | Admission Time, Expected Surgery Date, Notes |
| **Mark Discharged** | BD | — (confirmation only) | — |
| **Discharge Sheet Form** | Insurance | Discharge Date, Bill Amount | All other financial, breakdown, revenue split, remarks, files |
| **Query Form** (Q&A) | Insurance | Question | — |

---

## 12. Key URLs

- Patient details: `/patient/[leadId]`
- Pre-Auth (add details / complete / PDF): `/patient/[leadId]/pre-auth`
- Discharge sheet: `/patient/[leadId]/discharge`
- Insurance dashboard: `/insurance/dashboard`
- P/L dashboard: `/pl/dashboard`

---

*This document reflects the implementation as of the codebase snapshot. For form field-level detail, see the earlier “Forms and actions by role” breakdown.*
