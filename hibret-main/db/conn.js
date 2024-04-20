import mongoose from "mongoose";

async function connect() {
    try {
        mongoose.set('strictQuery', true);
        const db = await mongoose.connect(process.env.ATLAS_URI);
        console.log("Database Connected");
        return db;
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error; // Re-throw the error for handling at the top level
    }
}

export default connect;