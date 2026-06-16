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

	CREATE TABLE IF NOT EXISTS venues (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		type VARCHAR(100) NOT NULL,
		building VARCHAR(255),
		floor VARCHAR(100),
		capacity INTEGER,
		status VARCHAR(50) DEFAULT 'Disponible',
		amenities TEXT[],
		observations TEXT,
		image_url VARCHAR(500),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);

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
		suggested_time VARCHAR(20),
		audience_capacity INTEGER,
		phone VARCHAR(20),
		social_media VARCHAR(255),
		accepted_terms BOOLEAN NOT NULL DEFAULT false,
		venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_speakers_full_name ON speakers(full_name);
	CREATE INDEX IF NOT EXISTS idx_speakers_created_at ON speakers(created_at);

	CREATE TABLE IF NOT EXISTS venues (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		type VARCHAR(100) NOT NULL,
		building VARCHAR(255),
		floor VARCHAR(100),
		capacity INTEGER,
		status VARCHAR(50) DEFAULT 'Disponible',
		amenities TEXT[],
		observations TEXT,
		image_url VARCHAR(500),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);

	CREATE TABLE IF NOT EXISTS career_priority (
		career VARCHAR(255) PRIMARY KEY,
		priority_bonus INTEGER NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS speaker_registrations (
		id SERIAL PRIMARY KEY,
		speaker_id INTEGER NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
		student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
		status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist')),
		registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE (speaker_id, student_id)
	);

	CREATE INDEX IF NOT EXISTS idx_speaker_registrations_speaker ON speaker_registrations(speaker_id);
	CREATE INDEX IF NOT EXISTS idx_speaker_registrations_student ON speaker_registrations(student_id);

	CREATE TABLE IF NOT EXISTS contests (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		category VARCHAR(255) NOT NULL,
		status VARCHAR(100) DEFAULT 'Planificado',
		date TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS contest_registrations (
		id SERIAL PRIMARY KEY,
		contest_id INTEGER REFERENCES contests(id) ON DELETE CASCADE,
		student1_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
		student2_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
		artistic_activity TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS pageant_candidates (
		id SERIAL PRIMARY KEY,
		student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
		partner_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
		category VARCHAR(50),
		representative_of VARCHAR(255),
		artistic_activity TEXT,
		photo_url TEXT,
		bio TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS system_settings (
		key VARCHAR(255) PRIMARY KEY,
		value TEXT,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	`

	// Seed system_settings if empty
	_, err := db.Exec(`
		INSERT INTO system_settings (key, value)
		VALUES ('sidebar_logo', ''), ('login_logo', '')
		ON CONFLICT (key) DO NOTHING
	`)
	if err != nil {
		log.Printf("⚠️ Error seeding system_settings: %v", err)
	}

	// Check if suggested_time exists in speakers
	var exists bool
	db.QueryRow("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='speakers' AND column_name='suggested_time')").Scan(&exists)
	if !exists {
		db.Exec("ALTER TABLE speakers ADD COLUMN suggested_time VARCHAR(20)")
	}

	// Check if venue_id exists in speakers
	db.QueryRow("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='speakers' AND column_name='venue_id')").Scan(&exists)
	if !exists {
		db.Exec("ALTER TABLE speakers ADD COLUMN venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL")
	}

	_, err = db.Exec(schema)
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
		ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_pin TEXT;
		ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_pin_expires TIMESTAMP;
	`)
	if err != nil {
		log.Printf("⚠️  Migración recovery: %v", err)
	} else {
		log.Println("✅ Columnas de recuperación verificadas/migradas")
	}

	_, err = db.Exec(`
		ALTER TABLE contest_registrations ADD COLUMN IF NOT EXISTS artistic_activity TEXT;
		ALTER TABLE pageant_candidates ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES students(id) ON DELETE SET NULL;
		ALTER TABLE pageant_candidates ADD COLUMN IF NOT EXISTS artistic_activity TEXT;
		ALTER TABLE pageant_candidates ADD COLUMN IF NOT EXISTS representative_of VARCHAR(255);
		ALTER TABLE pageant_candidates ADD COLUMN IF NOT EXISTS photo_url TEXT;
		ALTER TABLE pageant_candidates ADD COLUMN IF NOT EXISTS bio TEXT;
		-- Remover restricción check si existe (ignorar error si no existe)
		ALTER TABLE pageant_candidates DROP CONSTRAINT IF EXISTS pageant_candidates_category_check;
	`)
	if err != nil {
		log.Printf("⚠️  Migración pageant: %v", err)
	} else {
		log.Println("✅ Tablas de certamen migradas")
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

	// Seed 'Señorita y Joven UES' contest if not exists
	_, err = db.Exec(`
		INSERT INTO contests (name, category, status, date)
		SELECT 'Señorita y Joven UES', 'Certamen Especial', 'Inscripciones Abiertas', NOW()
		WHERE NOT EXISTS (SELECT 1 FROM contests WHERE name = 'Señorita y Joven UES')
	`)
	if err != nil {
		log.Printf("⚠️  Error seeding contest: %v", err)
	} else {
		log.Println("✅ Permanent contest 'Señorita y Joven UES' verified/seeded")
	}

	return nil
}
