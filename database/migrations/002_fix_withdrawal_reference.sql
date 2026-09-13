-- Fix the idempotency key for withdrawals.
-- The previous unique index included cancelled_at, which allows duplicate
-- references when both rows are still active and cancelled_at is NULL.
-- MySQL treats NULLs as distinct in UNIQUE indexes, so the retry protection was
-- not effective.

DELETE w1
FROM wp_bl_withdrawals w1
JOIN wp_bl_withdrawals w2
  ON w1.instructor_id = w2.instructor_id
 AND w1.payout_reference = w2.payout_reference
 AND w1.id > w2.id;

ALTER TABLE wp_bl_withdrawals
  DROP INDEX uq_reference,
  MODIFY payout_reference VARCHAR(64) NOT NULL,
  ADD UNIQUE KEY uq_reference (instructor_id, payout_reference);
