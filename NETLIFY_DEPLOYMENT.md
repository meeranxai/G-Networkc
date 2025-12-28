# G-Network - Netlify Deployment Guide

## Quick Deploy to Netlify

### Method 1: Direct GitHub Integration
1. Push this repository to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Connect your GitHub account
5. Select this repository
6. Netlify will auto-detect settings from `netlify.toml`
7. Click "Deploy site"

### Method 2: Drag & Drop
1. Build locally: `cd frontend && npm run build`
2. Drag the `frontend/dist` folder to Netlify dashboard

## Environment Variables
Set these in Netlify dashboard under Site settings > Environment variables:

```
VITE_API_URL=https://your-backend-url.com
```

## Build Settings (Auto-configured via netlify.toml)
- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `frontend/dist`

## Backend Deployment
Deploy your backend separately on:
- Railway: `railway.app`
- Render: `render.com`
- Heroku: `heroku.com`

Then update `VITE_API_URL` in Netlify environment variables.

## Features Included
- ✅ SPA routing with redirects
- ✅ Optimized caching headers
- ✅ Environment variables support
- ✅ Auto-build from Git
- ✅ React Router support

## Post-Deployment
1. Update backend CORS to include your Netlify domain
2. Test all features work with production URLs
3. Set up custom domain (optional)

Your G-Network app is now ready for Netlify! 🚀