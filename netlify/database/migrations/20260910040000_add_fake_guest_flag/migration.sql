-- Generated and demo guests are explicitly marked so notification transports can suppress
-- external side effects without inferring intent from a phone-number convention.
ALTER TABLE "guests"
	ADD COLUMN "fake" boolean NOT NULL DEFAULT false;

-- Preserve the provenance of guests created by older versions of the fake-data tools. NPA 555
-- is not assigned in the North American Numbering Plan; the exact-length check avoids matching
-- international numbers that merely begin with the same digits.
UPDATE "guests"
SET "fake" = true
WHERE "normalized_phone" ~ '^\+1555[0-9]{7}$';
