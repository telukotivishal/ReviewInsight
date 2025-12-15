import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import { fetchAllReviews } from './Crawler.js'; 
import axios from 'axios';  
import contactRoutes from "./contactRoutes.js";
import authRoutes from "./authRoutes.js";
// import loginRoutes from "./login.js";
import dotenv from 'dotenv';
dotenv.config();

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
// app.use("/api/login", loginRoutes);

const flaskUrl=process.env.FASTAPI_URL;

// app.post("/send-reviews", async (req, res) => {
//   const productName = req.body.productName;

//   if (!productName) {
//     return res.status(400).send("No product name provided");
//   }

//   try {
//     await client.connect();
//     const database = client.db("Reviews"); 
//     const reviewsCollection = database.collection("ReviewBOT");

//     const reviews = await reviewsCollection
//       .find({ name: productName })
//       .toArray();

//     if (reviews.length === 0) {
//       return res.status(404).send("No reviews found for this product");
//     }
//     const concatenatedReviews = reviews
//       .map(review => review.review)
//       .join(" ");
//     const flaskResponse = await axios.post(flaskUrl, {
//       product_data: concatenatedReviews
//     });
//     if (flaskResponse.status === 200) {
//       console.log(flaskResponse.data.response_text)
//       res.json({
//         message: "Reviews processed successfully and sent to Flask",
//         flaskResponse: flaskResponse.data
//       });
//     } else {
//       res.status(flaskResponse.status).send("Error processing data with Flask server");
//     }

//   } catch (err) {
//     console.error("Error fetching reviews:", err);
//     res.status(500).send("Error fetching reviews");
//   } finally {
//     await client.close();
//   }
// });
// app.get("/prods", async (req, res) => {
//   try {
//     await client.connect();
//     const database = client.db("Reviews"); 
//     const reviewsCollection = database.collection("ReviewBOT");
//     const products = await reviewsCollection.find({}).toArray();
//     const uniqueProductNames = [...new Set(products.map(product => product.name))];
//     if (uniqueProductNames.length === 0) {
//       return res.status(404).send("No products found");
//     }
//     res.json(uniqueProductNames);
//   } catch (err) {
//     console.error("Error fetching products:", err);
//     res.status(500).send("Error fetching products");
//   } finally {
//     await client.close();
//   }
// });

// app.post("/search", async (req, res) => {
//   try {
//     const { productUrl } = req.body; 
//     if (!productUrl) {
//       return res.status(400).json({ error: "Product URL is required." });
//     }

//     const reviews = await fetchAllReviews(productUrl, 100); 
//     console.log(reviews);
//     const concatenatedReviews = reviews.map(review => review.reviewText).join(" ");
//     const flaskResponse = await axios.post(flaskUrl, {
//       product_data: concatenatedReviews
//     });
//     if (flaskResponse.status === 200) {
//       console.log(flaskResponse.data.response_text);
//       res.json({
//         message: "Reviews processed successfully and sent to Flask",
//         flaskResponse: flaskResponse.data
//       });
//     } else {
//       res.status(flaskResponse.status).send("Error processing data with Flask server");
//     }

//   } catch (error) {
//     console.error('Error in /search route:', error);
//     res.status(500).json({ error: "Failed to fetch reviews." });
//   }
// });

// app.get('/hello', (req, res) => {
//   res.send('Hello, World!');
// });


// app.post("/search", async (req, res) => {
//   const { name } = req.body;

//   // 1 & 2) Validate request
//   if (!name || typeof name !== "string" || name.trim() === "") {
//     return res.status(400).json({ error: "Parameter 'name' is required" });
//   }

//   const normalizedName = name.trim();

//   try {
//     await client.connect();
//     const db = client.db("Reviews");
//     const collection = db.collection("ProductReviews");

//     // 3) Check DB cache
//     const existing = await collection.findOne({ name: normalizedName });

//     if (existing) {
//       return res.status(200).json({
//         source: "cache",
//         success: existing.data
//       });
//     }

//     // 4) Call scraping service
//     const processResponse = await axios.post(
//       `${process.env.FASTAPI_URL}/process`,
//       { query: normalizedName }
//     );

//     const products = processResponse.data?.products || [];

//     let finalResponse;

