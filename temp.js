import { CrawlingAPI } from 'crawlbase';
import fs from 'fs';
import axios from 'axios';

// Replace with your actual Crawlbase token
const api = new CrawlingAPI({ token: 'panVxST8Utk3w9mkHX2dxA' });

// Add your cookies here (replace placeholders with actual values)
const amazonCookies =
  'x-acbin=BZLMLd92UTHrsYCF5iEJ8ubUDVQNlbQhO6OQWY0YkXU878N1KWIFlQAGM4kJNSYw; at-acbin=Atza|IwEBIPwhAhvMbocfl23Y74Tu1859c25znyqsltJdqJshBH0xIYX6boASpIXoyPlf4TGMZnLVKoCnsnmaQOooOj_V5kVMp5ES1XLMjocSLQq0qyFxoA-TRDImD5Y6ZiZLT12Y6lTSIsX89HUbdtWyRISORagh9zQ2PQruhT3rKTBI0x2Fo4MfAF9MJPs_UrC7inXKldwo0TTFuve-bEToyMCR5OuJed6ghFNpXKIiSORddczzHQ';

// Function to extract ASIN from any Amazon product URL
function extractASIN(url) {
  const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|\/product-reviews\/([A-Z0-9]{10})/);
  return match ? match[1] || match[2] || match[3] : null;
}

// Function to construct reviews URL using the ASIN
function constructReviewsURL(asin, pageNumber = 1) {
  return `https://www.amazon.in/product-reviews/${asin}/?reviewerType=all_reviews&pageNumber=${pageNumber}`;
}

// Fetch reviews for a single page
async function fetchPage(url) {
  try {
    const response = await api.get(url, {
      scraper: 'amazon-product-reviews',
      ajax_wait: 2000, // Reduce wait time
      page_wait: 2000, // Reduce wait time
      cookies: amazonCookies,
    });

    if (response.statusCode === 200) {
      const data = response.json.body;

      // Extract only the required fields
      return data.reviews.map((review) => ({
        reviewerName: review.reviewerName,
        reviewDate: review.reviewDate,
        reviewRating: review.reviewRating,
        reviewText: review.reviewText,
      }));
    } else {
      throw new Error(`API request failed with status: ${response.statusCode}`);
    }
  } catch (error) {
    console.error(`Failed to fetch page: ${url}`);
    console.error(`Error details: ${error.message}`);
    return [];
  }
}

// Fetch reviews in parallel
async function fetchReviews(asin, targetCount = 100) {
  const batchSize = 5; // Number of pages to fetch in parallel
  const allReviews = [];
  let page = 1;

  while (allReviews.length < targetCount) {
    const urls = Array.from({ length: batchSize }, (_, i) =>
      constructReviewsURL(asin, page + i)
    );

    console.log(`Fetching pages ${page} to ${page + batchSize - 1}...`);

    const batchReviews = await Promise.all(urls.map(fetchPage));
    const flatReviews = batchReviews.flat(); // Combine all reviews from the batch

    allReviews.push(...flatReviews);

    // Stop if there are no more reviews
    if (flatReviews.length < batchSize * 10) break;

    page += batchSize;
  }

  return allReviews.slice(0, targetCount); // Return only the desired number of reviews
}

// Main function to fetch reviews
async function fetchAllReviews(productURL, targetCount = 100) {
  try {
    const asin = extractASIN(productURL);
    if (!asin) {
      throw new Error('Invalid Amazon product URL. Unable to extract ASIN.');
    }

    console.log(`Fetching reviews for ASIN: ${asin}`);
    const reviews = await fetchReviews(asin, targetCount);

    console.log('Total Reviews Fetched:', reviews.length);
    fs.writeFileSync('amazon_reviews5.json', JSON.stringify({ reviews }, null, 2));
  } catch (error) {
    console.error(`Failed to fetch reviews: ${error.message}`);
  }
}

// Replace with any Amazon product URL
const amazonProductURL = 'https://www.amazon.in/dp/B08R41SH7Q?pd_rd_i=B08R41SH7Q&pf_rd_p=aa14fa00-bc47-4b9c-afe8-e5f5a8aecc2e&pf_rd_r=HMRB658JH5XZNSSZ38QD&pd_rd_wg=eNRJM&pd_rd_w=UA27M&pd_rd_r=c983c2de-7c88-445d-8221-34936da51a52&th=1';
fetchAllReviews(amazonProductURL, 100); 