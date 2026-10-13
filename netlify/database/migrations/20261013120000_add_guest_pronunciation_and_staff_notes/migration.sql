-- How to say a guest's name, so whoever calls them out gets it right. The guest can write it when
-- they register, and a worker can correct it. Optional: null for a guest nobody has written one for.
ALTER TABLE "guests" ADD COLUMN "pronunciation" text;

-- Notes workers keep about a guest. Read and written only through the admin API, and never sent
-- to the guest's own phone.
ALTER TABLE "guests" ADD COLUMN "staff_notes" text;
