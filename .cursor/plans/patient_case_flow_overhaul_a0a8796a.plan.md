---
name: Patient case flow overhaul
overview: "Phased overhaul of the patient/insurance case flow: splitting KYP into two stages, adding BD-Insurance chat, restructuring hospital suggestions, rebuilding discharge sheet, and aligning PL/Outstanding -- across 4 PRs with a migration script for existing data."
todos:
  - id: phase1-schema
    content: "Phase 1: Update Prisma schema (CaseStage enum, CaseChatMessage, HospitalSuggestion models, KYP/PreAuth/Lead field additions)"
    status: completed
  - id: phase1-migration
    content: "Phase 1: Write migration script (old stages to new, backfill hospitalSuggestions to rows, backfill area)"
    status: completed
  - id: phase1-chat
    content: "Phase 1: Build chat system (API routes, CaseChat component, integrate into patient page, remove Q&A)"
    status: completed
  - id: phase1-permissions
    content: "Phase 1: Update case-permissions.ts and stage-progress.tsx for new stage names"
    status: completed
  - id: phase2-kyp-basic
    content: "Phase 2: KYP Basic form + API (insurance card + city + area required)"
    status: completed
  - id: phase2-hospital-suggestions
    content: "Phase 2: Hospital Suggestion form + API (Insurance suggests hospitals with tentative bills and room rents)"
    status: completed
  - id: phase2-kyp-detailed
    content: "Phase 2: KYP Detailed form + API (aadhar, pan, prescription, disease photos, consent)"
    status: completed
  - id: phase2-preauth-raise
    content: "Phase 2: Update raise pre-auth flow (hospital card selection or new hospital request)"
    status: completed
  - id: phase2-patient-page
    content: "Phase 2: Update patient page actions and tabs for new stages"
    status: completed
  - id: phase3-preauth-approve
    content: "Phase 3: Update pre-auth approve/reject for new hospital flow + system chat messages"
    status: completed
  - id: phase3-pdf
    content: "Phase 3: Implement branded merged pre-auth PDF (jsPDF + document merging)"
    status: completed
  - id: phase3-mark-lost
    content: "Phase 3: Mark Lost API + UI (reason required, pipeline -> LOST)"
    status: completed
  - id: phase4-discharge
    content: "Phase 4: Rebuild discharge sheet (4 sections: Patient & Policy, Documents, Bill Breakup, Approval & Deductions)"
    status: completed
  - id: phase4-pl
    content: "Phase 4: Update PL form columns and prefilling from discharge"
    status: completed
  - id: phase4-outstanding
    content: "Phase 4: Align outstanding sync with new discharge fields"
    status: completed
isProject: false
---

# Patient Case Flow Overhaul (v2)

This plan implements the updated spec in **4 phases**, each as a separate PR. Every phase includes schema migration, API changes, UI updates, and tests.

---

## Current State Summary

- **Case stages:** `NEW_LEAD > KYP_PENDING > KYP_COMPLETE > PREAUTH_RAISED > PREAUTH_COMPLETE > INITIATED > DISCHARGED`
- **Communication:** Structured Q&A (`InsuranceQuery` model) on pre-auth page
- **Hospital suggestions:** Flat JSON arrays on `PreAuthorization` (`hospitalSuggestions: string[]`, `roomTypes: {name,rent}[]`)
- **Discharge sheet:** Flat financial form, no document uploads, no bill breakup
- **PDF generation:** Placeholder only (no real PDF -- `TODO` in code)
- **Mark Lost:** Only via generic lead PATCH `pipelineStage: 'LOST'`; no reason field

---

## Phase 1: Schema + Chat System + Migration

### 1A. Prisma Schema Changes

**Update `CaseStage` enum** in [prisma/schema.prisma](prisma/schema.prisma):

```
enum CaseStage {
  NEW_LEAD
  KYP_BASIC_PENDING       // was KYP_PENDING
  KYP_BASIC_COMPLETE      // new
  KYP_DETAILED_PENDING    // new
  KYP_DETAILED_COMPLETE   // was KYP_COMPLETE
  PREAUTH_RAISED
  PREAUTH_COMPLETE
  INITIATED
  DISCHARGED
  PL_PENDING
  OUTSTANDING
}
```

Remove: `KYP_PENDING`, `KYP_COMPLETE`, `ADMITTED`, `IPD_DONE`.

**New model: `CaseChat**` -- persistent 2-way chat between BD and Insurance, with system messages:

