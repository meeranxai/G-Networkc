# G-Network Deployment Guide

## 1. Frontend Deployment (Vercel)
**Host:** Vercel (Best for Vite/React apps)
**Repository:** `https://github.com/meeranxai/G-Networkc.git`

### Steps:
1.  Log in to [Vercel](https://vercel.com).
2.  Click **"Add New"** > **"Project"**.
3.  Import the `G-Networkc` repository.
4.  **Framework Preset:** Select `Vite`.
5.  **Root Directory:** click `Edit` and select `frontend`.
6.  **Environment Variables:** Add the following (copy from your local `.env` or `firebase.js`):
    *   `VITE_API_URL`: `https://<YOUR_RAILWAY_BACKEND_URL>.up.railway.app` (You will update this AFTER deploying the backend)
    *   `VITE_FIREBASE_API_KEY`: `AIzaSyD8Sg8rBwkCS4BYwgVrb_V_KQ4eMd0PkZ0`
    *   `VITE_FIREBASE_AUTH_DOMAIN`: `g-network-community.firebaseapp.com`
    *   `VITE_FIREBASE_PROJECT_ID`: `g-network-community`
    *   `VITE_FIREBASE_STORAGE_BUCKET`: `g-network-community.firebasestorage.app`
    *   `VITE_FIREBASE_MESSAGING_SENDER_ID`: `358032029950`
    *   `VITE_FIREBASE_APP_ID`: `1:358032029950:web:a8dc470de9d85ead240daf`
7.  Click **Deploy**.

---

## 2. Backend Deployment (Railway)
**Host:** Railway (Best for Node.js + MongoDB)
**Repository:** `https://github.com/meeranxai/G-Networkc.git`

### Steps:
1.  Log in to [Railway](https://railway.app).
2.  Click **"New Project"** > **"Deploy from GitHub repo"**.
3.  Select `G-Networkc`.
4.  **Root Directory:** Go to Settings > General > Root Directory and set it to `/backend`.
5.  **Variables:** Go to the **Variables** tab and add:
    *   `NODE_ENV`: `production`
    *   `PORT`: `5000`
    *   `MONGO_URI`: `mongodb+srv://...` (Your MongoDB production connection string)
    *   `FRONTEND_URL`: `https://<YOUR_VERCEL_APP_URL>.vercel.app` (Copy from Vercel dashboard)
    *   `JWT_SECRET`: (Generate a random secure string)
    *   `SESSION_SECRET`: (Generate a random secure string)
    *   `GOOGLE_API_KEY`: (If using AI features)
6.  Wait for the deployment to finish.
7.  Copy the **Public URL** provided by Railway.

---

## 3. Post-Deployment Linking (CRITICAL)

### A. Update Frontend with Backend URL
1.  Go back to your **Vercel Project Settings** > **Environment Variables**.
2.  Edit `VITE_API_URL` and paste your **Railway Backend URL** (e.g., `https://g-network-production.up.railway.app`).
3.  **Redeploy** the frontend (Deployments > Redeploy) for changes to take effect.

### B. Update Firebase Authorized Domains
**If you don't do this, Login will fail!**
1.  Go to [Firebase Console](https://console.firebase.google.com).
2.  Select your project > **Authentication** > **Settings** > **Authorized Domains**.
3.  Add your Vercel domain (e.g., `g-network.vercel.app`).

### C. Update Backend CORS
1.  Ensure your **Railway Variable** `FRONTEND_URL` exactly matches your Vercel domain (no trailing slash).
