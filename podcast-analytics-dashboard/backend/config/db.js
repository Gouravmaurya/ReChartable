const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Close any existing connections to avoid multiple connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Remove deprecated options
      // useNewUrlParser and useUnifiedTopology are no longer needed in Mongoose 6+
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
    
    // Log MongoDB connection events
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:'.red, err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected'.yellow);
    });
    
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`.red);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
