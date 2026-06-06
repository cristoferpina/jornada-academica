package database

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/jornada-academica/backend/internal/config"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func InitDB(cfg *config.Config) *sql.DB {
	psqlInfo := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cfg.DBHost,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBPort,
	)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}

	log.Println("✅ Database connection established")
	return db
}

func InitializeSchema(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		email VARCHAR(255) NOT NULL UNIQUE,
		password_hash VARCHAR(255) NOT NULL,
		name VARCHAR(255),
		role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'speaker', 'attendee')),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		last_login TIMESTAMP,
		is_active BOOLEAN DEFAULT true
	);

	CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
	CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

	CREATE TABLE IF NOT EXISTS students (
		id SERIAL PRIMARY KEY,
		matricula VARCHAR(32) NOT NULL UNIQUE,
		first_name VARCHAR(255) NOT NULL,
		last_name VARCHAR(255) NOT NULL,
		career VARCHAR(255) NOT NULL,
		user_id INTEGER UNIQUE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT fk_students_user
			FOREIGN KEY (user_id)
			REFERENCES users(id)
			ON DELETE SET NULL
	);

	CREATE INDEX IF NOT EXISTS idx_students_matricula ON students(matricula);
	CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

	CREATE TABLE IF NOT EXISTS speakers (
		id SERIAL PRIMARY KEY,
		full_name VARCHAR(255) NOT NULL,
		academic_level VARCHAR(50) NOT NULL CHECK (academic_level IN ('Doctorado', 'Maestría', 'Licenciatura')),
		institution VARCHAR(255),
		career VARCHAR(255),
		biografia TEXT,
		profile_photo_url TEXT,
		institutional_logo_url TEXT,
		conference_name VARCHAR(255) NOT NULL,
		suggested_date DATE,
		audience_capacity INTEGER,
		phone VARCHAR(20),
		social_media VARCHAR(255),
		accepted_terms BOOLEAN NOT NULL DEFAULT false,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_speakers_full_name ON speakers(full_name);
	CREATE INDEX IF NOT EXISTS idx_speakers_created_at ON speakers(created_at);
	`

	_, err := db.Exec(schema)
	if err != nil {
		return err
	}

	log.Println("✅ Database schema initialized")

	// Migración: agregar columna biografia si no existe (para tablas ya existentes)
	_, err = db.Exec(`
		ALTER TABLE speakers ADD COLUMN IF NOT EXISTS biografia TEXT;
	`)
	if err != nil {
		log.Printf("⚠️  Migración biografia: %v", err)
	} else {
		log.Println("✅ Columna 'biografia' verificada/migrada")
	}

	_, err = db.Exec(`
		ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE;
		ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
	`)
	if err != nil {
		log.Printf("⚠️  Migración students: %v", err)
	} else {
		log.Println("✅ Tabla 'students' verificada/migrada")
	}

	_, err = db.Exec(`
		ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_question TEXT;
		ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_answer TEXT;
	`)
	if err != nil {
		log.Printf("⚠️  Migración recovery: %v", err)
	} else {
		log.Println("✅ Columnas de recuperación verificadas/migradas")
	}

	// Crear usuario admin por defecto si no existe
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("error hashing password: %v", err)
	}

	query := `
		INSERT INTO users (email, password_hash, name, role, is_active)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (email) DO NOTHING
	`

	_, err = db.Exec(query, "admin@jornada.edu.mx", string(hashedPassword), "Administrador", "admin", true)
	if err != nil {
		return fmt.Errorf("error creating admin user: %v", err)
	}

	_, err = db.Exec(`
		UPDATE users
		SET recovery_question = $1, recovery_answer = $2
		WHERE id IN (
			SELECT user_id FROM students WHERE matricula = $3 AND user_id IS NOT NULL
		)
	`, "¿Quién es tu mascota?", "pelusa", "13220030")
	if err != nil {
		return fmt.Errorf("error configuring recovery question: %v", err)
	}

	log.Println("✅ Default admin user initialized (if not already exists)")

	return nil
}
