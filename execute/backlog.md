# Product & Feature Backlog

This document contains a running list of prioritized ideas and feature requests.

**Status Note:** Items marked with `[Tracked]` have been moved to the main [Execution Tracker](./execution_tracker.md) for implementation in the current milestone.

---

### 1. Multi-language Support (English/Tamil)
*   **Status:** `[Completed]`
*   **Description:** Implement a language switcher (e.g., a toggle button in the header) on the public-facing pages. This feature will allow users to dynamically change the language of all UI text, labels, and buttons between English and Tamil. This involves creating a translation mapping for all text elements and loading the appropriate language based on user selection.
*   **Primary Persona:** Citizen

### 2. Production-Ready Backend Infrastructure
*   **Status:** `[Tracked]`
*   **Description:** Fully implement the backend on the Cloudflare serverless platform as defined in the engineering design. This is a prerequisite for the MVP phase. Key tasks include:
    *   Setting up Cloudflare Pages with production environment variables for all secrets (admin credentials, API keys).
    *   Deploying Cloudflare Workers to handle all API logic (complaint submission, retrieval, updates).
    *   Configuring and connecting a D1 database for storing complaint data.
    *   Configuring and connecting an R2 bucket for storing all image uploads.
    *   Creating a secure, admin-only API endpoint to **purge all test data** from the D1 database and R2 bucket to allow for clean testing cycles.
*   **Primary Persona:** Admin, Developer

### 3. Internal Developer Documentation Portal
*   **Status:** `[Completed]`
*   **Description:** Create a special, hidden page accessible only at the `/dev` URL. This page must be password-protected. Upon successful authentication, the page should fetch and render the content of all project documentation and planning files (from the `docs/` and `execute/` folders) in a clean, readable format. This creates a single, live "source of truth" portal for the development team to view project plans, designs, and progress.
*   **Primary Persona:** Developer, Project Manager

### 4. Developer Tools: Quick Test Data Seeding
*   **Status:** `[Completed]`
*   **Description:** To accelerate testing, create a developer-only feature that automatically fills the complaint submission form with valid sample data. This could be implemented as a small "Fill with Test Data" button placed discreetly on the form, which is only visible when the application is running in a development or staging environment.
*   **Primary Persona:** Developer, QA Tester
