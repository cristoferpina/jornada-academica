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
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowOriginFunc = func(origin string) bool {
		return true // Permisivo para desarrollo e IP dinámica
	}
	router.Use(cors.New(corsConfig))

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
		cfg.GASURL,
	)
	uploadsDir := filepath.Join(".", "uploads")
	speakerHandler := handlers.NewSpeakerHandler(db, uploadsDir)
	venueHandler := handlers.NewVenueHandler(db)
	contestHandler := handlers.NewContestHandler(db)
	pageantHandler := handlers.NewPageantHandler(db)
	systemHandler := handlers.NewSystemHandler(db, uploadsDir)

	// Rutas de autenticación
	authGroup := router.Group("/api/auth")
	{
		authGroup.POST("/login", authHandler.Login)
		// Registro público
		authGroup.POST("/register", authHandler.Register)
		authGroup.GET("/student-lookup", authHandler.LookupStudent)
		authGroup.POST("/register-student", authHandler.RegisterStudent)
		authGroup.POST("/change-password", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("admin", "attendee"), authHandler.ChangePassword)
		// Recuperación de contraseña (Secret Question)
		authGroup.POST("/forgot", authHandler.ForgotPassword)
		authGroup.POST("/reset", authHandler.ResetPassword)
		// Recuperación de contraseña (Email PIN)
		authGroup.POST("/request-reset", authHandler.RequestReset)
		authGroup.POST("/verify-pin", authHandler.VerifyPin)
		authGroup.POST("/update-password", authHandler.UpdatePasswordWithPin)
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
		// Inscripciones (Alumno)
		speakersGroup.POST("/:id/register", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("attendee"), speakerHandler.RegisterForSpeaker)
		speakersGroup.DELETE("/:id/register", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("attendee"), speakerHandler.UnregisterFromSpeaker)
		speakersGroup.GET("/my-registrations", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("attendee"), speakerHandler.GetStudentRegistrations)

		speakersGroup.GET("/:id", speakerHandler.GetSpeakerByID)
		speakersGroup.POST("", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("admin"), speakerHandler.CreateSpeaker)
		speakersGroup.PUT("/:id", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("admin"), speakerHandler.UpdateSpeaker)
		speakersGroup.DELETE("/:id", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("admin"), speakerHandler.DeleteSpeaker)
	}

	// Rutas de recintos (Venues)
	venuesGroup := router.Group("/api/venues")
	{
		venuesGroup.GET("", venueHandler.GetVenues)
		// Protegidas para admin
		venuesGroup.POST("", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("admin"), venueHandler.CreateVenue)
		venuesGroup.PUT("/:id", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("admin"), venueHandler.UpdateVenue)
		venuesGroup.DELETE("/:id", middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("admin"), venueHandler.DeleteVenue)
	}

	// Rutas de Certámenes
	contestsGroup := router.Group("/api/contests")
	contestsGroup.Use(middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("admin"))
	{
		contestsGroup.POST("", contestHandler.CreateContest)
		contestsGroup.GET("", contestHandler.GetContests)
		contestsGroup.POST("/register", contestHandler.RegisterToContest)
		contestsGroup.GET("/:id/registrations", contestHandler.GetContestRegistrations)
		contestsGroup.DELETE("/registrations/:regId", contestHandler.DeleteRegistration)
		contestsGroup.DELETE("/:id", contestHandler.DeleteContest)
	}

	// Rutas de Señorita y Joven UES (Pageant)
	pageantGroup := router.Group("/api/pageant")
	pageantGroup.Use(middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("admin"))
	{
		pageantGroup.GET("/candidates", pageantHandler.GetCandidates)
		pageantGroup.POST("/candidates", pageantHandler.RegisterCandidate)
		pageantGroup.DELETE("/candidates/:id", pageantHandler.DeleteCandidate)
	}

	// Rutas de sistema
	router.GET("/api/system/settings", systemHandler.GetSettings)
	adminGroup := router.Group("/api/admin")
	adminGroup.Use(middleware.AuthMiddleware(cfg.JWTSecret), middleware.RequireRole("admin"))
	{
		adminGroup.POST("/settings/logos", systemHandler.UpdateLogos)
		// Gestión de administradores
		adminGroup.GET("/users", authHandler.ListAdmins)
		adminGroup.POST("/users", authHandler.CreateAdmin)
		adminGroup.DELETE("/users/:id", authHandler.DeleteAdmin)
	}

	// Iniciar servidor

	log.Printf("🚀 Backend corriendo en puerto %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Error iniciando servidor: %v", err)
	}
}
