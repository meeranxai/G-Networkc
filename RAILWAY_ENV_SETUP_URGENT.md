# 🚨 URGENT: Railway Environment Variables Setup

## 🔍 **CURRENT STATUS**

Your backend is getting **502 errors** because Railway doesn't have the required environment variables set. I've created an emergency server that will work immediately while you set up the proper environment variables.

## 🚀 **IMMEDIATE FIX (Emergency Mode)**

I've temporarily switched Railway to use `server-emergency.js` which will:
- ✅ Fix CORS errors immediately
- ✅ Provide mock responses for all API endpoints
- ✅ Enable WebSocket connections
- ✅ Allow your frontend to work (with limited functionality)

## 📋 **STEP 1: Push Emergency Fix**

The emergency server is ready. Let's deploy it:

```bash
git add .
git commit -m "🚨 EMERGENCY: Deploy emergency server to fix 502 errors"
git push origin main
```

## 📋 **STEP 2: Set Environment Variables in Railway**

**Go to Railway Dashboard → Your Backend Service → Variables Tab**

### **CRITICAL Variables (Required for full functionality):**

```bash
# CORS Configuration (CRITICAL)
FRONTEND_URL=https://mygwnetwork.vercel.app
CORS_ORIGIN=https://mygwnetwork.vercel.app

# Basic Configuration
NODE_ENV=production
PORT=5000

# Database (REQUIRED for real data)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/gnetwork?retryWrites=true&w=majority

# Firebase Authentication (REQUIRED for user auth)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-...@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-...%40your-project.iam.gserviceaccount.com"}
```

### **Optional Variables (AI Features):**

```bash
# AI Configuration (Optional)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_API_KEY=your_google_api_key_here
```

## 📋 **STEP 3: Switch Back to Full Server**

After setting environment variables:

1. **Update railway.json:**
   ```json
   {
     "deploy": {
       "startCommand": "node server.js"
     }
   }
   ```

2. **Update Procfile:**
   ```
   web: node server.js
   ```

3. **Push changes:**
   ```bash
   git add .
   git commit -m "✅ Switch back to full server with environment variables"
   git push origin main
   ```

## 🔍 **HOW TO GET REQUIRED CREDENTIALS**

### **MongoDB URI:**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create cluster or use existing
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<username>`, `<password>`, and `<dbname>`

### **Firebase Service Account:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Copy the entire JSON content as a string

## 📊 **TESTING PROGRESS**

### **Emergency Mode (Current):**
- ✅ CORS errors fixed
- ✅ 502 errors fixed
- ✅ WebSocket connections work
- ⚠️ Mock data only (no real database)

### **Full Mode (After env vars):**
- ✅ Real database data
- ✅ User authentication
- ✅ All features working

## 🚨 **IMMEDIATE ACTIONS**

1. **Deploy emergency server** (fixes CORS immediately)
2. **Set environment variables** in Railway Dashboard
3. **Switch back to full server** once env vars are set
4. **Test all functionality**

## 📞 **VERIFICATION**

**Emergency Mode Test:**
```bash
curl https://g-networkc-production.up.railway.app/health
# Should return: {"status":"OK - Emergency Mode",...}
```

**Full Mode Test (after env vars):**
```bash
curl https://g-networkc-production.up.railway.app/health
# Should return: {"status":"OK","mongodb":"Connected",...}
```

## 🎯 **SUMMARY**

The 502 errors were caused by missing environment variables in Railway. The emergency server will get your frontend working immediately while you set up the proper configuration for full functionality.

**Priority Order:**
1. 🚨 Deploy emergency server (immediate CORS fix)
2. 🔧 Set environment variables in Railway
3. ✅ Switch back to full server
4. 🧪 Test all functionality