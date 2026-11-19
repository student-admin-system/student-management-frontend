# Student Management System: Software Requirements Specification

Version 2.0 · 19 November 2026 · Status: Approved

## 1. Introduction

**1.1 Purpose.** This document defines WHAT the system must do. It is the source of truth for requirements. Technical design belongs in the architecture documents.

**1.2 Scope.** A web-based administrative and financial system for one private teacher and his team: students, subjects and levels, lessons, attendance, billing (streamlined monthly subscription or per-lesson), charges, payments, balances and reports. It does not deliver lessons or learning content.

**1.3 Conventions.**

- Stable ID prefixes: BR (business rule), PERM (permission), FR (functional), EC (edge case), NFR (non-functional), OOS (out of scope).
- All requirements are confirmed. A tag such as [D3] points to a confirmed clarification in section 11. No open questions remain.
- Where an older and a newer decision conflicted, the newer decision is applied.

**1.4 Glossary.**

- **Combination:** a subject plus one of its levels. Each level belongs to exactly one subject. Students, lessons and fees attach to a combination.
- **Lesson:** uniquely identified by combination and date (BR-15). Groups do not exist. Lessons for a combination within a Gregorian month are dynamically numbered sequentially (1, 2, 3...) ordered by date ascending.
- **Attendance:** one student's single attendance at one lesson.
- **Billing state** of a student for a month: None / Unlocked, Locked Subscription, or Locked Per-Lesson.
- **Charge:** money a student owes (Subscription or Per-Lesson). **Payment:** money received against one charge. **Payment group:** the payments created by one confirmation or atomic attendance-payment. It is a grouping, not a document.
- **Void:** mark a record as mistaken. **Waive:** forgive an unpaid charge.
- **Outstanding balance:** the sum of a student's Unpaid charges.

## 2. Roles and permissions

Only two roles exist: Admin (the teacher) and Assistant.

| ID | Capability | Admin | Assistant |
| --- | --- | --- | --- |
| PERM-01 | Create and disable Assistant accounts, reset Assistant passwords | Yes | No |
| PERM-02 | Search students, view student information and contact numbers | Yes | Yes |
| PERM-03 | Register a new student | Yes | Yes |
| PERM-04 | Edit student information, status, subject/level | Yes | No |
| PERM-05 | Permanently delete a student | Yes | No |
| PERM-06 | Record attendance and atomic billing/payment (within BR-02, BR-18 rules) | Yes | Yes |
| PERM-07 | *(Superseded in v2.0 - Groups removed)* | — | — |
| PERM-08 | Void attendance | Any | Own entries, same day (Africa/Cairo), charge not Paid |
| PERM-09 | Record a payment (standalone subscription or settling unpaid charges) | Yes | Yes |
| PERM-10 | Void a payment group | Yes | No |
| PERM-11 | Waive a charge | Yes | No |
| PERM-12 | Reopen / reset a locked monthly billing method | Yes | No |
| PERM-13 | Manage subjects, levels, fees, settings | Yes | No |
| PERM-14 | See fees, unpaid charges and balance of the student being handled | Yes | Yes |
| PERM-15 | See business-wide financial figures, the full debtors list, financial summaries | Yes | No |
| PERM-16 | Reports and dashboard | All | Limited [D1] |
| PERM-17 | Permanently delete a subject and cascade all associated data (BR-27) | Yes | No |

"Same day" means the calendar day in the **Africa/Cairo** time zone on which the entry was recorded, not the lesson date.

## 3. Business rules

**BR-01 Subscription covers every lesson.** A Monthly Subscription covers every lesson the student attends in that month, with no exceptions. Lessons have no type. A Subscription student never receives per-lesson charges.

**BR-02 Streamlined Attendance & Billing Workflow.**
Monthly billing is streamlined into real-time operational workflows at attendance or via the payments screen:

