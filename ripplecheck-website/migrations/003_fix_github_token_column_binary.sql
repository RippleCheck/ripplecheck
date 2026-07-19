-- Root cause of the repo-browsing "reauth_required" bug: on the live database
-- the github_access_token_encrypted column was a utf8mb4 TEXT column, not the
-- VARBINARY(1024) that migration 002 intended (002 was never applied there).
--
-- A utf8mb4 CHARACTER column cannot store the encrypted token blob: the AES-GCM
-- output (iv . tag . ciphertext) contains bytes >= 0x80 that are not valid
-- UTF-8, so every high byte is replaced on the way into/out of storage. The
-- byte-length is preserved but the content is destroyed, so decryptGithubToken()
-- returns null for every stored token. (Verified: a 256-byte round-trip through
-- this column corrupts everything from offset 128 up; SET NAMES binary does not
-- help because the mangling happens at the column's charset boundary.)
--
-- A binary-typed column has charset = binary, so raw bytes are stored verbatim
-- regardless of the connection's utf8mb4 charset. This forward-fixes the live
-- schema. Existing rows already hold corrupted (undecryptable) blobs; they are
-- overwritten with a fresh, decryptable token the next time each user logs in.

ALTER TABLE users
    MODIFY COLUMN github_access_token_encrypted VARBINARY(1024) NULL;
