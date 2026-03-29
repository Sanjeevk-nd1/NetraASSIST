# NetraASSIST v2 — EC2 Deployment Guide

## Prerequisites on EC2
- Docker & Docker Compose installed
- Git access to the repo

---

## 1. Stop the old app

```bash
pm2 stop netraassist
pm2 delete netraassist
```

## 2. Clone the new version

```bash
cd /home/ubuntu
git clone -b v2-clean https://github.com/Sanjeevk-nd1/NetraASSIST.git NetraASSIST-v2
cd NetraASSIST-v2
```

## 3. Create the `.env` file

```bash
cp .env.example .env
nano .env
```

Fill in **all** values — especially:

```env
PORT=3002

# Azure OpenAI
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_ENDPOINT=<your-endpoint>
AZURE_OPENAI_DEPLOYMENT=gpt-5.1-prod

# Azure AD (SharePoint)
AZURE_TENANT_ID=<your-tenant>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-secret>

# Database (Docker internal — leave as-is)
DATABASE_URL=postgresql://netraassist:changeme@db:5432/netraassist
POSTGRES_PASSWORD=changeme

# JWT (generate a random one)
JWT_SECRET=<run: openssl rand -hex 32>

# Super admin
PERMANENT_ADMIN_EMAIL=infosec@netradyne.com
ADMIN_DEFAULT_PASSWORD=<your-password>

# Redis (Docker internal — leave as-is)
REDIS_URL=redis://redis:6379/0
```

> **Important:** Change `POSTGRES_PASSWORD` from `changeme` to something secure, and update it in `DATABASE_URL` too.

## 4. Build & Start

```bash
docker compose up -d --build
```

This starts 4 containers:
| Container | Purpose | Port |
|-----------|---------|------|
| `web` | Flask/Gunicorn (API + Frontend) | 3002 (exposed) |
| `celery` | Background batch processing | — |
| `db` | PostgreSQL 16 | 5432 (internal) |
| `redis` | Redis 7 (task queue) | 6379 (internal) |

## 5. Verify

```bash
# Check all containers are running
docker compose ps

# Check logs
docker compose logs web --tail 50
docker compose logs celery --tail 50

# Test the endpoint
curl http://localhost:3002/api/auth/me
```

The app should now be live at `https://netrassist.netradyne.info/` (your ALB/target group points port 3002).

## 6. Common Operations

```bash
# View logs (live)
docker compose logs -f web

# Restart everything
docker compose restart

# Rebuild after code changes
git pull origin v2-clean
docker compose up -d --build

# Stop everything
docker compose down

# Stop and remove volumes (⚠️ deletes database data)
docker compose down -v
```

## 7. Making `v2-clean` the new `main` (after verification)

Once you've verified the app works on EC2:

```bash
# On GitHub: Go to Settings → Branches → change default branch to v2-clean
# Then locally:
git branch -m main main-v1-archive
git branch -m v2-clean main
git push origin main
git push origin :v2-clean        # delete old branch name
```

Or simply merge via GitHub PR:  
https://github.com/Sanjeevk-nd1/NetraASSIST/pull/new/v2-clean
