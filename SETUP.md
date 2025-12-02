# Quick Setup Guide - Creating Your First User

## Step-by-Step Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="your_random_secret_key_here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Generate Prisma Client & Push Schema

```bash
npm run db:generate
npm run db:push
```

### 4. Create Initial Users (Easiest Method)

Run the seed script to create default users:

```bash
npm run db:seed
```

This will create:
- **Admin**: `admin@mediend.com` / `Admin@123`
- **Sales Head**: `saleshead@mediend.com` / `SalesHead@123`
- **BD**: `bd@mediend.com` / `BD@123`

### 5. Start the Application

```bash
npm run dev
```

### 6. Login

1. Go to `http://localhost:3000`
2. You'll be redirected to `/login`
3. Use one of the seeded accounts:
   - Email: `admin@mediend.com`
   - Password: `Admin@123`

### 7. Create More Users (After Login)

Once logged in as Admin or HR Head:

1. Navigate to `/hr/users`
2. Click "Create User" button
3. Fill in the form:
   - Name
   - Email
   - Password (min 6 characters)
   - Role (BD, Team Lead, Sales Head, etc.)
   - Team (if applicable)
4. Click "Create User"

## Alternative: Using Prisma Studio

If you prefer a GUI:

```bash
npm run db:studio
```

1. Open `http://localhost:5555`
2. Click on "User" model
3. Click "Add record"
4. Fill in:
   - `email`: your email
   - `passwordHash`: You need to hash the password first (see below)
   - `name`: your name
   - `role`: `ADMIN`, `SALES_HEAD`, `BD`, etc.
   - `teamId`: null (can assign later)

### Hashing Password for Prisma Studio

Run this in Node.js:

```javascript
const bcrypt = require('bcryptjs');
bcrypt.hash('YourPassword123', 10).then(hash => console.log(hash));
```

Or use this quick script:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourPassword123', 10).then(hash => console.log(hash));"
```

## Troubleshooting

### "Cannot find module '@prisma/client'"

Run:
```bash
npm run db:generate
```

### "DATABASE_URL not set"

Make sure your `.env` file exists and has the correct `DATABASE_URL`.

### "Password doesn't work"

Make sure you're using the exact password from the seed output, or if you created manually, ensure the password was hashed correctly.

### "User already exists"

The seed script checks for existing users and won't create duplicates. If you want to reset, you can delete users via Prisma Studio or SQL.

## Security Note

⚠️ **IMPORTANT**: Change all default passwords immediately after first login, especially in production!

