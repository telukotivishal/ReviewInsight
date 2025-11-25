# import requests
# from bs4 import BeautifulSoup
# import time
# from urllib.parse import urlparse, parse_qs
# import os

# # Function to extract product ID from the Amazon product URL
# def extract_product_id(url):
#     # Parse the URL
#     parsed_url = urlparse(url)
    
#     # The product ID is usually between "dp/" and the next "/"
#     path_parts = parsed_url.path.split('/')
    
#     # Find the product ID in the URL structure
#     if "dp" in path_parts:
#         product_index = path_parts.index("dp") + 1
#         return path_parts[product_index]
#     else:
#         raise ValueError("Product ID not found in URL")

# # Function to get reviews from a specific page number
# def get_reviews_from_page(api_key, product_url, page_number):
#     # Extract product ID from the given URL
#     product_id = extract_product_id(product_url)
    
#     # Construct the review URL
#     base_url = f"https://www.amazon.in/product-reviews/{product_id}/ref=cm_cr_getr_d_paging_btm_next_{page_number}"
    
#     # Define query parameters including page number
#     params = {
#         "api_key": api_key,
#         "url": f"{base_url}?ie=UTF8&reviewerType=all_reviews&pageNumber={page_number}"
#     }
    
#     # Send the request to Scraper API
#     response = requests.get("http://api.scraperapi.com", params=params)
    
#     if response.status_code == 200:
#         # Parse HTML content
#         soup = BeautifulSoup(response.text, 'html.parser')
        
#         # Extract review titles
#         review_titles = soup.find_all("a", {"data-hook": "review-title"})
        
#         # Extract review bodies
#         review_bodies = soup.find_all("span", {"data-hook": "review-body"})
        
#         reviews = []
        
#         # Collect the review title and body from each review
#         for title, body in zip(review_titles, review_bodies):
#             review_data = {
#                 "title": title.text.strip(),
#                 "body": body.text.strip()
#             }
#             reviews.append(review_data)
        
#         return reviews
#     else:
#         print(f"Failed to retrieve data for page {page_number}. Status code: {response.status_code}")
#         return []

# # Function to scrape multiple pages of reviews
# def scrape_multiple_review_pages(api_key, product_url, max_pages=5, delay=2):
#     all_reviews = []
    
#     for page in range(1, max_pages + 1):
#         print(f"Scraping page {page}...")
#         reviews = get_reviews_from_page(api_key, product_url, page)
#         all_reviews.extend(reviews)
        
#         # Delay to avoid overwhelming the server or hitting rate limits
#         time.sleep(delay)
    
#     with open("reviews.txt", "a+", encoding="utf-8") as f:
#         for re in all_reviews:
#             f.write(f"Title: {re['title']}\n")
#             f.write(f"Body: {re['body']}\n")
#             f.write("-" * 80 + "\n")
#     return all_reviews

# # Your ScraperAPI key
# # api_key = "997f9a3015d18d4275413f8b22bc0a61" 
# # api_key=os.getenv("SCRAPER_API")
# api_key="2e903bee4251f8efac99ca85ef5ffacb"

# # The product URL you want to scrape reviews from
# product_url = "https://www.amazon.in/Adjustable-Motorised-Headphone-Management-60cm-Carbon-Black/dp/B0B4L9NLPM"

# # Scrape reviews (defaults to 5 pages unless specified)
# all_reviews = scrape_multiple_review_pages(api_key, product_url)  # No need to specify max_pages, defaults to 5

# # Print out the collected reviews
# for idx, review in enumerate(all_reviews):
#     print(f"Review {idx + 1}:")
#     print(f"Title: {review['title']}")
#     print(f"Body: {review['body']}")
#     print("-" * 80)


import requests
from bs4 import BeautifulSoup
import time
from urllib.parse import urlparse
import os

# Extract product ID
def extract_product_id(url):
    parsed = urlparse(url)
    parts = parsed.path.split("/")
    if "dp" in parts:
        return parts[parts.index("dp") + 1]
    raise ValueError("Product ID not found in URL")

# Scrape reviews from specific page
def get_reviews_from_page(api_key, product_url, page_number):
    product_id = extract_product_id(product_url)
    review_url = f"https://www.amazon.in/product-reviews/{product_id}?reviewerType=all_reviews&pageNumber={page_number}"

    params = {
        "api_key": api_key,
        "url": review_url,
        "country_code": "in",
        "device_type": "desktop",
        "render": "true"
    }

    response = requests.get("http://api.scraperapi.com", params=params)

    # Save raw HTML for debugging
    with open(f"debug_page_{page_number}.html", "w", encoding="utf-8") as f:
        f.write(response.text)

    if response.status_code != 200:
        print(f"❌ Status code: {response.status_code}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    titles = soup.select("[data-hook='review-title']")
    bodies = soup.select("[data-hook='review-body']")

    if not titles:
        print(f"⚠️ No reviews found on page {page_number} (Amazon may be blocking or CAPTCHA).")
        return []

    reviews = []
    for t, b in zip(titles, bodies):
        reviews.append({
            "title": t.get_text(strip=True),
            "body": b.get_text(strip=True)
        })

    return reviews

# Scrape multiple pages
def scrape_multiple_review_pages(api_key, product_url, max_pages=5, delay=2):
    all_reviews = []

    for p in range(1, max_pages + 1):
        print(f"🔍 Scraping page {p}...")
        reviews = get_reviews_from_page(api_key, product_url, p)
        all_reviews.extend(reviews)
        time.sleep(delay)

    # Save to file
    with open("reviews.txt", "w", encoding="utf-8") as f:
        for r in all_reviews:
            f.write(f"Title: {r['title']}\n")
            f.write(f"Body: {r['body']}\n")
            f.write("-" * 80 + "\n")

    print(f"✅ Saved {len(all_reviews)} reviews to reviews.txt")
    return all_reviews


# API KEY
api_key = "2e903bee4251f8efac99ca85ef5ffacb"

# Product URL
product_url = "https://www.amazon.in/Adjustable-Motorised-Headphone-Management-60cm-Carbon-Black/dp/B0B4L9NLPM"

# Run scraper
reviews = scrape_multiple_review_pages(api_key, product_url)
