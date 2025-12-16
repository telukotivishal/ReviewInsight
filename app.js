import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { MongoClient } from "mongodb";
import axios from "axios";
import contactRoutes from "./contactRoutes.js";
import authRoutes from "./authRoutes.js";
// import loginRoutes from "./login.js";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const app = express();
const port = process.env.PORT;
app.use(bodyParser.json());

app.use(cors());

app.use(express.json());
app.use(bodyParser.json());

app.use("/api/contact", contactRoutes);
app.use("/api/auth", authRoutes);
// app.use("/api/login", loginRoutes);

const flaskUrl = process.env.FASTAPI_URL;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/search", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Name is required" });
  }
  const trimmedName = name.trim();
  try {
    await client.connect();
    const db = client.db("Reviews");
    const collection = db.collection("ProductReviews");
    console.log("Connected to DB");

    const existing = await collection.findOne({
      $or: [
        { name: trimmedName },
        { "finalResponse.product_name": trimmedName },
      ],
    });

    if (existing && existing.finalResponse) {
      return res.status(200).json({
        source: "cache",
        data: existing.finalResponse,
      });
    }

    const reviewResponse = await axios.get(
      `${process.env.FASTAPI_URL}/search`,
      { params: { query: trimmedName } }
    );

    const productsScraped = reviewResponse.data?.results || [];
    if (!productsScraped || productsScraped.length === 0) {
      // Call grok here with the trimmed Name
      console.log("No products found, calling Gemini");
      const geminiSummary = await summarizeWithGemini(trimmedName);
      await collection.insertOne({
        name: trimmedName,
        finalResponse: geminiSummary,
        createdAt: new Date(),
      });
      return res.status(200).json({
        source: "gemini",
        data: geminiSummary,
      });
    } else {
      console.log("Products found, fetching details");
      const asinValue = productsScraped[0].asin;
      const productDetails = await axios.get(
        `${process.env.FASTAPI_URL}/product`,
        { params: { asin: asinValue } }
      );
      const geminiSummary = await summarizeWithGemini(
        trimmedName,
        productDetails.data
      );
      await collection.insertOne({
        name: trimmedName,
        finalResponse: geminiSummary,
        createdAt: new Date(),
      });
      return res.status(200).json({
        source: "created",
        data: geminiSummary,
      });
    }
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.close();
  }
});

async function summarizeWithGemini(productName, productData = null) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const prompt = `
Return ONLY valid JSON. No markdown. No explanations.

Product Name:
${productName}

${
  productData
    ? `Product Data:\n${JSON.stringify(productData)}`
    : "No structured product data available."
}

Required JSON schema:
{
  "product_name": string,
  "price": string | null,
  "overall_opinion": string,
  "pros": string[],
  "cons": string[],
  "sentiment_breakdown": {
    "Positive": number,
    "Negative": number,
    "Neutral": number
  }
}
`;

  const result = await model.generateContent(prompt);

  try {
    return JSON.parse(result.response.text());
  } catch (err) {
    console.error("Gemini returned invalid JSON:", result.response.text());
    throw new Error("Gemini returned invalid JSON");
  }
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
