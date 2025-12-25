# Follow Button Testing Instructions

## Step 1: Check if Backend is Running

Your backend server should already be running on port 5000. 

**To verify**, open a new terminal and run:
```bash
curl http://localhost:5000/api/health
```

If you get a response, the backend is running. ✅

If not, start it:
```bash
cd "c:\Project_Based Learning\CODE ME\G-Network\backend"
node server.js
```

## Step 2: Open the App with DevTools

1. Open Chrome/Edge browser
2. Press **F12** to open DevTools
3. Go to the **Console** tab
4. Navigate to: http://localhost:8080/index.html
5. Log in if needed

## Step 3: Test Follow Button on Feed

1. Scroll through the feed
2. Find a post from another user (not your own)
3. You should see a **"Follow"** button next to their name
4. **Click the Follow button**
5. **Watch the Console** - you should see:
   ```
   Follow button clicked: { authorId: "...", authorName: "...", currentUserId: "..." }
   Action: follow
   Calling API: http://localhost:5000/api/users/follow
   Payload: { userId: "...", targetUid: "..." }
   Response status: 200
   Response data: { success: true, isFollowing: true }
   ```

## Step 4: What to Report

**If you see an error**, copy these from the console and send to me:
- The full console output when you click Follow
- Any red error messages
- The "Response data" JSON

**Common Issues:**

### Error: "Cannot read property 'uid' of null"
- You're not logged in
- Refresh and log in again

### Error: "Response status: 404"
- The API endpoint doesn't exist
- Backend server might not be running

### Error: "Response status: 500" 
- Server error
- Check backend console for MongoDB errors

### Error: "Network error: Failed to fetch"
- Backend not running
- OR CORS issue
- Check CONFIG.API_BASE_URL in config.js

### Error: "User not found"
- The targetUid doesn't exist in the database
- This is OK for test data

## Step 5: Test Profile Follow

1. Click on a posts author name
2. You'll go to their profile
3. Click the **"Follow"** button in the profile header
4. Check console for the same logs

## What Should Happen (Success):

1. Button text changes: "Follow" → "Following" ✅
2. Icon changes: plus → checkmark ✅
3. Toast appears: "Now following [Name]" ✅
4. Console shows: `Response data: { success: true }` ✅
5. User is added to your following list ✅

## Send Me:

1. **Screenshot of the console** after clicking Follow
2. **The error message** from the toast
3. **Any red errors** in the console
4. **Backend console output** (if you can access it)

This will help me identify exactly what's failing!
