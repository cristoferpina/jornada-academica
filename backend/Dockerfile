# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache git

# Copiar archivos del proyecto
COPY . .

# Descargar dependencias
RUN go mod download

# Compilar la aplicación
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

# Final stage
FROM alpine:latest

WORKDIR /app

# Instalar ca-certificates para HTTPS
RUN apk --no-cache add ca-certificates

# Copiar el binario compilado del builder
COPY --from=builder /app/main .

# Crear directorio para uploads
RUN mkdir -p /app/uploads

# Exponer puerto
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["./main"]