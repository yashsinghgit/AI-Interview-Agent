const mongoose = require('mongoose');

let connectionPromise;

async function connectDB() {
   if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
   }

   if (!connectionPromise) {
      const mongoUri = process.env.MONGODB_URI;

      if (!mongoUri) {
         throw new Error('MONGODB_URI is not configured');
      }

      connectionPromise = mongoose.connect(mongoUri, {
         serverSelectionTimeoutMS: 30000,
      })
         .then((connection) => {
            console.log('Connected to DB');
            return connection;
         })
         .catch((error) => {
            connectionPromise = undefined;
            console.error('Error connecting to MongoDB:', error);
            throw error;
         });
   }

   return connectionPromise;
}
module.exports = connectDB;