1. **First attendance in a month:** When no monthly billing state exists yet for a student for the lesson's month, recording attendance requires selecting one of three billing actions (Admin or Assistant):
   - **a) Pay Per-Lesson Now (Default):** Locks the student's monthly billing method to `PER_LESSON`, records attendance, generates the Per-Lesson charge at the month's fee, and creates a payment record immediately marking the charge `PAID` within an atomic transaction.
   - **b) Attend Unpaid (Per-Lesson):** Locks the student's monthly billing method to `PER_LESSON`, records attendance, and creates an `UNPAID` Per-Lesson charge.
   - **c) Pay Monthly Subscription Now:** Locks the student's monthly billing method to `SUBSCRIPTION`, records attendance, creates the full Subscription charge for that month, and marks it `PAID` immediately with a payment record within an atomic transaction.
2. **Subsequent attendances in the same month:**
   - If the month is locked to **SUBSCRIPTION**: The lesson is covered automatically. No per-lesson charge is generated and no payment option appears. Attendance is recorded directly.
   - If the month is locked to **PER_LESSON**: The user selects between **Pay Per-Lesson Now (Default)** (charge generated as `PAID` with payment atomically) or **Attend Unpaid** (charge generated as `UNPAID`).
3. **Standalone Subscription Payment:** Outside of attendance recording, an Admin or Assistant can record a full Monthly Subscription payment on the payments screen for any student. If the student has no billing method for that month, this locks the month to `SUBSCRIPTION` and creates a `PAID` Subscription charge atomically. If already locked to Subscription and unpaid, it settles that charge.

**BR-03 Grouped payments.** The user selects one or more Unpaid charges of one student and confirms once. The system creates one payment record per selected charge. All share the same Received On date and entry timestamp and form a payment group whose total equals the sum of the selected charges. A charge has at most one active (non-voided) payment. Partial payments, overpayments, advance payments and carried-forward credit are not supported. A payment belongs to one student only.

**BR-04 Fee timing.** Fees change only from the first day of a month. Each charge uses the fee of the month it belongs to: a Per-Lesson charge uses the fee for the month of the lesson date, and a Subscription charge uses the fee for the billed month. A charge keeps its original amount and is never recalculated.

**BR-05 Void-based correction.** Mistaken attendance, charges and payments are voided, never deleted in ordinary operation. No reason is required and there is no restore function; a correction is a new entry where appropriate. Voided records stay in the student's history flagged Voided and are excluded from totals and balances. The only exception is permanent student deletion (BR-23).

**BR-06 Voiding attendance.** Voiding an attendance also voids its Per-Lesson charge when that charge is Unpaid or Waived. This frees the attendance slot so the student can be re-recorded if necessary (subject to BR-18). A Waived charge is voided together with the attendance, exactly like an Unpaid one.

**BR-07 Paid charges & Re-paying.** If a charge is Paid, the attendance cannot be voided until the payment group containing that payment is voided. Voiding a payment group marks its payments as voided (`isVoided = true`) and returns its charges to `UNPAID`. These charges can subsequently be settled again in a new payment group, while preventing duplicate active payments.

**BR-08 Reopening / Resetting a locked month.** A locked monthly billing method can only be reset/reopened by the Admin for an individual student. Reopening voids all unpaid or waived charges generated by that month's billing. If any charge in that month is Paid, its payment group must be voided first (BR-07). Attendance records remain intact. Resetting returns the month to an unlocked state, allowing the billing method to be established anew upon the next attendance or subscription payment.

**BR-09** *(Superseded by BR-02 streamlined workflow in v2.0)*.

**BR-10** *(Superseded by BR-02 streamlined workflow in v2.0)*.

**BR-11 Student status.**
1. A student is Active or Inactive. There is no Pause or Suspended status.
2. Active students appear in search and attendance entry.
3. Inactive students are hidden from default attendance search. Attendance cannot be recorded until reactivation.
4. Deactivation never deletes or changes records or outstanding charges.
5. An Active Subscription student owes the full monthly fee even with zero attendance. An Active Per-Lesson student owes only for recorded attendance.

**BR-12** *(Superseded by BR-02 streamlined workflow in v2.0)*.

