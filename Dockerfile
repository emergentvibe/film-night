# --- Stage 1: Server Base & Script Runner ---
# This stage sets up the server and runs our poster fetching script.
FROM node:18-alpine AS server-base

WORKDIR /app

# Install all server dependencies (including dev for the script)
COPY server/package.json server/package-lock.json ./server/
RUN npm install --prefix server

# Copy server code
COPY server/ ./server

# Copy the client's public folder structure so the script knows where to write to.
# Note: We are not copying client code yet, just the directory structure.
COPY client/public/ ./client/public

# Run the script to fetch posters and populate /app/client/public
# This runs BEFORE the client is built.
RUN npm run populate-posters --prefix server


# --- Stage 2: Client Builder ---
# This stage builds the React frontend, using the posters from the previous stage.
FROM node:18-alpine AS client-builder

WORKDIR /app

# Copy client dependency files
COPY client/package.json client/package-lock.json ./client/
RUN npm install --prefix client

# Copy the populated public folder from the server-base stage
COPY --from=server-base /app/client/public ./client/public

# Now copy the rest of the client source code
COPY client/ ./client

# Build the client. Vite will now see the posters in client/public.
RUN npm run build --prefix client


# --- Stage 3: Final Production Image ---
# This is the lean, final image that will be deployed.
FROM node:18-alpine AS server-prod

WORKDIR /app

ENV NODE_ENV=production

# Copy server dependency files and install *only* production dependencies
COPY server/package.json server/package-lock.json ./server/
RUN npm install --prefix server --omit=dev

# Copy server source code
COPY server/ ./server

# Copy the fully built client (including bundled posters) from the client-builder stage
COPY --from=client-builder /app/client/dist ./server/public

# Command to run the application
# The server should be configured to serve static files from the 'public' directory.
CMD [ "node", "server/index.js" ] 