```prisma
model CaseChatMessage {
  id        String   @id @default(cuid())
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  senderId  String?                // null for system messages
  sender    User?    @relation(fields: [senderId], references: [id])
  type      ChatMessageType        // TEXT, FILE, SYSTEM
  content   String   @db.Text
  fileUrl   String?
  fileName  String?
  createdAt DateTime @default(now())
  @@index([leadId, createdAt])
}

enum ChatMessageType {
  TEXT
  FILE
  SYSTEM
}
```

**New model: `HospitalSuggestion**` -- replaces flat JSON arrays:

```prisma
model HospitalSuggestion {
  id               String  @id @default(cuid())
  preAuthId        String
  preAuth          PreAuthorization @relation(fields: [preAuthId], references: [id], onDelete: Cascade)
  hospitalName     String
  tentativeBill    Float?
  roomRentGeneral  Float?
  roomRentPrivate  Float?
  roomRentICU      Float?
  notes            String?
  createdAt        DateTime @default(now())
  @@index([preAuthId])
}
```

**Update `KYPSubmission**` -- add `area` field, keep existing fields (they serve both basic and detailed):

```prisma
// Add to KYPSubmission:
  area              String?   // new: area within city
  prescriptionFileUrl String? // new: prescription upload
  diseasePhotos     Json?     // new: Array of {name, url}
  patientConsent    Boolean   @default(false) // new
```

**Update `PreAuthorization**` -- add new hospital request support:

```prisma
// Add to PreAuthorization:
  isNewHospitalRequest  Boolean @default(false)
  newHospitalPreAuthRaised Boolean @default(false)  // Insurance marks they raised pre-auth for new hospital
```

**Update `Lead**` -- add lost reason:

```prisma
// Add to Lead:
  lostReason   String?  @db.Text
  lostAt       DateTime?
```

### 1B. Migration Script

Create `scripts/migrate-case-stages-v2.ts`:

- `KYP_PENDING` -> `KYP_BASIC_PENDING` (if no preAuthData) or `KYP_DETAILED_PENDING` (if preAuthData exists but no raise)
- `KYP_COMPLETE` -> `KYP_DETAILED_COMPLETE`
- `ADMITTED` -> `INITIATED`
- `IPD_DONE` -> `DISCHARGED`
- Update all `CaseStageHistory` records
- Migrate `hospitalSuggestions` JSON to `HospitalSuggestion` rows
- Backfill `area` as empty string

### 1C. Chat API + Components

**API routes:**

- `POST /api/leads/[id]/chat` -- send message (text or file)
- `GET /api/leads/[id]/chat` -- get messages (paginated)
- System messages auto-posted on every stage change (from existing stage-change APIs)

**Components:**

- New `components/chat/case-chat.tsx` -- chat panel with message list, input, file upload
- New `components/chat/chat-message.tsx` -- individual message bubble (text/file/system)
- Integrate into [app/patient/[leadId]/page.tsx](app/patient/[leadId]/page.tsx) as a persistent panel/tab

**Remove:**

- `InsuranceQuery` model usage from pre-auth page (keep model for backward compat initially)
- `QueryForm` and `QueryList` components from [app/patient/[leadId]/pre-auth/page.tsx](app/patient/[leadId]/pre-auth/page.tsx)

### 1D. Update permissions

Update [lib/case-permissions.ts](lib/case-permissions.ts) to use new stage names throughout.

---

## Phase 2: Two-Stage KYP + Hospital Suggestions

### 2A. KYP Basic (Call 1)

**Update [components/kyp/kyp-form.tsx](components/kyp/kyp-form.tsx):**

- Split into `KYPBasicForm` and `KYPDetailedForm`
- Basic form requires: Insurance Card (upload), City, Area
- Optional: Patient Name, Phone, Notes
- Transition: `NEW_LEAD -> KYP_BASIC_PENDING`

**Update [app/api/kyp/submit/route.ts](app/api/kyp/submit/route.ts):**

- Add `type` param (`basic` or `detailed`)
- Basic: validate insuranceCard + location + area required
- Stage: `NEW_LEAD -> KYP_BASIC_PENDING`
- Post system chat message: "BD submitted KYP (Basic)"

### 2B. Insurance: Hospital Suggestions

**New form: `components/kyp/hospital-suggestion-form.tsx`:**

