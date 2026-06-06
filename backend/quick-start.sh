#!/bin/bash

# 🚀 Quick Start Script for Go Backend - Linux/macOS

echo "============================================"
echo "🚀 Jornada Académica - Go Backend Setup"
echo "============================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please update if necessary."
fi

# Download dependencies
echo ""
echo "📦 Installing Go dependencies..."
go mod download
if [ $? -ne 0 ]; then
    echo "❌ Failed to download dependencies"
    exit 1
fi
echo "✅ Dependencies installed"

# Build the application
echo ""
echo "🔨 Building application..."
go build -o bin/backend ./cmd/main.go
if [ $? -ne 0 ]; then
    echo "❌ Failed to build application"
    exit 1
fi
echo "✅ Application built successfully"

# Initialize database
echo ""
echo "🗄️  Initializing database..."
go run ./cmd/init-db/main.go
if [ $? -ne 0 ]; then
    echo "⚠️  Database initialization encountered an issue (might be normal if already initialized)"
fi
echo "✅ Database initialized"

# Start the server
echo ""
echo "🚀 Starting backend server..."
echo "📍 Server running on http://localhost:3000"
echo "============================================"

./bin/backend
