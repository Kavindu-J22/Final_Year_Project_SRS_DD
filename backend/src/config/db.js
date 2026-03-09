const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'cloud_forensics',
    });
    console.log(`✅  MongoDB connected → ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌  MongoDB error: ${err.message}`);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed on SIGINT');
  process.exit(0);
});

module.exports = connectDB;

