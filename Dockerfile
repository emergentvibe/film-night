# Stage 1: Build the React client
FROM node:18-alpine AS client-builder
WORKDIR /app

# Copy client package files and install dependencies
COPY client/package.json client/package-lock.json ./client/
RUN npm install --prefix client

# Copy the rest of the client source code
COPY client/ ./client/

# Build the client
RUN npm run build --prefix client

# Stage 2: Build the Node.js server
FROM node:18-alpine AS server-builder
WORKDIR /app

# Copy server package files and install dependencies
COPY server/package.json server/package-lock.json ./server/
RUN npm install --prefix server --omit=dev

# Copy server source code
COPY server/ ./server/

# Stage 3: Create the final production image
FROM node:18-alpine AS production
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy server dependencies from the server-builder stage
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server ./

# Copy the built React app from the client-builder stage
COPY --from=client-builder /app/client/dist ./public

# Expose the port the app runs on
EXPOSE 8080

# The command to run the application
CMD [ "node", "index.js" ] 