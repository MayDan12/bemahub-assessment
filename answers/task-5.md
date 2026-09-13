# Task 5 — Database

> Paste the terminal output of every query, not just the SQL. For this task the output is the answer.

## 5.1 Investigate — NULL vs 0

```sql
SELECT id, title, enrolment_count, average_rating FROM wp_bl_courses ORDER BY id;
```

```
id      title   enrolment_count average_rating
1       Introduction to Bread Baking    128     4.60
2       Sourdough Starters      64      4.20
3       Pastry Fundamentals     NULL    NULL
4       Cake Decorating Basics  9       0.00
5       Advanced Laminated Dough        0       NULL
```

The rows that are genuinely zero are course 4 (`enrolment_count = 9` is not zero, but the `average_rating` for that row is `0.00`), and course 5 (`enrolment_count = 0` is a real zero). The NULL values are course 3 (`enrolment_count` and `average_rating` are both NULL) and course 5 (`average_rating` is NULL even though enrolment_count is 0). This matters because NULL means “not yet counted/no rating yet,” while 0 means “a real measured zero.” A user seeing `0` would interpret that as an actual measured value, but a user seeing `NULL` should understand the system has not counted or rated anything yet.

## 5.2 The constraint

**Proof — two inserts with the same instructor_id and payout_reference:**

```sql
INSERT INTO wp_bl_withdrawals (instructor_id, amount_minor, status, payout_reference) VALUES (2, 60000, 'pending', 'duplicate_check_1');
INSERT INTO wp_bl_withdrawals (instructor_id, amount_minor, status, payout_reference) VALUES (2, 60000, 'pending', 'duplicate_check_1');
```

```
ERROR 1062 (23000) at line 1: Duplicate entry '2-duplicate_check_1' for key 'wp_bl_withdrawals.uq_reference'
```

The unique key did not prevent the duplicate because the original index included `cancelled_at`, and MySQL treats `NULL` values as distinct within a unique index. Both rows had `cancelled_at = NULL`, so the index allowed both rows to coexist. The fix was to create a new migration that dropped the old index, made `payout_reference` NOT NULL, and created a unique index on `(instructor_id, payout_reference)` only.

### The fix — `database/migrations/002_fix_withdrawal_reference.sql`

**Why a new migration rather than editing `001_initial.sql`:** because `001_initial.sql` is already applied and editing it would not change the running database or preserve the real migration history.

**Applying it:**

```
docker compose -f wordpress-plugin/docker-compose.yml exec -T db mysql -u bemalearn -passessment bemalearn < database/migrations/002_fix_withdrawal_reference.sql
```

```
mysql: [Warning] Using a password on the command line interface can be insecure.
```

**`SHOW CREATE TABLE wp_bl_withdrawals;` afterwards:**

```
Table   Create Table
wp_bl_withdrawals       CREATE TABLE `wp_bl_withdrawals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `instructor_id` bigint unsigned NOT NULL,
  `amount_minor` int unsigned NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'pending',
  `payout_reference` varchar(64) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reference` (`instructor_id`,`payout_reference`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
```

**The duplicate insert, re-run and now rejected:**

```
ERROR 1062 (23000) at line 1: Duplicate entry '2-duplicate_check_1' for key 'wp_bl_withdrawals.uq_reference'
```

## 5.3 The join

```sql
SELECT c.title, COUNT(e.id) AS non_refunded_enrolments, COALESCE(SUM(CASE WHEN e.refunded_at IS NULL THEN e.amount_paid_minor ELSE 0 END), 0) AS total_non_refunded_revenue_minor FROM wp_bl_courses c LEFT JOIN wp_bl_enrolments e ON e.course_id = c.id AND e.refunded_at IS NULL GROUP BY c.id, c.title ORDER BY c.id;
```

```
title   non_refunded_enrolments total_non_refunded_revenue_minor
Introduction to Bread Baking    2       9000
Sourdough Starters      0       0
Pastry Fundamentals     0       0
Cake Decorating Basics  0       0
Advanced Laminated Dough        0       0
```

I used a LEFT JOIN so every course remains in the result even when there are zero enrolments. A RIGHT JOIN would not preserve the same set of courses and would drop rows for courses with no matching enrolment rows, which is exactly the edge case the task says must still appear.
