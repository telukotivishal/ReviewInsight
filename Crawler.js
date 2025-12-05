import { CrawlingAPI } from 'crawlbase';
import dotenv from 'dotenv';

dotenv.config();

const { CRAWLBASE_TOKEN, AMAZON_REVIEW_COOKIES } = process.env;

if (!CRAWLBASE_TOKEN) {
  throw new Error('CRAWLBASE_TOKEN is not defined. Set it in the environment.');
}

const api = new CrawlingAPI({ token: CRAWLBASE_TOKEN });
const amazonCookies = AMAZON_REVIEW_COOKIES ?? '';

function extractASIN(url) {
  const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|\/product-reviews\/([A-Z0-9]{10})/);
  return match ? match[1] || match[2] || match[3] : null;
}

function constructReviewsURL(asin, pageNumber = 1) {
  return `https://www.amazon.in/product-reviews/${asin}/?reviewerType=all_reviews&pageNumber=${pageNumber}`;
}

async function fetchPage(url) {
  try {
    const { statusCode, json, headers } = await api.get(url, {
      scraper: 'amazon-product-reviews',
      ajax_wait: 2000,
      page_wait: 2000,
      cookies: amazonCookies,
    });

    if (statusCode !== 200) {
      console.error(`API request failed with status: ${statusCode}`);
      console.error('Response body:', json);
      console.error('Response headers:', headers);
      throw new Error(`API request failed with status: ${statusCode}`);
    }

    const reviews = json?.body?.reviews ?? [];
    if (!Array.isArray(reviews)) {
      return [];
    }

    return reviews
      .map(({ reviewerName, reviewDate, reviewRating, reviewText }) => ({
        reviewerName,
        reviewDate,
        reviewRating,
        reviewText,
      }))
      .filter(Boolean);
  } catch (error) {
    console.error(`Failed to fetch page: ${url}`);
    console.error('Full error object:', error);
    return [];
  }
}

async function fetchReviews(asin, targetCount = 100) {
  const batchSize = 5;
  const allReviews = [];
  let page = 1;

  while (allReviews.length < targetCount) {
    const urls = Array.from({ length: batchSize }, (_, i) =>
      constructReviewsURL(asin, page + i)
    );

    console.log(`Fetching pages ${page} to ${page + batchSize - 1}...`);

    const batchReviews = await Promise.allSettled(urls.map(fetchPage));
    const flatReviews = batchReviews
      .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
      .filter(Boolean);

    allReviews.push(...flatReviews);

    if (flatReviews.length === 0) {
      break;
    }

    page += batchSize;
  }

  return allReviews.slice(0, targetCount);
}

export async function fetchAllReviews(productURL, targetCount = 100) {
  try {
    const asin = extractASIN(productURL);
    if (!asin) {
      throw new Error('Invalid Amazon product URL. Unable to extract ASIN.');
    }

    console.log(`Fetching reviews for ASIN: ${asin}`);
    const reviews = await fetchReviews(asin, targetCount);

    console.log('Total Reviews Fetched:', reviews.length);
    return reviews;
    } catch (error) {
    console.error(`Failed to fetch reviews: ${error.message}`);
    return []; 
  }
}