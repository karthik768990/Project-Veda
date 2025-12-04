# frontend/Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies (use package-lock.json if present)
COPY package*.json ./
RUN npm ci

# Copy source and env (Vite needs .env at build time if you depend on env vars)
COPY . .

# Build the production bundle
RUN npm run build

# Expose the preview port
EXPOSE 5173

# Start Vite preview on all interfaces so container is reachable
# '--strictPort' avoids picking different port if 5173 is busy
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
