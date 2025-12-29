const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");

require('dotenv').config();

const app = express();
const server = http.createServer(app);

console.log('🔍 Starting Debug Server...');
console.log('Environment Variables Check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- MONGO_URI:', process.env.MONGO_URI ? 'SET' : 'NOT SET');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('- FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'SET' : 'NOT SET');

// ================================
// BASIC CORS SETUP
// ================================
const corsOptions = {
    origin: [
        'https://mygwnetwork.vercel.app',
        'https://mygwnetwork-227iteo97-my-world-741435e1.vercel.app',
        'https://skynaire.vercel.app',
        'https://skynaire-git-main-my-world-741435e1.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================================
// DATABASE CONNECTION TEST
// ================================
let dbConnected = false;
let dbError = null;

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI environment variable not set');
        }
        
        console.log('🔌 Attempting MongoDB connection...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected Successfully');
        dbConnected = true;
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        dbError = err.message;
        dbConnected = false;
    }
};

connectDB();

// ================================
// FIREBASE ADMIN TEST
// ================================
let firebaseInitialized = false;
let firebaseError = null;

try {
    const admin = require('firebase-admin');
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin Initialized');
        firebaseInitialized = true;
    } else {
        console.warn('⚠️ Firebase Admin NOT initialized: FIREBASE_SERVICE_ACCOUNT not set');
        firebaseError = 'FIREBASE_SERVICE_ACCOUNT not set';
    }
} catch (error) {
    console.error('❌ Firebase Admin Initialization Error:', error.message);
    firebaseError = error.message;
}

// ================================
// SOCKET.IO SETUP
// ================================
const io = new Server(server, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000
});

// ================================
// DIAGNOSTIC ROUTES
// ================================

// Health Check with detailed diagnostics
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        diagnostics: {
            database: {
                connected: dbConnected,
                error: dbError,
                uri_set: !!process.env.MONGO_URI
            },
            firebase: {
                initialized: firebaseInitialized,
                error: firebaseError,
                service_account_set: !!process.env.FIREBASE_SERVICE_ACCOUNT
            },
            cors: {
                frontend_url: process.env.FRONTEND_URL,
                configured: true
            }
        }
    };
    
    res.status(200).json(healthStatus);
});

// Test endpoint
app.get('/test', (req, res) => {
    res.status(200).json({
        message: 'Debug server test successful!',
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
    });
});

// ================================
// SIMPLE API ROUTES (NO DATABASE)
// ================================

// Simple posts route without database dependency
app.get('/api/posts', async (req, res) => {
    try {
        console.log('📝 Posts API called');
        
        if (!dbConnected) {
            return res.status(200).json({
                posts: [],
                totalPosts: 0,
                hasMore: false,
                message: 'Database not connected',
                error: dbError
            });
        }
        
        // Try to load Post model
        const Post = require('./models/Post');
        console.log('✅ Post model loaded');
        
        // Simple query
        const posts = await Post.find().limit(10).sort({ createdAt: -1 });
        console.log(`✅ Found ${posts.length} posts`);
        
        res.json({
            posts: posts,
            totalPosts: posts.length,
            hasMore: false
        });
        
    } catch (err) {
        console.error('❌ Posts API Error:', err.message);
        res.status(500).json({ 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Simple stories route
app.get('/api/stories', async (req, res) => {
    try {
        console.log('📖 Stories API called');
        
        if (!dbConnected) {
            return res.status(200).json([]);
        }
        
        const Story = require('./models/Story');
        const stories = await Story.find().limit(10);
        
        res.json(stories);
        
    } catch (err) {
        console.error('❌ Stories API Error:', err.message);
        res.status(500).json({ 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Simple user sync
app.post('/api/users/sync', async (req, res) => {
    try {
        console.log('👤 User sync called:', req.body);
        
        if (!dbConnected) {
            return res.status(200).json({
                success: true,
                message: 'Database not connected - sync skipped',
                user: req.body
            });
        }
        
        res.json({
            success: true,
            user: req.body,
            message: 'Debug mode - sync successful'
        });
        
    } catch (err) {
        console.error('❌ User Sync Error:', err.message);
        res.status(500).json({ 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// ================================
// SOCKET.IO DEBUG
// ================================
io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);
    
    socket.emit('debug_mode', {
        message: 'Connected to debug server',
        timestamp: new Date().toISOString()
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });
});

// ================================
// ERROR HANDLERS
// ================================
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.path,
        method: req.method
    });
});

app.use((err, req, res, next) => {
    console.error('💥 Unhandled Error:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Debug Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Socket.io enabled`);
    console.log(`🔍 Debug mode active - Check /health for diagnostics`);
});

module.exports = { app, server, io };