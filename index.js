import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import { fetchAllReviews } from './Crawler.js'; 
import axios from 'axios';  // Assuming you're using ES6 imports
import contactRoutes from "./contactRoutes.js";
import authRoutes from "./authRoutes.js";
import loginRoutes from "./login.js";

// Set up MongoDB connection URI
const uri = "mongodb+srv://yashmanthri19:Yeshrecipe1212@recipedb.xrkobjp.mongodb.net/RecipeDB?retryWrites=true&w=majority";
const client = new MongoClient(uri);

const app = express();
const port = 3000;
app.use(bodyParser.json());
// Enable CORS for the frontend origin (adjust if needed)
app.use(cors({
  origin: 'http://localhost:5173', // Frontend origin (adjust as per your setup)
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json()); // For parsing application/json
app.use(bodyParser.json()); // Middleware for parsing json data in the body

app.use("/api/contact", contactRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/login", loginRoutes);

// Global Flask URL
const flaskUrl = 'https://708b-34-75-36-186.ngrok-free.app/process'; // Replace with your Flask server URL

// Route to handle product name and fetch reviews
app.post("/send-reviews", async (req, res) => {
  const productName = req.body.productName;

  if (!productName) {
    return res.status(400).send("No product name provided");
  }

  try {
    // Connect to the database
    await client.connect();

    // Access the database and the relevant collection
    const database = client.db("Reviews"); // Replace with your DB name
    const reviewsCollection = database.collection("ReviewBOT"); // Replace with your collection name

    // Fetch reviews for the product
    const reviews = await reviewsCollection
      .find({ name: productName })
      .toArray();

    if (reviews.length === 0) {
      return res.status(404).send("No reviews found for this product");
    }

    // Concatenate all the reviews
    const concatenatedReviews = reviews
      .map(review => review.review)
      .join(" "); // You can modify how the reviews are concatenated here

    // Send concatenated reviews to the Flask server at flaskUrl
    const flaskResponse = await axios.post(flaskUrl, {
      product_data: concatenatedReviews
    });

    // Check the Flask response
    if (flaskResponse.status === 200) {
      console.log(flaskResponse.data.response_text)
      res.json({
        message: "Reviews processed successfully and sent to Flask",
        flaskResponse: flaskResponse.data
      });
    } else {
      res.status(flaskResponse.status).send("Error processing data with Flask server");
    }

  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).send("Error fetching reviews");
  } finally {
    await client.close();
  }
});

// Route to get all product information (unique product names)
app.get("/prods", async (req, res) => {
  try {
    // Connect to the database
    await client.connect();

    // Access the database and the relevant collection
    const database = client.db("Reviews"); // Replace with your DB name
    const reviewsCollection = database.collection("ReviewBOT"); // Replace with your collection name

    // Fetch all product information
    const products = await reviewsCollection.find({}).toArray();

    // Create an array of unique product names
    const uniqueProductNames = [...new Set(products.map(product => product.name))];

    // Check if the collection has any products
    if (uniqueProductNames.length === 0) {
      return res.status(404).send("No products found");
    }

    // Send the unique product names as JSON
    res.json(uniqueProductNames);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Error fetching products");
  } finally {
    await client.close();
  }
});

// Route to search and get reviews for a product (from the scraper)
app.post("/search", async (req, res) => {
  try {
    const { productUrl } = req.body; // Get the product URL from the request body

    if (!productUrl) {
      return res.status(400).json({ error: "Product URL is required." });
    }

    // Call the scraper function from crawler.js to get the reviews
    const reviews = await fetchAllReviews(productUrl, 100); // Scrape 100 reviews or any other number you want
    console.log(reviews);

    // Concatenate all review texts into a single string
    const concatenatedReviews = reviews.map(review => review.reviewText).join(" ");

    // Send the concatenated reviews to the Flask server at flaskUrl
    const flaskResponse = await axios.post(flaskUrl, {
      product_data: concatenatedReviews
    });

    // Check the Flask response
    if (flaskResponse.status === 200) {
      console.log(flaskResponse.data.response_text);
      res.json({
        message: "Reviews processed successfully and sent to Flask",
        flaskResponse: flaskResponse.data
      });
    } else {
      res.status(flaskResponse.status).send("Error processing data with Flask server");
    }

  } catch (error) {
    console.error('Error in /search route:', error);
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
