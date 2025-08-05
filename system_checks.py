# system_check.py

import os
import sys
import requests
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

load_dotenv()

def run_system_check():
    print("🔍 Running system checks...")

    # 1. Check API Key
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or not api_key.startswith("sk-or-v1-"):
        print("❌ OPENROUTER_API_KEY is missing or invalid in your .env file.")
        sys.exit(1)

    # 2. Check PostgreSQL connection
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="job_scraper",
            user="hetsuhagiya"
            # add password if needed
        )
        cursor = conn.cursor()
        print("✅ Database connection successful.")
    except Exception as e:
        print("❌ Failed to connect to PostgreSQL:", e)
        sys.exit(1)

    # 3. Check if required table exists
    try:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'job_listings'
            );
        """)
        exists = cursor.fetchone()[0]
        if exists:
            print("✅ Table exists.")
        else:
            print("⚠️ Table 'job_listings' does not exist. Creating now...")
            cursor.execute("""
                CREATE TABLE job_listings (
                    id SERIAL PRIMARY KEY,
                    title TEXT,
                    company TEXT,
                    location TEXT,
                    link TEXT UNIQUE,
                    description TEXT,
                    scraped_at TIMESTAMP
                );
            """)
            conn.commit()
            print("✅ Table created.")
    except Exception as e:
        print("❌ Error checking/creating table:", e)
        sys.exit(1)

    # 4. Check OpenRouter API
    try:
        test_payload = {
            "model": "mistralai/mistral-7b-instruct:free",
            "messages": [{"role": "user", "content": "Ping test"}]
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        res = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=test_payload)
        if res.status_code == 200:
            print("✅ OpenRouter API is reachable.")
        else:
            print(f"❌ OpenRouter API error ({res.status_code}):", res.json())
            sys.exit(1)
    except Exception as e:
        print("❌ OpenRouter API check failed:", e)
        sys.exit(1)

    cursor.close()
    conn.close()
    print("✅ All checks passed!\n")