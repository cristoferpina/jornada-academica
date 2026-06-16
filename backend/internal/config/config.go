package config

import (
	"os"
)

type Config struct {
	DBHost      string
	DBUser      string
	DBPassword  string
	DBName      string
	DBPort      string
	JWTSecret   string
	Port        string
	FrontendURL string
	GASURL      string
}

func LoadConfig() *Config {
	return &Config{
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBUser:      getEnv("DB_USER", "postgres"),
		DBPassword:  getEnv("DB_PASSWORD", "postgres"),
		DBName:      getEnv("DB_NAME", "jornada_db"),
		DBPort:      getEnv("DB_PORT", "5432"),
		JWTSecret:   getEnv("JWT_SECRET", "tu_clave_secreta_super_segura"),
		Port:        getEnv("PORT", "3000"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:5173"),
		GASURL:      getEnv("GAS_URL", ""),
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
