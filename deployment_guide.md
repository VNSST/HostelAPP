# 🚀 Mana PG Rent — Coolify Deployment Guide (Hostinger VPS)

This guide walks you through deploying the unified Mana PG Rent application (Landing Page, Admin Portal, and Tenant Portal) on a Hostinger VPS using **Coolify**.

> [!IMPORTANT]
> Since we use a `Dockerfile` to build everything into a single Node.js container on port `5000`, the deployment process in Coolify is very straightforward.

---

## Step 1: Create the PostgreSQL Database in Coolify

Before deploying the application, you need to set up the database so you can link it to the app.

1. Open your **Coolify Dashboard**.
2. Go to your Project / Environment and click **+ New Resource**.
3. Select **Database** -> **PostgreSQL**.
4. Leave the default settings or customize the name. Click **Save** and then **Start**.
5. Once the database is running, go to its **Configuration** tab. Note down the following details:
   - **Internal Host** (usually something like `postgresql-xxxx`)
   - **Database Name** (usually `postgres` or `hostel_db`)
   - **Database User** (usually `postgres`)
   - **Database Password**

---

## Step 2: Deploy the Application

1. In your Coolify Project, click **+ New Resource** and select **Public Repository** (or **Private Repository** if it's private).
2. Enter your GitHub repository URL (`https://github.com/VNSST/HostelAPP`).
3. Under **Build Pack**, make sure to select **Dockerfile**.
   > [!WARNING]
   > **CRITICAL:** Do NOT select "Static Web" or "Nixpacks". Coolify might auto-detect the HTML files and try to deploy it as a Static Site. If it deploys as a static site, the backend will not run, and the portals will fail to load. **You must use Dockerfile.**
4. Click **Save**.

---

## Step 3: Configure Application Settings

Before clicking "Deploy", configure the following settings in your new Application resource:

### Ports
- Under **Configuration -> General**, find the **Ports Exposes** setting.
- Set it to exactly `5000`. (This tells Coolify to route web traffic to port 5000 inside the Docker container).

### Environment Variables
- Go to the **Environment Variables** tab and add the following:

| Key | Value | Notes |
|---|---|---|
| `PORT` | `5000` | The port the Node.js app runs on |
| `DB_HOST` | *(The internal host from Step 1)* | e.g. `postgresql-abcd` |
| `DB_PORT` | `5432` | Standard Postgres port |
| `DB_NAME` | *(Database name from Step 1)* | e.g. `postgres` |
| `DB_USER` | *(Database user from Step 1)* | e.g. `postgres` |
| `DB_PASSWORD` | *(Database password from Step 1)* | Your secure password |
| `JWT_SECRET` | `generate-a-strong-random-string` | Used for user logins |
| `SMTP_HOST` | `smtp.hostinger.com` | (Optional) For emails |
| `SMTP_PORT` | `465` | (Optional) For emails |
| `SMTP_SECURE`| `true` | (Optional) For emails |
| `SMTP_USER` | `your_email@manapgrent.in` | (Optional) For emails |
| `SMTP_PASS` | `your_email_password` | (Optional) For emails |

---

## Step 4: Add Your Domain

1. In the **Configuration -> General** tab of your application, look for the **Domains** field.
2. Enter your domain with `https://`: `https://manapgrent.in,https://www.manapgrent.in`
3. Make sure you have pointed your domain's DNS A-records (both `@` and `www`) to your Hostinger VPS IP Address.
4. Coolify will automatically provision free SSL certificates (Let's Encrypt) for these domains.

---

## Step 5: Deploy!

1. Click the **Deploy** button at the top right of the Coolify dashboard.
2. Coolify will:
   - Check out your repository
   - Run the `Dockerfile` (which builds the React portals and prepares the Node.js backend)
   - Start the container running `node src/index.js`
3. Check the **Deployments** tab to watch the build logs and ensure everything succeeds.

---

## Step 6: Initialize the Database Tables

Once the app is deployed and running, you need to create the database tables.

1. In Coolify, go to your Application's dashboard.
2. Open the **Terminal** tab for the running container.
3. Run the database setup script manually:
   ```bash
   node src/models/db_setup.js
   ```
4. You should see a success message indicating that the tables (`OWNERS`, `HOSTELS`, `TENANTS`, `PAYMENTS`, etc.) have been created.

---

## Troubleshooting

- **I only see the landing page, even on `/admin/login`!**
  You accidentally deployed the app as a Static Site instead of using the Dockerfile. Go to your application settings, change the Build Pack to **Dockerfile**, and redeploy.
- **The API returns `405 Method Not Allowed`.**
  Same as above. The Nginx static server is intercepting API requests. Use the Dockerfile build pack.
- **Internal Server Error when logging in.**
  Check the Application Logs in Coolify. Usually, this means the database connection failed. Double-check your `DB_HOST`, `DB_USER`, and `DB_PASSWORD` environment variables.
