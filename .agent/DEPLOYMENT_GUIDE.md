# G-Network Deployment Guide

## 1. Backend Deployment (Railway or Render)

Because your project has a separate Backend (Node.js) and Frontend (React), it is best to deploy them separately.

### Option A: Railway (Recommended)
1.  Sign up at [Railway.app](https://railway.app/).
2.  Create a "New Project" -> "Deploy from GitHub repo".
3.  Select your G-Network repository.
4.  **Important**: It might try to deploy the root. You need to configure it for the `backend`.
    *   Go to **Settings** > **Root Directory** and set it to `/backend`.
5.  **Variables**: Add the following Environment Variables:
    *   `PORT`: `5000` (or leave default, Railway assigns one)
    *   `MONGO_URI`: Your MongoDB Atlas Connection String
6.  Once deployed, Railway will give you a **Domain** (e.g., `g-network-production.railway.app`). **Copy this.**

### Option B: Render
1.  Sign up at [Render.com](https://render.com/).
2.  Create "New Web Service".
3.  Connect GitHub repo.
4.  **Root Directory**: `backend`
5.  **Build Command**: `npm install`
6.  **Start Command**: `node server.js`
7.  **Environment Variables**: Add `MONGO_URI`.

---

## 2. Frontend Deployment (Vercel)

1.  Sign up at [Vercel.com](https://vercel.com/).
2.  "Add New..." -> "Project".
3.  Import your G-Network repository.
4.  **Framework Preset**: It should auto-detect "Vite".
5.  **Root Directory**: Click "Edit" and select `frontend`.
6.  **Environment Variables**:
    *   **Name**: `VITE_API_URL`
    *   **Value**: Paste your Backend URL from Step 1 (e.g., `https://g-network-production.railway.app`).  
        *Note: Do NOT add a trailing slash (/) at the end.*
7.  Click **Deploy**.

## 3. Verify
*   Open your Vercel URL.
*   Check if Posts load (fetch requests).
*   Check if Chat connects (Socket.io).
*   Check if Images load.

## Note on Images
Currently, images are uploaded to the local `backend/uploads` folder.
*   On **Railway/Render (Free Tier)**, files uploaded will **disappear** when the server restarts/redeploys (Ephemeral filesystem).
*   **Recommendation**: For a real production app, move to **Cloudinary** or **AWS S3** for image storage.
