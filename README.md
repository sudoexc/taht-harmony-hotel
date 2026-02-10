# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Custom Backend (NestJS + Prisma)

This repo now includes a standalone backend in `server/`.

### 1) Configure environment

Backend env (copy and edit):

```sh
cp server/.env.example server/.env
```

Frontend env (create `.env` in project root):

```sh
VITE_API_URL=http://localhost:4000
```

### 2) Prepare database

From `server/`:

```sh
npm install
npx prisma generate
npx prisma migrate dev
```

### 3) Run backend

```sh
cd server
npm run dev
```

### Auth (HTTP‑Only cookie)

Login sets an `access_token` cookie (HttpOnly). Make sure `CORS_ORIGIN` in `server/.env` matches your frontend URL.

### Health check

```sh
GET http://localhost:4000/health
```

### 3a) Create the first admin (one-time)

Registration is only allowed when no users exist (or when `ALLOW_REGISTER=true`).

Example request:

```sh
curl -X POST http://localhost:4000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{\"email\":\"admin@example.com\",\"password\":\"changeme\",\"full_name\":\"Admin\",\"hotel_name\":\"My Hotel\",\"timezone\":\"Asia/Tashkent\"}'
```

### 4) Run frontend

From project root:

```sh
npm install
npm run dev
```

## Backups (pg_dump)

Create a backup:

```sh
cd server
./scripts/backup.sh
```

Restore a backup:

```sh
cd server
./scripts/restore.sh ./backups/backup_YYYYMMDD_HHMMSS.sql.gz
```

Cron example (daily at 02:00):

```sh
0 2 * * * cd /path/to/server && ./scripts/backup.sh >> /path/to/server/backups/backup.log 2>&1
```

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
