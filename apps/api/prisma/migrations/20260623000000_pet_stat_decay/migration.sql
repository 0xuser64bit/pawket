-- Track when a pet's stored vitals were last written so the API can drain them
-- (decay) lazily from that instant forward. Existing pets backfill to "now".
ALTER TABLE "Pet" ADD COLUMN "statsUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
