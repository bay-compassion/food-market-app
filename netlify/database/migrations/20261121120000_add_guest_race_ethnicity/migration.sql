-- Additive only: three nullable columns on `guests`, no backfill. A null `race_ethnicity` means the
-- guest was never asked; `{prefer_not_to_answer}` means they declined. Codes follow OMB's 2024
-- SPD 15 minimum categories (see src/models/race-ethnicity.ts), and the self-description belongs to
-- `another` alone.
ALTER TABLE "guests" ADD COLUMN "race_ethnicity" text[]
	CONSTRAINT "guests_race_ethnicity_check" CHECK (
		"race_ethnicity" <@ ARRAY[
			'american_indian_alaska_native',
			'asian',
			'black_african_american',
			'hispanic_latino',
			'middle_eastern_north_african',
			'native_hawaiian_pacific_islander',
			'white',
			'another',
			'prefer_not_to_answer'
		]::text[]
	);
ALTER TABLE "guests" ADD COLUMN "race_ethnicity_other" text
	CONSTRAINT "guests_race_ethnicity_other_check" CHECK (char_length("race_ethnicity_other") <= 100);
-- When the answer was given, so reports can take a person's latest across duplicate records.
ALTER TABLE "guests" ADD COLUMN "race_ethnicity_answered_at" timestamptz;
