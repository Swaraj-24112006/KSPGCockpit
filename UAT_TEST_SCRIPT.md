# KSPGCockpit — Enterprise User Acceptance Testing (UAT) Script

**System:** KSPGCockpit — Smart Manufacturing & Quality Operations Intelligence Platform  
**Target Release:** Production v1.0 / Release Candidate  
**Document Version:** 1.0.0  
**Test Environment:** Staging / Local Sandbox (`http://localhost:5173` & `http://localhost:8000/api/v1/`)  
**Target Date:** September 2026  

---

## 1. Document Control & Execution Summary

| Attribute | Specification |
|:---|:---|
| **Platform Name** | KSPGCockpit (Kaizen Continuous Improvement & PPSR 8D/PSQ Core) |
| **Test Window** | 3 - 5 Working Days |
| **UAT Coordinator** | Quality Lead / Lead QA Engineer |
| **Business Owners** | Plant Head, Head of Quality Assurance, Operations & Mini-Factory Leads |
| **Supported Browsers** | Google Chrome (v120+), Microsoft Edge (v120+), Firefox (v120+) |
| **Screen Resolution** | Recommended: Full HD 1920x1080 (Minimum: 1366x768, Responsive Tablet/Desktop) |
| **Default Test Credentials** | `Test@1234` (Applicable across all pre-provisioned persona accounts) |

---

## 2. Scope, Entry & Exit Criteria

### 2.1 Test Scope
- **In-Scope:**
  1. Authentication, Role-Based Access Control (RBAC), Mini-Factory isolation, and OTP Password Reset.
  2. Global Operations Dashboard & Cross-Module KPI counters.
  3. Kaizen Continuous Improvement Lifecycle:
     - Multi-stage Idea Submission (P/Q/C/D/S/M benefits, before/after evidence photos, INR cost calculation).
     - Local & Backend Drafts Auto-Save / Resume / Deletion.
     - Review Board (Managerial Approval, Rejection, Return for Rework, Classification).
     - 5M & Safety Impact Assessment modal & Open Impact Action Item Tracker.
     - 6-Point Shop Floor Verification Audit & Final Administrative Closure.
     - Spreadsheet Filtering, Full-text Search, A4 Digital Inspect & Presentation Modes.
  4. Practical Problem Solving Report (PPSR — 8D & Shainin PSQ):
     - 5-Step 8D Problem Creation Wizard (D1-D5, containment actions, 6M Ishikawa, 5-Whys, Yokoten).
     - Shainin Component Search & PSQ Elimination Tree (Stages 0, 1, 2 and Standard Worksheets).
     - Asynchronous WeasyPrint A4 Vector PDF Generation and Download.
     - Presentation Mode with live feedback & PPSR Spreadsheet Review.
  5. Cross-Functional Team (CFT) Monthly Awards Board (Evaluation session, star voting, leaderboard).
  6. Supplementary Modules (Red Flags defect tracking, 5S Shopfloor Audits, Safety Incident Logging).
  7. SuperAdmin Management Console (User CRUD, Mini-Factory reallocation, RBAC role assignment).

- **Out-of-Scope:**
  - Automated load and stress testing > 5,000 requests/second (handled in SIT/Performance phase).
  - Direct hardware PLC / SCADA serial driver communications.

### 2.2 Entry Criteria (Prerequisites)
- [ ] Django backend server running and healthy (`GET /api/v1/health/` returns `200 OK` for DB and Redis).
- [ ] Frontend React application running without Vite build/transpile errors on port 5173.
- [ ] Test database seeded with baseline users using `python create_test_users.py`.
- [ ] Celery worker running (`celery -A config worker -l info -P solo`) for PDF rendering tasks.
- [ ] Sample JPEG/PNG image files available for before/after evidence attachments (< 5MB each).

### 2.3 Exit & Sign-off Criteria
- **Pass Rate:** 100% of Severity 1 (Blocker) and Severity 2 (Critical) test cases must Pass.
- **Defects:** Zero open Severity 1 or 2 defects; all Severity 3 (Major) defects must have documented workarounds approved by the Plant Quality Lead.
- **Sign-off:** Formal sign-off completed by Business Owners and QA Lead.

