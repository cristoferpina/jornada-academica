package models

import "time"

// User representa un usuario en la base de datos
type User struct {
	ID               int        `json:"id"`
	Email            string     `json:"email" binding:"required,email"`
	PasswordHash     string     `json:"-"`
	Name             string     `json:"name"`
	Role             string     `json:"role" binding:"required,oneof=admin speaker attendee"`
	RecoveryQuestion string     `json:"recovery_question"`
	RecoveryAnswer   string     `json:"-"`
	CreatedAt        time.Time  `json:"created_at"`
	LastLogin        *time.Time `json:"last_login"`
	IsActive         bool       `json:"is_active"`
}

// Implement jwt.Claims interface for JWTClaims
func (c *JWTClaims) GetExpirationTime() (*time.Time, error) { return nil, nil }
func (c *JWTClaims) GetIssuedAt() (*time.Time, error)       { return nil, nil }
func (c *JWTClaims) GetNotBefore() (*time.Time, error)      { return nil, nil }
func (c *JWTClaims) GetIssuer() (string, error)             { return "", nil }
func (c *JWTClaims) GetSubject() (string, error)            { return "", nil }
func (c *JWTClaims) GetAudience() ([]string, error)         { return []string{}, nil }

// LoginRequest estructura para las solicitudes de login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role"`
}

// RegisterRequest estructura para registro de usuarios
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

// AdminStudentRequest estructura para que administración cargue alumnos.
type AdminStudentRequest struct {
	Matricula string `json:"matricula" binding:"required"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
	Career    string `json:"career" binding:"required"`
}

// Student representa la información institucional cargada por el administrador.
type Student struct {
	ID        int       `json:"id"`
	Matricula string    `json:"matricula" binding:"required"`
	FirstName string    `json:"first_name" binding:"required"`
	LastName  string    `json:"last_name" binding:"required"`
	Career    string    `json:"career" binding:"required"`
	UserID    *int      `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// StudentLookupResponse expone la información mostrable antes de confirmar con contraseña.
type StudentLookupResponse struct {
	Matricula          string `json:"matricula"`
	FirstName          string `json:"first_name"`
	LastName           string `json:"last_name"`
	Career             string `json:"career"`
	FullName           string `json:"full_name"`
	InstitutionalEmail string `json:"institutional_email"`
	AlreadyRegistered  bool   `json:"already_registered"`
}

// StudentRegisterRequest registra al alumno usando su matrícula y contraseña.
type StudentRegisterRequest struct {
	Matricula string `json:"matricula" binding:"required"`
	Password  string `json:"password" binding:"required,min=6"`
}

// ForgotPasswordRequest estructura para solicitar recuperación
type ForgotPasswordRequest struct {
	Matricula string `json:"matricula" binding:"required"`
}

// ResetPasswordRequest estructura para aplicar nuevo password
type ResetPasswordRequest struct {
	Matricula    string `json:"matricula" binding:"required"`
	SecretAnswer string `json:"secret_answer" binding:"required"`
	NewPassword  string `json:"new_password" binding:"required,min=6"`
}

// ChangePasswordRequest estructura para cambiar la contraseña autenticado.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
}

// LoginResponse estructura de respuesta del login
type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

// UserResponse estructura para responder datos del usuario sin la contraseña
type UserResponse struct {
	ID    int    `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

// Speaker representa un ponente
type Speaker struct {
	ID                   int        `json:"id"`
	FullName             string     `json:"full_name" binding:"required"`
	AcademicLevel        string     `json:"academic_level" binding:"required,oneof=Doctorado Maestría Licenciatura"`
	Institution          *string    `json:"institution"`
	Career               *string    `json:"career"`
	Biografia            *string    `json:"biografia"`
	ProfilePhotoURL      *string    `json:"profile_photo_url"`
	InstitutionalLogoURL *string    `json:"institutional_logo_url"`
	ConferenceName       string     `json:"conference_name" binding:"required"`
	SuggestedDate        *time.Time `json:"suggested_date"`
	AudienceCapacity     *int       `json:"audience_capacity"`
	Phone                *string    `json:"phone"`
	SocialMedia          *string    `json:"social_media"`
	AcceptedTerms        bool       `json:"accepted_terms" binding:"required"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

// JWTClaims estructura para los claims del JWT
type JWTClaims struct {
	ID    int    `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// ErrorResponse estructura para respuestas de error
type ErrorResponse struct {
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}
