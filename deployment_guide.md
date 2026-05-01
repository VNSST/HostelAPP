# 🚀 Mana PG Rent — Hostinger VPS Deployment Guide

> [!IMPORTANT]
> This app requires **Hostinger VPS** (KVM plans). Shared hosting and website builder plans do **NOT** support Node.js or PostgreSQL.

## Prerequisites

| Requirement | Details |
|---|---|
| **Hostinger Plan** | VPS KVM (any tier — KVM 1 is enough to start) |
| **OS** | Ubuntu 22.04 (recommended) |
| **Domain** | e.g. `pgrentflow.com` (optional, can use VPS IP) |

---

## Step 1: Set Up Your VPS

### 1.1 — Get your VPS details from Hostinger

After purchasing VPS, go to **Hostinger Panel → VPS → Manage** and note:
- **IP Address** (e.g. `103.45.67.89`)
- **Root Password**

### 1.2 — Connect via SSH

```bash
ssh root@YOUR_VPS_IP
```

### 1.3 — Create a non-root user (recommended)

```bash
adduser pgadmin
usermod -aG sudo pgadmin
su - pgadmin
```

---

## Step 2: Install Dependencies on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # should show v20.x
npm -v

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Git
sudo apt install -y git

# Install PM2 (process manager to keep Node.js running)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx
```

---

## Step 3: Set Up PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside psql:
CREATE DATABASE hostel_db;
CREATE USER pguser WITH PASSWORD 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE hostel_db TO pguser;
\q
```

---

## Step 4: Upload Your Code

### Option A: Git (Recommended)

Push your code to GitHub/GitLab first, then:
```bash
cd /home/pgadmin
git clone https://github.com/YOUR_USERNAME/HOSTEL_APP.git
cd HOSTEL_APP
```

### Option B: SFTP Upload

Use FileZilla or WinSCP to upload the entire `HOSTEL_APP` folder to `/home/pgadmin/HOSTEL_APP`.

---

## Step 5: Configure the Backend

### 5.1 — Update `.env`

```bash
cd /home/pgadmin/HOSTEL_APP/backend
nano .env
```

Set these values:
```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=hostel_db
DB_USER=pguser
DB_PASSWORD=YourStrongPassword123!
JWT_SECRET=generate_a_long_random_string_here
```

> [!TIP]
> Generate a strong JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 5.2 — Install dependencies & run DB setup

```bash
npm install
node src/models/db_setup.js
```

---

## Step 6: Build the Frontends

```bash
# Build Admin frontend
cd /home/pgadmin/HOSTEL_APP/frontend/admin
npm install
npm run build

# Build Tenant frontend
cd /home/pgadmin/HOSTEL_APP/frontend/tenant
npm install
npm run build
```

This creates `dist/` folders in each frontend.

---

## Step 7: Update API URLs for Production

Before building, update the API base URLs in the frontends:

### `frontend/admin/src/api.js`
```js
// Change from:
const API_BASE = 'http://localhost:5000/api';
// To:
const API_BASE = '/api';  // Uses relative URL with Nginx proxy
```

### `frontend/tenant/src/api.js`
Same change:
```js
const API_BASE = '/api';
```

### `frontend/landing/index.html`
Update the portal links from `localhost` to your domain:
```html
<!-- Change localhost:3000 → admin.pgrentflow.com -->
<!-- Change localhost:3001 → tenant.pgrentflow.com -->
```

> [!WARNING]
> Make the API_BASE changes **BEFORE** running `npm run build` in Step 6, otherwise rebuild after making changes.

---

## Step 8: Configure Nginx (Reverse Proxy)

Nginx will serve everything on port 80/443 and route traffic appropriately.

```bash
sudo nano /etc/nginx/sites-available/pgrentflow
```

Paste this config:

```nginx
# Landing page + API backend
server {
    listen 80;
    server_name pgrentflow.com www.pgrentflow.com;

    # Landing page static files
    root /home/pgadmin/HOSTEL_APP/frontend/landing;
    index index.html;

    # API proxy to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Uploaded files
    location /uploads/ {
        alias /home/pgadmin/HOSTEL_APP/uploads/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Admin Portal
server {
    listen 80;
    server_name admin.pgrentflow.com;

    root /home/pgadmin/HOSTEL_APP/frontend/admin/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /home/pgadmin/HOSTEL_APP/uploads/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Tenant Portal
server {
    listen 80;
    server_name tenant.pgrentflow.com;

    root /home/pgadmin/HOSTEL_APP/frontend/tenant/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /home/pgadmin/HOSTEL_APP/uploads/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable the config:

```bash
sudo ln -s /etc/nginx/sites-available/pgrentflow /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default   # Remove default
sudo nginx -t                               # Test config
sudo systemctl restart nginx
```

---

## Step 9: Start Backend with PM2

```bash
cd /home/pgadmin/HOSTEL_APP/backend
pm2 start src/index.js --name "pgrentflow-api"
pm2 save
pm2 startup   # Auto-start on reboot (run the command it outputs)
```

**Useful PM2 commands:**
```bash
pm2 status          # Check if running
pm2 logs            # View logs (OTPs will show here!)
pm2 restart all     # Restart after code changes
```

---

## Step 10: Set Up Your Domain (DNS)

In **Hostinger DNS Zone Editor** or your domain registrar, add these records:

| Type | Name | Value |
|---|---|---|
| A | `@` | `YOUR_VPS_IP` |
| A | `www` | `YOUR_VPS_IP` |
| A | `admin` | `YOUR_VPS_IP` |
| A | `tenant` | `YOUR_VPS_IP` |

---

## Step 11: Enable HTTPS (SSL) — Free with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pgrentflow.com -d www.pgrentflow.com -d admin.pgrentflow.com -d tenant.pgrentflow.com
```

Follow the prompts. Certbot auto-configures Nginx for HTTPS. ✅

---

## Step 12: Update CORS in Backend

Edit `backend/src/index.js` to allow your production domains:

```js
app.use(cors({
  origin: [
    'https://pgrentflow.com',
    'https://admin.pgrentflow.com',
    'https://tenant.pgrentflow.com'
  ],
  credentials: true
}));
```

Then restart: `pm2 restart pgrentflow-api`

---

## Final URLs

| What | URL |
|---|---|
| 🏠 **Landing Page** | `https://pgrentflow.com` |
| 🏢 **Owner Portal** | `https://admin.pgrentflow.com` |
| 🔑 **Tenant Portal** | `https://tenant.pgrentflow.com` |
| ⚙️ **API** | `https://pgrentflow.com/api/` |

---

## Quick Reference — Common Tasks

```bash
# SSH into server
ssh pgadmin@YOUR_VPS_IP

# View backend logs & OTPs
pm2 logs

# Restart after code update
cd /home/pgadmin/HOSTEL_APP
git pull
cd backend && npm install && pm2 restart pgrentflow-api
cd ../frontend/admin && npm install && npm run build
cd ../frontend/tenant && npm install && npm run build

# Check database
sudo -u postgres psql -d hostel_db -c "SELECT * FROM owners;"

# Restart Nginx
sudo systemctl restart nginx
```

---

> [!CAUTION]
> **Before going live, remember to:**
> 1. Replace mock OTP with a real SMS provider (Twilio/MSG91)
> 2. Use a strong, unique JWT_SECRET
> 3. Enable PostgreSQL password authentication in `pg_hba.conf`
> 4. Set up automated database backups
> 5. Update the landing page download links when apps are published
