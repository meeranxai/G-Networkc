const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    senderId: {
        type: String, // User UID
        required: true
    },
    text: {
        type: String,
        default: ''
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    mediaType: {
        type: String,
        enum: ['text', 'image', 'file', 'voice'],
        default: 'text'
    },
    mediaUrl: {
        type: String,
        default: ''
    },
    mediaMetadata: {
        filename: String,
        size: Number,
        mimeType: String,
        duration: Number,
        width: Number,
        height: Number
    },
    reactions: [{
        userId: String,
        emoji: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    read: {
        type: Boolean,
        default: false
    },
    delivered: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', MessageSchema);
