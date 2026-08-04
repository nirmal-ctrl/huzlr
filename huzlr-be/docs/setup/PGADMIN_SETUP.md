# pgAdmin Setup Guide

Complete guide to connecting pgAdmin to your PostgreSQL database running in Docker.

## Table of Contents

- [Option 1: Using pgAdmin in Docker (Recommended)](#option-1-using-pgadmin-in-docker-recommended)
- [Option 2: Using Desktop pgAdmin](#option-2-using-desktop-pgadmin)
- [Verifying Connection](#verifying-connection)
- [Troubleshooting](#troubleshooting)

## Your Database Credentials

Based on your `.env` file, here are your PostgreSQL credentials:

```
Host: localhost
Port: 5432
Database: mydb
Username: user
Password: password
```

## Option 1: Using pgAdmin in Docker (Recommended)

This option uses the pgAdmin container already configured in your `docker-compose.yml`.

### Step 1: Start pgAdmin Container

Your `docker-compose.yml` already has pgAdmin configured. Start it with:

```bash
cd /Users/gnirmalkumar/Documents/work/huzlr-be
docker-compose up -d pgadmin
```

### Step 2: Access pgAdmin Web Interface

Open your browser and go to:

```
http://localhost:5050
```

### Step 3: Login to pgAdmin

Use these credentials (from your docker-compose.yml):

```
Email: admin@admin.com
Password: admin
```

### Step 4: Create a New Server Connection

1. **Click "Add New Server"** (or right-click "Servers" → "Register" → "Server")

2. **General Tab:**
   - **Name:** `Huzlr PostgreSQL` (or any name you prefer)

3. **Connection Tab:**
   - **Host name/address:** `postgres` (⚠️ Use `postgres`, NOT `localhost` - this is the Docker service name)
   - **Port:** `5432`
   - **Maintenance database:** `mydb`
   - **Username:** `user`
   - **Password:** `password`
   - ✅ Check "Save password"

4. **Click "Save"**

### Why Use `postgres` as Host?

When pgAdmin runs in Docker, it's in the same Docker network as your PostgreSQL container. The containers communicate using their **service names** from `docker-compose.yml`:

```yaml
services:
  postgres:  # ← This is the hostname pgAdmin uses
    ...
  pgadmin:
    ...
```

## Option 2: Using Desktop pgAdmin

If you have pgAdmin installed on your Mac (not in Docker), follow these steps:

### Step 1: Download pgAdmin (if not installed)

Download from: https://www.pgadmin.org/download/pgadmin-4-macos/

### Step 2: Open pgAdmin Desktop Application

### Step 3: Create a New Server Connection

1. **Right-click "Servers"** → **"Register"** → **"Server"**

2. **General Tab:**
   - **Name:** `Huzlr PostgreSQL`

3. **Connection Tab:**
   - **Host name/address:** `localhost` (⚠️ Use `localhost` for desktop pgAdmin)
   - **Port:** `5432`
   - **Maintenance database:** `mydb`
   - **Username:** `user`
   - **Password:** `password`
   - ✅ Check "Save password"

4. **Click "Save"**

### Why Use `localhost` for Desktop pgAdmin?

Desktop pgAdmin runs on your Mac (not in Docker), so it connects to PostgreSQL through the **exposed port** on `localhost:5432`.

## Quick Reference Table

| pgAdmin Type | Host | Port | Database | Username | Password |
|--------------|------|------|----------|----------|----------|
| **Docker pgAdmin** | `postgres` | `5432` | `mydb` | `user` | `password` |
| **Desktop pgAdmin** | `localhost` | `5432` | `mydb` | `user` | `password` |

## Verifying Connection

Once connected, you should see:

```
Servers
└── Huzlr PostgreSQL
    └── Databases
        └── mydb
            └── Schemas
                └── public
                    └── Tables
                        ├── alembic_version
                        └── tasks
```

### Viewing Your Data

1. **Expand:** Servers → Huzlr PostgreSQL → Databases → mydb → Schemas → public → Tables
2. **Right-click `tasks`** → **"View/Edit Data"** → **"All Rows"**
3. You'll see all your task records!

### Running SQL Queries

1. **Right-click on `mydb`** → **"Query Tool"**
2. Type your SQL:
   ```sql
   SELECT * FROM tasks;
   ```
3. **Click the "Execute" button** (▶️) or press `F5`

## Troubleshooting

### Issue 1: "Could not connect to server"

**If using Docker pgAdmin:**
- ✅ Make sure you used `postgres` as the host (not `localhost`)
- ✅ Check both containers are running: `docker ps`
- ✅ Verify they're on the same network

**If using Desktop pgAdmin:**
- ✅ Make sure you used `localhost` as the host
- ✅ Check PostgreSQL is running: `docker ps | grep postgres`
- ✅ Verify port 5432 is exposed: `docker port huzlr-postgres`

### Issue 2: "FATAL: password authentication failed"

- ✅ Double-check your credentials match your `.env` file
- ✅ Default credentials are:
  - Username: `user`
  - Password: `password`

### Issue 3: pgAdmin Container Won't Start

Check the logs:
```bash
docker logs huzlr-pgadmin
```

Restart the container:
```bash
docker-compose restart pgadmin
```

### Issue 4: Can't Access http://localhost:5050

- ✅ Check if pgAdmin container is running: `docker ps | grep pgadmin`
- ✅ Check if port 5050 is in use: `lsof -i :5050`
- ✅ Try restarting: `docker-compose restart pgadmin`

## Useful Commands

### Check Running Containers
```bash
docker ps
```

### View Container Logs
```bash
# PostgreSQL logs
docker logs huzlr-postgres

# pgAdmin logs
docker logs huzlr-pgadmin
```

### Restart Services
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Restart pgAdmin
docker-compose restart pgadmin

# Restart both
docker-compose restart
```

### Stop Services
```bash
docker-compose down
```

### Start Services
```bash
docker-compose up -d
```

## Next Steps

Once connected, you can:

- ✅ View and edit data in your tables
- ✅ Run SQL queries
- ✅ View table structures and relationships
- ✅ Monitor database performance
- ✅ Create backups
- ✅ Manage users and permissions

## Security Note

⚠️ **Important:** The default credentials (`user`/`password` and `admin@admin.com`/`admin`) are for **development only**. 

For production:
1. Change all passwords in your `.env` file
2. Use strong, unique passwords
3. Never commit `.env` to version control (it's already in `.gitignore`)

---

**Quick Start Summary:**

1. Start pgAdmin: `docker-compose up -d pgadmin`
2. Open browser: http://localhost:5050
3. Login: `admin@admin.com` / `admin`
4. Add server with host: `postgres`, database: `mydb`, user: `user`, password: `password`
5. Done! 🎉
