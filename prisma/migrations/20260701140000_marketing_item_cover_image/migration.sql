-- Optional per-item cover image for marketing items (any kind).
-- `cover_image_path`: admin-set card cover shown in place of the auto thumbnail; null when none.
-- `cover_hidden`: force the file-type placeholder even when the file itself is an image.

ALTER TABLE "marketing_items" ADD COLUMN "cover_image_path" TEXT,
ADD COLUMN "cover_hidden" BOOLEAN NOT NULL DEFAULT false;
