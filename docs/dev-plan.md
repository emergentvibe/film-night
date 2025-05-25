# Film Night App - Development Plan

## 1. Introduction

This document outlines the software architecture and development plan for the "Film Night" web application. It builds upon the `ux-design.md` document and details the technical implementation strategy, including technology stack, data models, API design, and development phases.

## 2. High-Level Architecture

The application will follow a standard client-server architecture:

*   **Frontend (Client-Side):** A Single Page Application (SPA) responsible for rendering the UI, managing user interactions, and communicating with the backend via API calls. It will handle all aspects described in the UX design, including session creation, movie submission (URL & manual), pairwise comparison UI, and displaying the ranked list.
*   **Backend (Server-Side):** A RESTful API server responsible for business logic, data persistence, and external service integrations (like fetching movie metadata).
*   **Database:** A persistent storage solution to store session data, movie suggestions, and user votes for pairwise comparisons.

## 3. Proposed Technology Stack

This stack is chosen for its modern capabilities, developer productivity, and scalability for a project of this nature.

*   **Frontend:**
    *   **Framework:** React (with Vite for a fast development environment) or Next.js (for potential SSR/SSG benefits if desired later, though not strictly necessary for V1).
    *   **State Management:** Zustand or React Context API (for simplicity, given the scope).
    *   **Styling:** Tailwind CSS (for rapid UI development) or Styled Components/Emotion.
    *   **HTTP Client:** `fetch` API or Axios.
*   **Backend:**
    *   **Language/Framework:** Node.js with Express.js (widely adopted, good for I/O bound tasks like API calls) or Python with FastAPI/Flask (good for rapid development and data handling).
    *   **Movie Metadata Fetching:** A library like `unfluff` or `html-metadata-parser` to scrape basic metadata from URLs. For specific services like Letterboxd, direct API interaction would be ideal if available and permissible, otherwise, robust scraping (which can be fragile) or a dedicated movie API (like TMDB, OMDb - may require API keys and adherence to terms) might be integrated.
*   **Database:**
    *   **Type:** NoSQL (e.g., MongoDB) or Relational (e.g., PostgreSQL).
        *   **MongoDB:** Offers flexibility which is good for evolving schemas, and could easily store session documents with embedded movie lists and votes.
        *   **PostgreSQL:** Offers strong consistency and relational integrity, which can also model this data effectively.
    *   For simplicity and ease of development for V1, a NoSQL database like MongoDB might be slightly preferred due to its flexible schema, especially when dealing with varying movie metadata.
*   **Deployment (Initial Thoughts):**
    *   Frontend: Vercel, Netlify (for easy deployment of SPAs).
    *   Backend & DB: Heroku, Railway, or a cloud provider like AWS (EC2/ECS + RDS/DynamoDB), Google Cloud (App Engine + Cloud SQL/Firestore).

## 4. Data Models (Conceptual)

This outlines the basic structure of data to be stored. Specific fields will be refined during implementation.

### 4.1. `Session`
*   `_id` (or `session_id`): Unique identifier (e.g., auto-generated string, MongoDB ObjectID).
*   `createdAt`: Timestamp.
*   `movies`: Array of `Movie` objects (embedded or referenced).
*   `votes`: Array of `Vote` objects (embedded or referenced).
*   `sessionName` (Optional): A user-friendly name for the session.

### 4.2. `Movie` (within a `Session`)
*   `_id` (or `movie_id`): Unique identifier within the session (e.g., UUID generated on submission).
*   `title`: String (required).
*   `submittedUrl`: String (URL if submitted via link).
*   `sourceType`: Enum (e.g., 'url', 'manual').
*   `posterUrl`: String (optional).
*   `genres`: Array of Strings (optional).
*   `synopsis`: String (optional).
*   `year`: Number (optional).
*   `director`: String (optional).
*   `runtime`: String (optional, e.g., "105 min").
*   `rating`: String or Number (optional, e.g., "7.8/10" or 7.8).
*   `addedAt`: Timestamp.

