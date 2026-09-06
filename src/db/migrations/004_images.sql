-- Optional images: profile picture for a user, storefront picture for a store.
ALTER TABLE users  ADD COLUMN image_url TEXT;
ALTER TABLE stores ADD COLUMN image_url TEXT;
