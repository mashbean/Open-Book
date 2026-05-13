# OpenBook Self-Hosting Guide

OpenBook is a self-hosted municipal budget transparency portal. Each town deploys its own instance.

## Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- npm 9+

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-org/openbook.git
cd openbook
```

### 2. Install and start

```bash
npm install
npm run dev
```

That's it. `npm install` generates the Prisma client, and `npm run dev` automatically creates the SQLite database, applies all migrations, and starts the server.

Visit `http://localhost:3000/admin/register` to create your admin account. The first person to register becomes the admin — no setup key or `.env` file required. After the first admin account exists, registration is locked unless an admin is logged in.

## First-Time Setup

1. Go to `/admin/register` and create an admin account (the first account becomes admin automatically).
2. After logging in, go to `/admin/setup` to configure your town (name, slug, color, contact email).
3. Go to `/admin/upload` to upload your budget CSV or Excel files.
4. Map columns and confirm. Your portal is now live at `/{your-town-slug}`.

## Production Deployment

### Vercel

1. Fork this repository
2. Import the project in Vercel
3. Set `DATABASE_URL` if using a non-default database path
4. Deploy

Note: SQLite works for single-instance deployments. For Vercel, the database file must be in a persistent storage location. Consider using Vercel's Blob storage or switching to PostgreSQL for production.

### VPS / Docker

```bash
# Build for production
npm run build

# Start the production server
npm start
```

The app runs on port 3000 by default. Use a reverse proxy (nginx, Caddy) for HTTPS.

### Custom Domain

For municipal deployments, we recommend a `.gov` subdomain:

1. Set up a CNAME record: `budget.yourtown.gov` -> your deployment host
2. Configure HTTPS via your reverse proxy or hosting platform
3. Update the portal's URL slug to match your subdomain expectations

## Environment Variables

| Variable      | Required | Description                                                        |
|---------------|----------|--------------------------------------------------------------------|
| DATABASE_URL  | No       | SQLite database file path (defaults to `file:./dev.db` if not set) |

## Seeding Sample Data

To load sample data for testing:

```bash
npm run seed
```

This loads the sample CSV files from `sample-data/` into the database.

## Troubleshooting

**Database errors**: Try deleting `dev.db` and running `npm run dev` again. The database will be recreated automatically from the migrations.

**Port conflicts**: Use `npm run dev -- --port 3001` to run on a different port.
