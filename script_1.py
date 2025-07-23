import requests
import os
import json
import time
import datetime
import psycopg2
from psycopg2.extras import execute_values
from linkedin_jobs_scraper import LinkedinScraper
from linkedin_jobs_scraper.query import Query, QueryOptions, QueryFilters
from linkedin_jobs_scraper.filters import ExperienceLevelFilters
from linkedin_jobs_scraper.events import Events, EventData

# --- CONFIG ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
headers = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost",
    "X-Title": "JobScraperAI"
}

# --- GET USER INPUT ---
job_title_input = input("🔍 Enter the job title you want to search for: ").strip()
job_country = input("🌍 Enter the country to search in: ").strip()

# --- DB SETUP ---
conn = psycopg2.connect(
    host="localhost",
    database="job_scraper",
    user="hetsuhagiya"
)
cursor = conn.cursor()

# --- SCRAPER SETUP ---
jobs = []

scraper = LinkedinScraper(
    chrome_executable_path=None,
    chrome_binary_location=None,
    headless=True,
    slow_mo=2,
    max_workers=1
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
    print(f"\n✅ Saved: {job['Title']} at {job['Company']}")

def on_error(error):
    print("❌ Error occurred:", error)

def on_end():
    print("\n✅ Scraping completed!")

    if not jobs:
        print("⚠️ No jobs to store.")
        return

    print(f"📦 Saving {len(jobs)} jobs to PostgreSQL...")

    insert_query = """
        INSERT INTO job_listings (title, company, location, link, description, scraped_at)
        VALUES %s
        ON CONFLICT (link) DO NOTHING;
    """

    data_tuples = [
        (
            job["Title"],
            job["Company"],
            job["Location"],
            job["Link"],
            job["Description"],
            datetime.datetime.now()
        )
        for job in jobs
    ]

    execute_values(cursor, insert_query, data_tuples)
    conn.commit()
    print("✅ Jobs saved.")

    # --- COMBINE DESCRIPTIONS ---
    long_descriptions = [job["Description"] for job in jobs if job["Description"] and len(job["Description"]) > 100]
    combined_desc = "\n\n".join(long_descriptions)

    if not combined_desc:
        print("⚠️ No valid job descriptions found to generate suggestions.")
    else:
        # --- MAKE SINGLE AI REQUEST ---
        prompt = f"""
You are an expert career and AI assistant. Your task is to read job descriptions for roles like "{job_title_input}" and suggest 3 to 5 specific, realistic portfolio projects someone can build to strengthen their application.

You should:
- Combine the common needs across all descriptions
- Recommend projects that are practical and relevant
- Focus on what a beginner to intermediate candidate can realistically do
- Ensure the projects reflect real-world value and skills expected in the roles

Here are the job descriptions to analyze:
{combined_desc}
        """.strip()

        payload = {
            "model": "qwen/qwen-2.5-72b-instruct:free",
            "messages": [
                {"role": "system", "content": "You generate realistic portfolio project ideas based on job descriptions."},
                {"role": "user", "content": prompt}
            ]
        }

        try:
            response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, data=json.dumps(payload))
            response_json = response.json()

            if "choices" in response_json:
                suggestions = response_json["choices"][0]["message"]["content"]
                print(f"\n🧠 Final Project Suggestions Based on {len(jobs)} Job Descriptions:\n{suggestions}\n")
            else:
                print("❌ Failed to fetch suggestions — response invalid.")
                print("🔍 Full response:", response_json)

        except Exception as e:
            print(f"❌ AI API error: {e}")

    cursor.close()
    conn.close()

# --- REGISTER EVENTS ---
scraper.on(Events.DATA, on_data)
scraper.on(Events.ERROR, on_error)
scraper.on(Events.END, on_end)

# --- RUN SCRAPER ---
scraper.run([
    Query(
        query=job_title_input,
        options=QueryOptions(
            locations=[job_country],
            limit=10,
            filters=QueryFilters(
                experience=[
                    ExperienceLevelFilters.ENTRY_LEVEL,
                    ExperienceLevelFilters.ASSOCIATE
                ]
            )
        )
    )
])