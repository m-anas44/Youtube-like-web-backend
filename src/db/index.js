import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI)
    console.log(
      `\n Connected MongoDB!! DB Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("Connection of DB is failed",error);
    process.exit(1);
  }
};

export default connectDB;
