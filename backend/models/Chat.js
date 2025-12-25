const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    participants: [{
        type: String, // Storing User UIDs (Firebase UIDs or local IDs)
        required: true
    }],
    lastMessage: {
        type: String,
        default: ''
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    unreadCounts: {
        type: Map,
        of: Number,
        default: new Map()
    },
    isGroup: {
        type: Boolean,
        default: false
    },
    groupName: {
        type: String,
        default: ''
    },
    groupAvatar: {
        type: String,
        default: ''
    },
    groupAdmin: {
        type: String, // UID of the group creator
        default: ''
    },
    mutedBy: [{
        type: String // UIDs of users who muted this chat
    }],
    disappearingTimer: {
        type: Number, // Seconds, 0 means off
        default: 0
    }
});

module.exports = mongoose.model('Chat', ChatSchema);