---

## 3. Pre-configured Test Accounts & Personas

All accounts are pre-seeded in the database with the default password: **`Test@1234`**

| Persona ID | Username | Employee ID | Full Name | Department | Mini-Factory (MF) | Primary Role |
|:---|:---|:---|:---|:---|:---|:---|
| **PER-01** | `operator_john` | `EMP-101` | John Operator | Production | **MF1** | Shop Floor Initiator |
| **PER-02** | `reviewer_jane` | `EMP-102` | Jane Quality | Quality Assurance | **MF1** | Reviewer / Committee Member |
| **PER-03** | `coord_mike` | `EMP-103` | Mike Coordinator | Operations | **MF1** | Kaizen Lead / Coordinator |
| **PER-04** | `admin_sarah` | `EMP-104` | Sarah Admin | Plant Management | **Central** | Plant Admin / SuperAdmin |
| **PER-05** | `operator_bob` | `EMP-105` | Bob Assembler | Assembly Line | **MF2** | MF2 Initiator |
| **PER-06** | `coord_priya` | `EMP-106` | Priya Sharma | Production | **MF2** | MF2 Coordinator |
| **PER-07** | `committee_rahul` | `EMP-107` | Rahul Verma | Maintenance | **MF3** | MF3 Committee Member |

---

## 4. Detailed Test Scripts by Module

```
Status Options: [ ] PASS   [ ] FAIL   [ ] BLOCKED   [ ] PENDING
Severity Levels: S1 (Blocker) | S2 (Critical) | S3 (Major) | S4 (Cosmetic)
```

---

### MODULE 1: Authentication, RBAC & Profile Management

#### Test Case ID: UAT-AUTH-001 — Multi-Factory Persona Login & Session Persistence
- **Severity:** S1 (Blocker)
- **Actor:** `operator_john` (PER-01)
- **Preconditions:** User is logged out and browser is at `http://localhost:5173`.
- **Test Steps:**
  1. In the login dialog, input Username: `operator_john` and Password: `Test@1234`.
  2. Select Mini-Factory: `MF1` (or leave default if auto-populated).
  3. Click the **Login** button.
  4. Refresh the web page using browser F5.
- **Expected Result:**
  - Login succeeds immediately; JWT tokens are securely stored in `localStorage`.
  - User is greeted with the Operator workspace; user badge displays `John Operator` and `MF1`.
  - On page refresh, user session persists without prompting for re-login.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-AUTH-002 — Invalid Credentials & Throttling Feedback
- **Severity:** S2 (Critical)
- **Actor:** Unauthenticated User
- **Preconditions:** Application is on the login page.
- **Test Steps:**
  1. Enter Username: `operator_john` and an incorrect Password: `WrongPassword999`.
  2. Click **Login**.
  3. Attempt 5 rapid consecutive failed logins.
- **Expected Result:**
  - Informative toast error: "Invalid credentials. Please verify your employee ID or password."
  - Rate limiting / security lock responds gracefully with HTTP 429 after repeated abusive attempts without unhandled frontend crashes.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-AUTH-003 — Zero-Plaintext Forgot Password OTP Flow
- **Severity:** S2 (Critical)
- **Actor:** `reviewer_jane` (PER-02)
- **Preconditions:** User is on login page.
- **Test Steps:**
  1. Click **"Forgot Password?"** link on the login card.
  2. Enter Employee Email: `reviewer.jane@kspg.com` and submit.
  3. Retrieve generated 6-digit OTP from server log/email.
  4. Enter OTP and specify New Password: `NewSecurePassword@2026`.
  5. Complete reset and log in using the newly updated password.
- **Expected Result:**
  - System verifies OTP securely; password hash updates in PostgreSQL.
  - User successfully logs in with the new password; old password no longer works.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-AUTH-004 — RBAC Navigation Tab Guarding
- **Severity:** S1 (Blocker)
- **Actor:** `operator_john` (Role: Initiator) vs `admin_sarah` (Role: Admin)
- **Preconditions:** Logged in as `operator_john`.
- **Test Steps:**
  1. While logged in as `operator_john`, inspect visible sidebar/sub-navigation tabs under Kaizen.
  2. Attempt to click or manually navigate to Review Board / Committee Approval / SuperAdmin Console.
  3. Log out and log in as `admin_sarah`.
  4. Inspect visible modules and admin console.
