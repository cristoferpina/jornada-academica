.PHONY: build run dev init-db install clean

# Variables
GO = go
BINARY_NAME = backend

install:
	$(GO) mod download
	$(GO) mod tidy

build:
	$(GO) build -o bin/$(BINARY_NAME) ./cmd/main.go

build-init-db:
	$(GO) build -o bin/init-db ./cmd/init-db/main.go

run: build
	./bin/$(BINARY_NAME)

dev:
	$(GO) run ./cmd/main.go

init-db: build-init-db
	./bin/init-db

dev-init-db:
	$(GO) run ./cmd/init-db/main.go

clean:
	$(GO) clean
	rm -f bin/$(BINARY_NAME)
	rm -f bin/init-db

help:
	@echo "Available targets:"
	@echo "  make install       - Download and install dependencies"
	@echo "  make build         - Build the application"
	@echo "  make build-init-db - Build the init-db utility"
	@echo "  make run           - Build and run the application"
	@echo "  make dev           - Run the application in development mode"
	@echo "  make init-db       - Initialize the database"
	@echo "  make dev-init-db   - Initialize database in dev mode"
	@echo "  make clean         - Clean build artifacts"
