ALTER TABLE "visits" ADD COLUMN "lottery_weight" integer NOT NULL DEFAULT 1;

ALTER TABLE "visits" ADD CONSTRAINT "visits_lottery_weight_check"
	CHECK ("lottery_weight" >= 1 AND "lottery_weight" <= 100);
