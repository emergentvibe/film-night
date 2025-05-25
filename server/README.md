# Film Night API Server

This directory contains the backend server for the Film Night application.

## Prerequisites

*   Node.js (v18.0.0 or higher recommended - see `package.json` engines)
*   npm or yarn
*   PostgreSQL server running

## Setup

1.  **Clone the repository (if you haven't already).**
2.  **Navigate to the `server` directory:**
    ```bash
    cd server
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```
4.  **Set up your PostgreSQL database:**
    *   Create a new database (e.g., `film_night_db`).
    *   Create a database user with permissions to access this database.
5.  **Configure environment variables:**
    *   Create a `.env` file in this `server` directory.
    *   Add the following variables, replacing with your actual database credentials:
        ```env
        DB_USER=your_postgres_user
        DB_HOST=localhost
        DB_NAME=film_night_db
        DB_PASSWORD=your_postgres_password
        DB_PORT=5432
        # PORT=3001 # Optional, defaults to 3001 if not set
        ```

## Running the Server

*   **For development (with auto-restarting using nodemon):**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
*   **For production:**
    ```bash
    npm start
    # or
    # yarn start
    ```

The server will typically start on `http://localhost:3001`.

## API Endpoints

Refer to `docs/dev-plan.md` for detailed API endpoint specifications. 