# Use Node.js 22 as the base image
FROM node:22-slim AS builder

# Set the working directory
WORKDIR /app

# Copy all files
COPY . .

# Build the Frontend
WORKDIR /app/frontend/portal
RUN npm install
RUN npm run build

# Setup the Backend
WORKDIR /app/backend
RUN npm install

# Final Production Stage
FROM node:22-slim
WORKDIR /app

# Copy built frontend and backend code
COPY --from=builder /app/backend /app/backend
COPY --from=builder /app/frontend/portal/dist /app/frontend/portal/dist
COPY --from=builder /app/frontend/landing /app/frontend/landing

# Ensure the uploads directory exists
RUN mkdir -p /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port
EXPOSE 5000

# Start the application
WORKDIR /app/backend
CMD ["node", "src/index.js"]
