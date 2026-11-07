# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Architecture & Best Practices

Accurate AI is designed with strict security principles to safeguard user privacy, API keys, and sensitive uploaded documents:

### 1. Zero Secret Leakage & Environment Isolation
- All sensitive credentials (such as `GEMINI_API_KEY`, `JWT_SECRET_KEY`, `GOOGLE_CLIENT_ID`, and database passwords) are loaded strictly via environment variables.
- Production `.gitignore` prevents `.env`, SQLite databases (`*.db`, `*.sqlite3`), and user document uploads (`data/uploads/`) from ever being committed to source control.

### 2. User Data Isolation
- **Document & Vector Isolation**: Every uploaded file and vector chunk is strictly partitioned and queried by `user_id == current_user.id`. Users can never access, query, or delete another user's documents or conversations.
- **File System Sanitation**: Uploaded filenames are sanitized using `_safe_filename()` to prevent Directory Traversal attacks (`../../`), and MIME types are validated against supported document extensions.

### 3. Authentication & Password Security
- **Bcrypt Hashing**: Passwords are never stored in plaintext. They are hashed using `bcrypt` with dynamic 12-round salt generation.
- **JWT Authentication**: User sessions use HMAC-SHA256 (HS256) signed JSON Web Tokens with strict expiration checks.
- **Brute-Force & Rate Limiting**: Authentication endpoints (`/auth/login`, `/auth/register`) implement sliding-window rate limiting to throttle automated brute-force attacks.

### 4. Defense-in-Depth HTTP Headers
Every API response includes essential security headers:
- `X-Content-Type-Options: nosniff` (Prevents MIME-confusion attacks)
- `X-Frame-Options: DENY` (Mitigates clickjacking)
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), camera=(), microphone=()`

## Reporting a Security Vulnerability

If you discover a security vulnerability within Accurate AI, please report it privately:
- Do not open a public issue.
- Submit details through GitHub's Security Advisories or reach out to the project maintainers.
