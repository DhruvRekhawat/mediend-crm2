# Mediend CRM v2

A comprehensive Customer Relationship Management system for Mediend, a medico marketing company that brings surgery patients to hospitals.

## Features

- **Lead Management**: Track patient leads from first contact through surgery completion
- **Role-Based Access Control**: Support for MD, Sales Head, Team Lead, BD, Insurance Head, P/L Head, HR Head, and Admin roles
- **Kanban Boards**: Visual pipeline management for BDs and Team Leads
- **Analytics & KPIs**: Comprehensive dashboards with department-wise metrics
- **Targets & Bonuses**: Set and track targets for teams and individual BDs
- **Client-Side Caching**: IndexedDB + localStorage for fast, offline-capable experience
- **Optimistic UI**: Instant feedback for all mutations

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **UI Components**: shadcn/ui, Tailwind CSS
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **State Management**: TanStack Query (React Query)
- **Caching**: IndexedDB (idb), localStorage
- **Authentication**: JWT-based session management

## Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (Supabase recommended)
- npm or bun package manager

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mediend_crm?schema=public"

# Auth
JWT_SECRET=your_jwt_secret_key_here_change_in_production

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or run migrations (for production)
npm run db:migrate
```

### 4. Seed Initial Users

**IMPORTANT**: Create default users for testing using the seed API:

**Option 1: Using the Web Interface (Recommended)**
1. Start the dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/admin/seed-users`
3. Click "Create Default Users" button

**Option 2: Using cURL or Postman**
```bash
curl -X POST http://localhost:3000/api/admin/seed-users
```

This will create:
- **Admin User**: `admin@mediend.com` / `Admin@123`
- **Sales Head**: `saleshead@mediend.com` / `SalesHead@123`
- **BD User**: `bd@mediend.com` / `BD@123`
- **Insurance Head**: `insurance@mediend.com` / `Insurance@123`
- **P/L Head**: `pl@mediend.com` / `PL@123`
- **HR Head**: `hr@mediend.com` / `HR@123`

⚠️ **Change all passwords after first login!**

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Creating Your First User

### Option 1: Using Seed Script (Recommended for Development)

Run the seed script as shown above. This creates default users for testing.

### Option 2: Using Prisma Studio (GUI)

```bash
npm run db:studio
```

1. Open Prisma Studio (usually at `http://localhost:5555`)
2. Navigate to the `User` model
3. Click "Add record"
4. Fill in:
   - `email`: Your email
   - `passwordHash`: Use a password hasher (see Option 3)
   - `name`: Your name
   - `role`: Choose from `MD`, `SALES_HEAD`, `TEAM_LEAD`, `BD`, `INSURANCE_HEAD`, `PL_HEAD`, `HR_HEAD`, `ADMIN`
   - `teamId`: Leave null for now (can assign later)

### Option 3: Using Node.js Script

Create a file `scripts/create-user.ts`:

```typescript
import { PrismaClient } from '../lib/generated'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createUser() {
  const email = 'your-email@example.com'
  const password = 'YourPassword123'
  const name = 'Your Name'
  const role = 'ADMIN' // or 'SALES_HEAD', 'BD', etc.

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
    },
  })

  console.log('User created:', user.email)
  await prisma.$disconnect()
}

createUser()
```

Run it:
```bash
npx tsx scripts/create-user.ts
```

### Option 4: Using HR Dashboard (After First Login)

1. Login with the admin account created by seed script
2. Navigate to `/hr/users`
3. Click "Create User" button
4. Fill in the form and submit

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── login/             # Login page
│   ├── md/                # MD dashboard
│   ├── sales/             # Sales Head pages
│   ├── bd/                # BD pages
│   └── ...
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── kanban-board.tsx  # Kanban board component
│   └── ...
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
│   ├── prisma.ts        # Prisma client
│   ├── auth.ts          # Authentication utilities
│   ├── rbac.ts          # Role-based access control
│   ├── indexeddb.ts     # IndexedDB caching
│   └── ...
├── prisma/               # Prisma schema
│   ├── schema.prisma
│   └── seed.ts          # Database seed script
└── providers/           # React context providers
```

## User Roles & Access

- **MD (Managing Director)**: Full read access to all departments, analytics, and reports
- **Sales Head**: Manage leads, set targets, view team/BD analytics
- **Team Lead**: Manage leads for their team, view team analytics
- **BD (Business Development)**: Manage own leads, view personal performance
- **Insurance Head**: Manage insurance cases and approvals
- **P/L Head**: Manage profit & loss records and payouts
- **HR Head**: Manage users, teams, and view performance metrics
- **Admin**: Full system access

## Key Features

### Lead Management
- Create and track leads through the entire pipeline
- Status updates via Kanban board drag & drop
- Automatic stage transitions (Sales → Insurance → P/L → Completed)
- Lead assignment and reassignment

### Analytics
- Department-wise KPIs
- Team and BD leaderboards
- Hospital, doctor, and surgery analytics
- Source and campaign performance tracking

### Targets & Bonuses
- Set monthly/weekly targets for teams and BDs
- Track progress with visual indicators
- Configure bonus rules (percentage above target or fixed count)
- Real-time bonus calculations

### Caching Strategy
- **IndexedDB**: Caches lead lists and analytics snapshots (5-10 min TTL)
- **localStorage**: Stores user preferences and filter presets
- **React Query**: Client-side caching with automatic refetching

## API Routes

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/leads` - List leads (with filters)
- `POST /api/leads` - Create lead
- `PATCH /api/leads/[id]` - Update lead
- `GET /api/targets` - List targets
- `POST /api/targets` - Create target
- `GET /api/analytics/dashboard` - Dashboard KPIs
- `GET /api/analytics/leaderboard` - Team/BD leaderboards
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team

## Development

### Database Management

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Create a new migration
npm run db:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Seed database with initial data
npm run db:seed
```

### Code Quality

```bash
# Run linter
npm run lint
```

## Production Deployment

1. Set up PostgreSQL database (Supabase recommended)
2. Configure environment variables
3. Run database migrations: `npm run db:migrate`
4. Seed initial admin user: `npm run db:seed` (or create manually)
5. Build the application: `npm run build`
6. Start the server: `npm start`

## Notes

- The application uses optimistic UI updates for better UX
- All API routes enforce RBAC
- IndexedDB caching improves performance and enables offline capabilities
- Session management uses HTTP-only cookies for security
- Default seed passwords should be changed immediately in production

## License

Private - Mediend CRM
