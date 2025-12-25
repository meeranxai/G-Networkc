# Backend Server Restart Karne Ka Tarika (Roman Urdu)

## ⚠️ **Server Pehle Se Chal Raha Hai!**

Port 5000 already use ho raha hai. Matlab backend server already running hai.

## 🔧 **Proper Restart Kaise Kare:**

### **Option 1: Manual Stop & Start (Recommended)**

1. **Pehle running server ko dhundo:**
   - Task Manager kholo (Ctrl+Shift+Esc)
   - "Details" tab pe jao
   - "node.exe" search karo
   - Sabhi node.exe processes ko "End Task" karo

2. **Fresh start karo:**
   ```bash
   cd "c:\Project_Based Learning\CODE ME\G-Network\backend"
   node server.js
   ```

### **Option 2: PowerShell Se (Quick)**

```powershell
# Sabhi node processes ko force stop karo
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2 second wait karo
Start-Sleep -Seconds 2

# Fresh start karo
cd "c:\Project_Based Learning\CODE ME\G-Network\backend"
node server.js
```

### **Option 3: Port Ko Free Karo (Advanced)**

```powershell
# Dekho kon port 5000 use kar raha hai
netstat -ano | findstr :5000

# Output mein last number = Process ID
# Example: TCP 0.0.0.0:5000 ... LISTENING 1234
#                                          ^^^^
#                                       Process ID

# Us process ko kill karo
taskkill /PID 1234 /F

# Ab server start karo
cd backend
node server.js
```

## ✅ **Server Successfully Start Hone Ke Signs:**

Terminal mein ye messages aane chahiye:
```
Server running on port 5000
MongoDB Connected
```

**Agar ye error aaye:**
- `Error: listen EADDRINUSE` → Port already used hai
- `MongoDB connection error` → MongoDB nahi chal raha
- `Cannot find module` → Dependencies missing hain

## 🧪 **Test Karo Server Chal Raha Hai:**

### **Method 1: Browser Mein**
```
http://localhost:5000/api/health
```
Agar response aaye (kuch bhi), to server chal raha hai ✓

### **Method 2: PowerShell Mein**
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/users" -Method GET
```

### **Method 3: cURL (Git Bash/WSL)**
```bash
curl http://localhost:5000/api/health
```

## 🔍 **Agar Server Start Nahi Ho Raha:**

### **Problem 1: Port Busy**
```powershell
# Check who's using port 5000
netstat -ano | findstr :5000

# Kill that process
taskkill /PID <process_id> /F
```

### **Problem 2: MongoDB Not Running**
```bash
# Start MongoDB service
# Windows Services mein jao ya:
net start MongoDB
```

### **Problem 3: Dependencies Missing**
```bash
cd backend
npm install
```

## 📋 **Current Status Check:**

```powershell
# Ye command run karo:
Get-Process -Name node | Select-Object Id, ProcessName, StartTime, Path

# Output dekhega:
# Id   ProcessName  StartTime              Path
# ---  -----------  ---------              ----
# 2164 node         12/25/2025 7:55:41 PM  C:\...\node.exe
```

**Agar 4 ya zyada node processes chal rahi hain:**
- Sab ko band karo
- Fresh start karo

## 🎯 **Recommended: Terminal Management**

**Best Practice:**
```
Terminal 1: Frontend
cd "c:\Project_Based Learning\CODE ME\G-Network"
python -m http.server 8080

Terminal 2: Backend
cd "c:\Project_Based Learning\CODE ME\G-Network\backend"
node server.js

Terminal 3: Testing/Commands
# Yahan testing commands run karo
```

## ⚡ **Quick Commands Reference:**

```powershell
# Kill all node
Get-Process node | Stop-Process -Force

# Start backend
cd backend; node server.js

# Check if running
curl http://localhost:5000

# View logs
# (Backend terminal mein dikhengi automatically)
```

## 💡 **Pro Tip:**

**VS Code ya Windows Terminal use karo:**
- Split terminals
- Ek mein Frontend
- Dusre mein Backend  
- Dono sath dikhengi

## ✅ **Success Check:**

Server successfully chal raha hai agar:
- [ ] Terminal mein "Server running on port 5000"
- [ ] Terminal mein "MongoDB Connected"
- [ ] `http://localhost:5000` browser mein khulta hai
- [ ] Koi error nahi terminal mein
- [ ] Follow button kaam karta hai

## 🚀 **Ab Follow Button Test Karo:**

1. Browser refresh karo (Ctrl+Shift+R)
2. Account 1 se login karo
3. Feed pe jao
4. Account 2 ki post pe "Follow" click karo
5. Should work now! ✅

**Agar abhi bhi "Action Failed" aaye:**
- F12 press karo
- Console tab dekho
- Network tab dekho
- Backend terminal dekho
- Error message screenshot bhejo mujhe!
