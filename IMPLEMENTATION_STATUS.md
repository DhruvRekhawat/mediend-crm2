# Insurance Workflow UX Redesign - Implementation Status

## ✅ Completed

### Phase 1: Schema & Data Model Updates
- ✅ Added `CaseStage` enum with all required stages
- ✅ Added `caseStage` field to Lead model with default `NEW_LEAD`
- ✅ Extended PreAuthorization model with BD request fields:
  - `requestedHospitalName`
  - `diseaseDescription`
  - `diseaseImages` (JSON)
  - `preAuthRaisedAt`
  - `preAuthRaisedById`
- ✅ Added `PreAuthPDF` model for PDF version tracking
- ✅ Added `AdmissionRecord` model for admission tracking
- ✅ Added `CaseStageHistory` model for audit trail
- ✅ Updated User relations for new models
- ✅ Updated NotificationType enum with new notification types

### Phase 2: API Routes
- ✅ Created `/api/leads/[id]/raise-preauth` - BD raises pre-auth request
- ✅ Created `/api/leads/[id]/initiate` - BD marks patient as admitted
- ✅ Created `/api/leads/[id]/discharge` - BD marks discharge
- ✅ Created `/api/leads/[id]/preauth-pdf` - Generate pre-auth PDF
- ✅ Created `/api/leads/[id]/stage-history` - Get stage transition history
- ✅ Updated `/api/kyp/pre-auth` - Now updates caseStage to PREAUTH_COMPLETE
- ✅ Updated `/api/kyp/submit` - Now sets caseStage to KYP_PENDING and creates history

### Phase 3: UI Components
- ✅ Created `StageProgress` component - Visual progress bar
- ✅ Created `MultiStepForm` component - Generic multi-step form wrapper
- ✅ Created `PreAuthRaiseForm` component - Multi-step form for BD to raise pre-auth
- ✅ Created `InitiateForm` component - Form for BD to admit patient
- ✅ Created `ActivityTimeline` component - Shows stage history

### Phase 4: Page Redesigns
- ✅ Created `/app/bd/dashboard/page.tsx` - BD dashboard with stage-based filters
- ✅ Updated `/app/patient/[leadId]/page.tsx` - Added stage progress and activity timeline
- ✅ Updated `/app/patient/[leadId]/pre-auth/page.tsx` - Role-based views (BD vs Insurance)

### Phase 5: Permission System
- ✅ Created `lib/case-permissions.ts` with permission helper functions:
  - `canEditFinancials`
  - `canRaisePreAuth`
  - `canCompletePreAuth`
  - `canInitiate`
  - `canMarkDischarge`
  - `canGeneratePDF`
  - `canViewStageHistory`
  - `canEditKYP`
  - `canEditDischargeSheet`

### Phase 6: PDF Generation
- ✅ Created API endpoint for PDF generation
- ⚠️ PDF template implementation pending (placeholder URL used)

### Phase 7: Notifications & Activity
- ✅ Notifications created for all stage transitions:
  - KYP_SUBMITTED
  - PREAUTH_RAISED
  - PREAUTH_COMPLETE
  - INITIATED
  - DISCHARGED
- ✅ Stage history tracking implemented

### Phase 8: Migration Script
- ✅ Created `scripts/migrate-case-stages.ts` to migrate existing data

## ⚠️ Pending/Incomplete

### Phase 4: Page Updates
- ✅ Insurance Dashboard (`app/insurance/dashboard/page.tsx`) - Updated with work queues by stage
- ✅ Pre-Auth Complete Form - Converted to multi-step wizard
- ✅ Discharge Form - Converted to multi-step wizard

### Phase 6: PDF Generation
- ⚠️ PDF template implementation needed (`lib/pdf-templates/preauth-template.tsx`)
- ⚠️ PDF generation service implementation (`lib/pdf-generator.ts`)
- Note: API endpoint exists but uses placeholder URL

### Additional Updates Needed
- ✅ Updated KYP API to return full preAuth data including BD request fields and caseStage
- ⚠️ Set `KYP_COMPLETE` stage when Insurance first reviews KYP (optional enhancement - current flow works without it)
- ✅ Updated discharge form to use multi-step wizard
- ✅ Updated insurance dashboard to show work queues by stage

## 📋 Next Steps

1. **Run Prisma Migration**
   ```bash
   npx prisma migrate dev --name add_case_stage_workflow
   ```

2. **Run Data Migration Script**
   ```bash
   npm run migrate:case-stages
   ```
   or `bun run migrate:case-stages`, or `tsx scripts/migrate-case-stages.ts`

3. **Update Insurance Dashboard**
   - Add work queues based on caseStage
   - Show KYP review queue, pre-auth raised queue, etc.

4. **Implement PDF Generation**
   - Create PDF template using `@react-pdf/renderer` or `puppeteer`
   - Implement PDF generation service
   - Upload generated PDFs to S3

5. **Update Forms**
   - Convert Pre-Auth Complete Form to multi-step wizard
   - Convert Discharge Form to multi-step wizard

6. **Testing**
   - Test BD workflow: KYP → Raise Pre-Auth → Admit → Discharge
   - Test Insurance workflow: Review KYP → Complete Pre-Auth → Generate PDF → Fill Discharge
   - Test permissions at each stage
   - Test notifications

## 🔧 Configuration Notes

- All new API routes follow existing patterns
- Permission checks are implemented in API routes
- Stage transitions are logged in `CaseStageHistory`
- Notifications are sent for all stage changes
- Mobile responsiveness should work with existing UI components

## 📝 API Endpoints Summary

### New Endpoints
- `POST /api/leads/[id]/raise-preauth` - BD raises pre-auth
- `POST /api/leads/[id]/initiate` - BD admits patient
- `POST /api/leads/[id]/discharge` - BD marks discharge
- `POST /api/leads/[id]/preauth-pdf` - Generate PDF
- `GET /api/leads/[id]/stage-history` - Get stage history

### Updated Endpoints
- `POST /api/kyp/submit` - Now sets caseStage and creates history
- `POST /api/kyp/pre-auth` - Now updates caseStage to PREAUTH_COMPLETE
- `GET /api/leads/[id]` - Now includes caseStage and full preAuth data