- **Expected Result:**
  - For `operator_john`: Reviewer-only and Admin tabs are hidden or disabled. If manually addressed, route guard automatically falls back to safe default dashboard.
  - For `admin_sarah`: Full administrative suite, Review Board, Impact Tracker, and SuperAdmin Console are accessible.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

### MODULE 2: Kaizen Continuous Improvement

#### Test Case ID: UAT-KZ-001 — End-to-End Kaizen Submission with Photo Upload & Benefit Calculations
- **Severity:** S1 (Blocker)
- **Actor:** `operator_john` (PER-01)
- **Preconditions:** Logged in; Kaizen module selected -> **"Log Kaizen" / "Kaizen Form"** tab.
- **Test Steps:**
  1. **Stage 1 (General Information):**
     - Plant: `Pune Main Plant`, Mini-Factory: `MF1`, Department: `Production`.
     - Kaizen Title: `"Pneumatic Cylinder Auto-Ejector for Milling Machine #4"`.
     - Problem Statement: `"Manual part ejection causes 12 seconds delay and repetitive ergonomic strain."`.
     - Root Cause: `"No automated mechanism existed; cycle relied completely on operator manual reach."`.
  2. **Stage 2 (Solution & Evidence Photos):**
     - Countermeasure: `"Installed compact pneumatic cylinder with sensor-triggered blow-off."`.
     - Upload **Before Photo** (Select valid JPEG/PNG).
     - Upload **After Photo** (Select valid JPEG/PNG).
  3. **Stage 3 (Benefits Assessment):**
     - Check categories: `[x] Productivity`, `[x] Quality`, `[x] Cost (INR)`, `[x] Safety`.
     - Productivity metric: `"Cycle time reduced from 45 sec to 33 sec (26% improvement)"`.
     - Safety metric: `"Eliminated ergonomic wrist strain and pinch-point risk"`.
  4. **Stage 4 (Financial Impact & Investment):**
     - Implementation Cost: `₹ 8,500`.
     - Projected Annual Savings: `₹ 1,20,000`.
     - System auto-calculates Net Savings and Payback Period.
  5. Click **"Submit Kaizen"**.
- **Expected Result:**
  - Progress bar reflects step completion across the 4 stages.
  - Form validates all mandatory inputs.
  - Atomic Kaizen Serial Number is generated (Format: `KZ-YYYY-NNN`, e.g., `KZ-2026-001`).
  - Toast confirmation appears: "Kaizen submitted successfully".
  - Status is marked as `Pending` / `Submitted`.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-KZ-002 — Draft Auto-Save, Offline Resilience & Edit-Resume
- **Severity:** S2 (Critical)
- **Actor:** `operator_john` (PER-01)
- **Preconditions:** User is on the Kaizen Form.
- **Test Steps:**
  1. Enter Title: `"Draft Hydraulic Valve Sensor Upgrade"`.
  2. Fill Stage 1 and select 1 benefit checkbox in Stage 2.
  3. Do NOT click Submit. Wait 5 seconds or click **"Save as Draft"**.
  4. Navigate away to "Global Dashboard", then navigate back to **"My Drafts"**.
  5. Verify the draft item is listed with correct timestamp and title.
  6. Click **"Resume / Edit"** on the draft item.
  7. Complete remaining fields and click **"Submit Kaizen"**.
- **Expected Result:**
  - Form state is accurately restored with previously entered values intact.
  - Submitting successfully creates an active Kaizen and removes or marks the draft as finalized.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-KZ-003 — Review Board: Classification, Approval & Rework Workflows
