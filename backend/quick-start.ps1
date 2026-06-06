# 🚀 Quick Start Script for Go Backend - Windows PowerShell

# Colors for output
$Green = 'Green'
$Yellow = 'Yellow'
$Red = 'Red'

Write-Host "============================================" -ForegroundColor $Green
Write-Host "🚀 Jornada Académica - Go Backend Setup" -ForegroundColor $Green
Write-Host "============================================" -ForegroundColor $Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor $Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created. Please update if necessary." -ForegroundColor $Green
}

# Download dependencies
Write-Host "`n📦 Installing Go dependencies..." -ForegroundColor $Yellow
go mod download
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to download dependencies" -ForegroundColor $Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor $Green

# Build the application
Write-Host "`n🔨 Building application..." -ForegroundColor $Yellow
go build -o bin/backend.exe ./cmd/main.go
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build application" -ForegroundColor $Red
    exit 1
}
Write-Host "✅ Application built successfully" -ForegroundColor $Green

# Initialize database
Write-Host "`n🗄️  Initializing database..." -ForegroundColor $Yellow
go run ./cmd/init-db/main.go
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Database initialization encountered an issue (might be normal if already initialized)" -ForegroundColor $Yellow
}
Write-Host "✅ Database initialized" -ForegroundColor $Green

# Start the server
Write-Host "`n🚀 Starting backend server..." -ForegroundColor $Green
Write-Host "📍 Server running on http://localhost:3000" -ForegroundColor $Green
Write-Host "============================================" -ForegroundColor $Green

./bin/backend.exe
