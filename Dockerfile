# Stage 1: Build the React frontend
FROM node:18-alpine AS client-builder

WORKDIR /app/client

# Copy client package.json and package-lock.json (or yarn.lock)
COPY client/package.json client/package-lock.json ./

# Install client dependencies
RUN npm install

# Copy the rest of the client application code
COPY client/ .

# Build the client application
# The output should be in /app/client/dist
RUN npm run build

# Stage 2: Setup the Node.js backend server
FROM node:18-alpine AS server-prod

WORKDIR /app/server

# Copy server package.json and package-lock.json
COPY server/package.json server/package-lock.json ./

# Install production server dependencies
RUN npm install --omit=dev

# Copy the rest of the server application code
COPY server/ .

# Copy the built client app from the client-builder stage
COPY --from=client-builder /app/client/dist ./client/dist

# Set NODE_ENV to production for the server
ENV NODE_ENV=production

# Expose the port the app runs on
# The server/index.js uses process.env.PORT || 3001
# Fly.io will set the PORT environment variable.
# No need to EXPOSE PORT here as Fly.io handles it based on fly.toml internal_port.

# Command to run the application
# This should match the start script in your server/package.json or be node index.js
CMD [ "node", "index.js" ] 