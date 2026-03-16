# 🔐 Admin Dashboard Setup Guide

## Overview

A complete admin dashboard system has been built for the Milk Tracker app. It allows admins to:

- View user count and list all users
- See analytics and trends
- Deactivate/activate users
- Monitor daily/monthly activities

## ✅ Safety Features

- **No existing user logic changed** - all existing flows work as before
- **Separate admin login** - users and admins use different pages
- **Backward compatible** - new database columns default to safe values
- **Role-based authorization** - only users marked as admin can access

## 🚀 Setup Steps

### Step 1: Database Migration (CRITICAL)

Run these SQL queries in your PostgreSQL database:

```sql
-- Add is_admin column (defaults to false)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add is_active column (defaults to true)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
```

**File reference:** See `ADMIN_MIGRATION.sql` in project root for the exact queries.

### Step 2: Set Admin User

After running the migration, execute this query to set your admin:

```sql
UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';
```

### Step 3: Deploy the Code

All new files are already created:

- `/src/app/admin/login/page.tsx` - Admin login page
- `/src/app/admin/dashboard/page.tsx` - Admin dashboard
- `/src/app/api/admin/login/route.ts` - Admin authentication
- `/src/app/api/admin/analytics/route.ts` - Analytics data
- `/src/app/api/admin/users/route.ts` - User management
- `/src/lib/adminAuth.ts` - Admin auth utilities

### Step 4: Test

1. Go to `/admin/login` (or click "Admin Portal →" on the login page)
2. Login with your admin email & password
3. You should see the admin dashboard with user stats

## 📱 Pages & Routes

### User Side (Unchanged)

- `/login` - Regular user login
- `/register` - User registration
- `/dashboard` - User dashboard
- All other existing pages work as before

### Admin Side (New)

- `/admin/login` - Admin login page
- `/admin/dashboard` - Admin dashboard with:
  - 📊 Overview tab: stats and trends
  - 👥 Users tab: manage all users

### API Routes (New)

- `POST /api/admin/login` - Admin login authentication
- `GET /api/admin/analytics` - Get dashboard analytics
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users` - Activate/deactivate users

## 🎯 Admin Dashboard Features

### Overview Tab

Shows:

- Total Users count
- Active Users
- Total Milk Entries recorded
- Today's Entries
- 📈 Monthly Activity Trend (last 12 months)

### Users Tab

Shows table with:

- User email & name
- Mobile number
- Join date
- Current status (Active/Inactive)
- Action button to activate/deactivate users

## 🔒 Security Notes

1. **JWT Token** - Same token system used for admin login
2. **Admin Verification** - Every admin API checks `is_admin` flag in database
3. **Cookie-based Auth** - Uses secure httpOnly cookies
4. **Role Check** - All admin APIs verify admin status before returning data

## 🚫 Deactivating Users

When you deactivate a user:

- Their `is_active` flag is set to FALSE
- This is recorded in the database
- Currently, user can still login (optional: you can add this restriction later)

To add login restriction for inactive users (optional, future enhancement):

```typescript
// In /api/login/route.ts, after password check, add:
if (!user.is_active) {
  return NextResponse.json(
    { error: "Your account has been deactivated" },
    { status: 403 },
  );
}
```

## 📝 Future Enhancements (Optional)

1. **Enforce inactive logins** - Prevent deactivated users from logging in
2. **User reports** - View how much milk each user has recorded
3. **Rate analytics** - See average milk prices over time
4. **Delete users** - Option to permanently remove users
5. **Audit logs** - Track admin actions
6. **Export data** - Download user/analytics as CSV

## ⚠️ Important Reminders

- ✅ User flows are NOT changed
- ✅ Existing logins still work
- ✅ New columns default to safe values (is_admin=false, is_active=true)
- ✅ If you revert these changes, app still works (columns are optional)
- ⚠️ Only run migrations once per database
- ⚠️ Keep admin email private

## 🆘 Troubleshooting

### "Admin access denied" error

- Make sure you ran the `UPDATE users SET is_admin = TRUE` query
- Check you're using the correct admin email
- Verify the database migration was applied

### Page shows "Loading dashboard..."

- Check browser console for errors
- Verify admin token is set in cookies
- Ensure you're logged in as admin

### Users list is empty

- This is normal if app is new
- Register a few test users as regular users
- They should appear in admin dashboard

---

**Questions?** Check the code comments in the admin files for additional context.
