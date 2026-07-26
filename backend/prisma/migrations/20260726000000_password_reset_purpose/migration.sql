-- Legacy rows mixed password-reset and email-verification tokens with no
-- discriminator, so they cannot be classified retroactively. Backfilling them
-- all as RESET would let old verification links reset passwords; drop them
-- instead (tokens are short-lived — users simply re-request).
DELETE FROM `PasswordReset`;

-- AlterTable
ALTER TABLE `PasswordReset` ADD COLUMN `purpose` ENUM('RESET', 'VERIFY') NOT NULL DEFAULT 'RESET';
