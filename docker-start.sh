#!/bin/bash
# 🐳 Docker Compose Quick Start

echo "============================================"
echo "🐳 Starting with Docker Compose"
echo "============================================"

# Create uploads directory if it doesn't exist
mkdir -p ./backend/uploads

# Start services
echo "📦 Building and starting services..."
docker-compose up -d

echo ""
echo "✅ Services started!"
echo "📍 Backend:  http://localhost:3000"
echo "📍 Frontend: http://localhost:5173"
echo "📍 Database: localhost:5432"
echo ""
echo "View logs: docker-compose logs -f"
echo "Stop:      docker-compose down"
echo "============================================"
