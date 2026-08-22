const mongoose = require('mongoose');
async function connectDB() {
   try{
 await mongoose.connect("mongodb+srv://yash_db_07:prqicTsrOxuaB0R4@cluster0.wdwtseb.mongodb.net/interviewAI?appName=Cluster0")
    console.log("Connected to DB")
   }

   catch (error) {
      console.error('Error connecting to MongoDB:', error);
      process.exit(1);
   }
}
module.exports = connectDB;