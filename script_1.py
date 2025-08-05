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

# Load environment variables
load_dotenv()

def run_pipeline(job_title_input, job_country):
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

    def on_error(error):
        print("❌ Error occurred:", error)

    def on_end():
        nonlocal result

        if not jobs:
            result = {"error": "No jobs scraped."}
            finished_event.set()
            return

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

        try:
            execute_values(cursor, insert_query, data_tuples)
            conn.commit()
        except Exception as e:
            result = {"error": f"DB insert error: {e}"}
            finished_event.set()
            return

        # New job descriptions
        long_descriptions = [job["Description"] for job in jobs if job["Description"] and len(job["Description"]) > 100]

        # --- Fetch historical descriptions for similar roles ---
        try:
            historical_query = """
                SELECT description FROM job_listings
                WHERE title ILIKE %s
                ORDER BY scraped_at DESC
                LIMIT 20
            """
            cursor.execute(historical_query, (f"%{job_title_input}%",))
            historical_results = cursor.fetchall()
            historical_descriptions = [row[0] for row in historical_results if row[0]]
        except Exception as e:
            historical_descriptions = []
            print(f"⚠️ Warning: Could not fetch historical descriptions: {e}")

        # Combine both
        combined_desc = "\n\n".join(historical_descriptions + long_descriptions)

        if not combined_desc:
            result = {"error": "No valid job descriptions to analyze."}
            finished_event.set()
            return

        # --- AI Prompt ---
        prompt = f"""
You are an expert career and AI assistant. Your task is to read job descriptions for roles like "{job_title_input}" and suggest 3 to 5 specific, realistic portfolio projects someone can build to strengthen their application.

You should:
- Combine the common needs across all descriptions
- Recommend projects that are both practical and relevant
- Provide detailed case description
- Frame each project with a real-world problem it solves and how your solution addresses it
- Focus on what a beginner to intermediate candidate can realistically do
- Suggest what deliverables to create (e.g. dashboard, notebook, blog post, PDF report, GitHub README)
- Ensure the projects reflect real-world value and skills expected in the roles
- Make sure that the projects are structured in detail including detailed description, sources user can refer along with the links
- Suggest walkthrough projects available on YouTube
- Provide what expected outcome should look like
- List the ideal tech stack (e.g. Python, SQL, APIs, Tableau, Streamlit, etc.)
- Include optional stretch goals for those who want to go beyond the basic version
- Mention how to evaluate if the project is done well (what makes it impactful or complete)
- Describe the value of each project: does it have commercial potential, MVP value, or something unique compared to what exists in the market?
- Suggest how the project can be presented professionally — such as in interviews, blog posts, or on LinkedIn

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

            if "choices" in response_json and response_json["choices"]:
                suggestions = response_json["choices"][0]["message"]["content"]
                result = {"suggestions": suggestions}
            else:
                result = {"error": "Invalid AI response format."}
        except Exception as e:
            result = {"error": f"AI call failed: {e}"}
        finally:
            cursor.close()
            conn.close()
            finished_event.set()

    # --- Register Events ---
    scraper.on(Events.DATA, on_data)
    scraper.on(Events.ERROR, on_error)
    scraper.on(Events.END, on_end)

    # --- Run Scraper ---
    try:
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
    except Exception as e:
        return {"error": f"Scraper error: {e}"}

    # Wait for scraping and AI call to finish
    finished_event.wait()
    return result