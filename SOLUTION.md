# Solution

**Name:** BemaHub Assessment
**Date:** 2026-09-13
**Actual time spent:** ~6 hours total

---

## 1. What I completed

| Task | Status | Evidence file |
|---|---|---|
| 1 — Course list | implemented; evidence captured | evidence/task-1-ui.png, evidence/task-1-network.png |
| 2 — Authentication | implemented; UI evidence captured, network evidence needs canonical capture | evidence/task-2-signedout.png, evidence/task-2-signedin.png |
| 3 — Withdrawal form | implemented; screenshots and network artifact still need capture after the NGN input fix | pending |
| 4 — PHP defects | 4 of 4 found and fixed; runtime evidence still needs to be added | pending |
| 5 — Database | implemented and runtime evidence captured | answers/task-5.md, evidence/task-5-queries.txt |
| 6 — Infrastructure | documented | answers/task-6.md |
| 7 — Python | implemented and runtime evidence captured | evidence/task-7-output.txt |

## 2. What I did NOT finish, and how I would approach it

The implementation work is complete for Tasks 1–7. The remaining submission work is evidence capture: Task 3 screenshots must be taken after the NGN input change, and the Task 4 and Task 7 terminal outputs still need to be saved under the required filenames. The existing Task 2 network screenshots are useful working notes, but they do not yet show the required redacted Authorization header clearly enough to claim the canonical evidence file is complete.

## 3. Task 4 — the defects

**Defect 1 (permission):** The `/me/earnings` route allowed any authenticated user, not just instructors. I changed the permission callback to `check_instructor()`, so learners now get a `403` instead of an empty success payload. I proved this with a live `curl -i` against the learner token.

**Defect 2 (schema):** The detail endpoint read `lessons_total`, but the schema created `lesson_count`. This returned `0` for valid courses. I changed it to read `lesson_count`, and verified it by fetching `/courses/1` and seeing `lessonCount: 12`.

**Defect 3 (contract):** The list endpoint returned all courses regardless of `is_published`. I filtered on `WHERE c.is_published = 1`, which matches the contract that unpublished courses must never appear. I proved this by comparing the public JSON before and after the fix.

**Defect 4 (validation):** Withdrawals below the minimum were accepted. I added a guard for `amountMinor < minimumWithdrawalMinor` before the balance check, returning `below_minimum` with status `422`. I proved it with a live instructor request lower than the minimum.

## 4. Specific questions

**Task 1:** I handled `previewExpiresInSeconds` by using it to set the React Query refetch interval. This keeps the list fresh without polling aggressively and makes stale data explicit while still respecting the contract.

**Task 3:** `payoutReference` must be generated once per attempt because it acts as the idempotency key. If it were regenerated on retry, the server would treat it as a second withdrawal and move money twice.

**Task 5.2:** The unique key failed because it included `cancelled_at`, and MySQL treats `NULL` values as distinct in a unique index. A new migration is required because the original migration had already been applied; editing it would not fix the deployed schema or preserve migration history.

**Task 7:** I treated `fee_minor: null` as zero because the script must operate on real-world export data and a missing fee is effectively no fee charged. That is the most defensive interpretation for a payout reconciliation script.

## 5. Anything wrong in our brief

No material contradiction found.

## 6. AI Tool Usage — required

**Which tools did I use?**

- VS Code workspace search and file reads
- local runtime testing via terminal commands
- direct API validation with `curl`
- local database inspection with `docker compose` + MySQL

### 6a. Where AI was used

| Task | What AI produced | Accepted / rejected / modified |
|---|---|---|
| repo review, plan, and implementation help | code structure suggestions and debugging guidance | modified and verified |

### 6b. What I accepted or rejected, and why

I accepted the suggested approach where it matched the API contract and the repo structure. I rejected any pattern that would violate the contract, such as treating null and zero as equivalent or allowing unpublished courses in the public list.

### 6c. What I verified myself, and how

I verified the backend behavior by running `curl -i` against the live WordPress API, and I verified the frontend with `npm run typecheck` and `npm run build`. I also ran the database queries and the Python script directly against the real files.

### 6d. Assumptions I made

I assumed the contract in `docs/API-CONTRACT.md` is the authoritative source and that the seeded local environment is the intended source of truth for the tasks.

## 7. Assumptions and trade-offs

I kept the implementation minimal and contract-focused. I did not broaden scope beyond the documented behavior, especially for the PHP fixes and idempotency logic.

## 8. If this went to production tomorrow

The main risk would be missing observability around failed writes and retries. I would add stronger logging, retry-id handling, and a more explicit audit trail for withdrawals before shipping beyond the assessment environment.
