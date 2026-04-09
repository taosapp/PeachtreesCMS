# PeachtreesCMS Codex Rules

## Package Manager
- Use `pnpm` for dependency installation, dependency changes, and project scripts.
- Do not use `npm` or `yarn` for normal project workflows.

## Backend API Layout
- Place backend API files under `pt_api/`.
- Follow the pattern `pt_api/{module}/{action}.php`.
- Examples:
- `pt_api/posts/index.php`
- `pt_api/auth/login.php`
- `pt_api/tags/create.php`

## Frontend Component Layout
- React shared components live under `src/components/{ComponentName}/index.jsx`.
- Prefer one component directory per component.

## Page Layout
- Frontend pages live under `src/pages/{PageName}/index.jsx`.
- Admin pages live under `src/pages/admin/{PageName}.jsx`.

## API Response Format
- Backend APIs must return JSON through helpers from `pt_api/response.php`.
- Use the project response helpers such as `success(...)` and `error(...)`.
- Do not hand-roll JSON responses when a shared helper already exists.

## Authentication
- Any protected PHP endpoint must require authentication near the top of the file.
- Use `requireAuth()` or `requireAdmin()` from `pt_api/auth.php` as appropriate.
- Do not manually duplicate session auth checks unless there is a strong reason.

## Database Access
- Use `getDB()` for database connections.
- Use PDO prepared statements with `prepare()` and `execute()`.
- Do not build SQL by concatenating untrusted input.

## Internationalization
- User-visible frontend text should go through the language system from `src/contexts/LanguageContext.jsx`.
- Prefer `useLanguage()` and translated keys over hard-coded strings.

## Styling
- Use Bootstrap 5 first for layout and UI patterns.
- Put project-wide custom styles in `src/index.css` unless an existing file structure clearly suggests otherwise.
- Avoid custom CSS when a Bootstrap utility or component already fits.

## Admin Route Protection
- Admin routes should be wrapped with `ProtectedRoute`.
- Do not add unprotected admin pages.

## Router Mode
- Use `HashRouter`, not `BrowserRouter`.
- Keep route behavior compatible with `#/path` URLs.

## Local Environment Assumptions
- Development is expected to run behind Nginx with working `/api` and `/pt_upload` paths.
- Keep Vite proxy and backend path assumptions aligned with that environment.