- **Severity:** S1 (Blocker)
- **Actor:** `reviewer_jane` (PER-02, Reviewer / Committee)
- **Preconditions:** A Kaizen with status `Pending` exists from UAT-KZ-001.
- **Test Steps:**
  1. Log in as `reviewer_jane` and navigate to **Kaizen Module -> Review Board**.
  2. Locate the submitted Kaizen `KZ-2026-001`.
  3. Click **"Review / Evaluate"**.
  4. **Scenario A (Return for Rework):**
     - Click **"Return for Rework"**, enter Reason: `"Please attach clearer post-installation photo showing safety guard."`.
     - Verify status transitions to `Rework`.
     - Log in as `operator_john`, edit the rework item, update photo, and resubmit.
  5. **Scenario B (Approval & Classification):**
     - As `reviewer_jane`, open the resubmitted Kaizen.
     - Select Classification: `Kaizen` (or `Good Point`).
     - Enter Manager Remarks: `"Approved. Excellent shop-floor safety enhancement."`.
     - Click **"Approve Kaizen"**.
- **Expected Result:**
  - Status updates to `Approved` (or `Good Point`).
  - Immutable audit history (`WorkflowHistory`) records reviewer name, timestamp, and comments.
  - Approved item appears in the Kaizen Spreadsheet register and CFT eligibility pool.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-KZ-004 — 5M / Safety / PFMEA Impact Assessment & Open Action Tracking
- **Severity:** S2 (Critical)
- **Actor:** `coord_mike` (PER-03, Coordinator)
- **Preconditions:** Approved Kaizen exists.
- **Test Steps:**
  1. Navigate to **Kaizen Module -> Review Board / Impact Assessment**.
  2. Click **"Assess Impact"** on the approved Kaizen.
  3. In the 5M Impact Matrix, toggle:
     - **Man:** Training required for night shift operators (`[x] Yes`).
     - **Machine:** Preventative maintenance schedule update required (`[x] Yes`).
     - **Method / PFMEA:** PFD/Control Plan update required (`[x] Yes`).
  4. Add an Action Item:
     - Description: `"Update Work Instruction Sheet (WIS) and train 8 operators"`.
     - Assignee: `John Operator`, Target Date: 7 days from today.
  5. Click **"Save Impact Assessment"**.
  6. Navigate to **"Open Impact Tracker"** tab.
  7. Locate the newly logged action item, click **"Mark Complete"**, attach verification note, and submit.
- **Expected Result:**
  - Impact assessment persists with selected 5M categories.
  - Open action item appears in the plant-wide Open Impact Tracker.
  - Marking complete updates progress percentage and clears pending closure blockers.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-KZ-005 — 6-Point Shop Floor Verification Audit & Final Closure
- **Severity:** S2 (Critical)
- **Actor:** `coord_mike` (PER-03) or `admin_sarah` (PER-04)
- **Preconditions:** Kaizen is Approved and all critical impact actions are addressed.
- **Test Steps:**
  1. Open Kaizen detail and click **"Conduct Verification / Closure"**.
  2. Complete the 6-Point Verification Checklist:
     - [x] Countermeasure physically in place on the machine.
     - [x] Sustained performance observed over 30 production shifts.
     - [x] Standard operating procedure (SOP/WIS) updated & displayed.
     - [x] Operators trained on modified work method.
     - [x] No adverse secondary safety or quality effects observed.
     - [x] Actual cost savings verified with Finance ledger.
  3. Enter Verified Annual Cost Savings: `₹ 1,18,500`.
  4. Select Closure Status: `Closed & Verified`.
  5. Click **"Confirm Final Closure"**.
- **Expected Result:**
  - Kaizen lifecycle status moves to `Closed`.
  - Financial figures freeze as audited realized savings.
  - Closure badge and verified audit stamp appear on the Kaizen sheet.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-KZ-006 — Kaizen Spreadsheet Register, Full-Text Search & CSV Export
- **Severity:** S3 (Major)
- **Actor:** Any Authenticated User (`reviewer_jane`)
- **Preconditions:** Minimum 5 Kaizens logged in system.
- **Test Steps:**
  1. Navigate to **Kaizen Module -> Spreadsheet Register**.
  2. Use the Search bar to search by keyword `"Cylinder"`.
  3. Filter by Status: `Approved`, Mini-Factory: `MF1`.
  4. Verify table instantaneously filters to matching records.
  5. Click the column headers (e.g., Date, Savings INR) to test ascending/descending sorting.
  6. Click **"Export to CSV / Excel"** button.