**BR-13 Subject/level matching.** A student can attend only lessons of their own combination (resolved by finding the latest combination effective on or before the lesson month). No guest, visitor or cross-level attendance exists. A mismatch is blocked with an explicit error naming both combinations.

**BR-14 Level changes.** Only the Admin can change a student's combination. A change takes effect from the first day of a month: the current month, only if the student has no non-voided attendance and no non-voided charges in that month; otherwise the next month. The system keeps the student's combination history by month. Historical attendance, charges, payments and reports always show the combination applicable at the time. A student has exactly one combination in any month.

**BR-15 Lesson identity & Dynamic Numbering.**
1. There is at most one Lesson per combination per date, enforced by the system.
2. Groups are completely removed. A Lesson is identified solely by `(levelId, date)`.
3. Lessons for a combination within a Gregorian month are dynamically numbered sequentially (1, 2, 3...) ordered by date ascending.
4. A student can attend a Lesson at most once.

**BR-16** *(Superseded in v2.0 - Groups removed)*.

**BR-17 Fee management.**
1. Each combination has a Monthly Subscription Fee and a Per-Lesson Fee.
2. If no fees are set for a month, the most recent earlier month's fees carry forward automatically.
3. The Admin can set fees for the current or any future month, effective from the 1st.
4. A month's fees can be edited only while no non-voided charge exists for that combination in that month. After the first such charge, that month's fees are frozen and changes apply from a future month. Past months' fees can never be edited.
5. A new combination cannot be used until both fees are entered.
6. Attendance and charge generation are never blocked because fees were not entered (defaults to 0 if missing).

**BR-18 Attendance dates.**
1. Future dates are never allowed.
2. Backdating is allowed only within the current and the immediately preceding calendar month. Older dates are rejected for every role, with no Admin override.
3. Backdated attendance follows the billing rules in BR-02 (billing state is evaluated by the lesson date's month, not today's month).
4. The student must be Active when the attendance is recorded, and must satisfy BR-20.
5. Backdated lesson validation: A new lesson can only be created when recording attendance on today's date (Africa/Cairo). For any past date, a lesson must already exist for that combination on that date; if no lesson exists, recording attendance is blocked to prevent ghost lessons from shifting sequential monthly lesson numbering.

**BR-19 Scope of the date window.** The window (BR-18) restricts only the creation of new attendance. Voiding attendance, voiding payment groups, and reopening a month remain available to the Admin for any past month.

**BR-20 Status history.** The system keeps a dated history of every status change. Status changes take effect on the day they are performed (Cairo date) and cannot be backdated. Attendance is valid only on dates when the student was both enrolled and Active.

**BR-21 Charges.**
1. Exactly two charge types: Subscription and Per-Lesson.
2. Charge states: Unpaid, Paid, Voided, Waived.
3. There are no due dates, late fees, penalties or Overdue state.
4. A student has at most one non-voided Subscription charge per month.
5. Outstanding balance = sum of Unpaid charges. Waived charges are excluded from it and reported separately.

**BR-22 Waivers.** The Admin can waive an entire Unpaid charge. The state becomes Waived. No reason is required. Partial waivers, discounts and student-specific pricing are not supported. A Waived charge is treated like an Unpaid one under BR-06 and BR-08.

**BR-23 Permanent student deletion.** The Admin can permanently delete a student after explicit confirmation naming the student. Deletion removes all student data irreversibly. Student numbers are never reused (enforced via a non-decrementing PostgreSQL sequence). Lessons left without attendance are removed.

**BR-24 Payment dates.** Every payment has two values: the entry timestamp (automatic, not editable) and Received On (default today). Received On can be today or any day in the current or previous calendar month, never in the future.

**BR-25 Calendar and currency.** Months are Gregorian calendar months in Africa/Cairo. Currency is EGP with two decimal places; whole amounts are shown without trailing zeros (e.g. `100 ج.م`, not `100.00 ج.م`).

**BR-26 Student registration and number.** The student number is generated automatically from a dedicated database sequence, unique, sequential, never edited, never reused, and shown wherever the student appears.

