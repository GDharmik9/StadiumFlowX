# Multi-stage build for StadiumFlow Backend Engine
# Optimized for Google Cloud Run deployment

# ─── Stage 1: Build ──────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (Docker layer caching optimization)
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

# ─── Stage 2: Production ─────────────────────
FROM node:18-alpine AS production

# Security: Run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY src/ ./src/
COPY package.json .

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Security: Switch to non-root user
USER appuser

# Expose Cloud Run port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the server
CMD ["node", "src/index.js"]
