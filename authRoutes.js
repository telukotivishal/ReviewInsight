import express from "express";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    await client.connect();
    const database = client.db("UsersDB");
    const usersCollection = database.collection("Users");

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await usersCollection.insertOne({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    console.error("Error in /signup:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    await client.close();
  }
});

export default router;
