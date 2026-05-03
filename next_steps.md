# Next Steps

You've successfully pushed your unified codebase to GitHub! Since you are using Hostinger VPS with **Coolify**, the deployment process is much smoother than a manual VPS setup. 

However, based on my analysis of the live site (`manapgrent.in`), **Coolify has currently deployed your application as a "Static Site" rather than a Node.js Docker container.** 

Because of this, Nginx is just serving your `frontend/landing` HTML files. When you visit `/admin/login`, it falls back to the landing page, and when you try to access the API, Nginx blocks it.

Here are your exact next steps to fix the live website and get the portals and database running:

### 1. Reconfigure the App in Coolify
1. Go to your Coolify Dashboard.
2. Select your `HostelAPP` application.
3. Go to **Configuration**. You need to change the **Build Pack** setting from whatever it is currently (likely "Static Web" or "Nixpacks") to **Dockerfile**.
   - *Why?* We have a custom `Dockerfile` in the repository that builds the React portals and sets up the Node.js backend to serve *everything* together on Port 5000. Coolify needs to use this file.
4. Ensure the **Ports Exposes** setting is set to `5000`.

### 2. Set Up the PostgreSQL Database in Coolify
Since you are unsure about database management, here is the easiest way to handle it:
1. Do not install Postgres manually on the VPS. Instead, let Coolify manage it!
2. In your Coolify Project, click **+ New Resource** -> **Database** -> **PostgreSQL**.
3. Start the database. Once started, look at its **Configuration** tab.
4. Note down the **Internal Host**, **Database Name**, **User**, and **Password**.

### 3. Add Environment Variables
Go back to your `HostelAPP` application in Coolify, open the **Environment Variables** tab, and add your database credentials so the Node.js backend can connect to it:
- `DB_HOST`: (The internal host from the DB step above, e.g., `postgresql-xxxx`)
- `DB_PORT`: `5432`
- `DB_NAME`: `postgres` (or whatever you named it)
- `DB_USER`: `postgres`
- `DB_PASSWORD`: (Your DB password)
- `JWT_SECRET`: (Create a random secure string)
- `PORT`: `5000`

### 4. Deploy and Initialize Tables
1. Click **Deploy** on your Coolify application. 
2. Once the deployment finishes, the website at `manapgrent.in` will now be powered by your Node.js backend! The Owner and Tenant portals will load correctly.
3. Finally, you must create the database tables. In Coolify, go to the **Terminal** tab for your running application container and execute:
   ```bash
   node src/models/db_setup.js
   ```
   *This creates the `OWNERS`, `TENANTS`, `ROOMS`, and `PAYMENTS` tables.*

### 5. Final Verification
- Visit `https://manapgrent.in/admin/login` – It should now load the Owner Portal.
- Try creating a new Owner account to verify that the API and Database connection are working correctly.

> I have also updated `deployment_guide.md` with these exact Coolify-specific steps so you have a permanent reference in your codebase!