- **Expected Result:**
  - Filter and search react within < 300ms.
  - CSV file downloads successfully with correctly formatted columns, dates, and currency values.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

### MODULE 3: PPSR (Practical Problem Solving Report / 8D & Shainin PSQ)

#### Test Case ID: UAT-PPSR-001 — 5-Step 8D Creation Wizard (D1 through D5)
- **Severity:** S1 (Blocker)
- **Actor:** `coord_mike` (PER-03, Quality Lead)
- **Preconditions:** PPSR Module selected -> **"New PPSR" / Wizard**.
- **Test Steps:**
  1. **Step D1 (Team & Problem Setup):**
     - Title: `"Excessive Porosity in Aluminum Engine Block Casting"`.
     - Part Name: `Cylinder Block 2.0L`, Part Number: `CB-20-AL-901`.
     - Defect Type: `Porosity / Blow Hole`, Severity: `Critical`.
     - Assign Team Lead: `Mike Coordinator`, Members: `Jane Quality, John Operator`.
  2. **Step D2 (Containment Actions):**
     - Action: `"100% X-ray inspection on quarantine batch of 450 castings"`.
     - Responsible: `Jane Quality`, Status: `Implemented`.
     - Defect Evidence: Upload defect sample image.
  3. **Step D3 (Root Cause Analysis — 6M Ishikawa & 5-Whys):**
     - Select Primary Category: `Machine / Process Parameters`.
     - Enter 5-Whys Chain:
       - *Why 1:* High gas porosity in upper deck.
       - *Why 2:* Trapped air during high-pressure die injection.
       - *Why 3:* Chill vent blocked with residual aluminum flash.
       - *Why 4:* Preventative maintenance vent cleaning frequency was weekly instead of daily.
       - *Why 5 (Root Cause):* Lack of sensorized back-pressure monitoring on vent block.
  4. **Step D4 (Permanent Corrective & Preventative Actions):**
     - Countermeasure: `"Install digital differential pressure gauge with auto-purge blast after every 25 shots"`.
     - Target Date: 14 days, Status: `In Progress`.
  5. **Step D5 (Yokoten / Standardization & Closure):**
     - SOP Document Updated: `SOP-HPDC-VENT-04`.
     - Read-Across (Yokoten) Lines: `Line 2 & Line 3 Die Casting Cells`.
  6. Click **"Generate & Save PPSR Report"**.
- **Expected Result:**
  - Atomic PPSR identifier generated (Format: `BE-YYYY-NNN`, e.g., `BE-2026-001`).
  - Report saves with all 5 disciplines recorded.
  - Interactive Ishikawa fishbone diagram correctly binds the 5-Whys chain under the designated 6M category.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-PPSR-002 — Shainin Component Search & PSQ Elimination Tree
- **Severity:** S2 (Critical)
- **Actor:** `coord_mike` (PER-03)
- **Preconditions:** PPSR report `BE-2026-001` opened in detail view.
- **Test Steps:**
  1. In the PPSR detail view, switch to the **"PSQ / Shainin Elimination Tree"** tab.
  2. Initialize Stage 0 (Green Y definition):
     - Parameter: `"Porosity Volume % (Target < 0.5%)"`.
  3. Create Branch Stage 1 (Sub-Assembly / Process Parameters):
     - Branch A: `"Melt Temperature (680°C vs 720°C)"`.
     - Branch B: `"Plunger Injection Speed (Stage 2 Velocity)"`.
  4. Run Paired Comparison / Elimination:
     - Mark Melt Temperature as `Eliminated (P > 0.05)`.
     - Mark Plunger Injection Speed as `Red X Candidate / Confirmed Root Cause`.
  5. View the Standard Worksheet table and visual tree graph renderer.
  6. Click **"Save PSQ Tree"**.
- **Expected Result:**
  - Tree visual updates dynamically with color-coded nodes (Red X = Red, Eliminated = Grey/Green).
  - Standard worksheet reflects mathematical elimination rows accurately.
  - Elimination state embeds seamlessly into the parent PPSR record.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-PPSR-003 — Asynchronous WeasyPrint A4 Vector PDF Generation
