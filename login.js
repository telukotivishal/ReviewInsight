import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Environment variables
const LOGIN_DB_URI = process.env.LOGIN_DB_URI;

// Ensure the LOGIN_DB_URI is set
if (!LOGIN_DB_URI) {
  console.error("LOGIN_DB_URI is not defined in the environment variables.");
  process.exit(1);
}

// Create a separate connection for the login database
const loginDB = mongoose.createConnection(LOGIN_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Handle MongoDB connection errors
loginDB.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// Define the User schema and model using the login database connection
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = loginDB.model("Users", userSchema);

// Login route
router.post("/", async (req, res) => {
  mongoose
    .connect(LOGIN_DB_URI)
    .then(() => {
      console.log("Successfully connected to the login database.");
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
    });

  const { email, password } = req.body;
  console.log(`Email: ${email} Password: ${password}`);
  try {
    console.log("Checking email and password...");

    // Find the user by email in the login database
    const user = await User.findOne({ email });
    // const user = await User.findOne({ email: email.toLowerCase() });

    console.log(user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the provided password with the hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("Login successful.");
    // Send the response back to the client
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Export the router
export default router;