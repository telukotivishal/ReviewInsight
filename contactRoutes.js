import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    await client.connect();
    const database = client.db("Reviews");
    const contactCollection = database.collection("contact_RB");
    const result = await contactCollection.insertOne({
      name,
      email,
      message,
      timestamp: new Date(),
    });

    res
      .status(200)
      .json({ message: "Contact details submitted successfully.", result });
  } catch (error) {
    console.error("Error saving contact details:", error);
    res.status(500).json({
      error: "Failed to save contact details. Please try again later.",
    });
  } finally {
    await client.close();
  }
});

export default router;