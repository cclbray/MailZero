# Multi-stage Dockerfile for MailZero on Railway
FROM node:20-alpine AS base

# Install dependencies
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/mail/package.json ./apps/mail/
COPY apps/server/package.json ./apps/server/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application using a custom script that ensures proper binding
WORKDIR /app/apps/mail

# Create a startup script that forces binding to 0.0.0.0
RUN echo '#!/bin/sh\necho "Starting MailZero on Railway - binding to 0.0.0.0:$PORT"\nexec npx wrangler dev --port $PORT --local --show-interactive-dev-session=false' > /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
