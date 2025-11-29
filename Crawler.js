import { CrawlingAPI } from 'crawlbase';
import fs from 'fs';
import axios from 'axios';

const api = new CrawlingAPI({ token: 'panVxST8Utk3w9mkHX2dxA' });

const amazonCookies = 'x-acbin=Ws5Or0X6ElG9Xe0vMWl4M@XqRrJ2JRlMMCmAM4zNXx8HeNIJvv7LzW2igTy4EcLd; at-acbin=Atza|IwEBIDzqIDHmzvbJyHzgGeJg8JsG-mfGrdXWs5y9fVPFT96yrWWj_DlHKjimp7pvYaJ6n5RgaQ64CjecLR4URfmBXbOEsMuruUnDqA6C7utI-uWs6cNB4jITKaQ9zFjjLow39DyKFRpHzCoppTFw4etXm1PrQCQ_6Ft_9PfiiaBIXM6ctCczQS05stklQBQzcjj3cr5CbIVVg63kt3oj1qkWF_Z-OpaKgnTJjYUyFIxMU7lEZA'; 

function extractASIN(url) {
  const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|\/product-reviews\/([A-Z0-9]{10})/);
  return match ? match[1] || match[2] || match[3] : null;
}

function constructReviewsURL(asin, pageNumber = 1) {
  return `https://www.amazon.in/product-reviews/${asin}/?reviewerType=all_reviews&pageNumber=${pageNumber};`
}

async function fetchPage(url) {
  try {
    const response = await api.get(url, {
      scraper: 'amazon-product-reviews',
      ajax_wait: 2000,
      page_wait: 2000,
      cookies: amazonCookies,
    });

    if (response.statusCode === 200) {
      const data = response.json.body;
      return data.reviews.map((review) => ({
        reviewerName: review.reviewerName,
        reviewDate: review.reviewDate,
        reviewRating: review.reviewRating,
        reviewText: review.reviewText,
      }));
    } else {
      console.error(`API request failed with status: ${response.statusCode}`);
      console.error('Response body:', response.json);
      console.error('Response headers:', response.headers);
      throw new Error(`API request failed with status: ${response.statusCode}`);
    }
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

    const batchReviews = await Promise.all(urls.map(fetchPage));
    const flatReviews = batchReviews.flat(); 

    allReviews.push(...flatReviews);
    if (flatReviews.length < batchSize * 10) break;

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