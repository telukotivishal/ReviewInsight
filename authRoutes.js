import express from "express";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";

const router = express.Router();

// MongoDB connection
const uri =
  "mongodb+srv://yashmanthri19:Yeshrecipe1212@recipedb.xrkobjp.mongodb.net/?retryWrites=true&w=majority&appName=RecipeDB";
const client = new MongoClient(uri);

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Connect to MongoDB
    await client.connect();
    const database = client.db("UsersDB"); // Replace with your DB name
    const usersCollection = database.collection("Users"); // Replace with your collection name

    // Check if the user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user to the database
    const newUser = { name, email, password: hashedPassword };
    await usersCollection.insertOne(newUser);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error in /signup:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    await client.close();
  }
});

export default router;