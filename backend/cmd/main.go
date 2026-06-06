package main

import (
	"log"
	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/jornada-academica/backend/internal/config"
	"github.com/jornada-academica/backend/internal/database"
	"github.com/jornada-academica/backend/internal/handlers"
	"github.com/jornada-academica/backend/internal/middleware"
)

func main() {
	// Cargar variables de entorno
	_ = godotenv.Load()

	// Cargar configuración
	cfg := config.LoadConfig()

	// Inicializar base de datos
	db := database.InitDB(cfg)
	defer db.Close()

	// Inicializar esquema
	if err := database.InitializeSchema(db); err != nil {
		log.Fatalf("Error inicializando esquema: %v", err)
	}

	// Crear router
	router := gin.Default()

	// Configurar CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// DB test
	router.GET("/db-test", func(c *gin.Context) {
		var currentTime string
		err := db.QueryRow("SELECT NOW()").Scan(&currentTime)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"time": currentTime})
	})

	// Servir archivos estáticos
	router.Static("/uploads", "./uploads")

	// Crear handlers
	authHandler := handlers.NewAuthHandler(
		db,
		cfg.JWTSecret,
		cfg.SMTPHost,
		cfg.SMTPPort,
		cfg.SMTPUsername,
		cfg.SMTPPassword,
		cfg.SMTPFrom,
		cfg.SMTPFromName,
		cfg.FrontendURL,
	)
	uploadsDir := filepath.Join(".", "uploads")
	speakerHandler := handlers.NewSpeakerHandler(db, uploadsDir)

	// Rutas de autenticación
	authGroup := router.Group("/api/auth")
	{
		authGroup.POST("/login", authHandler.Login)
		// Registro público
		authGroup.POST("/register", authHandler.Register)
		authGroup.GET("/student-lookup", authHandler.LookupStudent)
		authGroup.POST("/register-student", authHandler.RegisterStudent)
		authGroup.POST("/change-password", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("attendee"), authHandler.ChangePassword)
		// Recuperación de contraseña
		authGroup.POST("/forgot", authHandler.ForgotPassword)
		authGroup.POST("/reset", authHandler.ResetPassword)
		authGroup.GET("/verify", middleware.AuthMiddleware(cfg.JWTSecret), authHandler.Verify)
		authGroup.POST("/logout", authHandler.Logout)
	}

	studentGroup := router.Group("/api/students")
	studentGroup.Use(middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("admin"))
	{
		studentGroup.POST("", authHandler.CreateStudent)
		studentGroup.GET("", authHandler.ListStudents)
		studentGroup.GET("/:id", authHandler.GetStudentByID)
		studentGroup.PUT("/:id", authHandler.UpdateStudent)
		studentGroup.DELETE("/:id", authHandler.DeleteStudent)
	}

	// Rutas de ponentes
	speakersGroup := router.Group("/api/speakers")
	{
		speakersGroup.GET("", speakerHandler.GetAllSpeakers)
		speakersGroup.GET("/:id", speakerHandler.GetSpeakerByID)
		speakersGroup.POST("", speakerHandler.CreateSpeaker)
		speakersGroup.PUT("/:id", speakerHandler.UpdateSpeaker)
		speakersGroup.DELETE("/:id", speakerHandler.DeleteSpeaker)
	}

	// Iniciar servidor
	log.Printf("🚀 Backend corriendo en puerto %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Error iniciando servidor: %v", err)
	}
}
