# G-Network Backend - Deployment Guide

## Environment Variables Required

### Essential Variables
```bash
PORT=5000
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
FRONTEND_URL=https://your-netlify-app.netlify.app
CORS_ORIGIN=https://your-netlify-app.netlify.app
```

### Optional AI Features
```bash
# Get from https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
ENABLE_AI_ANALYSIS=true
AI_ENABLE_CACHE=true
AI_ENABLE_LOGGING=true
```

## Deployment Options

### 1. Railway (Recommended)
1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Select `backend` folder as root
4. Add environment variables
5. Deploy automatically

### 2. Render
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Set **Root Directory**: `backend`
5. Set **Build Command**: `npm install`
6. Set **Start Command**: `npm start`
7. Add environment variables

### 3. Heroku
```bash
# Install Heroku CLI
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set MONGO_URI="your_mongodb_string"
heroku config:set FRONTEND_URL="https://your-netlify-app.netlify.app"
# Add other environment variables
git subtree push --prefix backend heroku main
```

## Important Notes

### AI Features
- **Without GROQ_API_KEY**: App works with fallback analysis
- **With GROQ_API_KEY**: Full AI content analysis enabled
- Get free API key from [console.groq.com](https://console.groq.com/keys)

### CORS Configuration
- Update `FRONTEND_URL` and `CORS_ORIGIN` to your Netlify domain
- Example: `https://gnetworkc.netlify.app`

### MongoDB
- Use MongoDB Atlas (free tier available)
- Connection string format: `mongodb+srv://username:password@cluster.mongodb.net/database`

## Post-Deployment
1. Test API endpoints: `https://your-backend-url.com/api/health`
2. Update frontend `VITE_API_URL` environment variable
3. Redeploy frontend with new backend URL

## Troubleshooting
- **GROQ Error**: Set `GROQ_API_KEY` or app will use fallback mode
- **CORS Error**: Check `FRONTEND_URL` matches your Netlify domain
- **MongoDB Error**: Verify connection string and network access

Your backend is now ready for production! 🚀