- **Severity:** S1 (Blocker)
- **Actor:** `coord_mike` or `reviewer_jane`
- **Preconditions:** Celery worker active; PPSR report `BE-2026-001` exists with evidence photos.
- **Test Steps:**
  1. Open PPSR report `BE-2026-001`.
  2. Click **"Export A4 PDF"** (or "Generate Formal 8D Sheet").
  3. Observe loading progress indicator / polling state.
  4. Once notification confirms generation, click **"Download PDF"**.
  5. Open the downloaded PDF in Adobe Reader or Chrome PDF viewer.
- **Expected Result:**
  - Backend dispatches asynchronous Celery task without HTTP timeout or gateway 504.
  - Client polls task status until completed (`SUCCESS`).
  - PDF layout is exactly A4 industrial format with:
    - KSPG header and ISO compliance footer.
    - D1-D5 sections neatly aligned in tables.
    - Embedded Ishikawa diagram and high-resolution defect images.
    - Team signatures and digital timestamp watermark.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-PPSR-004 — PPSR Full-Screen Presentation Mode & Live Meeting Feedback
- **Severity:** S3 (Major)
- **Actor:** `coord_mike` (Presenter) and `reviewer_jane` (Attendee)
- **Preconditions:** Active PPSR report.
- **Test Steps:**
  1. In the PPSR detail view, click **"Presentation Mode"**.
  2. Verify full-screen presentation slides open (Cover, D1 Team, D2 Defect, D3 Ishikawa, D4 Actions, D5 Yokoten).
  3. Navigate through slides using Keyboard Arrow Keys (`←` / `→`) or on-screen controls.
  4. In the Meeting Feedback panel on the right drawer, enter an action note: `"Finance team to verify scrap savings by Friday"`.
  5. Click **"Log Meeting Note"** and exit presentation mode.
- **Expected Result:**
  - Slides render smoothly without layout truncation or overflow.
  - Live feedback is appended to the PPSR Meeting Minutes log.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

### MODULE 4: Cross-Functional Team (CFT) Monthly Awards Board

#### Test Case ID: UAT-CFT-001 — Monthly Award Cycle Initiation & Candidate Nomination
- **Severity:** S2 (Critical)
- **Actor:** `admin_sarah` (PER-04, Plant Admin)
- **Preconditions:** Multiple approved Kaizens exist for the current month.
- **Test Steps:**
  1. Navigate to **CFT Awards Module -> Award Cycle Manager**.
  2. Click **"Initiate New Cycle"**:
     - Month/Year: `September 2026`.
     - Evaluation Criteria: Cost, Innovation, Safety, Replicability.
  3. Select eligible approved Kaizens and PPSR reports into the nominee roster.
  4. Click **"Open Voting Session"**.
- **Expected Result:**
  - Active cycle is created with status `Voting Open`.
  - Nominees populate the evaluation board for all assigned CFT committee members.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-CFT-002 — Star Rating Voting & Live Leaderboard Compilation
- **Severity:** S2 (Critical)
- **Actor:** `reviewer_jane` (PER-02, Committee Member)
- **Preconditions:** Voting session is open.
- **Test Steps:**
  1. Log in as `reviewer_jane` and open **CFT Awards Module -> Live Evaluation Board**.
  2. For Nominee `KZ-2026-001`:
     - Cast Star Rating: `5 Stars` (Safety & Ergonomics).
     - Cast Star Rating: `4 Stars` (Cost & Productivity).
     - Add Reviewer Comment: `"Standout safety initiative with high shop-floor adoption."`.
  3. Click **"Submit Evaluation"**.
  4. Attempt to cast a second vote on the same Kaizen with the same user account.
- **Expected Result:**
  - Rating submits successfully; live average score and star count recalculate on the leaderboard.
  - Duplicate vote prevention prevents duplicate submissions by the same member in the same cycle.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-CFT-003 — Award Finalization & Monthly Recognition Publication
