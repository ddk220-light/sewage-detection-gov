# Instructions for the LLM Coding Agent

### Project Context
You are a competent coding agent working on a **Government Complaint Management System**.
- **Frontend:** The frontend is composed of static files: `index.html`, `styles.css`, and `script.js`.
- **Backend:** The backend will be serverless, built inside the `functions/` directory, which automatically deploys to Cloudflare Pages Functions.
- **Documentation:** All project planning and design documents are located in the `docs/` folder.
- **Agile Tracking:** All agile planning files (epics, backlog, etc.) are in the `execute/` folder.

### Your Workflow
1.  Your primary set of tasks is located in this file (`execute/execution_tracker.md`) under the **"LLM Coding Instructions"** section.
2.  You must tackle the tasks in the order they are presented, from easiest to hardest.
3.  Before starting a task, announce which one you are beginning (e.g., "Starting Task 1: Developer Tools: Quick Test Data Seeding").
4.  After you successfully complete the implementation for a task, you **must** update the project tracking documents as described below.

### How to Update Tracking Documents (CRITICAL)
After completing a task, perform the following steps:

1.  **Mark Task as Completed:** In this file (`execute/execution_tracker.md`), find the instruction block for the task you just finished. Add a new line at the top of that section: `**Status:** Completed`.
2.  **Update the Backlog:** Open the `execute/backlog.md` file. Find the corresponding item and change its status from `[Tracked]` to `[Completed]`.
3.  **Update Milestone Status:** In this file, check if all tasks under "LLM Coding Instructions" are marked as "Completed". If they are, change the status of the **"Phase 1: Prototype Stage"** milestone in the table at the top from "In Progress" to "Completed".
4.  **Report and Proceed:** Announce that you have completed the task and updated the tracking documents, then state which task you are beginning next.

---
# Execution & Milestone Tracker

This document provides a high-level overview of the project's major milestones and tracks the status of the Epics associated with them. This roadmap is directly tied to the phases outlined in the Go-To-Market plan.

| Milestone | Description | Associated Epic(s) / Items | Status | Target Date |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1: Prototype Stage** | Validate core functionality and add key features for testing and production readiness. | [EPIC-001](./epics/EPIC-001-core-complaint-system.md) <br/> - Quick Test Data Seeding <br/> - Multi-language Support <br/> - Dev Documentation Portal <br/> - Production Backend | **In Progress** | 2025-12-15 |
| **Phase 2: MVP Private Beta** | Launch a stable, end-to-end system to a limited group of real users. Achieve 50 real complaints. | TBD | Not Started | 2025-12-31 |
| **Phase 3: Public Launch** | Roll out the system to the general public, starting with a few city wards. | TBD | Not Started | Q1 2026 |

---

## LLM Coding Instructions

This section contains high-level goals and acceptance criteria for the remaining items in the **Phase 1: Prototype Stage** milestone. The items are ordered by estimated effort (easiest first). As a competent coding agent, you are expected to handle the implementation details.

---
### 1. Developer Tools: Quick Test Data Seeding (Easiest)

**Status:** Completed

*   **Goal:** Implement a way for developers to quickly populate the complaint form with sample data.
*   **Acceptance Criteria:**
    *   A mechanism (e.g., a button) is present on the complaint submission page for developers.
    *   Activating this mechanism instantly fills the 'Location', 'Description', and 'Contact Number' fields with valid sample data.
    *   The feature should not be obtrusive to a regular user and should be implemented entirely in `script.js`.
*   **Suggested Approach:** You could dynamically create and append a small, absolutely positioned button to the form container. Alternatively, a URL query parameter could trigger the data seeding. Choose the approach you find most efficient.
*   **Implementation Details:**
    *   Added a floating developer button (🔧 icon) in the bottom-right corner, only visible in public view
    *   Implemented keyboard shortcut: Ctrl/Cmd + Shift + D
    *   URL parameter support: `?seed=true` or `?dev=true`
    *   4 realistic test data samples with Indian locations and phone numbers
    *   Visual feedback with notification and field highlighting

---
### 2. Multi-language Support (English/Tamil)

**Status:** Completed

*   **Goal:** Allow users to toggle the language of the public-facing UI between English and Tamil.
*   **Acceptance Criteria:**
    *   A language toggle button is visible in the header of the public view.
    *   Clicking the button switches all visible text elements (labels, placeholders, button text) between English and Tamil.
    *   The toggle button's text also updates to show the other language (e.g., when in English, it shows "தமிழ்").
*   **Suggested Approach:** A common pattern is to add unique IDs to all translatable elements in `index.html` and manage the text strings in a `translations` object within `script.js`. A function can then iterate through this object to update the DOM. You are free to use a different or more optimized pattern.

---
### 3. Internal Developer Documentation Portal

**Status:** Completed

*   **Goal:** Create a hidden, password-protected web page at `/dev.html` that aggregates and displays all project documentation for the development team.
*   **Acceptance Criteria:**
    *   A new `dev.html` file is created, along with a corresponding `dev.js`.
    *   Navigating to `/dev.html` presents a password prompt.
    *   Upon entering the correct (hardcoded) password, the page dynamically fetches and displays the content of all files from the `/docs` and `/execute` directories.
    *   Markdown files (`.md`) are rendered as formatted HTML, while other text files can be shown as pre-formatted text.
*   **Suggested Approach:** Use the `fetch` API to load the file contents. The list of files to fetch can be hardcoded in `dev.js`. For rendering Markdown, you can include a lightweight client-side library like `marked.js` from a CDN in `dev.html`.

---
### 4. Production-Ready Backend Infrastructure (Hardest)

*   **ACTION REQUIRED FROM USER:** Before you begin, I (the user) must configure the Cloudflare environment (D1, R2, Secrets) as detailed in `docs/cloudflare_details.txt`. I will confirm when this is done.
*   **Goal:** Decommission the `localStorage`-based prototype and implement a fully functional, serverless backend on Cloudflare.
*   **Acceptance Criteria:**
    *   All `localStorage` logic is removed from `script.js`.
    *   The application successfully uses `fetch` to communicate with API endpoints for all data operations (login, create, read complaints).
    *   New complaints submitted via the UI are successfully stored in the D1 database.
    *   Images uploaded with new complaints are successfully stored in the R2 bucket, with the image URL stored in the D1 record.
    *   The admin dashboard correctly displays data fetched from the D1 database.
*   **Suggested Approach:**
    *   Use Cloudflare Pages Functions by creating a file at `functions/api/[[path]].js` to act as a universal API router.
    *   Inside the router, handle different routes (`/api/login`, `/api/complaints`) and HTTP methods (`GET`, `POST`, `PUT`).
    *   Access Cloudflare bindings and environment variables (e.g., `env.DB`, `env.R2_BUCKET`, `env.ADMIN_PASSWORD`) from the function's `context` parameter.
    *   Systematically refactor `script.js`, replacing all local data functions with asynchronous `fetch` calls to your new API endpoints. Ensure the UI correctly handles the loading and error states of these network requests.