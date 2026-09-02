# Deploying AeroMed to Vercel (Step-by-Step Guide)

AeroMed is configured for full-stack deployment on **Vercel** with a unified configuration:
- **Frontend:** Built via Vite to `client/dist` and served through Vercel's global Edge CDN.
- **Backend:** Exported as a high-performance Serverless Function via [`api/index.js`](file:///d:/ambulance/api/index.js) handling all `/api/*` REST endpoints.
- **Database:** Seeded SQLite database (`dev.db`) is bundled and mounted into `/tmp/dev.db` on cold-start so that reads and writes (case creation, dispatch, inventory deductions, and maintenance orders) work seamlessly in serverless execution.

---

## 🛠️ Deployment Configuration Pre-Configured in Repo

The repository already includes:
1. **[`vercel.json`](file:///d:/ambulance/vercel.json):**
   - Directs build output to `client/dist`.
   - Rewrites `/api/(.*)` to the serverless function `api/index.js`.
   - Rewrites `/(.*)` to `/index.html` for single-page client routing.
   - Bundles `server/prisma/dev.db` with the serverless function.
2. **[`api/index.js`](file:///d:/ambulance/api/index.js):**
   - Serverless entrypoint exporting Express `app`.
   - Copies `dev.db` to `/tmp/dev.db` for write permissions.
3. **[`package.json`](file:///d:/ambulance/package.json):**
   - Contains `npm run vercel-build` which generates Prisma Client and compiles Vite.

---

## 🚀 Deployment Method 1: Deploy via Vercel CLI (Quickest)

You can deploy directly from your local terminal using the Vercel CLI without installing anything globally:

### Step 1: Run Vercel CLI
Open PowerShell in the project root (`d:\ambulance`):
```powershell
npx vercel
```

### Step 2: Answer the Setup Prompts
- **Set up and deploy “d:\ambulance”?** `y`
- **Which scope do you want to deploy to?** *(Select your Vercel account)*
- **Link to existing project?** `n`
- **What’s your project’s name?** `aeromed-fleet` *(or press Enter for default)*
- **In which directory is your code located?** `./` *(press Enter)*
- **Want to modify these settings?** `n` *(press Enter, settings from `vercel.json` are automatically used)*

### Step 3: Deploy to Production
Once the preview URL is generated, deploy to production:
```powershell
npx vercel --prod
```

Your live URL will be displayed in the terminal:
👉 `https://aeromed-fleet.vercel.app`

---

## 🐙 Deployment Method 2: Deploy via GitHub (Recommended for CI/CD)

### Step 1: Push Code to a GitHub Repository
If you haven't initialized Git yet:
```powershell
cd d:\ambulance
git init
git add .
git commit -m "feat: complete AeroMed MVP with Vercel configuration"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aeromed-fleet.git
git push -u origin main
```

### Step 2: Import into Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new) and log in.
2. Select your `aeromed-fleet` repository and click **Import**.
3. In the **Configure Project** screen:
   - **Framework Preset:** Select **Other** (or **Vite**).
   - **Root Directory:** Keep `./` (root).
   - **Build and Output Settings:** (Automatically detected from `vercel.json`):
     - **Build Command:** `npm run vercel-build`
     - **Output Directory:** `client/dist`
4. **Environment Variables:**
   Add these two variables under **Environment Variables**:
   | Key | Value |
   | :--- | :--- |
   | `JWT_SECRET` | `aeromed_super_secret_jwt_key_chennai_2026` |
   | `NODE_ENV` | `production` |
5. Click **Deploy**!

Within 1–2 minutes, Vercel will build the frontend, package the serverless API, and provide your live URL.

---

## 🧪 Post-Deployment Verification Checklist

Once your Vercel site is live:
1. **Open your URL:** e.g. `https://your-project.vercel.app`.
2. **Test Login:** Click the **Operator** or **Administrator** demo card to sign in.
3. **Test API Health:** Navigate to `https://your-project.vercel.app/api/health` — it should return:
   ```json
   {
     "status": "OK",
     "service": "AeroMed Emergency Fleet Management Backend",
     "environment": "production"
   }
   ```
4. **Test Live GIS Map:**
   - Go to **Live Telematics Map**.
   - Click **`TN-01-EM-1001`** under *"Touch Vehicle to Trace Lines"*.
   - Confirm that the **🔴 Red Route** and **🟢 Green Route** trace the shortest road corridors!