//     // 5) If no products → placeholder Groq flow
//     if (products.length === 0) {
//       finalResponse = {
//         product_name: normalizedName,
//         price: null,
//         overall_opinion:
//           "Insufficient structured review data available. Analysis generated using language model.",
//         pros: [],
//         cons: [],
//         sentiment_breakdown: {
//           Positive: 0,
//           Negative: 0,
//           Neutral: 0
//         }
//         // 👉 Groq API call will be placed here later
//       };
//     } else {
//       // 6) Extract ASINs
//       const asinList = products
//         .map(p => p.asin)
//         .filter(Boolean);

//       let prices = [];
//       let allPros = [];
//       let allCons = [];
//       let sentiment = { Positive: 0, Negative: 0, Neutral: 0 };

//       // Fetch product details per ASIN
//       for (const asin of asinList) {
//         const detailRes = await axios.get(
//           `${process.env.FASTAPI_URL}/product`,
//           { params: { asin } }
//         );

//         const details = detailRes.data;

//         // Price (INR only, real Amazon price)
//         const price =
//           details?.buybox_winner?.price?.value ||
//           details?.price?.value ||
//           null;

//         if (price) prices.push(price);

//         // Reviews sentiment (defensive)
//         const reviews = details?.reviews || [];

//         reviews.forEach(r => {
//           if (r.sentiment === "positive") sentiment.Positive += 1;
//           else if (r.sentiment === "negative") sentiment.Negative += 1;
//           else sentiment.Neutral += 1;

//           if (r.sentiment === "positive") allPros.push(r.title || r.text);
//           if (r.sentiment === "negative") allCons.push(r.title || r.text);
//         });
//       }

//       // Compute representative price (median, safer than avg)
//       prices.sort((a, b) => a - b);
//       const medianPrice =
//         prices.length > 0
//           ? prices[Math.floor(prices.length / 2)]
//           : null;

//       finalResponse = {
//         name:normalizedName,
//         product_name: normalizedName,
//         price: medianPrice ? `${medianPrice.toLocaleString("en-IN")}` : null,
//         overall_opinion:
//           sentiment.Positive >= sentiment.Negative
//             ? "Overall user sentiment is mostly positive with some reported issues."
//             : "Mixed to negative reviews with recurring concerns reported by users.",
//         pros: [...new Set(allPros)].slice(0, 6),
//         cons: [...new Set(allCons)].slice(0, 6),
//         sentiment_breakdown: sentiment
//       };
//     }

//     // 7) Store in DB (for both if & else)
//     await collection.insertOne({
//       name: normalizedName,
//       source: "scraped",
//       data: finalResponse,
//       createdAt: new Date()
//     });

//     // 8) Return response
//     return res.status(200).json({
//       source: "fresh",
//       success: finalResponse
//     });

//   } catch (error) {
//     console.error("Error in /search:", error.message);
//     return res.status(500).json({ error: "Internal server error" });
//   } finally {
//     await client.close();
//   }
// });


app.post("/search",async(req,res)=>{
  const {name} = req.body;
  if(!name || typeof name !== "string" || name.trim()===""){
    return res.status(400).json({error:"Name is required"});
  }
  const trimmedName=name.trim();
  try {
    // Creating a new connection
    await client.connect();
    const db=client.db("Reviews");
    const collection=db.collection("ProductReviews");
    console.log("Connected to DB");
    // Check DB with the name or link
    const existing=await collection.findOne({"finalResponse.name":trimmedName});
    if(existing && existing.finalResponse){
      return res.status(200).json({
        source:"cache",
        data:existing.finalResponse
      });
    }
    const reviewResponse = await axios.get(
      `${process.env.FASTAPI_URL}/search`,
      { params: { query: trimmedName } } 
    );
   
    const productsScraped=reviewResponse.data?.results || [];
    let finalResponse;
    let preFinalResponse;
    if(!productsScraped || productsScraped.length===0){
      // Call grok here with the trimmed Name
      return res.status(404).json({error:"No products found"});
    }
    else{
      // const asinList=productsScraped.map(prod=>prod.asin).filter(Boolean);
      const asinValue=productsScraped[0].asin;
      const productDetails=await axios.get(
        `${process.env.FASTAPI_URL}/product`,
        {params:{asin:asinValue}}
      );
      preFinalResponse=productDetails.data;
      finalResponse={
        name:trimmedName,
        preFinalResponse
      }
      // console.log(finalResponse);
      // call groq here using the final response and then store it into DB
      await collection.insertOne({
        finalResponse,
        createdAt:new Date(),
      })
      return res.status(200).json({
        source:"created",
        data:finalResponse
      });
    }

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.close();
  }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
