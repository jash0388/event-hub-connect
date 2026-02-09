# Admin Management Feature Guide

## Overview
A comprehensive admin management system has been added to the Event Hub Connect admin dashboard. This allows existing admins to create, manage, and remove other admin users.

## Features Implemented

### 1. **View All Admins**
- Displays a table of all users with admin role
- Shows: Email, Full Name, Role Badge, Creation Date
- Accessible via the "Admins" tab in the admin dashboard

### 2. **Create New Admin Users**
Two methods are available:

#### Method A: Create with Email + Password
- Enter email and password (minimum 6 characters)
- Admin is created immediately with full access
- User can log in right away with provided credentials

#### Method B: Send Invite Email
- Enter email only
- System sends an invite email to the user
- User sets their own password via the invite link
- Admin role is automatically assigned upon acceptance

### 3. **Revoke Admin Access**
- Demotes an admin to a regular user
- User remains in the system but loses admin privileges
- Requires confirmation before proceeding

### 4. **Delete Admin User**
- Completely removes the user from the system
- Deletes from auth.users (cascades to profiles and user_roles)
- Self-protection: Cannot delete your own admin account
- Requires confirmation before proceeding

## Technical Implementation

### Files Modified/Created

1. **`/app/.env`**
   - Added `VITE_SUPABASE_SERVICE_ROLE_KEY` for admin operations

2. **`/app/src/lib/supabaseAdmin.ts`** (NEW)
   - `createAdminUser()` - Creates admin with password
   - `sendAdminInvite()` - Sends invite email
   - `getAllAdmins()` - Fetches all admin users
   - `revokeAdminAccess()` - Demotes admin to user
   - `deleteAdminUser()` - Completely removes user

3. **`/app/src/pages/AdminDashboard.tsx`** (UPDATED)
   - Added "Admins" tab to dashboard
   - Admin listing table with actions
   - Create admin dialog with dual modes
   - Revoke and delete functionality
   - All elements have `data-testid` attributes for testing

## Security Features

✅ **Service Role Key Protection**
- Service role key stored in environment variables
- Only used server-side for privileged operations

✅ **RLS Policies**
- Existing Supabase RLS policies enforce admin-only access
- Only users with 'admin' role can manage other admins

✅ **Self-Protection**
- Admins cannot delete their own account
- Prevents accidental lockout

✅ **Confirmation Dialogs**
- All destructive actions require user confirmation
- Clear descriptions of what will happen

## Usage Instructions

### To Create a New Admin:

1. Log in to the admin dashboard at `/admin/login`
2. Click on the "Admins" tab
3. Click "Create Admin" button
4. Choose creation method:
   - **With Password**: Enter email and password, then click "Create Admin"
   - **With Invite**: Uncheck "Create with password", enter email, click "Send Invite"
5. New admin will appear in the table

### To Revoke Admin Access:

1. Navigate to the "Admins" tab
2. Find the user in the table
3. Click the "User Minus" icon (revoke access)
4. Confirm the action
5. User becomes a regular user (can no longer access admin area)

### To Delete an Admin:

1. Navigate to the "Admins" tab
2. Find the user in the table
3. Click the "Trash" icon (delete user)
4. Confirm the action
5. User is completely removed from the system

## Testing

All interactive elements have `data-testid` attributes:
- `admins-tab` - The Admins tab trigger
- `create-admin-button` - Button to open create dialog
- `admin-email-input` - Email input field
- `admin-password-input` - Password input field
- `create-with-password-checkbox` - Toggle between creation modes
- `submit-admin-button` - Submit button
- `cancel-admin-button` - Cancel button
- `admin-row-{userId}` - Each admin row in the table
- `revoke-admin-{userId}` - Revoke button for specific admin
- `delete-admin-{userId}` - Delete button for specific admin

## Error Handling

- Email validation (must be valid email format)
- Password validation (minimum 6 characters)
- Duplicate email handling
- Network error handling with toast notifications
- Loading states during async operations

## Database Schema

The feature uses existing tables:
- `auth.users` - Supabase authentication table
- `profiles` - User profile information
- `user_roles` - Role assignments (admin, moderator, user)

## API Functions

### `createAdminUser(email, password?)`
Creates a new admin user with optional password.

**Parameters:**
- `email` (string): User's email address
- `password` (string, optional): User's password

**Returns:**
- `{ data: User | null, error: Error | null }`

### `sendAdminInvite(email)`
Sends an invite email to create a new admin.

**Parameters:**
- `email` (string): User's email address

**Returns:**
- `{ data: User | null, error: Error | null }`

### `getAllAdmins()`
Fetches all users with admin role.

**Returns:**
- `{ data: AdminUser[] | null, error: Error | null }`

### `revokeAdminAccess(userId)`
Changes a user's role from 'admin' to 'user'.

**Parameters:**
- `userId` (string): UUID of the user

**Returns:**
- `{ error: Error | null }`

### `deleteAdminUser(userId)`
Completely removes a user from the system.

**Parameters:**
- `userId` (string): UUID of the user

**Returns:**
- `{ error: Error | null }`

## Future Enhancements (Optional)

- Bulk admin creation via CSV import
- Admin activity logs
- Role-based permissions (super admin vs regular admin)
- Email templates customization
- Admin user search and filtering
- Export admin list to CSV

## Support

For issues or questions about the admin management feature, check:
1. Browser console for JavaScript errors
2. Supabase dashboard logs for database/auth errors
3. Network tab for API request failures
