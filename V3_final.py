import requests
import os
import threading
import json
import datetime
import psycopg2
from psycopg2.extras import execute_values
from linkedin_jobs_scraper import LinkedinScraper
from linkedin_jobs_scraper.query import Query, QueryOptions, QueryFilters
from linkedin_jobs_scraper.filters import ExperienceLevelFilters
from linkedin_jobs_scraper.events import Events, EventData
from system_checks import run_system_check
from dotenv import load_dotenv
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import concurrent.futures
from urllib.parse import urlparse
import hashlib
import pickle
from threading import Lock
import queue

# Load environment variables
load_dotenv()

# Global browser pool and cache
browser_pool = queue.Queue()
cache_lock = Lock()
description_cache = {}
ai_cache = {}

def init_browser_pool(pool_size=3):
    """Initialize a pool of browser instances"""
    for _ in range(pool_size):
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--disable-images")  # Speed optimization
        chrome_options.add_argument("--disable-javascript")  # Speed optimization
        chrome_options.add_argument("--disable-css")  # Speed optimization
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        
        try:
            driver = webdriver.Chrome(options=chrome_options)
            browser_pool.put(driver)
        except Exception as e:
            print(f"⚠️ Failed to create browser instance: {e}")

def cleanup_browser_pool():
    """Clean up all browser instances"""
    while not browser_pool.empty():
        try:
            driver = browser_pool.get_nowait()
            driver.quit()
        except:
            pass

def get_url_hash(url):
    """Generate hash for URL caching"""
    return hashlib.md5(url.encode()).hexdigest()

def load_cache():
    """Load description cache from disk"""
    global description_cache
    try:
        if os.path.exists('description_cache.pkl'):
            with open('description_cache.pkl', 'rb') as f:
                description_cache = pickle.load(f)
            print(f"📦 Loaded {len(description_cache)} cached descriptions")
    except Exception as e:
        print(f"⚠️ Could not load cache: {e}")
        description_cache = {}

def save_cache():
    """Save description cache to disk"""
    try:
        with open('description_cache.pkl', 'wb') as f:
            pickle.dump(description_cache, f)
        print(f"💾 Saved {len(description_cache)} descriptions to cache")
    except Exception as e:
        print(f"⚠️ Could not save cache: {e}")

def get_cached_description(url):
    """Get description from cache if available and recent"""
    with cache_lock:
        url_hash = get_url_hash(url)
        if url_hash in description_cache:
            cached_data = description_cache[url_hash]
            # Check if cache is less than 7 days old
            if (datetime.datetime.now() - cached_data['timestamp']).days < 7:
                return cached_data['description']
    return None

def cache_description(url, description):
    """Cache description with timestamp"""
    with cache_lock:
        url_hash = get_url_hash(url)
        description_cache[url_hash] = {
            'description': description,
            'timestamp': datetime.datetime.now(),
            'url': url
        }

