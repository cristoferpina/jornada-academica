package main

import (
	"fmt"
	"log"

	"github.com/joho/godotenv"
	"github.com/jornada-academica/backend/internal/config"
	"github.com/jornada-academica/backend/internal/database"
	"golang.org/x/crypto/bcrypt"
)

type studentSeed struct {
	matricula string
	firstName string
	lastName  string
	career    string
}

var studentSeeds = []studentSeed{
	{matricula: "13220045", firstName: "DANIEL", lastName: "BENITEZ", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220003", firstName: "RODOLFO", lastName: "CRUZ IBARRA", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220042", firstName: "JUAN EDUARDO", lastName: "FUENTES CRUZ", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220063", firstName: "MARCO ANTONIO", lastName: "GARCIA CRUZ", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220011", firstName: "SOFIA", lastName: "GARCIA CRUZ", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220014", firstName: "JESUS", lastName: "MARTINEZ NARCISO", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220024", firstName: "JESUS ANDRES", lastName: "MONDRAGON TENORIO", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220038", firstName: "LIZETH", lastName: "MORENO PIÑA", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220056", firstName: "MAURICIO", lastName: "NOLAZCO LONJINO", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220001", firstName: "MIGUEL ANGEL", lastName: "PASCUAL MARTINEZ", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220040", firstName: "IVAN", lastName: "POSADAS REYES", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220009", firstName: "ALEJANDRO", lastName: "SANCHEZ GARCIA", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220021", firstName: "MAURICIO", lastName: "SANCHEZ GARCIA", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220064", firstName: "ENRIQUE", lastName: "SANCHEZ RAMIREZ", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220018", firstName: "ALAN FERNANDO", lastName: "SANCHEZ ROMERO", career: "Ingeniería en Sistemas Computacionales"},
	{matricula: "13220035", firstName: "LUIS ANTONIO", lastName: "SANCHEZ SANCHEZ", career: "Ingeniería en Sistemas Computacionales"},
}

func main() {
	_ = godotenv.Load()

	cfg := config.LoadConfig()
	db := database.InitDB(cfg)
	defer db.Close()

	// Inicializar esquema
	if err := database.InitializeSchema(db); err != nil {
		log.Fatalf("Error inicializando esquema: %v", err)
	}

	// Verificar si el usuario admin ya existe
	var count int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM users WHERE email = $1 AND role = $2",
		"admin@jornada.edu.mx", "admin",
	).Scan(&count)

	if err != nil {
		log.Fatalf("Error consultando usuarios: %v", err)
	}

	if count == 0 {
		// Crear contraseña hasheada
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("Error hasheando contraseña: %v", err)
		}

		// Insertar usuario admin
		_, err = db.Exec(
			"INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)",
			"admin@jornada.edu.mx", string(hashedPassword), "Administrador", "admin",
		)

		if err != nil {
			log.Fatalf("Error creando usuario admin: %v", err)
		}

		log.Println("✅ Usuario admin creado: admin@jornada.edu.mx / admin123")
	} else {
		log.Println("ℹ️  Usuario admin ya existe")
	}

	for _, student := range studentSeeds {
		_, err = db.Exec(
			`INSERT INTO students (matricula, first_name, last_name, career)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (matricula) DO UPDATE SET
				first_name = EXCLUDED.first_name,
				last_name = EXCLUDED.last_name,
				career = EXCLUDED.career,
				updated_at = NOW()`,
			student.matricula,
			student.firstName,
			student.lastName,
			student.career,
		)
		if err != nil {
			log.Fatalf("Error creando alumno %s: %v", student.matricula, err)
		}
	}

	log.Printf("✅ Alumnos cargados: %d", len(studentSeeds))

	fmt.Println("✅ Base de datos configurada correctamente")
}
