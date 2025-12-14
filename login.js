// import express from "express";
// import mongoose from "mongoose";
// import bcrypt from "bcrypt";
// import dotenv from "dotenv";

// dotenv.config();

// const router = express.Router();

// const LOGIN_DB_URI = process.env.LOGIN_DB_URI;

// if (!LOGIN_DB_URI) {
//   console.error("Error during connection to the database.");
//   process.exit(1);
// }

// const loginDB = mongoose.createConnection(LOGIN_DB_URI, {
//   maxPoolSize: 10,
//   serverSelectionTimeoutMS: 5000,
// });

// loginDB.on("connected", () => {
//   console.log("Successfully connected to the login database.");
// });

// loginDB.on("error", (err) => {
//   console.error("MongoDB connection error:", err);
// });

// const loginReady = loginDB.asPromise();

// const userSchema = new mongoose.Schema({
//   username: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
// });

// const User = loginDB.model("Users", userSchema);

// // Login route
// router.post("/signin", async (req, res) => {
//   try {
//     await loginReady;

//     const { username, password } = req.body;

//     if (!username || !password) {
//       return res.status(400).json({ message: "username and password are required" });
//     }

//     const normalizedusername = username.trim().toLowerCase();
//     const user = await User.findOne({ username: normalizedusername }).lean();

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const isPasswordValid = await bcrypt.compare(password, user.password);

//     if (!isPasswordValid) {
//       return res.status(401).json({ message: "Invalid username or password" });
//     }

//     console.log("Login successful.");
//     return res.status(200).json({ message: "Login successful" });
//   } catch (error) {
//     console.error("Login error:", error.message);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// });

// export default router;