- **Severity:** S2 (Critical)
- **Actor:** `admin_sarah` (PER-04)
- **Preconditions:** Voting session has received committee votes.
- **Test Steps:**
  1. Open the September 2026 Evaluation Board as `admin_sarah`.
  2. Click **"Close Voting & Finalize Awards"**.
  3. Allocate Category Trophies:
     - **1st Place (Gold Kaizen of the Month):** Nominee with highest weighted score.
     - **Best Safety Innovation:** Nominee with highest safety sub-score.
  4. Confirm publication to Plant-Wide Leaderboard.
- **Expected Result:**
  - Cycle status moves to `Completed / Awarded`.
  - Award badges appear on the respective Kaizen records.
  - The Global Dashboard highlights monthly winners on the digital showcase banner.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

### MODULE 5: Supplementary Modules (Red Flags, 5S & Safety)

#### Test Case ID: UAT-SUP-001 — Red Flag Defect Escalation & Resolution Lifecycle
- **Severity:** S3 (Major)
- **Actor:** `operator_john` (Initiator) & `coord_mike` (Resolver)
- **Preconditions:** Red Flag module accessible.
- **Test Steps:**
  1. As `operator_john`, open **Red Flag Module -> "Raise Red Flag"**.
  2. Enter Defect: `"Coolant pressure gauge fluctuating beyond permissible tolerance (+/- 15%)"`.
  3. Machine: `CNC-04`, Mini-Factory: `MF1`, Severity: `High`. Click **Submit**.
  4. As `coord_mike`, locate the raised Red Flag.
  5. Assign maintenance technician, input Containment note: `"Filter cleared, pressure stabilized"`.
  6. Click **"Resolve Red Flag"**.
- **Expected Result:**
  - Red Flag counter increments on Global Dashboard immediately.
  - Resolving updates status to `Resolved` and clears the active alarm.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-SUP-002 — 5S Shop Floor Zone Audit & Radar Scoring
- **Severity:** S3 (Major)
- **Actor:** `reviewer_jane` (Auditor)
- **Preconditions:** 5S Module opened.
- **Test Steps:**
  1. Click **"New 5S Audit"**.
  2. Select Area: `MF1 Machine Shop Zone B`.
  3. Score the 5 Pillars (1-5 scale):
     - **1S (Sort / Seiri):** 4
     - **2S (Set in Order / Seiton):** 5
     - **3S (Shine / Seiso):** 4
     - **4S (Standardize / Seiketsu):** 4
     - **5S (Sustain / Shitsuke):** 3
  4. Upload 1 shopfloor audit photo and click **"Submit 5S Audit"**.
- **Expected Result:**
  - Overall score calculated (80% / 4.0 avg).
  - 5S Radar / spider chart updates visually with the pillar breakdown.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

### MODULE 6: SuperAdmin Administration & Data Integrity

#### Test Case ID: UAT-ADM-001 — User Account Provisioning, Role Mutation & Mini-Factory Reallocation
- **Severity:** S1 (Blocker)
- **Actor:** `admin_sarah` (PER-04, SuperAdmin)
- **Preconditions:** Logged in; click **"SuperAdmin Console"** on header/sidebar.
- **Test Steps:**
  1. In the User Management table, click **"Add New Employee"**.
  2. Enter Username: `operator_test99`, Employee ID: `EMP-999`, Email: `test99@kspg.com`.
  3. Set Department: `Logistics`, Designation: `Material Handler`, Mini-Factory: `MF2`.
  4. Assign Role: `Initiator`, Kaizen Module Role: `Initiator`.
  5. Save user, then search for `EMP-999` in the list.
  6. Click **"Edit Role"**, change Mini-Factory to `MF1` and Role to `Reviewer`. Click Save.
  7. Log in as `operator_test99` using `Test@1234` to verify updated permissions.
- **Expected Result:**
  - User is created without database constraint conflicts.
  - Role and Mini-Factory changes take effect immediately upon next login/token refresh.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

