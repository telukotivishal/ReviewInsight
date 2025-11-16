import express from "express";
import { MongoClient } from "mongodb";

// MongoDB connection URI
const uri =
  "mongodb+srv://yashmanthri19:Yeshrecipe1212@recipedb.xrkobjp.mongodb.net/RecipeDB?retryWrites=true&w=majority";
const client = new MongoClient(uri);

const router = express.Router();

// Route to handle contact form submission
router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Connect to the MongoDB database
    await client.connect();
    const database = client.db("Reviews"); // Use a new database or existing one
    const contactCollection = database.collection("contact_RB");

    // Insert the contact details into the collection
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