def get_full_job_description_optimized(job_link, max_retries=2):
    """
    Optimized version using browser pool and caching
    """
    # Check cache first
    cached_desc = get_cached_description(job_link)
    if cached_desc:
        print(f"🚀 Using cached description for: {job_link[:50]}...")
        return cached_desc

    # Try to get browser from pool
    driver = None
    try:
        driver = browser_pool.get(timeout=5)
    except queue.Empty:
        print(f"⚠️ No available browser for: {job_link[:50]}...")
        return None

    for attempt in range(max_retries):
        try:
            driver.get(job_link)
            
            # Reduced wait time
            time.sleep(1)
            
            # Try to click "Show more" button if it exists
            try:
                show_more_button = WebDriverWait(driver, 3).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@aria-label, 'Show more') or contains(text(), 'Show more') or contains(@class, 'show-more')]"))
                )
                driver.execute_script("arguments[0].click();", show_more_button)
                time.sleep(0.5)
            except:
                pass

            # Optimized selectors (most common first)
            description_selectors = [
                ".jobs-description-content__text",
                ".jobs-description__content", 
                ".description__text",
                "[data-test-id='job-description']",
                ".jobs-box__html-content",
                ".job-description",
                ".description"
            ]
            
            full_description = ""
            for selector in description_selectors:
                try:
                    description_elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    if description_elements:
                        full_description = description_elements[0].text.strip()
                        if len(full_description) > 100:
                            break
                except:
                    continue
            
            if full_description and len(full_description) > 100:
                # Cache the result
                cache_description(job_link, full_description)
                return full_description
            
        except Exception as e:
            print(f"Attempt {attempt + 1} failed for {job_link}: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
        finally:
            # Return browser to pool
            if driver:
                try:
                    browser_pool.put(driver, timeout=1)
                except queue.Full:
                    driver.quit()  # Pool is full, close this instance
    
    return None

def fetch_descriptions_smart_parallel(job_links, target_descriptions=8, max_workers=4):
    """
    Smart parallel fetching with early termination and quality filtering
    """
    full_descriptions = {}
    processed = 0
    
    # Prioritize jobs (you can customize this logic)
    prioritized_links = sorted(job_links, key=lambda x: len(x))  # Shorter URLs often = better structured
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit initial batch
        futures = {}
        for i, link in enumerate(prioritized_links[:max_workers * 2]):  # Submit 2x workers initially
            future = executor.submit(get_full_job_description_optimized, link)
            futures[future] = link
        
        # Process as they complete
        for future in concurrent.futures.as_completed(futures, timeout=60):
            link = futures[future]
            processed += 1
            
            try:
                description = future.result(timeout=10)
                if description and len(description) > 200:
                    full_descriptions[link] = description
                    print(f"✅ ({len(full_descriptions)}/{target_descriptions}) Fetched: {link[:50]}...")
                    
                    # Early termination if we have enough quality descriptions
                    if len(full_descriptions) >= target_descriptions:
                        print(f"🎯 Target reached! Got {len(full_descriptions)} descriptions")
                        # Cancel remaining futures
                        for remaining_future in futures:
                            if not remaining_future.done():
                                remaining_future.cancel()
                        break
                else:
                    print(f"⚠️ Low quality description for: {link[:50]}...")
                    
                # Submit next job if available and we haven't reached target
                if processed + len(futures) - processed < len(prioritized_links) and len(full_descriptions) < target_descriptions:
                    next_idx = max_workers * 2 + (processed - max_workers * 2)
                    if next_idx < len(prioritized_links):
                        next_link = prioritized_links[next_idx]
                        future = executor.submit(get_full_job_description_optimized, next_link)
                        futures[future] = next_link
                        
            except Exception as e:
                print(f"❌ Error processing {link[:50]}...: {e}")
            
            # Small delay to avoid overwhelming LinkedIn
            time.sleep(0.5)
    
    return full_descriptions

def get_ai_suggestions_cached(combined_desc, job_title_input, job_country, headers):
    """Get AI suggestions with caching"""
    # Create hash for this specific request
    request_hash = hashlib.md5(f"{job_title_input}_{job_country}_{combined_desc[:1000]}".encode()).hexdigest()
    
    # Check AI cache
    if request_hash in ai_cache:
        cache_data = ai_cache[request_hash]
        if (datetime.datetime.now() - cache_data['timestamp']).hours < 24:  # 24 hour cache
            print("🚀 Using cached AI suggestions!")
            return cache_data['suggestions']
    
    # Generate new suggestions
    prompt = f"""
You are an expert career and AI assistant. Your task is to read FULL job descriptions for roles like "{job_title_input}" and suggest 3 to 5 specific, realistic portfolio projects someone can build to strengthen their application.

ANALYSIS CONTEXT:
- Focus on {job_country} market requirements
- Analyzed comprehensive job descriptions

You should:
- Analyze the complete job requirements, not just summaries
- Identify the most common technical skills, tools, and responsibilities
- Recommend projects that directly address these requirements
- Provide detailed project descriptions with step-by-step guidance
- Frame each project with a real-world problem it solves
- Focus on what a beginner to intermediate candidate can realistically complete
- Suggest specific deliverables (dashboard, notebook, blog post, PDF report, GitHub README)
- Ensure projects reflect real-world value expected in these roles
- Include detailed project structure with sources and links
- Suggest walkthrough tutorials available on YouTube
- Provide clear success criteria and expected outcomes
- List ideal tech stack for each project
- Include optional stretch goals for advanced learners
- Explain evaluation criteria (what makes each project impactful)
- Describe commercial potential, MVP value, or unique market differentiation
- Suggest professional presentation strategies for interviews and LinkedIn

Here are the FULL job descriptions to analyze:
{combined_desc[:12000]}
    """.strip()

    payload = {
        "model": "qwen/qwen-2.5-72b-instruct:free",
        "messages": [
            {"role": "system", "content": "You are an expert career advisor who analyzes complete job descriptions to generate realistic, targeted portfolio project recommendations."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 4000,
        "temperature": 0.7
    }

    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, data=json.dumps(payload))
        response_json = response.json()

        if "choices" in response_json and response_json["choices"]:
            suggestions = response_json["choices"][0]["message"]["content"]
            
            # Cache the result
            ai_cache[request_hash] = {
                'suggestions': suggestions,
                'timestamp': datetime.datetime.now()
            }
            
            return suggestions
        else:
            return None
    except Exception as e:
        print(f"AI call failed: {e}")
        return None

def check_existing_descriptions(cursor, job_links):
    """Check which jobs already have full descriptions in DB"""
    if not job_links:
        return {}
    
    try:
        # Create placeholders for the query
        placeholders = ','.join(['%s'] * len(job_links))
        query = f"""
            SELECT link, description FROM job_listings
            WHERE link IN ({placeholders}) 
            AND LENGTH(description) > 300
            AND scraped_at > NOW() - INTERVAL '7 days'
        """
        
        cursor.execute(query, job_links)
        results = cursor.fetchall()
        
        existing_descriptions = {row[0]: row[1] for row in results}
        print(f"📚 Found {len(existing_descriptions)} existing full descriptions in DB")
        return existing_descriptions
        
    except Exception as e:
        print(f"⚠️ Could not check existing descriptions: {e}")
        return {}

def run_pipeline(job_title_input, job_country):
    start_time = time.time()
    
    # Load caches
    load_cache()
    
    # Initialize browser pool
    print("🚀 Initializing browser pool...")
    init_browser_pool(pool_size=3)
    
    try:
        run_system_check()

        # --- API Setup ---
        OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
        if not OPENROUTER_API_KEY:
            return {"error": "Missing OpenRouter API key."}

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "JobScraperAI"
        }

        # --- Database Setup ---
        try:
            conn = psycopg2.connect(
                host="aws-0-eu-west-2.pooler.supabase.com",
                database="postgres",
                user="postgres.ddinjwscpzammkrzkdvw",
                password=os.getenv("SUPABASE_DB_PASSWORD"),
                port=5432,
                sslmode="require"
            )
            cursor = conn.cursor()
        except Exception as e:
            return {"error": f"Database connection failed: {e}"}

        # --- Scraper Setup ---
        jobs = []
        result = {}
        finished_event = threading.Event()

        scraper = LinkedinScraper(
            chrome_executable_path=None,
            chrome_binary_location=None,
            headless=True,
            slow_mo=1,  # Reduced from 2
            max_workers=2  # Increased from 1
        )

        def on_data(data: EventData):
            job = {
                "Title": data.title,
                "Company": data.company,
                "Location": data.place or data.company_location,
                "Link": data.link,
                "Description": data.description[:500] if data.description else ""
            }
            jobs.append(job)

        def on_error(error):
            print("❌ Error occurred:", error)

        def on_end():
            nonlocal result

            if not jobs:
                result = {"error": "No jobs scraped."}
                finished_event.set()
                return

            print(f"📊 Scraped {len(jobs)} jobs in {time.time() - start_time:.1f}s")

            # Check existing descriptions in DB first
            job_links = [job["Link"] for job in jobs if job["Link"]]
            existing_descriptions = check_existing_descriptions(cursor, job_links)
            
            # Only fetch descriptions for jobs we don't have
            links_to_fetch = [link for link in job_links if link not in existing_descriptions]
            
            if links_to_fetch:
                print(f"🔍 Need to fetch {len(links_to_fetch)} new descriptions...")
                # Start fetching descriptions in parallel while we continue
                fetch_start = time.time()
                full_descriptions = fetch_descriptions_smart_parallel(
                    links_to_fetch, 
                    target_descriptions=min(8, len(links_to_fetch)), 
                    max_workers=3
                )
                print(f"⚡ Fetched descriptions in {time.time() - fetch_start:.1f}s")
            else:
                full_descriptions = {}

            # Combine existing and newly fetched descriptions
            all_descriptions = {**existing_descriptions, **full_descriptions}

            # Update jobs with full descriptions
            quality_jobs = []
            for job in jobs:
                if job["Link"] in all_descriptions:
                    job["FullDescription"] = all_descriptions[job["Link"]]
                    if len(job["FullDescription"]) > 300:  # Quality threshold
                        quality_jobs.append(job)
                        print(f"✅ Quality description for: {job['Title']}")
                else:
                    job["FullDescription"] = job["Description"]
                    print(f"⚠️ Using fallback for: {job['Title']}")

            # Only insert/update jobs with new full descriptions
            if full_descriptions:
                insert_query = """
                    INSERT INTO job_listings (title, company, location, link, description, scraped_at)
                    VALUES %s
                    ON CONFLICT (link) DO UPDATE SET 
                        description = EXCLUDED.description,
                        scraped_at = EXCLUDED.scraped_at;
                """
                data_tuples = [
                    (job["Title"], job["Company"], job["Location"], job["Link"], 
                     job["FullDescription"], datetime.datetime.now())
                    for job in jobs if job["Link"] in full_descriptions
                ]

                try:
                    if data_tuples:
                        execute_values(cursor, insert_query, data_tuples)
                        conn.commit()
                        print(f"💾 Updated {len(data_tuples)} jobs in database")
                except Exception as e:
                    print(f"⚠️ DB insert warning: {e}")

            # Use quality descriptions for AI analysis
            long_descriptions = [
                job["FullDescription"] for job in quality_jobs 
                if len(job["FullDescription"]) > 300
            ]

            print(f"📝 Using {len(long_descriptions)} quality descriptions for AI")

            # --- Get historical descriptions (limit to save time) ---
            try:
                historical_query = """
                    SELECT description FROM job_listings
                    WHERE title ILIKE %s AND LENGTH(description) > 300
                    ORDER BY scraped_at DESC
                    LIMIT 10
                """
                cursor.execute(historical_query, (f"%{job_title_input}%",))
                historical_results = cursor.fetchall()
                historical_descriptions = [row[0] for row in historical_results if row[0]]
                print(f"📚 Using {len(historical_descriptions)} historical descriptions")
            except Exception as e:
                historical_descriptions = []
                print(f"⚠️ No historical descriptions: {e}")

            # Combine descriptions (prioritize recent quality ones)
            combined_desc = "\n\n".join(long_descriptions[:5] + historical_descriptions[:5])

            if not combined_desc:
                result = {"error": "No valid job descriptions to analyze."}
                finished_event.set()
                return

            # --- AI Analysis with caching ---
            print("🤖 Generating AI suggestions...")
            ai_start = time.time()
            suggestions = get_ai_suggestions_cached(combined_desc, job_title_input, job_country, headers)
            
            if suggestions:
                result = {
                    "suggestions": suggestions,
                    "jobs_analyzed": len(jobs),
                    "quality_descriptions": len(long_descriptions),
                    "historical_jobs_used": len(historical_descriptions),
                    "cached_descriptions_used": len(existing_descriptions),
                    "newly_fetched": len(full_descriptions),
                    "total_time": round(time.time() - start_time, 1),
                    "ai_time": round(time.time() - ai_start, 1)
                }
                print(f"✅ AI analysis completed in {time.time() - ai_start:.1f}s!")
            else:
                result = {"error": "Failed to generate AI suggestions."}

            cursor.close()
            conn.close()
            finished_event.set()

        # --- Register Events ---
        scraper.on(Events.DATA, on_data)
        scraper.on(Events.ERROR, on_error)
        scraper.on(Events.END, on_end)

        # --- Run Scraper ---
        try:
            print(f"🔍 Starting optimized scraper for '{job_title_input}' in '{job_country}'...")
            scraper.run([
                Query(
                    query=job_title_input,
                    options=QueryOptions(
                        locations=[job_country],
                        limit=12,  # Slightly increased to account for filtering
                        filters=QueryFilters(
                            experience=[
                                ExperienceLevelFilters.ENTRY_LEVEL,
                                ExperienceLevelFilters.ASSOCIATE
                            ]
                        )
                    )
                )
            ])
        except Exception as e:
            return {"error": f"Scraper error: {e}"}

        # Wait for completion
        finished_event.wait()
        
        # Save cache for next time
        save_cache()
        
        print(f"🏁 Total pipeline time: {time.time() - start_time:.1f}s")
        return result

    finally:
        # Always cleanup browser pool
        cleanup_browser_pool()