### 4.3. `Vote` (within a `Session`)
*   `_id` (or `vote_id`): Unique identifier.
*   `voterIdentifier`: String (A temporary unique ID for the voter in the session, perhaps stored in localStorage on the client, to try and ensure a user doesn't vote multiple times on the same pair, or to identify their own votes. This is a simplification for an anonymous system).
*   `movieA_id`: ID of the first movie in the pair.
*   `movieB_id`: ID of the second movie in the pair.
*   `winner_id`: ID of the chosen movie (can be `null` if skipped).
*   `isSkip`: Boolean (true if the pair was skipped).
*   `votedAt`: Timestamp.

## 5. API Endpoints (RESTful)

Base URL: `/api`

*   **Sessions:**
    *   `POST /sessions`: Create a new film night session.
        *   Request Body: (Optional) `{ sessionName: "My Film Night" }`
        *   Response: `{ sessionId: "unique_session_id", shareableLink: "..." }`
    *   `GET /sessions/{sessionId}`: Get details of a specific session (includes movies and potentially current rankings).
        *   Response: Full `Session` object including `movies` and ranked list.

*   **Movies (within a Session):**
    *   `POST /sessions/{sessionId}/movies`: Add a new movie to the session.
        *   Request Body (URL submission): `{ url: "movie_url_here" }`
        *   Request Body (Manual submission): `{ title: "...", posterUrl: "...", ... }`
        *   Response: The newly added `Movie` object or updated `Session` object.
    *   `GET /sessions/{sessionId}/movies`: List all movies suggested for a session (primarily for internal use by `GET /sessions/{sessionId}` but could be separate).
        *   Response: Array of `Movie` objects.

*   **Votes & Ranking (within a Session):**
    *   `POST /sessions/{sessionId}/votes`: Submit a vote for a pairwise comparison.
        *   Request Body: `{ movieA_id: "id1", movieB_id: "id2", winner_id: "id1" | "id2" | null, isSkip: false | true, voterIdentifier: "anon_voter_xyz" }`
        *   Response: Confirmation or updated ranking.
    *   `GET /sessions/{sessionId}/pairs`: Get a new pair of movies for the current user to compare. The backend should try to provide a pair the `voterIdentifier` hasn't voted on yet.
        *   Query Params: `?voterIdentifier=anon_voter_xyz`
        *   Response: `{ movieA: MovieObject, movieB: MovieObject }` or `{ message: "No more pairs to compare." }`
    *   `GET /sessions/{sessionId}/rankings`: Get the current ranked list of movies.
        *   Response: Array of `Movie` objects, sorted by rank, potentially with score/win info.
          (This might be integrated into `GET /sessions/{sessionId}` to reduce chattiness).

## 6. Key Backend Logic / Modules

*   **Session Management:** Creating, retrieving sessions. Generating unique session IDs/links.
*   **Movie Submission & Metadata Extraction:**
    *   Handling URL submissions: Fetching the URL content, attempting to parse metadata (title, poster, etc.). Graceful fallback if metadata extraction fails partially or completely.
    *   Handling manual submissions: Validating and storing provided data.
*   **Pairwise Comparison Engine:**
    *   Generating unique pairs of movies for users to vote on.
    *   Ensuring a user (identified by `voterIdentifier`) doesn't vote on the same pair multiple times (unless we allow re-voting, which adds complexity).
    *   Determining when a user has seen all relevant pairs.
*   **Ranking Algorithm:**
    *   This is a placeholder for now. The initial approach will be simple: count "wins" for each movie. (`win_count = number of times a movie was chosen as `winner_id`). Rank by `win_count` descending.
    *   Future research/implementation could involve more sophisticated algorithms (e.g., Elo rating system, Glicko, TrueSkill, or simpler ones like Copeland or Simpson methods if appropriate for unweighted pairwise preferences).

## 7. Development Milestones / Phases

### Phase 1: Core Backend & Basic Session Flow
*   **Goal:** Setup backend, database, and implement session creation & movie submission.
*   **Tasks:**
    1.  Setup chosen backend framework (e.g., Express.js).
    2.  Setup chosen database (e.g., MongoDB) and define initial schemas (`Session`, `Movie`).
    3.  Implement `POST /sessions` to create a new session.
    4.  Implement `POST /sessions/{sessionId}/movies` for manual movie submission.
    5.  Implement basic URL metadata scraping for `POST /sessions/{sessionId}/movies` (e.g., extract `<title>` and OpenGraph tags for poster/description).
    6.  Implement `GET /sessions/{sessionId}` to retrieve session data including its movies.
    7.  Basic unit tests for API endpoints.

### Phase 2: Frontend Foundation & Movie Submission UI
*   **Goal:** Create the basic frontend structure and allow users to create sessions and submit movies.
*   **Tasks:**
    1.  Setup chosen frontend framework (e.g., React with Vite).
    2.  Implement homepage UI: "Create New Film Night" button.
    3.  Implement session page UI (basic layout).
    4.  Integrate `POST /sessions` API call; redirect to session page with shareable link displayed.
    5.  Implement movie submission form (manual fields + URL field) on the session page.
    6.  Integrate `POST /sessions/{sessionId}/movies` API call.
    7.  Display list of submitted movies on the session page (fetched via `GET /sessions/{sessionId}`).

### Phase 3: Pairwise Comparison Logic & UI
*   **Goal:** Implement the voting mechanism and UI.
*   **Tasks:**
    1.  Backend: Implement `GET /sessions/{sessionId}/pairs` to serve movie pairs for voting (initially, can be random pairs from movies not yet compared by a user).
    2.  Backend: Implement `POST /sessions/{sessionId}/votes` to record votes.
    3.  Backend: Define initial `Vote` schema and store votes.
    4.  Frontend: Implement UI for displaying two movies for comparison.
    5.  Frontend: Implement voting buttons ("Choose A", "Choose B", "Skip") and integrate with `POST /sessions/{sessionId}/votes`.
    6.  Frontend: Logic to fetch new pairs using `GET /sessions/{sessionId}/pairs` after a vote.
    7.  Implement `voterIdentifier` handling on the client (e.g., generate UUID, store in localStorage).

### Phase 4: Ranking Display & Refinements
*   **Goal:** Calculate and display the ranked list of movies.
*   **Tasks:**
    1.  Backend: Implement basic ranking logic (e.g., based on vote counts) and the `GET /sessions/{sessionId}/rankings` endpoint (or integrate into `GET /sessions/{sessionId}`).
    2.  Frontend: Display the ranked list of movies on the session page.
    3.  Refine UI/UX based on initial implementation (e.g., loading states, error handling).
    4.  Basic responsive design testing and adjustments.
    5.  Testing of the end-to-end flow.

### Phase 5: (Post V1 / Future Enhancements)
*   **Goal:** Add polish, advanced features, and deployment.
*   **Tasks:**
    *   More robust movie metadata fetching (e.g., dedicated movie API integration).
    *   Improved ranking algorithms.
    *   Deployment to chosen platform(s).
    *   User feedback incorporation.
    *   Features from UX design's "Future Considerations" (e.g., naming sessions, editing/deleting movies if deemed necessary).

## 8. Error Handling & Resilience
*   API endpoints should have clear error responses (e.g., 400 for bad requests, 404 for not found, 500 for server errors).
*   Graceful degradation for metadata fetching (if a URL can't be parsed, still allow manual entry or partial data).
*   Frontend should handle API errors and provide user-friendly messages.

## 9. Security Considerations (Initial)
*   Since it's an unauthenticated system with shared links, the primary risk is abuse (e.g., spamming sessions/movies). Rate limiting could be considered if this becomes an issue.
*   Validate all inputs on the backend to prevent injection attacks (e.g., NoSQL injection if using MongoDB without proper sanitization, though ORMs/ODMs often help).
*   Ensure any metadata scraping is done responsibly and respects `robots.txt` if possible (though harder for ad-hoc user-submitted URLs).

---
This development plan provides a roadmap. Specific choices and details will be refined as the project progresses. 