#!/usr/bin/env node

/**
 * Server Diagnostic Script
 * Tests server startup without full dependencies
 */

console.log('🔍 Diagnosing Server Issues...\n');

// Test 1: Check Node.js version
console.log('1. Node.js Version:', process.version);

// Test 2: Check environment variables
console.log('2. Environment Variables:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('   PORT:', process.env.PORT || 'undefined');
console.log('   MONGO_URI:', process.env.MONGO_URI ? 'SET' : 'NOT SET');
console.log('   FRONTEND_URL:', process.env.FRONTEND_URL || 'undefined');
console.log('   FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'SET' : 'NOT SET');

// Test 3: Check required modules
console.log('\n3. Testing Module Imports:');
const requiredModules = [
    'express',
    'mongoose', 
    'cors',
    'socket.io',
    'firebase-admin',
    'helmet',
    'morgan'
];

for (const module of requiredModules) {
    try {
        require(module);
        console.log(`   ✅ ${module}`);
    } catch (err) {
        console.log(`   ❌ ${module}: ${err.message}`);
    }
}

// Test 4: Check file existence
console.log('\n4. Checking Critical Files:');
const fs = require('fs');
const criticalFiles = [
    './config/db.js',
    './middleware/errorHandler.js',
    './middleware/rateLimiter.js',
    './routes/users.js',
    './routes/posts.js',
    './routes/chat.js'
];

for (const file of criticalFiles) {
    try {
        if (fs.existsSync(file)) {
            console.log(`   ✅ ${file}`);
        } else {
            console.log(`   ❌ ${file}: File not found`);
        }
    } catch (err) {
        console.log(`   ❌ ${file}: ${err.message}`);
    }
}

// Test 5: Try minimal server startup
console.log('\n5. Testing Minimal Server Startup:');
try {
    const express = require('express');
    const cors = require('cors');
    
    const app = express();
    
    // Basic CORS
    app.use(cors({
        origin: process.env.FRONTEND_URL || 'https://mygwnetwork.vercel.app',
        credentials: true
    }));
    
    app.use(express.json());
    
    // Test route
    app.get('/health', (req, res) => {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    });
    
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`   ✅ Minimal server started on port ${PORT}`);
        server.close(() => {
            console.log('   ✅ Server test completed successfully');
            process.exit(0);
        });
    });
    
    server.on('error', (err) => {
        console.log(`   ❌ Server startup failed: ${err.message}`);
        process.exit(1);
    });
    
} catch (err) {
    console.log(`   ❌ Minimal server test failed: ${err.message}`);
    process.exit(1);
}