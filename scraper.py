from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
import os
import re
import time
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SCRAPER_API_KEY")

SEARCH_URL = "https://api.scraperapi.com/structured/amazon/search/v1"
PRODUCT_URL = "https://api.scraperapi.com/structured/amazon/product/v1"

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    print(f"{request.method} {request.url.path} took {time.time() - start_time:.2f}s")
    return response


@app.middleware("http")
async def error_handler(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Internal FastAPI Error", "details": str(e)}
        )


def clean_name(name: str):
    if not name:
        return None
    name = name.replace("-", " ").replace("_", " ")
    name = re.sub(r"\s+", " ", name)
    return name.strip()


def extract_product_name(url: str):
    if not url:
        return None

    url = url.lower()

    if not url.startswith("http"):
        url = "https://" + url

    patterns = [
        # Amazon
        (r"\/([^\/]+)\/dp",1),
        # Flipkart
        (r"\/([^\/]+)\/p\/",1),
        # Croma
        (r"croma\.com/([^/]+)/p/", 1),
    ]

    print("Extracting from URL:", url)

    for pattern, group in patterns:
        match = re.search(pattern, url)
        if match:
            return clean_name(match.group(group))

    return None


def search_products_internal(query: str):
    payload = {"api_key": API_KEY, "query": query }
    r = requests.get(SEARCH_URL, params=payload)
    return r.json()


def product_details_internal(asin: str):
    payload = {"api_key": API_KEY, "asin": asin}
    r = requests.get(PRODUCT_URL, params=payload)
    return r.json()


@app.post("/extract-name")
def extract_name_route(data: dict):
    url = data.get("url")
    if not url:
        return {"error": "No URL provided"}

    name = extract_product_name(url)

    if name:
        return {"name": name}

    return {"name": None, "message": "Could not extract product name"}



@app.get("/search")
def search_products(query: str):

    if query.startswith("http"):
        extracted = extract_product_name(query)
        if extracted:
            query = extracted
        else:
            return {"error": "Could not extract product name from URL"}

    return search_products_internal(query)

@app.get("/product")
def product_details(asin: str):
    return product_details_internal(asin)


@app.post("/process")
def process_input(data: dict):
    """
    Input: { "query": "..."} OR { "url": "..." }

    Flow:
    1. If URL → extract product name
    2. Use name/query → run Amazon search
    3. Fetch details for each product ASIN
    """

    url = data.get("url")
    query = data.get("query")

    if url:
        extracted_name = extract_product_name(url)
        if extracted_name:
            query = extracted_name

    if not query:
        return {"error": "No valid product query or URL provided."}

    search_result = search_products_internal(query)

    if "results" not in search_result:
        return {"error": "Search failed or no results found."}

    products = []

    for item in search_result["results"]:
        asin = item.get("asin")
        if not asin:
            continue

        detail_json = product_details_internal(asin)

        products.append({
            "asin": asin,
            "title": item.get("title"),
            "search_item": item,
            "details": detail_json
        })

    return {
        "query_used": query,
        "count": len(products),
        "products": products
    }