**BR-27 Permanent subject deletion.** The Admin can permanently delete a subject after explicit confirmation. Deleting a subject cascades irreversibly: removing its levels, lessons, attendances, fees, combination histories, and associated charges/payments.

## 4. Key data (conceptual)

| Record | Retained data |
| --- | --- |
| Student | Number (from sequence), full name, normalizedName, enrollment date, student phone, guardian name, guardian phone, school, notes, current status |
| Combination history | Student, month (YYYY-MM), combination (level) |
| Status history | Student, status, effective date (YYYY-MM-DD) |
| Subject / Level | Name, active or inactive; each level belongs to one subject |
| Fee | Combination, month (YYYY-MM), subscription fee, per-lesson fee |
| Lesson | Combination and date (YYYY-MM-DD) (unique together) |
| Attendance | Student, lesson, recording user, entry timestamp, voided flag (unique on studentId, lessonId WHERE isVoided = false) |
| Billing state | Student, month, method (SUBSCRIPTION or PER_LESSON), isConfirmed, confirmedAt |
| Charge | Student, billed month, type, amount, source, attendanceId, status |
| Payment | Student, charge, amount, Received On, entry timestamp, recording user, payment group, voided flag |
| Settings | Teacher / business name |

## 5. Functional requirements

### 5.1 Accounts
- **FR-ACC-01** Two roles only (Admin, Assistant). One Admin account exists; several Assistant accounts are allowed.
- **FR-ACC-02** Admin creates and disables Assistant accounts and resets their passwords (PERM-01). The backend explicitly asserts that the target account is an Assistant.
- **FR-ACC-03** A disabled account cannot log in. Historical records remain attributed to it.

### 5.2 Students
- **FR-STU-01** Register a student: full name, enrollment date, combination, optional phones/notes.
- **FR-STU-02** Phone warning if both phones empty, allowing save.
- **FR-STU-03** Registration generates sequential student number via sequence (BR-26).
- **FR-STU-04** Search by name, student number, or phone. All student search results display the student's academic level/combination next to their name. Arabic normalization (أ/إ/آ -> ا, ة -> ه, ى -> ي, strip diacritics) is backed by an indexed `normalizedName` column. Attendance search returns active students of the lesson's combination (resolving latest combination on or before the lesson month).
- **FR-STU-05** Duplicate warning on similar names.
- **FR-STU-06** Student page shows profile, combination/status history, attendance, charges, payments grouped by payment group, totals, and outstanding balance.
- **FR-STU-07** Only Admin edits student info. Enrollment date locked if non-voided attendance or charges exist [D4].
- **FR-STU-08** Admin sets status (BR-11, BR-20) and changes combination (BR-14).
- **FR-STU-09** Admin permanently deletes student (BR-23, D3).

### 5.3 Academic structure and settings
- **FR-ACA-01** Admin manages subjects and levels. Cannot deactivate items with Active students.
- **FR-ACA-02** Admin manages fees (BR-17). Groups are completely removed.
- **FR-ACA-03** Teacher / business name is an editable setting.

### 5.4 Attendance
- **FR-ATT-01** The user selects date (default today) and combination once. Selections stay fixed while recording students.
- **FR-ATT-02** Lesson is created when its first valid attendance is saved, identified solely by `(levelId, date)`.
- **FR-ATT-03** Each rejection shows a clear message: student not Active; future date; before enrollment or inside Inactive period; older than previous month; combination mismatch; duplicate attendance in this lesson.
- **FR-ATT-04** Atomic attendance recording according to BR-02:
  - First attendance in month presents: Pay Per-Lesson Now (Default), Attend Unpaid, or Pay Monthly Subscription Now.
  - Subsequent attendances: directly recorded for Subscription; Pay Per-Lesson Now (Default) or Attend Unpaid for Per-Lesson.
