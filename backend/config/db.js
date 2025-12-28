const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/g-network';
        
        // Validate MongoDB URI format
        if (!MONGO_URI.includes('mongodb')) {
            console.warn('⚠️ Invalid MongoDB URI format, skipping database connection');
            return;
        }
        
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Connected Successfully');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.warn('⚠️ Running without database connection');
        // Don't exit, let the app run without DB
    }
};

module.exports = connectDB;
