const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
        match: /^[a-z0-9_]+$/,  // Only lowercase letters, numbers, underscores
        index: true
    },
    email: {
        type: String,
        required: true
    },
    photoURL: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: 'Hey there! I am using G-Network.'
    },
    techStack: [{
        type: String
    }],
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    socketId: {
        type: String,
        default: ''
    },
    privacy: {
        isPrivate: { type: Boolean, default: false }, // Post privacy: true = only followers
        about: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
        lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
        profilePhoto: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' }
    },
    blockedUsers: [{
        type: String // UIDs of blocked users
    }],
    followers: [{
        type: String // UIDs of followers
    }],
    following: [{
        type: String // UIDs of users being followed
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
