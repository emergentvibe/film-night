# Use a specific, stable base image
FROM node:18-alpine AS base
WORKDIR /app

# ---- Server Dependencies ----
# First, copy only package.json and package-lock.json for the server
COPY server/package.json server/package-lock.json ./
# Install only production dependencies
RUN npm install --omit=dev

# ---- Client Dependencies & Build ----
# Copy client package files
COPY client/package.json client/package-lock.json ./client/
# Install client dependencies
RUN npm install --prefix client
# Copy the rest of the client code
COPY client/ ./client/
# Build the client
RUN npm run build --prefix client

# ---- Final Production Image ----
# Start a new, clean stage from the base
FROM base
WORKDIR /app

# Copy the pre-installed server node_modules from the 'base' stage
COPY --from=base /app/node_modules ./node_modules
# Copy the built client assets
COPY --from=base /app/client/dist ./public
# Copy the server source code. A change here will now correctly bust the cache.
COPY server/ ./

# Expose the port and set the command
ENV NODE_ENV=production
EXPOSE 8080
CMD [ "node", "index.js" ] 