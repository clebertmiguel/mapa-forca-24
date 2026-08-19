# Plan: Implementation of Authentication and RBAC with Google Sheets

Implement a complete authentication and Role-Based Access Control (RBAC) system integrated with Google Sheets, replacing the current device-ID based logic.

## User Review Required

> [!IMPORTANT]
> - The application will require users to log in using their email and password from the spreadsheet.
> - Permissions will be strictly enforced based on the "GRUPO" column in the spreadsheet.
> - Authentication will use Lovable Cloud (Supabase) as a bridge for secure session management, while keeping the user database in Google Sheets.

## Technical Details

### 1. Database Schema (Google Sheets)
- Use the spreadsheet `1SwrfUR0WYhIgHjxO0lFEtdaIy6rFjQ3U2kh6jYEGgD8`.
- Ensure a "USUARIOS" sheet exists with columns: `id`, `nome`, `re`, `email`, `telefone`, `senha`, `grupo` (Administrador, Oficiais, Supervisor, Usuario), `ativo` (SIM/NAO).

### 2. Authentication Logic
- **Server Function**: `loginUser` will query the "USUARIOS" sheet for the provided email.
- **Verification**: It will compare the password (plaintext for simplicity per request, though hashing is recommended) and check if `ativo === 'SIM'`.
- **Session**: Upon successful login, a Supabase session will be created (using `signInWithPassword` or a custom token approach) or a simple session cookie/token will be managed to track the user's role and ID.

### 3. Role-Based Access Control (RBAC)
- **Administrador**: Full CRUD on all records + User management.
- **Oficiais / Supervisor**: Full CRUD on operational records.
- **Usuario**: CRUD only on their own records (filtered by user ID/Email).
- **Route Protection**: Use TanStack Router's `beforeLoad` to redirect unauthenticated users to `/auth/login`.

### 4. UI Components
- **Login Page (`/auth/login`)**: Email/Password fields with PM branding.
- **Registration Page (`/auth/register`)**: Form for new users (defaulting to "Usuario" and "SIM").
- **User Management Page (`/admin/users`)**: Restricted to Administrators.
- **Navigation**: Update `AppNav` to show/hide links based on user role and add a Logout button.

## Execution Steps

1. **Backend Integration (`src/lib/auth.server.ts`)**:
   - Add helpers to fetch and validate users from the "USUARIOS" sheet.
   - Implement `login` and `logout` server functions.

2. **Route Setup**:
   - Create `/auth/login` and `/auth/register` routes.
   - Implement a pathless layout `_authenticated` to wrap protected routes.

3. **RBAC Implementation**:
   - Update `RecordForm` and `Dashboard` to check user roles for edit/delete permissions.
   - Add filtering for "Usuario" role to only see their own records.

4. **User Management**:
   - Create a new route for managing users (exclusive to Admins).