- **FR-ATT-05** Concurrency protection: partial unique index on Attendance prevents duplicate active records for the same student on the same lesson.
- **FR-ATT-06** Void attendance (BR-06, BR-07, PERM-08). Assistants can void own entries on the same day in Africa/Cairo time zone if unpaid/waived.

### 5.5 Billing and charges
- **FR-BIL-01** Streamlined billing workflow embedded directly in attendance and payments (BR-02).
- **FR-BIL-02** Reopen / reset a locked month (Admin only, BR-08).
- **FR-BIL-03** Waive a charge (Admin only, BR-22).
- **FR-BIL-04** Charge model stores student, billed month, type, amount, source, and status.

### 5.6 Payments
- **FR-PAY-01** Grouped payments: select one or more Unpaid charges, confirm once, atomic payment group.
- **FR-PAY-02** Standalone Subscription payment: records full subscription for a month directly on the payments screen, locking billing state to Subscription (BR-02.3).
- **FR-PAY-03** Received On follows BR-24 (today or current/previous month).
- **FR-PAY-04** Payment stores amount, Received On, automatic entry timestamp, and recording user.
- **FR-PAY-05** Payment history shows payment groups with Received On, total, and recording user.
- **FR-PAY-06** Admin voids payment group as a whole (BR-07), returning charges to Unpaid for re-payment.
- **FR-PAY-07** Partial unique index on Payment prevents duplicate active payments while permitting re-payment after voiding.

### 5.7 Reports and exports
- **FR-RPT-01 Student Statement:** student information, level, attendance, charges, payments, outstanding balance.
- **FR-RPT-02 Debtors List:** students with Unpaid charges, amounts, oldest unpaid month, guardian phone (Admin only).
- **FR-RPT-03 Student Attendance Report:** Shows all lessons held for the student's combination while they were enrolled and Active, dynamically numbered sequentially per month (1, 2, 3...), marked as حاضر (Present) or غائب (Absent), along with summary counts of total attended and total missed lessons at the top. Lesson Attendance view shows attendees and absent list for a specific lesson [D7].
- **FR-RPT-04 Monthly Financial Summary:** charged, collected, waived and outstanding by subject and level [D2]. Combination is accurately resolved to prevent multi-counting. (Admin only).
- **FR-RPT-05 Daily Collections:** payments recorded per day, each showing the recording user. Assistants see only own entries [D1, D2].
- **FR-RPT-06 Exports:** PDF for Student Statement; CSV for Debtors List, Attendance Report, Monthly Financial Summary, and Daily Collections.

### 5.8 Dashboards
- **FR-DSH-01 Admin Dashboard:** attendance entered today, total outstanding, collections recorded today.
- **FR-DSH-02 Assistant Dashboard:** attendance they entered today, collections they recorded today.

## 6. Key workflows

**W-01 Attendance Recording.** User picks date and combination. Searches student (level shown). If student has no billing state for this month, user chooses: Pay Per-Lesson Now (Default), Attend Unpaid, or Pay Monthly Subscription Now. If already locked, records attendance directly (Subscription) or with payment option (Per-Lesson).

**W-02 Standalone Subscription Payment.** User goes to payments screen, selects student and month, and records full Monthly Subscription payment.

**W-03 Collect Payment for Unpaid Charges.** Find student, check unpaid charges, confirm once to create a payment group.

**W-04 Wrong-student attendance.** Void attendance (same day in Cairo time for Assistant if unpaid; Admin anytime). If paid, void payment group first. Re-record correctly.

**W-05 Reopening billing.** Admin resets locked month for a student. Unpaid/waived charges are voided; attendance is preserved.

## 7. Edge cases and validation

