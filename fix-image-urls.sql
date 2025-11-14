-- Fix image URLs that have 'undefined' instead of the R2 public URL
-- This happens when complaints were created before R2_PUBLIC_URL was properly configured

-- Fix before_image_url
UPDATE complaints
SET before_image_url = REPLACE(before_image_url, 'undefined/', 'https://pub-62cfd0f5ce354768976829718b8e95cd.r2.dev/')
WHERE before_image_url LIKE 'undefined%';

-- Fix after_image_url
UPDATE complaints
SET after_image_url = REPLACE(after_image_url, 'undefined/', 'https://pub-62cfd0f5ce354768976829718b8e95cd.r2.dev/')
WHERE after_image_url LIKE 'undefined%';

-- Verify the results
SELECT id, before_image_url, after_image_url FROM complaints;
