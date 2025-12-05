import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import { fetchAllReviews } from './Crawler.js'; 
import axios from 'axios';  
import contactRoutes from "./contactRoutes.js";
import authRoutes from "./authRoutes.js";
import loginRoutes from "./login.js";
import dotenv from 'dotenv';
dotenv.config();

// Set up MongoDB connection URI
// const uri = process.env.MONGODB_URI;
// const uri="mongodb+srv://sohithreddy33:Sohith123@productdb.2flhp.mongodb.net/?appName=ProductDB";
const uri=process.env.MONGODB_URI;
const client = new MongoClient(uri);

const app = express();
const port = process.env.PORT;
app.use(bodyParser.json());

app.use(cors());

app.use(express.json());
app.use(bodyParser.json());

app.use("/api/contact", contactRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/login", loginRoutes);

const flaskUrl=process.env.FLASK_URL;

app.post("/send-reviews", async (req, res) => {
  const productName = req.body.productName;

  if (!productName) {
    return res.status(400).send("No product name provided");
  }

  try {
    await client.connect();
    const database = client.db("Reviews"); 
    const reviewsCollection = database.collection("ReviewBOT");

    const reviews = await reviewsCollection
      .find({ name: productName })
      .toArray();

    if (reviews.length === 0) {
      return res.status(404).send("No reviews found for this product");
    }
    const concatenatedReviews = reviews
      .map(review => review.review)
      .join(" ");
    const flaskResponse = await axios.post(flaskUrl, {
      product_data: concatenatedReviews
    });
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
app.get("/prods", async (req, res) => {
  try {
    await client.connect();
    const database = client.db("Reviews"); 
    const reviewsCollection = database.collection("ReviewBOT");
    const products = await reviewsCollection.find({}).toArray();
    const uniqueProductNames = [...new Set(products.map(product => product.name))];
    if (uniqueProductNames.length === 0) {
      return res.status(404).send("No products found");
    }
    res.json(uniqueProductNames);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Error fetching products");
  } finally {
    await client.close();
  }
});

app.post("/search", async (req, res) => {
  try {
    const { productUrl } = req.body; 
    if (!productUrl) {
      return res.status(400).json({ error: "Product URL is required." });
    }

    const reviews = await fetchAllReviews(productUrl, 100); 
    console.log(reviews);
    const concatenatedReviews = reviews.map(review => review.reviewText).join(" ");
    const flaskResponse = await axios.post(flaskUrl, {
      product_data: concatenatedReviews
    });
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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
