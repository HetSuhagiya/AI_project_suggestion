import streamlit as st
import os
import sys
import re
from system_checks import run_system_check

# Ensure current directory is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Run system check before anything else
run_system_check()

# Page config
st.set_page_config(page_title="JobScraperAI", layout="centered")

# --- UI Header ---
st.title("🔍 AI-Powered Job Scraper")
st.markdown(
    "Use this tool to scrape LinkedIn job listings and generate tailored portfolio project suggestions using OpenRouter AI."
)

# --- Input Form ---
with st.form("input_form"):
    job_title_input = st.text_input("Job Title", placeholder="e.g. Junior Data Analyst")
    job_country = st.text_input("Country", placeholder="e.g. United Kingdom")
    submit_btn = st.form_submit_button("Start Scraping")

# --- Run Main Script ---
if submit_btn and job_title_input and job_country:
    st.success("✅ Inputs received. Running the scraper...")

    with st.spinner("Scraping job listings and generating project ideas..."):
        from script_1 import run_pipeline
        output = run_pipeline(job_title_input.strip(), job_country.strip())

    if output and "suggestions" in output:
        raw_text = output["suggestions"]

        st.markdown("## 🧠 Suggested Portfolio Projects")

        # Split suggestions by numbered sections like "1. ..."
        projects = re.split(r"\n(?=\d+\.\s)", raw_text.strip())

        for proj in projects:
            proj = proj.strip()
            if not proj:
                continue

            # Extract title and content
            match = re.match(r"(\d+\.\s+)(.+?)(\n|$)", proj)
            if match:
                title = match.group(2).strip()
                content = proj[match.end():].strip()
            else:
                title = "Untitled Project"
                content = proj

            #st.markdown(f"### 📌 {title}")
            st.markdown(content)
            st.markdown("---")  # Horizontal line between projects

    elif "error" in output:
        st.error(f"❌ {output['error']}")
    else:
        st.error("❌ No suggestions generated.")