- Sum Insured (required)
- Dynamic list of hospitals, each with: name, tentative bill, room rents (general/private/ICU -- all optional)
- Saves `HospitalSuggestion` rows + sum insured on `PreAuthorization`

**Update [app/api/kyp/pre-auth/route.ts](app/api/kyp/pre-auth/route.ts):**

- New flow for `KYP_BASIC_PENDING -> KYP_BASIC_COMPLETE`
- Create `HospitalSuggestion` rows instead of flat JSON
- Set `pipelineStage -> INSURANCE`
- Post system chat message: "Insurance suggested N hospitals"

### 2C. KYP Detailed (Call 2)

**New form: `components/kyp/kyp-detailed-form.tsx`:**

- Disease/Diagnosis (required), Patient Consent checkbox (required)
- Optional uploads: Aadhar, PAN, Prescription, Disease Photos

**Update API:**

- `KYP_BASIC_COMPLETE -> KYP_DETAILED_PENDING` on submit
- Post system chat message: "BD submitted KYP (Detailed)"

### 2D. Update Pre-Auth Raise

**Update [components/case/preauth-raise-form.tsx](components/case/preauth-raise-form.tsx):**

- Hospital selection: show `HospitalSuggestion` cards (with tentative bill, room rents) OR "Request New Hospital" option
- If new hospital: text input for hospital name, sets `isNewHospitalRequest = true`
- Stage: `KYP_DETAILED_PENDING -> PREAUTH_RAISED` (or `KYP_DETAILED_COMPLETE -> PREAUTH_RAISED`)

**Update [app/api/leads/[id]/raise-preauth/route.ts](app/api/leads/[id]/raise-preauth/route.ts):**

- Accept `isNewHospitalRequest` flag
- Remove validation that hospital must be in suggestions (when new hospital requested)
- Post system chat message

### 2E. Update Patient Page

**Update [app/patient/[leadId]/page.tsx](app/patient/[leadId]/page.tsx):**

- Show different action buttons based on new stages
- KYP tab: show Basic form, then Detailed form based on stage
- Pre-Auth tab: show hospital suggestion cards from `HospitalSuggestion` model

**Update [components/case/stage-progress.tsx](components/case/stage-progress.tsx):**

- Update STAGES array with new stage names and labels

---

## Phase 3: Pre-Auth Processing + PDF + Mark Lost

### 3A. Insurance Pre-Auth Processing

**Update [components/kyp/pre-auth-approval-modal.tsx](components/kyp/pre-auth-approval-modal.tsx):**

- If `isNewHospitalRequest`: show "Mark pre-auth raised for new hospital" button before approve/reject
- Approve / Reject flow stays similar
- Post system chat messages

**Update [app/api/pre-auth/[kypSubmissionId]/approve/route.ts](app/api/pre-auth/[kypSubmissionId]/approve/route.ts):**

- Post system chat message on approve

**Update [app/api/pre-auth/[kypSubmissionId]/reject/route.ts](app/api/pre-auth/[kypSubmissionId]/reject/route.ts):**

- Post system chat message with rejection reason

### 3B. Branded Merged PDF

**Implement [app/api/leads/[id]/preauth-pdf/route.ts](app/api/leads/[id]/preauth-pdf/route.ts):**

- Use `jspdf` (already in project) to generate real PDF
- Include: MediEND logo (`public/logo-mediend.png`), patient details, insurance details, selected hospital, disease description
- Merge uploaded documents (insurance card, aadhar, pan, prescription, disease photos) -- fetch from S3 URLs and append as pages
- Store generated PDF in S3, update `PreAuthPDF.pdfUrl`
- Post system chat message: "Pre-auth PDF generated"

### 3C. Mark Lost

**New API: `POST /api/leads/[id]/mark-lost`:**

- Required: `lostReason` (enum: Patient Declined, Ghosted, Financial Issue, Other) + optional `lostReasonDetail`
- Sets `pipelineStage -> LOST`, `lostReason`, `lostAt`
- Creates `CaseStageHistory` entry
- Post system chat message: "BD marked case lost -- reason"

**Update patient page:**

- Add "Mark Lost" button (visible when `caseStage >= PREAUTH_COMPLETE`)
- Dialog with reason selection

---

## Phase 4: Discharge Sheet Rebuild + PL + Outstanding

### 4A. Discharge Sheet Schema Update

**Update `DischargeSheet` model** in [prisma/schema.prisma](prisma/schema.prisma):

Add new fields for the structured form:

