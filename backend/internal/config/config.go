package config

import (
	"os"
)

type Config struct {
	DBHost       string
	DBUser       string
	DBPassword   string
	DBName       string
	DBPort       string
	JWTSecret    string
	Port         string
	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string
	SMTPFromName string
	FrontendURL  string
}

func LoadConfig() *Config {
	return &Config{
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBUser:       getEnv("DB_USER", "postgres"),
		DBPassword:   getEnv("DB_PASSWORD", "postgres"),
		DBName:       getEnv("DB_NAME", "jornada_db"),
		DBPort:       getEnv("DB_PORT", "5432"),
		JWTSecret:    getEnv("JWT_SECRET", "tu_clave_secreta_super_segura"),
		Port:         getEnv("PORT", "3000"),
		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUsername: getEnv("SMTP_USERNAME", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", ""),
		SMTPFromName: getEnv("SMTP_FROM_NAME", "Jornada Academica"),
		FrontendURL:  getEnv("FRONTEND_URL", "http://localhost:5173"),
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
