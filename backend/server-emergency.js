const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");

require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ================================
// EMERGENCY CORS Configuration
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
// SOCKET.IO SETUP
// ================================
const io = new Server(server, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000
});

// ================================
// EMERGENCY ROUTES (No Database Required)
// ================================

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK - Emergency Mode',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        mode: 'emergency',
        message: 'Running without database - Set environment variables to enable full functionality'
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.status(200).json({
        message: 'CORS Test Successful - Emergency Mode!',
        origin: req.headers.origin,
        timestamp: new Date().toISOString(),
        mode: 'emergency'
    });
});

// Emergency API endpoints (mock responses)
app.get('/api/users/check-username/:username', (req, res) => {
    res.status(200).json({
        available: true,
        username: req.params.username,
        message: 'Emergency mode - username check disabled',
        mode: 'emergency'
    });
});

app.get('/api/posts', (req, res) => {
    res.status(200).json({
        posts: [],
        totalPosts: 0,
        hasMore: false,
        message: 'Emergency mode - Set MONGO_URI environment variable to enable database',
        mode: 'emergency'
    });
});

app.get('/api/stories', (req, res) => {
    res.status(200).json([]);
});

app.get('/api/notifications/:userId', (req, res) => {
    res.status(200).json([]);
});

app.get('/api/chat/unread-counts/:userId', (req, res) => {
    res.status(200).json([]);
});

app.get('/api/autonomous/theme/user/:userId', (req, res) => {
    res.status(200).json({
        theme: {
            primaryColor: '#1976d2',
            secondaryColor: '#dc004e',
            mode: 'light'
        },
        message: 'Emergency mode - Default theme provided',
        mode: 'emergency'
    });
});

app.post('/api/autonomous/track/interaction', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Emergency mode - Tracking disabled',
        mode: 'emergency'
    });
});

app.post('/api/users/sync', (req, res) => {
    res.status(200).json({
        success: true,
        user: req.body,
        message: 'Emergency mode - User sync disabled',
        mode: 'emergency'
    });
});

// Additional API endpoints that frontend might call
app.get('/api/users/:userId', (req, res) => {
    res.status(200).json({
        firebaseUid: req.params.userId,
        displayName: 'Emergency User',
        email: 'emergency@example.com',
        photoURL: '',
        followers: [],
        following: [],
        mode: 'emergency'
    });
});

app.get('/api/users/stats/:userId', (req, res) => {
    res.status(200).json({
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        mode: 'emergency'
    });
});

app.get('/api/posts/saved', (req, res) => {
    res.status(200).json({
        posts: [],
        mode: 'emergency'
    });
});

app.get('/api/posts/trending-hashtags', (req, res) => {
    res.status(200).json([]);
});

app.get('/api/users/search/all', (req, res) => {
    res.status(200).json([]);
});

app.get('/api/chat/history/:userId', (req, res) => {
    res.status(200).json([]);
});

app.get('/api/notifications/unread-count/:userId', (req, res) => {
    res.status(200).json({
        count: 0,
        mode: 'emergency'
    });
});

// Catch all API routes
app.all('/api/*', (req, res) => {
    res.status(200).json({
        message: `Emergency mode - ${req.method} ${req.path} endpoint disabled`,
        mode: 'emergency',
        instructions: 'Set MONGO_URI and FIREBASE_SERVICE_ACCOUNT environment variables to enable full functionality'
    });
});

// ================================
// SOCKET.IO EMERGENCY MODE
// ================================
io.on('connection', (socket) => {
    console.log('User Connected (Emergency Mode):', socket.id);
    
    socket.emit('emergency_mode', {
        message: 'Connected in emergency mode - Limited functionality',
        mode: 'emergency'
    });
    
    // Handle common socket events to prevent errors
    socket.on('user_online', (userData) => {
        console.log('User online (emergency mode):', userData?.firebaseUid);
        socket.emit('user_presence_changed', {
            firebaseUid: userData?.firebaseUid,
            isOnline: true,
            mode: 'emergency'
        });
    });
    
    socket.on('join_personal_room', (uid) => {
        socket.join(uid);
        console.log(`User ${uid} joined personal room (emergency mode)`);
    });
    
    socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        console.log(`Socket ${socket.id} joined chat room ${chatId} (emergency mode)`);
    });
    
    socket.on('send_message', (data) => {
        console.log('Message received (emergency mode):', data);
        socket.emit('error', { 
            message: 'Emergency mode - Messaging disabled. Set environment variables to enable.',
            mode: 'emergency'
        });
    });
    
    socket.on('typing', (data) => {
        // Ignore typing events in emergency mode
    });
    
    socket.on('mark_messages_read', (data) => {
        // Ignore read receipts in emergency mode
    });
    
    socket.on('clear_unread_count', (data) => {
        // Ignore unread count clearing in emergency mode
    });
    
    socket.on('disconnect', () => {
        console.log('User Disconnected (Emergency Mode):', socket.id);
    });
});

// ================================
// ERROR HANDLERS
// ================================
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.path,
        method: req.method,
        mode: 'emergency'
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        mode: 'emergency'
    });
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚨 Emergency Backend Server running on port ${PORT}`);
    console.log(`📍 Mode: Emergency (Limited Functionality)`);
    console.log(`🔌 Socket.io enabled`);
    console.log(`⚠️  To enable full functionality:`);
    console.log(`   1. Set MONGO_URI environment variable`);
    console.log(`   2. Set FIREBASE_SERVICE_ACCOUNT environment variable`);
    console.log(`   3. Set FRONTEND_URL environment variable`);
    console.log(`   4. Redeploy with server.js`);
});

module.exports = { app, server, io };