#### Test Case ID: UAT-ADM-002 — Plant-Wide KPI Aggregation & Cost Savings Verification
- **Severity:** S2 (Critical)
- **Actor:** `admin_sarah` (PER-04)
- **Preconditions:** Multiple Kaizens approved and closed with INR savings.
- **Test Steps:**
  1. Navigate to **"Global Operations Dashboard"**.
  2. Verify top KPI metric cards:
     - Total Kaizens Logged.
     - Total Approved & Implemented.
     - Verified Realized Savings (INR `₹`).
     - Active PPSR 8D Investigations.
  3. Filter dashboard by Mini-Factory: `MF1` vs `MF2` vs `Plant-Wide`.
- **Expected Result:**
  - Currency metrics match the sum of audited Kaizen savings.
  - Mini-Factory selector dynamically aggregates sub-totals accurately.
- **Execution Log:**
  - **Actual Result:** __________________________________________________
  - **Status:** `[ ] PASS` `[ ] FAIL` `[ ] BLOCKED` `[ ] PENDING`
  - **Tester Initials:** ________  **Date:** ____________

---

## 5. Defect Severity & Triage Guidelines

During UAT execution, any variance between **Expected Result** and **Actual Result** must be logged as a Defect according to the following severity matrix:

| Severity Level | Definition | SLA / Remediation Window | UAT Gate Impact |
|:---|:---|:---|:---|
| **S1 — Blocker** | System crash, data loss, unable to log in, inability to submit Kaizen/PPSR, security breach. | Immediate (< 4 hours) | **Halts UAT sign-off.** Must be resolved and retested. |
| **S2 — Critical** | Major business workflow broken (e.g., approval state machine stuck, PDF generation failing, incorrect financial savings tally). No viable workaround. | Within 24 hours | **Halts UAT sign-off.** |
| **S3 — Major** | Feature or calculation issue with an available manual workaround (e.g., specific filter glitch, non-critical chart rendering defect). | Within 48 hours | Permitted with Business Owner concession. |
| **S4 — Cosmetic** | Minor typo, spacing, alignment, font variance, or icon mismatch. | Next scheduled patch | Does not block sign-off. |

### Defect Logging Template
```text
Defect ID: DEF-UAT-XXX
Test Case ID: UAT-XXX-XXX
Severity: [S1 / S2 / S3 / S4]
Tested By: [Name]
Date: [YYYY-MM-DD]
Summary: Brief description of the bug.
Steps to Reproduce:
  1. ...
  2. ...
Expected Result: What should have occurred.
Actual Result: What actually occurred (include screenshot or console error).
Assigned Developer: [Name]
Resolution Status: [Open / In Fix / Retested / Closed]
```

---

## 6. UAT Execution Summary & Formal Sign-Off Matrix

### 6.1 Test Execution Scorecard

| Module | Total Tests | Passed | Failed | Blocked | Pass % |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Module 1: Auth & RBAC** | 4 | | | | |
| **Module 2: Kaizen Lifecycle** | 6 | | | | |
| **Module 3: PPSR 8D & PSQ** | 4 | | | | |
| **Module 4: CFT Awards Board** | 3 | | | | |
| **Module 5: Red Flags & 5S** | 2 | | | | |
| **Module 6: SuperAdmin & KPIs** | 2 | | | | |
| **TOTAL** | **21** | | | | |

---

### 6.2 Formal Stakeholder Acceptance Sign-Off

By signing below, the undersigned stakeholders certify that User Acceptance Testing for **KSPGCockpit v1.0** has been completed. The system satisfies the business requirements, security standards, and manufacturing operational workflows of the plant.

| Role / Title | Stakeholder Name | Signature | Date | Decision |
|:---|:---|:---|:---|:---:|
| **Plant Operations Head** | ________________________ | ____________________ | ____________ | `[ ] ACCEPTED` `[ ] CONDITIONAL` |
| **Head of Quality Assurance** | ________________________ | ____________________ | ____________ | `[ ] ACCEPTED` `[ ] CONDITIONAL` |
| **Lead QA / UAT Lead** | ________________________ | ____________________ | ____________ | `[ ] ACCEPTED` `[ ] CONDITIONAL` |
| **IT & Systems Lead** | ________________________ | ____________________ | ____________ | `[ ] ACCEPTED` `[ ] CONDITIONAL` |

**Conditional Acceptance Notes (if applicable):**  
____________________________________________________________________________________________________  
____________________________________________________________________________________________________  
