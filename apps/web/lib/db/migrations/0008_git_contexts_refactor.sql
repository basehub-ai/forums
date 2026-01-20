-- Rename git_context to git_contexts and convert existing data to array format
ALTER TABLE "posts" RENAME COLUMN "git_context" TO "git_contexts";

-- Convert existing single objects to arrays (wrap in array if not null)
UPDATE "posts" SET "git_contexts" = jsonb_build_array("git_contexts") WHERE "git_contexts" IS NOT NULL;

-- Drop archived_at column from comments (no longer needed, we use gitRef instead)
ALTER TABLE "comments" DROP COLUMN "archived_at";
