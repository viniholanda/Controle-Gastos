# FinTrack — Expense Tracking System

A modern, production-ready expense tracking system built with Next.js 14, TypeScript, Tailwind CSS, PostgreSQL, and Prisma.

## Features

- **Fast data entry** — Quick-add modal with keyboard shortcuts (N, Ctrl+Enter)
- **Smart categories** — Hierarchical categories with auto-suggest
- **Multiple accounts** — Cash, bank, credit card, digital wallet
- **Budgets** — Monthly budgets with progress indicators and alerts
- **Reports** — Visual charts by category, merchant, and period
- **Import** — CSV, Excel, OFX, QIF file import with preview
- **Dark mode** — Full light/dark theme support
- **PWA** — Installable as a mobile app
- **Multi-currency** — BRL, USD, EUR support

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: Radix UI primitives with custom styling
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 with credential providers
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **State**: TanStack Query

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Clone and install

```bash
git clone <repo>
cd controle-gastos
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/controle_gastos"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="same as NEXTAUTH_SECRET"
```

### 3. Set up database

```bash
# Create the database (PostgreSQL)
createdb controle_gastos

# Run migrations
npx prisma migrate dev --name init

# Seed demo data
npx prisma db seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo credentials

- **Email**: `demo@fintrack.app`
- **Password**: `demo1234`

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register pages
│   ├── (dashboard)/     # Main app pages
│   │   ├── dashboard/   # Overview dashboard
│   │   ├── transactions/ # Transaction list & management
│   │   ├── budgets/     # Budget tracking
│   │   ├── reports/     # Analytics & reports
│   │   ├── import/      # File import wizard
│   │   └── settings/    # App settings
│   └── api/             # API routes
├── components/
│   ├── ui/              # Base UI components
│   ├── transactions/    # Transaction-specific components
│   ├── dashboard/       # Dashboard widgets
│   └── layout/          # Layout components
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── prisma.ts        # Database client
│   ├── utils.ts         # Utility functions
│   ├── validations.ts   # Zod schemas
│   ├── audit.ts         # Audit logging
│   └── workspace.ts     # Workspace helpers
└── types/               # TypeScript type definitions
```

## Database

Run migrations:
```bash
npx prisma migrate dev
```

View database:
```bash
npx prisma studio
```

## Testing

```bash
npm test
npm run test:coverage
```

## Production Build

```bash
npm run build
npm start
```

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Docker

```bash
docker build -t fintrack .
docker run -p 3000:3000 fintrack
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New transaction |
| `Ctrl+Enter` | Save form |
| `Escape` | Close modal |

## License

MIT
