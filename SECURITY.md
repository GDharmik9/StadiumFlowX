# SECURITY.md — StadiumFlow Security Practices

## Overview
StadiumFlow implements defense-in-depth security across all layers of the application stack.

## Authentication & Authorization

### Firebase Anonymous Auth
- All users authenticate via Firebase Anonymous Authentication before accessing any data
- Each session generates a unique `uid` bound to the user's Firestore document
- No personally identifiable information (PII) is collected or stored

### Firestore Security Rules
- Read/write access is scoped to authenticated users only
- Users can only modify their own documents (`request.auth.uid == resource.data.uid`)
- Stadium zone data is read-only for clients; only the backend engine can modify congestion status

## API Security

### Backend (Express + Cloud Run)
- **Helmet.js**: Sets security HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS**: Strict origin allowlist — only the Firebase Hosting domain and localhost dev servers
- **Rate Limiting**: 100 requests per 15-minute window per IP to prevent abuse
- **Input Validation**: All API inputs are validated (zone IDs, status values) before database operations
- **No eval()**: Backend code never uses `eval()` or dynamic code execution
- **Request Size Limits**: JSON body parsing limited to 1MB to prevent payload attacks

### Environment Variables
- Firebase configuration supports environment variables via `EXPO_PUBLIC_*` prefix
- Service account keys are excluded from version control (`.gitignore`)
- `.env.example` provided as a template without real credentials

## Data Security

### Firestore
- Server-side timestamps (`FieldValue.serverTimestamp()`) prevent client clock manipulation
- Scenario deployment uses anti-loop flags to prevent duplicate triggers
- Batch writes ensure atomic operations for multi-document updates

### Client-Side
- WebView communication uses structured JSON messages (not raw `eval`)
- Message handlers gracefully reject malformed payloads
- No sensitive data is stored in AsyncStorage or local storage

## Infrastructure

### Google Cloud Run
- Runs in a sandboxed container with minimal permissions
- Auto-scales to zero when idle (no idle compute costs = smaller attack surface)
- HTTPS-only via Cloud Run's built-in TLS termination

### Firebase Hosting
- Automatic SSL/TLS certificates
- CDN-cached static assets with cache-control headers
- No server-side rendering — pure static deployment

## Dependency Management
- `package-lock.json` committed for reproducible builds
- No known critical vulnerabilities in production dependencies
- DevDependencies (jest, supertest) are excluded from production builds

## Reporting Vulnerabilities
If you discover a security issue, please report it responsibly to the project maintainers.
