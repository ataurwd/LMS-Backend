import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('Error: MONGO_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    mongoose.connection.on('connected', () => {
      console.log('MongoDB successfully connected.');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB connection disconnected.');
    });

    await mongoose.connect(mongoUri, {
      autoIndex: true,
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};