| ID | Case | Required behavior |
| --- | --- | --- |
| EC-01 | First attendance in month | Prompts billing choice (Pay Per-Lesson Now, Attend Unpaid, Pay Subscription Now) and locks month |
| EC-02 | Attendance dated in an Inactive period or before enrollment | Rejected with explanation |
| EC-03 | Subscription student attends nothing all month | Still owes the full subscription |
| EC-04 | Concurrent save or double-click on same lesson attendance | One succeeds; second blocked by partial unique index |
| EC-05 | Double tap or retry on payment | Blocked by partial unique index on active payment |
| EC-06 | Fee edit after the month's first charge exists | Rejected for that month; applies from a later month |
| EC-07 | Level change in a month with activity | Takes effect next month |
| EC-08 | Wrong attendance outside the window is voided | Correct student cannot be entered afterward |
| EC-09 | Student permanently deleted | All data and effect on totals disappear; student number not reused |
| EC-10 | Student registered with no phone number | Warning, then allowed |
| EC-11 | Disabled Assistant | Cannot log in; records remain |
| EC-12 | Assistant attempts an Admin-only action | Blocked with 403 Forbidden |
| EC-13 | Paid, Voided or Waived charge in a payment | Not selectable |
| EC-14 | Received On in the future or older than the previous month | Rejected |
| EC-15 | Deactivating a subject or level that has Active students | Blocked |

## 8. Non-functional requirements

- **NFR-01 Language & Timezone:** Fully Arabic, right-to-left, Gregorian dates, Western digits (0-9), EGP currency without trailing zeros for whole numbers, Africa/Cairo time zone for all calendar and same-day logic.
- **NFR-02 Devices:** Responsive for phones, tablets, and laptops with large touch targets.
- **NFR-03 Scale and speed:** Fast search (<1s), saving (<2s), reports (<5s).
- **NFR-04 Reliability & Concurrency:** Database partial unique indexes prevent duplicate active attendance and payments. All operations are atomic transactions.
- **NFR-05 Security:** HTTPS, bcrypt passwords, backend JWT authentication, role enforcement on all API routes, IP-based login rate limiting.
- **NFR-06 Privacy:** Minimum data collection; no public access.
- **NFR-07 Availability:** Independent hosting with persistent database.
- **NFR-08 Single teacher:** Single-tenant model with editable business name setting.
- **NFR-09 Data protection scope:** Backups outside release scope.
- **NFR-10 Simplicity:** No out-of-scope features.

## 9. Approved technical constraints

- **TC-01** Frontend (Next.js) and Backend (Node.js/Express) are two separate applications in a monorepo.
- **TC-02** Communication exclusively through REST API.
- **TC-03** Backend owns all business logic, validation, authentication, authorization, and database operations.
- **TC-04** Frontend never accesses the database directly.
- **TC-05** Monorepo structure with top-level `frontend/` and `backend/`.
- **TC-06** Straightforward, maintainable architecture with Prisma ORM and PostgreSQL.

## 10. Out of scope

- **OOS-01** Audit log or activity history.
- **OOS-02** External notifications (SMS, WhatsApp, email, push).
- **OOS-03** Data import and opening balances.
- **OOS-04** Printed/PDF receipts, receipt numbers, thermal printers.
- **OOS-05** Refund ledger, partial payments, overpayments, advance payments, student credit, discounts.
- **OOS-06** Family/sibling entity, academic years, bulk promotion, month closing.
- **OOS-07** Absence tracking outside held lessons, offline mode, cross-level attendance.
- **OOS-08** Multi-tenant support, English interface.
- **OOS-09** Automated backup/recovery tools.
- **OOS-10** Online courses, lesson videos, homework, exams.

## 11. Confirmed clarifications

- **D1** Assistant report access: Student Statement for student being handled, Attendance Report, and Daily Collections limited to own entries. Debtors List and Monthly Financial Summary are Admin-only.
- **D2** Report date bases: Daily Collections and dashboard collections use payment entry date. Monthly Financial Summary uses non-voided charges billed in the month and payments whose Received On falls in the month.
- **D3** Permanent deletion details: Admin only; student numbers are never reused (via PostgreSQL sequence); lessons left without attendance are removed.
- **D4** Enrollment-date lock applies when student has non-voided attendance or charges.
- **D6** Terminology: payment group replaces receipt; identified by student, Received On, and total amount.
- **D7** Lesson Informational Absent List: active students on lesson date in that combination who did not attend.