```
// A. Patient & Policy (mostly existing, add):
  tentativeAmount    Float?
  copayPct           Float?

// B. Documents (new upload fields):
  dischargeSummaryUrl  String?
  otNotes              String?     // upload URL
  codesCount           Int?
  finalBillUrl         String?
  settlementLetterUrl  String?

// C. Bill Breakup (new):
  roomRentAmount       Float @default(0)
  pharmacyAmount       Float @default(0)
  investigationAmount  Float @default(0)
  consumablesAmount    Float @default(0)
  implantsAmount       Float @default(0)
  totalFinalBill       Float @default(0)

// D. Approval & Deductions (new):
  finalApprovedAmount  Float @default(0)
  deductionAmount      Float @default(0)
  discountAmount       Float @default(0)
  waivedOffAmount      Float @default(0)
  settlementPart       Float @default(0)
  tdsAmount            Float @default(0)
  otherDeduction       Float @default(0)
  netSettlementAmount  Float @default(0)
```

### 4B. Discharge Sheet Form Rebuild

**Rewrite [components/discharge/discharge-sheet-form.tsx](components/discharge/discharge-sheet-form.tsx):**

- 4 sections matching the spec: Patient & Policy, Documents, Bill Breakup, Approval & Deductions
- All previously-filled data (sum insured, hospital, room rent, copay, doctor, tentative amount) prefilled from KYP/PreAuth
- Document upload fields with view/download for existing files
- Bill breakup as editable table
- Approval & deductions as editable table
- Net Settlement Amount auto-calculated

### 4C. PL Form Update

**Update P/L dashboard** [app/pl/dashboard/page.tsx](app/pl/dashboard/page.tsx) and `PLRecord` schema:

- Columns per spec: Month, ATL/TL/ACM/CM/SCM, BDM, P.Number, P.Name, Category, Treatment, Circle, Doctors, Hospitals, Surgery Date, Payment, Status, Approved/Cash, Cash/Ded Paid, Total, Bill Amount, Payment Collected At, Lead Source, Hospital Share %, Hospital Share, Doctor Charges, D&C, Implant, Cab Charges, Referral Amount, MediEND Share %, MediEND Share, MediEND Net-Profit, Remarks
- All prefilled from discharge sheet; editable by PL Head

### 4D. Outstanding Alignment

- Outstanding already works (sync from PL records, mark paid/not paid, track outstanding days)
- Ensure `OutstandingCase` sync pulls new discharge sheet fields
- Add `paymentReceived` toggle and `remark2` edit on outstanding dashboard

---

## Cross-Cutting Concerns

- **System chat messages:** Every API that changes case stage must also `POST` a `CaseChatMessage` with `type: SYSTEM`
- **Prefilling:** Each stage form must pull data from all previous stages (KYP -> PreAuth -> Admission -> Discharge -> PL)
- **Notifications:** Keep existing notification system; add `CASE_CHAT_MESSAGE` type for chat messages
- **Stage progress bar:** Update [components/case/stage-progress.tsx](components/case/stage-progress.tsx) with new stages

---

## Files Changed Per Phase (Key Files)

**Phase 1:** `prisma/schema.prisma`, `scripts/migrate-case-stages-v2.ts`, `lib/case-permissions.ts`, `app/api/leads/[id]/chat/route.ts` (new), `components/chat/*` (new), `app/patient/[leadId]/page.tsx`

**Phase 2:** `components/kyp/kyp-form.tsx` (split), `components/kyp/hospital-suggestion-form.tsx` (new), `components/kyp/kyp-detailed-form.tsx` (new), `app/api/kyp/submit/route.ts`, `app/api/kyp/pre-auth/route.ts`, `components/case/preauth-raise-form.tsx`, `app/api/leads/[id]/raise-preauth/route.ts`, `components/case/stage-progress.tsx`, `app/patient/[leadId]/page.tsx`, `app/patient/[leadId]/pre-auth/page.tsx`

**Phase 3:** `components/kyp/pre-auth-approval-modal.tsx`, `app/api/pre-auth/*/route.ts`, `app/api/leads/[id]/preauth-pdf/route.ts`, `app/api/leads/[id]/mark-lost/route.ts` (new), `app/patient/[leadId]/page.tsx`

**Phase 4:** `prisma/schema.prisma`, `components/discharge/discharge-sheet-form.tsx`, `app/api/discharge-sheet/route.ts`, `app/pl/dashboard/page.tsx`, `app/api/outstanding/sync/route.ts`