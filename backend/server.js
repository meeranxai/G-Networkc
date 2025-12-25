const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http'); // Required for Socket.io
const { Server } = require("socket.io");
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const User = require('./models/User');
const Notification = require('./models/Notification');

require('dotenv').config();

const app = express();
const server = http.createServer(app); // Wrap express app
// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for dev
        methods: ["GET", "POST"]
    }
});
app.set('socketio', io);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Configuration
const multer = require('multer');

// Chat media upload configuration
const chatMediaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = file.mimetype.startsWith('image/') ? 'uploads/chat-media/images'
            : file.mimetype.startsWith('audio/') ? 'uploads/chat-media/voice'
                : 'uploads/chat-media/files';
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const chatMediaUpload = multer({
    storage: chatMediaStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|zip|mp3|webm|ogg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/g-network';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/user-relations'));

// Chat Media Upload
app.post('/api/chat/upload-media', chatMediaUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const mediaUrl = `/${req.file.path.replace(/\\/g, '/')}`;
        const mediaMetadata = {
            filename: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype
        };

        res.json({
            success: true,
            mediaUrl,
            mediaMetadata,
            mediaType: req.file.mimetype.startsWith('image/') ? 'image'
                : req.file.mimetype.startsWith('audio/') ? 'voice'
                    : 'file'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper to filter user data based on privacy settings
const filterUserByPrivacy = (user, requesterId) => {
    const isOwner = requesterId === user.firebaseUid;
    if (isOwner) return user; // Owner sees everything

    const filtered = {
        firebaseUid: user.firebaseUid,
        displayName: user.displayName,
        isOnline: user.isOnline,
        privacy: user.privacy // Client might need to know privacy to show "Private"
    };

    // Filter Bio (About)
    if (user.privacy?.about === 'nobody') {
        filtered.bio = 'Private';
    } else {
        filtered.bio = user.bio;
    }

    // Filter Profile Photo
    if (user.privacy?.profilePhoto === 'nobody') {
        filtered.photoURL = ''; // Client will fallback to default avatar
    } else {
        filtered.photoURL = user.photoURL;
    }

    // Filter Last Seen
    if (user.privacy?.lastSeen === 'nobody') {
        filtered.lastSeen = null;
    } else {
        filtered.lastSeen = user.lastSeen;
    }

    return filtered;
};

// Check username availability
app.get('/api/users/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;

        // Validate username format
        if (!/^[a-z0-9_]{3,30}$/.test(username)) {
            return res.json({
                available: false,
                error: 'Username must be 3-30 characters (lowercase letters, numbers, underscores only)'
            });
        }

        const existingUser = await User.findOne({ username: username.toLowerCase() });
        res.json({ available: !existingUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create or get user (modified to include username)
app.post('/api/users/', async (req, res) => {
    try {
        const { firebaseUid, email, displayName, photoURL, username } = req.body;

        // Check if user already exists
        let user = await User.findOne({ firebaseUid });

        if (user) {
            return res.json(user);
        }

        // Generate username if not provided
        let finalUsername = username;
        if (!finalUsername) {
            // Auto-generate from email or displayName
            const baseUsername = (displayName || email.split('@')[0])
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '');

            // Check if available, add numbers if taken
            let counter = 1;
            finalUsername = baseUsername;
            while (await User.findOne({ username: finalUsername })) {
                finalUsername = `${baseUsername}${counter}`;
                counter++;
            }
        }

        // Create new user
        user = new User({
            firebaseUid,
            email,
            displayName,
            photoURL: photoURL || '',
            username: finalUsername,
            isOnline: true
        });

        await user.save();
        res.json(user);
    } catch (err) {
        if (err.code === 11000) {
            // Duplicate username
            res.status(400).json({ error: 'Username already taken' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// Get user by UID or username UID
app.get('/api/users/:uid', async (req, res) => {
    try {
        const { requesterId } = req.query; // Client can pass its UID
        let user = await User.findOne({ firebaseUid: req.params.uid });

        // If not found by firebaseUid, try finding by username
        if (!user) {
            user = await User.findOne({ username: req.params.uid.toLowerCase() });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(filterUserByPrivacy(user, requesterId));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user profile info
app.post('/api/users/update-profile', async (req, res) => {
    try {
        const { firebaseUid, displayName, bio, techStack } = req.body;
        const updateData = { displayName, bio };
        if (techStack) updateData.techStack = techStack;

        const user = await User.findOneAndUpdate(
            { firebaseUid },
            updateData,
            { new: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user privacy settings
app.post('/api/users/update-privacy', async (req, res) => {
    try {
        const { firebaseUid, privacy } = req.body;
        // Merge privacy settings
        const user = await User.findOne({ firebaseUid });
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.privacy = { ...user.privacy, ...privacy };
        await user.save();

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Follow User
app.post('/api/users/follow', async (req, res) => {
    try {
        const { userId, targetUid } = req.body; // userId = follower, targetUid = followed

        // SERVER DEBUG LOGGING
        console.log('\n🔵 FOLLOW REQUEST RECEIVED:');
        console.log('userId (follower):', userId);
        console.log('targetUid (target):', targetUid);
        console.log('Are they equal?:', userId === targetUid);
        console.log('userId type:', typeof userId);
        console.log('targetUid type:', typeof targetUid);

        if (userId === targetUid) {
            console.log('❌ REJECTED: Cannot follow self');
            return res.status(400).json({ error: 'Cannot follow self' });
        }

        const [follower, target] = await Promise.all([
            User.findOne({ firebaseUid: userId }),
            User.findOne({ firebaseUid: targetUid })
        ]);

        console.log('Follower found:', follower ? follower.displayName : 'NOT FOUND');
        console.log('Target found:', target ? target.displayName : 'NOT FOUND');

        if (!follower || !target) {
            console.log('❌ REJECTED: User not found');
            return res.status(404).json({ error: 'User not found' });
        }

        if (!target.followers.includes(userId)) {
            target.followers.push(userId);
            await target.save();
            console.log('✅ Added to followers list');
        } else {
            console.log('⚠️ Already in followers list');
        }

        if (!follower.following.includes(targetUid)) {
            follower.following.push(targetUid);
            await follower.save();
            console.log('✅ Added to following list');
        } else {
            console.log('⚠️ Already in following list');
        }

        // Notify Target
        const notif = new Notification({
            recipient: targetUid,
            sender: userId,
            type: 'follow',
            content: `${follower.displayName} started following you.`
        });
        await notif.save();
        io.to(target.socketId).emit('notification', notif);

        console.log('✅ FOLLOW SUCCESS:', follower.displayName, '→', target.displayName);

        res.json({ success: true, isFollowing: true });
    } catch (err) {
        console.error('❌ FOLLOW ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Unfollow User
app.post('/api/users/unfollow', async (req, res) => {
    try {
        const { userId, targetUid } = req.body;

        const [follower, target] = await Promise.all([
            User.findOne({ firebaseUid: userId }),
            User.findOne({ firebaseUid: targetUid })
        ]);

        if (target) {
            target.followers = target.followers.filter(id => id !== userId);
            await target.save();
        }

        if (follower) {
            follower.following = follower.following.filter(id => id !== targetUid);
            await follower.save();
        }

        res.json({ success: true, isFollowing: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get User Stats & Permissions
app.get('/api/users/stats/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const requesterId = req.query.requesterId;

        const user = await User.findOne({ firebaseUid: uid });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isFollowing = requesterId && user.followers.includes(requesterId);
        const isSelf = requesterId === uid;
        const isPrivate = user.privacy?.isPrivate;

        // Content Permission: True if public, or following, or self
        const canViewPosts = !isPrivate || isFollowing || isSelf;

        res.json({
            followersCount: user.followers.length,
            followingCount: user.following.length,
            isFollowing,
            canViewPosts,
            isPrivate
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Suggested Users (users you're not following yet)
app.get('/api/users/suggestions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 5;

        const currentUser = await User.findOne({ firebaseUid: userId });
        if (!currentUser) return res.status(404).json({ error: 'User not found' });

        // Get users not in following list and not self
        const suggestions = await User.find({
            firebaseUid: {
                $nin: [...currentUser.following, userId],
                $ne: userId
            }
        })
            .select('firebaseUid displayName photoURL bio followers')
            .sort({ 'followers': -1 }) // Sort by most followers
            .limit(limit);

        res.json(suggestions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get multiple users by UIDs (batch lookup)
app.post('/api/users/batch', async (req, res) => {
    try {
        const { uids, requesterId } = req.body;
        const users = await User.find({ firebaseUid: { $in: uids } });
        const userMap = {};
        users.forEach(user => {
            userMap[user.firebaseUid] = filterUserByPrivacy(user, requesterId);
        });
        res.json(userMap);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// User API Routes (Phase 2)
app.post('/api/users/sync', async (req, res) => {
    try {
        const { firebaseUid, displayName, email, photoURL } = req.body;

        // Find or create user
        let user = await User.findOne({ firebaseUid });

        if (!user) {
            user = new User({ firebaseUid, displayName, email, photoURL });
        } else {
            user.displayName = displayName;
            user.email = email;
            user.photoURL = photoURL || user.photoURL;
        }

        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/online', async (req, res) => {
    try {
        const { requesterId } = req.query;
        const users = await User.find({ isOnline: true }).select('-socketId');
        const filteredUsers = users.map(user => filterUserByPrivacy(user, requesterId));
        res.json(filteredUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Group API Routes (Phase 6)
app.post('/api/chat/groups/create', async (req, res) => {
    try {
        const { groupName, participants, adminId } = req.body;

        if (!groupName || !participants || participants.length < 2) {
            return res.status(400).json({ error: 'Group name and at least 2 participants required' });
        }

        // Add admin to participants if not already there
        const allParticipants = [...new Set([...participants, adminId])];

        const newGroup = new Chat({
            participants: allParticipants,
            isGroup: true,
            groupName,
            groupAdmin: adminId,
            unreadCounts: new Map()
        });

        await newGroup.save();

        await newGroup.save();

        // Broadcast to all participants that they are in a new group
        // We iterate and emit to each user's room if they are online
        allParticipants.forEach(pId => {
            // Check if user is connected (optional optimization, but io.to is safe)
            io.to(pId).emit('new_group_created', newGroup);
        });

        res.json(newGroup);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Message Reactions (Phase 6)
app.post('/api/chat/message/:id/react', async (req, res) => {
    try {
        const { emoji, userId } = req.body;
        const messageId = req.params.id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        // Remove existing reaction by this user if any
        message.reactions = message.reactions.filter(r => r.userId !== userId);

        // Add new reaction if emoji is provided (toggle behavior: empty emoji removes it)
        if (emoji) {
            message.reactions.push({ userId, emoji });
        }

        await message.save();

        // Broadcast reaction to the chat room
        // We'll use io.to(chatId) which we'll need to know. 
        // Message schema has chatId.
        io.to(message.chatId.toString()).emit('message_reaction_update', {
            messageId: message._id,
            reactions: message.reactions
        });

        res.json({ success: true, reactions: message.reactions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Chat Management (Phase 7)
app.post('/api/chat/:id/clear', async (req, res) => {
    try {
        const { userId } = req.body;
        const chatId = req.params.id;
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(userId)) {
            return res.status(403).json({ error: 'Unauthorized or chat not found' });
        }

        await Message.deleteMany({ chatId });

        // Update last message
        chat.lastMessage = '';
        await chat.save();

        io.to(chatId).emit('chat_cleared', { chatId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark messages read (Phase 8 - Real-time)
app.post('/api/chat/:id/read', async (req, res) => {
    try {
        const { userId } = req.body;
        const chatId = req.params.id;

        // Reset unread count for this user in this chat (if we were tracking it)
        // Since schema might not have unreadCounts map fully utilized yet, we focus on emitting event

        // Broadcast "messages read" so sender sees blue ticks
        io.to(chatId).emit('messages_read_update', { chatId, readerId: userId });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.delete('/api/chat/:id', async (req, res) => {
    try {
        const { userId } = req.body;
        const chatId = req.params.id;
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(userId)) {
            return res.status(403).json({ error: 'Unauthorized or chat not found' });
        }

        await Message.deleteMany({ chatId });
        await Chat.findByIdAndDelete(chatId);

        io.to(chatId).emit('chat_deleted', { chatId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chat/:id/mute', async (req, res) => {
    try {
        const { userId } = req.body;
        const chatId = req.params.id;
        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: 'Chat not found' });

        const isMuted = chat.mutedBy.includes(userId);
        if (isMuted) {
            chat.mutedBy = chat.mutedBy.filter(id => id !== userId);
        } else {
            chat.mutedBy.push(userId);
        }

        await chat.save();
        res.json({ success: true, muted: !isMuted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/block', async (req, res) => {
    try {
        const { userId, targetUid } = req.body;
        const user = await User.findOne({ firebaseUid: userId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isBlocked = user.blockedUsers.includes(targetUid);
        if (isBlocked) {
            user.blockedUsers = user.blockedUsers.filter(id => id !== targetUid);
        } else {
            user.blockedUsers.push(targetUid);
        }

        await user.save();
        res.json({ success: true, blocked: !isBlocked });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chat/:id/disappearing', async (req, res) => {
    try {
        const { userId } = req.body;
        const chatId = req.params.id;
        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: 'Chat not found' });

        // Toggle: if current > 0, turn off (0). If 0, turn on (24h = 86400s)
        chat.disappearingTimer = chat.disappearingTimer > 0 ? 0 : 86400;

        await chat.save();
        res.json({ success: true, timer: chat.disappearingTimer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Notification API Routes (Phase 12)
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.params.userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const notif = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );
        res.json(notif);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/read-all/:userId', async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.params.userId, isRead: false },
            { isRead: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API Routes for Chat History (Phase 1)
app.get('/api/chat/history/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        // Find chats where user is participant
        const chats = await Chat.find({ participants: userId }).sort({ lastMessageAt: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get messages for a chat
app.get('/api/chat/:chatId/messages', async (req, res) => {
    try {
        const messages = await Message.find({ chatId: req.params.chatId })
            .populate('replyTo', 'senderId text mediaType') // Populate quoted msg
            .sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);

    // User comes online
    socket.on('user_online', async (userData) => {
        try {
            const { firebaseUid, displayName, email, photoURL } = userData;

            // Update or create user
            let user = await User.findOne({ firebaseUid });
            if (!user) {
                user = new User({ firebaseUid, displayName, email, photoURL });
            }

            user.isOnline = true;
            user.socketId = socket.id;
            user.lastSeen = new Date();
            await user.save();

            // Join personal room
            socket.join(firebaseUid);

            // Notify all clients about user coming online
            io.emit('user_presence_changed', {
                firebaseUid,
                displayName,
                photoURL,
                isOnline: true
            });

            console.log(`User ${displayName} (${firebaseUid}) is online`);
        } catch (err) {
            console.error('Error in user_online:', err);
        }
    });

    // =========================================
    // WebRTC Signaling (Phase 14)
    // =========================================
    socket.on("call_user", ({ userToCall, signalData, from, name }) => {
        // userToCall is the firebaseUid of the recipient
        // We broadcast to their personal room
        io.to(userToCall).emit("call_user", { signal: signalData, from, name });
    });

    socket.on("answer_call", (data) => {
        // data.to is the firebaseUid of the original caller
        io.to(data.to).emit("call_accepted", data.signal);
    });

    socket.on("ice_candidate", ({ target, candidate }) => {
        io.to(target).emit("ice_candidate", { candidate });
    });

    socket.on("end_call", ({ to }) => {
        io.to(to).emit("call_ended");
    });

    // Typing Status - Now includes Name
    socket.on('typing', async (data) => {
        // data: { chatId, isTyping, senderId }
        try {
            const user = await User.findOne({ firebaseUid: data.senderId });
            socket.to(data.chatId).emit('display_typing', {
                chatId: data.chatId,
                senderId: data.senderId,
                senderName: user ? user.displayName : 'Someone',
                isTyping: data.isTyping
            });
        } catch (err) {
            // fallback
            socket.to(data.chatId).emit('display_typing', data);
        }
    });

    // Join personal room and all active chat rooms
    socket.on('join_personal_room', async (uid) => {
        socket.join(uid);
        console.log(`User ${uid} joined personal room`);

        // Also join rooms for all existing chats
        const chats = await Chat.find({ participants: uid });
        chats.forEach(chat => {
            socket.join(chat._id.toString());
        });
    });

    socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        console.log(`Socket ${socket.id} joined chat room ${chatId}`);
    });

    // Send Message
    socket.on('send_message', async (data) => {
        // data: { chatId, senderId, text, recipientId }
        console.log("Message received:", data);

        try {
            let chat;

            // If no chatId, check if chat exists or create new
            if (!data.chatId) {
                // Check if chat exists
                chat = await Chat.findOne({
                    participants: { $all: [data.senderId, data.recipientId] }
                });

                if (!chat) {
                    chat = new Chat({
                        participants: [data.senderId, data.recipientId],
                        lastMessage: data.text
                    });
                    await chat.save();
                }
            } else {
                chat = await Chat.findById(data.chatId);
            }

            if (!chat) return;

            // Enforcement: Check for blocks if it's a 1-to-1 chat
            if (!chat.isGroup) {
                const recipientId = data.recipientId || chat.participants.find(p => p !== data.senderId);
                const users = await User.find({ firebaseUid: { $in: [recipientId, data.senderId] } });
                const recipient = users.find(u => u.firebaseUid === recipientId);
                const sender = users.find(u => u.firebaseUid === data.senderId);

                if (recipient && recipient.blockedUsers.includes(data.senderId)) {
                    return socket.emit('error', { message: 'You are blocked by this user.' });
                }
                if (sender && sender.blockedUsers.includes(recipientId)) {
                    return socket.emit('error', { message: 'You have blocked this user. Unblock to send messages.' });
                }
            }

            // Save Message to DB with delivery status
            const isRecipientOnline = (await User.findOne({ firebaseUid: data.recipientId, isOnline: true })) !== null;

            const newMessage = new Message({
                chatId: chat._id,
                senderId: data.senderId,
                text: data.text,
                mediaUrl: data.mediaUrl,
                mediaType: data.mediaType || 'text',
                replyTo: data.replyTo || null, // Capture reply ID
                timestamp: new Date()
            });

            await newMessage.save();

            // Populate replyTo for immediate return
            await newMessage.populate('replyTo', 'senderId text mediaType');

            chat.lastMessage = data.mediaType && data.mediaType !== 'text' ? `Sent a ${data.mediaType}` : data.text;
            chat.lastMessageTimestamp = new Date();
            chat.unreadCounts.set(data.senderId, 0); // Reset sender unread msg count

            // Increment unread for others
            chat.participants.forEach(p => {
                if (p !== data.senderId) {
                    const current = chat.unreadCounts.get(p) || 0;
                    chat.unreadCounts.set(p, current + 1);
                }
            });

            await chat.save();

            // BroadCast to Room
            io.to(chat._id.toString()).emit('receive_message', newMessage);

            // Send notification to offline/inactive participants
            chat.participants.forEach(p => {
                if (p !== data.senderId) {
                    io.to(p).emit('notification', {
                        type: 'message',
                        senderName: data.senderId, // Ideally fetch name
                        text: data.text || `Sent a ${data.mediaType}`,
                        chatId: chat._id
                    });

                    // Also emit global update for unread counts in sidebar
                    io.to(p).emit('chat_list_update', {
                        chatId: chat._id,
                        lastMessage: chat.lastMessage,
                        timestamp: chat.lastMessageTimestamp,
                        unreadCount: chat.unreadCounts.get(p)
                    });
                }
            });
            socket.emit('message_sent', { chatId: chat._id, message: newMessage });

            // Broadcast to all participants in the room
            io.to(chat._id.toString()).emit('receive_message', newMessage);

            // Also notify recipient's personal room for individual chats (for fallback/list updates)
            if (!chat.isGroup) {
                const recipientId = data.recipientId || chat.participants.find(p => p !== data.senderId);
                io.to(recipientId).emit('receive_message_individual', newMessage);
            }

            // Also notify any other connections of the sender (multi-device sync)
            socket.to(data.senderId).emit('message_sent_sync', { chatId: chat._id, message: newMessage });

        } catch (err) {
            console.error("Socket Message Error:", err);
        }
    });

    // Mark messages as read
    socket.on('mark_messages_read', async (data) => {
        // data: { chatId, userId }
        try {
            const result = await Message.updateMany(
                {
                    chatId: data.chatId,
                    senderId: { $ne: data.userId },
                    read: false
                },
                { read: true }
            );

            // Notify sender that messages were read
            if (result.modifiedCount > 0) {
                io.to(data.chatId).emit('messages_read_update', {
                    chatId: data.chatId,
                    readBy: data.userId
                });
            }
        } catch (err) {
            console.error('Error marking messages read:', err);
        }
    });

    // Clear unread count
    socket.on('clear_unread_count', async (data) => {
        // data: { chatId, userId }
        try {
            const chat = await Chat.findById(data.chatId);
            if (chat && chat.unreadCounts) {
                chat.unreadCounts.set(data.userId, 0);
                await chat.save();

                // Notify user that count was cleared
                socket.emit('unread_count_updated', {
                    chatId: data.chatId,
                    count: 0
                });
            }
        } catch (err) {
            console.error('Error clearing unread count:', err);
        }
    });

    socket.on('disconnect', async () => {
        console.log('User Disconnected:', socket.id);

        // Mark user as offline
        try {
            const user = await User.findOne({ socketId: socket.id });
            if (user) {
                user.isOnline = false;
                user.lastSeen = new Date();
                user.socketId = '';
                await user.save();

                // Notify all clients
                io.emit('user_presence_changed', {
                    firebaseUid: user.firebaseUid,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    isOnline: false
                });

                console.log(`User ${user.displayName} went offline`);
            }
        } catch (err) {
            console.error('Error in disconnect:', err);
        }
    });
});

// Base Route
app.get('/', (req, res) => {
    res.send('G-Network API is running...');
});

// Start Server (Change app.listen to server.listen)
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server (Socket.io) running on http://localhost:${PORT}`);
});
