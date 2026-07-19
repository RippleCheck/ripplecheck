ALTER TABLE users
    ADD COLUMN github_access_token_encrypted VARBINARY(1024) NULL AFTER avatar_url;
