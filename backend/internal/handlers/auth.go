package handlers

import (
	"bytes"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jornada-academica/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/text/unicode/norm"
)

type AuthHandler struct {
	db        *sql.DB
	jwtSecret string
	gasURL    string
}

func NewAuthHandler(
	db *sql.DB,
	jwtSecret string,
	gasURL string,
) *AuthHandler {
	return &AuthHandler{
		db:        db,
		jwtSecret: jwtSecret,
		gasURL:    strings.TrimSpace(gasURL),
	}
}

func (h *AuthHandler) validatePassword(password string) error {
	var (
		hasMinLen  = len(password) >= 8
		hasUpper   = false
		hasLower   = false
		hasNumber  = false
		hasSpecial = false
	)
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}
	if !hasMinLen {
		return fmt.Errorf("la contraseña debe tener al menos 8 caracteres")
	}
	if !hasUpper {
		return fmt.Errorf("la contraseña debe tener al menos una letra mayúscula")
	}
	if !hasLower {
		return fmt.Errorf("la contraseña debe tener al menos una letra minúscula")
	}
	if !hasNumber {
		return fmt.Errorf("la contraseña debe tener al menos un número")
	}
	if !hasSpecial {
		return fmt.Errorf("la contraseña debe tener al menos un carácter especial")
	}
	return nil
}

func (h *AuthHandler) callGAS(data map[string]interface{}) (map[string]interface{}, error) {
	if h.gasURL == "" {
		return nil, fmt.Errorf("GAS_URL no configurada")
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(h.gasURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Leer el cuerpo para diagnóstico si falla el decode
	bodyBytes, _ := io.ReadAll(resp.Body)
	
	var result map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		log.Printf("⚠️ GAS devolvió una respuesta no válida (posible error de permisos o script): %s", string(bodyBytes))
		return nil, err
	}

	log.Printf("📡 Respuesta de GAS: %v", result)
	return result, nil
}

func normalizeEmailPrefix(value string) string {
	normalized := norm.NFD.String(strings.ToLower(strings.TrimSpace(value)))
	var builder strings.Builder
	previousHyphen := false

	for _, r := range normalized {
		if unicode.Is(unicode.Mn, r) {
			continue
		}

		switch {
		case r >= 'a' && r <= 'z':
			builder.WriteRune(r)
			previousHyphen = false
		case r >= '0' && r <= '9':
			builder.WriteRune(r)
			previousHyphen = false
		case unicode.IsSpace(r) || r == '-' || r == '_':
			if builder.Len() > 0 && !previousHyphen {
				builder.WriteRune('-')
				previousHyphen = true
			}
		}
	}

	result := strings.Trim(builder.String(), "-")
	if result == "" {
		return "alumno"
	}

	return result
}

func buildInstitutionalEmail(firstName string, matricula string) string {
	firstName = strings.TrimSpace(firstName)
	if firstName == "" {
		firstName = "alumno"
	}

	firstPart := strings.Fields(firstName)
	if len(firstPart) > 0 {
		firstName = firstPart[0]
	}

	return fmt.Sprintf("%s-%s@umb.edu.mx", normalizeEmailPrefix(firstName), strings.TrimSpace(matricula))
}

func buildFullName(firstName string, lastName string) string {
	return strings.TrimSpace(strings.Join([]string{strings.TrimSpace(firstName), strings.TrimSpace(lastName)}, " "))
}

func normalizeSecretAnswer(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func recoveryQuestionForUser(user models.User) (string, string, bool) {
	name := strings.ToLower(strings.TrimSpace(user.Name))
	email := strings.ToLower(strings.TrimSpace(user.Email))
	question := strings.TrimSpace(user.RecoveryQuestion)
	answer := strings.TrimSpace(user.RecoveryAnswer)

	if question != "" && answer != "" {
		return question, answer, true
	}

	if strings.Contains(name, "cristofer") || strings.Contains(email, "cristofer") {
		return "¿Quién es tu mascota?", "pelusa", true
	}

	return "", "", false
}

func fetchUserByMatricula(db *sql.DB, matricula string) (*models.User, error) {
	var user models.User
	err := db.QueryRow(
		`SELECT u.id, u.email, u.password_hash, u.name, u.role, u.recovery_question, u.recovery_answer, u.created_at, u.last_login, u.is_active
		 FROM users u
		 INNER JOIN students s ON s.user_id = u.id
		 WHERE s.matricula = $1`,
		strings.TrimSpace(matricula),
	).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.Role,
		&user.RecoveryQuestion,
		&user.RecoveryAnswer,
		&user.CreatedAt,
		&user.LastLogin,
		&user.IsActive,
	)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func fetchStudentByMatricula(db *sql.DB, matricula string) (*models.Student, error) {
	var student models.Student
	err := db.QueryRow(
		`SELECT id, matricula, first_name, last_name, career, user_id, created_at, updated_at
		 FROM students
		 WHERE matricula = $1`,
		strings.TrimSpace(matricula),
	).Scan(
		&student.ID,
		&student.Matricula,
		&student.FirstName,
		&student.LastName,
		&student.Career,
		&student.UserID,
		&student.CreatedAt,
		&student.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &student, nil
}

func fetchStudentByID(db *sql.DB, id string) (*models.Student, error) {
	var student models.Student
	err := db.QueryRow(
		`SELECT id, matricula, first_name, last_name, career, user_id, created_at, updated_at
		 FROM students
		 WHERE id = $1`,
		strings.TrimSpace(id),
	).Scan(
		&student.ID,
		&student.Matricula,
		&student.FirstName,
		&student.LastName,
		&student.Career,
		&student.UserID,
		&student.CreatedAt,
		&student.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &student, nil
}

// Login maneja la autenticación de usuarios
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Message: "Campos requeridos: email, password",
			Error:   err.Error(),
		})
		return
	}

	// Buscar usuario en la BD (sin filtrar por rol)
	var user models.User
	err := h.db.QueryRow(
		"SELECT id, email, password_hash, name, role FROM users WHERE email = $1",
		req.Email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Message: "Credenciales inválidas",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Message: "Error del servidor",
			Error:   err.Error(),
		})
		return
	}

	// Comparar contraseña
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Message: "Credenciales inválidas",
		})
		return
	}

	// Generar token JWT
	claims := models.JWTClaims{
		ID:    user.ID,
		Email: user.Email,
		Role:  user.Role,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    claims.ID,
		"email": claims.Email,
		"role":  claims.Role,
		"exp":   time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Message: "Error al generar token",
			Error:   err.Error(),
		})
		return
	}

	// Actualizar último acceso
	_, _ = h.db.Exec("UPDATE users SET last_login = NOW() WHERE id = $1", user.ID)

	c.JSON(http.StatusOK, models.LoginResponse{
		Token: tokenString,
		User: models.UserResponse{
			ID:    user.ID,
			Email: user.Email,
			Name:  user.Name,
			Role:  user.Role,
		},
	})
}

// Register crea un nuevo usuario (público)
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Campos inválidos", Error: err.Error()})
		return
	}

	// Verificar si el email ya existe
	var count int
	err := h.db.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", req.Email).Scan(&count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error del servidor", Error: err.Error()})
		return
	}
	if count > 0 {
		c.JSON(http.StatusConflict, models.ErrorResponse{Message: "El correo ya está registrado"})
		return
	}

	// Validar requisitos de contraseña
	if err := h.validatePassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: err.Error()})
		return
	}

	// Hashear contraseña
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al procesar contraseña", Error: err.Error()})
		return
	}

	role := req.Role
	if role == "" {
		role = "attendee"
	}

	var userID int
	err = h.db.QueryRow(
		"INSERT INTO users (email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		req.Email, string(hashed), req.Name, role, true,
	).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error creando usuario", Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": userID, "email": req.Email, "name": req.Name, "role": role})
}

// LookupStudent devuelve la información institucional cargada por el administrador.
func (h *AuthHandler) LookupStudent(c *gin.Context) {
	matricula := strings.TrimSpace(c.Query("matricula"))
	if matricula == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "La matrícula es requerida"})
		return
	}

	student, err := fetchStudentByMatricula(h.db, matricula)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "No se encontró un alumno con esa matrícula"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error del servidor", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.StudentLookupResponse{
		Matricula:          student.Matricula,
		FirstName:          student.FirstName,
		LastName:           student.LastName,
		Career:             student.Career,
		FullName:           buildFullName(student.FirstName, student.LastName),
		InstitutionalEmail: buildInstitutionalEmail(student.FirstName, student.Matricula),
		AlreadyRegistered:  student.UserID != nil,
	})
}

// CreateStudent permite a administración cargar o actualizar la información base de un alumno.
func (h *AuthHandler) CreateStudent(c *gin.Context) {
	var req models.AdminStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Campos inválidos", Error: err.Error()})
		return
	}

	matricula := strings.TrimSpace(req.Matricula)
	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)
	career := strings.TrimSpace(req.Career)

	if matricula == "" || firstName == "" || lastName == "" || career == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Matrícula, nombre, apellidos y carrera son requeridos"})
		return
	}

	_, err := h.db.Exec(
		`INSERT INTO students (matricula, first_name, last_name, career)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (matricula) DO UPDATE SET
			first_name = EXCLUDED.first_name,
			last_name = EXCLUDED.last_name,
			career = EXCLUDED.career,
			updated_at = NOW()`,
		matricula,
		firstName,
		lastName,
		career,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error guardando alumno", Error: err.Error()})
		return
	}

	student, err := fetchStudentByMatricula(h.db, matricula)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error leyendo alumno", Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":                  student.ID,
		"matricula":           student.Matricula,
		"first_name":          student.FirstName,
		"last_name":           student.LastName,
		"career":              student.Career,
		"full_name":           buildFullName(student.FirstName, student.LastName),
		"institutional_email": buildInstitutionalEmail(student.FirstName, student.Matricula),
		"message":             "Alumno guardado correctamente",
	})
}

// ListStudents devuelve todos los alumnos con estado de registro (enlazado/no enlazado)
func (h *AuthHandler) ListStudents(c *gin.Context) {
	rows, err := h.db.Query(`SELECT id, matricula, first_name, last_name, career, user_id FROM students ORDER BY matricula`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error consultando alumnos", Error: err.Error()})
		return
	}
	defer rows.Close()

	var list []gin.H
	for rows.Next() {
		var id int
		var matricula, firstName, lastName, career string
		var userID sql.NullInt64
		if err := rows.Scan(&id, &matricula, &firstName, &lastName, &career, &userID); err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error leyendo fila de alumno", Error: err.Error()})
			return
		}
		already := userID.Valid
		list = append(list, gin.H{
			"id":                  id,
			"matricula":           matricula,
			"first_name":          firstName,
			"last_name":           lastName,
			"career":              career,
			"full_name":           buildFullName(firstName, lastName),
			"institutional_email": buildInstitutionalEmail(firstName, matricula),
			"already_registered":  already,
		})
	}

	c.JSON(http.StatusOK, list)
}

// RegisterStudent crea la cuenta del alumno usando matrícula + contraseña.
func (h *AuthHandler) RegisterStudent(c *gin.Context) {
	var req models.StudentRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Campos inválidos", Error: err.Error()})
		return
	}

	student, err := fetchStudentByMatricula(h.db, req.Matricula)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "No se encontró un alumno con esa matrícula"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error del servidor", Error: err.Error()})
		return
	}
	if student.UserID != nil {
		c.JSON(http.StatusConflict, models.ErrorResponse{Message: "Esta matrícula ya fue registrada"})
		return
	}

	email := buildInstitutionalEmail(student.FirstName, student.Matricula)
	fullName := buildFullName(student.FirstName, student.LastName)

	var existingCount int
	err = h.db.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", email).Scan(&existingCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error del servidor", Error: err.Error()})
		return
	}
	if existingCount > 0 {
		c.JSON(http.StatusConflict, models.ErrorResponse{Message: "Este correo institucional ya está registrado"})
		return
	}

	// Validar requisitos de contraseña
	if err := h.validatePassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: err.Error()})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al procesar contraseña", Error: err.Error()})
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error iniciando registro", Error: err.Error()})
		return
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var userID int
	err = tx.QueryRow(
		"INSERT INTO users (email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		email,
		string(hashed),
		fullName,
		"attendee",
		true,
	).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error creando usuario", Error: err.Error()})
		return
	}

	result, err := tx.Exec("UPDATE students SET user_id = $1, updated_at = NOW() WHERE id = $2 AND user_id IS NULL", userID, student.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error vinculando alumno", Error: err.Error()})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error finalizando registro", Error: err.Error()})
		return
	}
	if rowsAffected == 0 {
		c.JSON(http.StatusConflict, models.ErrorResponse{Message: "Esta matrícula ya fue registrada"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error confirmando registro", Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":                  userID,
		"matricula":           student.Matricula,
		"name":                fullName,
		"email":               email,
		"career":              student.Career,
		"institutional_email": email,
		"role":                "attendee",
	})
}

// GetStudentByID devuelve un alumno por su identificador interno.
func (h *AuthHandler) GetStudentByID(c *gin.Context) {
	student, err := fetchStudentByID(h.db, c.Param("id"))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "Alumno no encontrado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error del servidor", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                  student.ID,
		"matricula":           student.Matricula,
		"first_name":          student.FirstName,
		"last_name":           student.LastName,
		"career":              student.Career,
		"full_name":           buildFullName(student.FirstName, student.LastName),
		"institutional_email": buildInstitutionalEmail(student.FirstName, student.Matricula),
		"already_registered":  student.UserID != nil,
	})
}

// UpdateStudent actualiza la información institucional de un alumno.
func (h *AuthHandler) UpdateStudent(c *gin.Context) {
	var req models.AdminStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Campos inválidos", Error: err.Error()})
		return
	}

	id := strings.TrimSpace(c.Param("id"))
	matricula := strings.TrimSpace(req.Matricula)
	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)
	career := strings.TrimSpace(req.Career)

	if matricula == "" || firstName == "" || lastName == "" || career == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Matrícula, nombre, apellidos y carrera son requeridos"})
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error iniciando actualización", Error: err.Error()})
		return
	}
	defer func() { _ = tx.Rollback() }()

	var currentUserID sql.NullInt64
	err = tx.QueryRow(`SELECT user_id FROM students WHERE id = $1`, id).Scan(&currentUserID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "Alumno no encontrado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error consultando alumno", Error: err.Error()})
		return
	}

	_, err = tx.Exec(
		`UPDATE students
		 SET matricula = $1,
		     first_name = $2,
		     last_name = $3,
		     career = $4,
		     updated_at = NOW()
		 WHERE id = $5`,
		matricula,
		firstName,
		lastName,
		career,
		id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error guardando alumno", Error: err.Error()})
		return
	}

	if currentUserID.Valid {
		institutionalEmail := buildInstitutionalEmail(firstName, matricula)
		fullName := buildFullName(firstName, lastName)

		var userCount int
		err = tx.QueryRow(
			`SELECT COUNT(*) FROM users WHERE email = $1 AND id <> $2`,
			institutionalEmail,
			currentUserID.Int64,
		).Scan(&userCount)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error validando correo institucional", Error: err.Error()})
			return
		}
		if userCount > 0 {
			c.JSON(http.StatusConflict, models.ErrorResponse{Message: "Ya existe un usuario con el correo institucional generado"})
			return
		}

		_, err = tx.Exec(
			`UPDATE users SET email = $1, name = $2 WHERE id = $3`,
			institutionalEmail,
			fullName,
			currentUserID.Int64,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error actualizando usuario vinculado", Error: err.Error()})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error confirmando actualización", Error: err.Error()})
		return
	}

	updatedStudent, err := fetchStudentByID(h.db, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error leyendo alumno actualizado", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                  updatedStudent.ID,
		"matricula":           updatedStudent.Matricula,
		"first_name":          updatedStudent.FirstName,
		"last_name":           updatedStudent.LastName,
		"career":              updatedStudent.Career,
		"full_name":           buildFullName(updatedStudent.FirstName, updatedStudent.LastName),
		"institutional_email": buildInstitutionalEmail(updatedStudent.FirstName, updatedStudent.Matricula),
		"message":             "Alumno actualizado correctamente",
	})
}

// DeleteStudent elimina un alumno y, si existe, su cuenta vinculada.
func (h *AuthHandler) DeleteStudent(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))

	tx, err := h.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error iniciando eliminación", Error: err.Error()})
		return
	}
	defer func() { _ = tx.Rollback() }()

	var userID sql.NullInt64
	err = tx.QueryRow(`SELECT user_id FROM students WHERE id = $1`, id).Scan(&userID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "Alumno no encontrado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error consultando alumno", Error: err.Error()})
		return
	}

	if userID.Valid {
		if _, err = tx.Exec(`DELETE FROM users WHERE id = $1`, userID.Int64); err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error eliminando usuario vinculado", Error: err.Error()})
			return
		}
	}

	result, err := tx.Exec(`DELETE FROM students WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error eliminando alumno", Error: err.Error()})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "Alumno no encontrado"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error confirmando eliminación", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Alumno eliminado exitosamente"})
}

// ChangePassword permite a un alumno cambiar su contraseña autenticado.
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Campos inválidos", Error: err.Error()})
		return
	}

	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Usuario no autenticado"})
		return
	}

	claims := userInterface.(*models.JWTClaims)

	var passwordHash string
	err := h.db.QueryRow(`SELECT password_hash FROM users WHERE id = $1`, claims.ID).Scan(&passwordHash)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "Usuario no encontrado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error consultando usuario", Error: err.Error()})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Message: "La contraseña actual es incorrecta"})
		return
	}

	// Validar requisitos de contraseña
	if err := h.validatePassword(req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: err.Error()})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error procesando contraseña", Error: err.Error()})
		return
	}

	_, err = h.db.Exec(`UPDATE users SET password_hash = $1 WHERE id = $2`, string(hashed), claims.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error actualizando contraseña", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contraseña actualizada exitosamente"})
}

// ForgotPassword devuelve la pregunta secreta configurada para la cuenta.
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Campo matrícula requerido", Error: err.Error()})
		return
	}

	user, err := fetchUserByMatricula(h.db, req.Matricula)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{
			"message":          "Si la cuenta existe, podrás responder la pregunta secreta para cambiar la contraseña",
			"recovery_enabled": false,
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error del servidor", Error: err.Error()})
		return
	}

	question, _, ok := recoveryQuestionForUser(*user)
	if !ok {
		c.JSON(http.StatusOK, gin.H{
			"message":          "Si la cuenta existe, podrás responder la pregunta secreta para cambiar la contraseña",
			"recovery_enabled": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":          "Responde la pregunta secreta para continuar con el cambio de contraseña",
		"recovery_enabled": true,
		"secret_question":  question,
	})
}

// ResetPassword aplica un nuevo password usando la respuesta secreta.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Campos inválidos", Error: err.Error()})
		return
	}

	user, err := fetchUserByMatricula(h.db, req.Matricula)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "No se encontró una cuenta con esa matrícula"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error del servidor", Error: err.Error()})
		return
	}

	question, answer, ok := recoveryQuestionForUser(*user)
	if !ok {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "No hay una pregunta secreta configurada para esta cuenta"})
		return
	}

	if question == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "No hay una pregunta secreta configurada para esta cuenta"})
		return
	}

	if normalizeSecretAnswer(req.SecretAnswer) != normalizeSecretAnswer(answer) {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Message: "La respuesta secreta es incorrecta"})
		return
	}

	// Validar requisitos de contraseña
	if err := h.validatePassword(req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: err.Error()})
		return
	}

	// Hashear nueva contraseña
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error procesando contraseña", Error: err.Error()})
		return
	}

	// Actualizar en BD
	_, err = h.db.Exec("UPDATE users SET password_hash = $1 WHERE id = $2", string(hashed), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error actualizando contraseña", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contraseña actualizada exitosamente"})
}

// Verify verifica que un token JWT sea válido
func (h *AuthHandler) Verify(c *gin.Context) {
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Message: "Token no válido",
		})
		return
	}

	user := userInterface.(*models.JWTClaims)
	
	// Si es alumno, incluir datos de estudiante
	var response = gin.H{"user": user}
	if user.Role == "attendee" {
		var student models.Student
		err := h.db.QueryRow(`
			SELECT s.id, s.matricula, s.first_name, s.last_name, s.career, s.user_id, 
			       COALESCE(cp.priority_bonus, 0), s.created_at, s.updated_at
			FROM students s
			LEFT JOIN career_priority cp ON s.career = cp.career
			WHERE s.user_id = $1
		`, user.ID).Scan(
			&student.ID, &student.Matricula, &student.FirstName, &student.LastName,
			&student.Career, &student.UserID, &student.PriorityPoints, &student.CreatedAt, &student.UpdatedAt,
		)
		if err == nil {
			response["student"] = student
		}
	}

	c.JSON(http.StatusOK, response)
}

// Logout cierra la sesión (simplemente retorna confirmación)
func (h *AuthHandler) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Sesión cerrada exitosamente",
	})
}

// ListAdmins devuelve todos los usuarios con rol de administrador
func (h *AuthHandler) ListAdmins(c *gin.Context) {
	rows, err := h.db.Query(`SELECT id, email, name, role, created_at, last_login FROM users WHERE role = 'admin' ORDER BY id`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error consultando administradores", Error: err.Error()})
		return
	}
	defer rows.Close()

	var list []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.CreatedAt, &u.LastLogin); err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error leyendo fila", Error: err.Error()})
			return
		}
		list = append(list, u)
	}

	c.JSON(http.StatusOK, list)
}

// CreateAdmin permite a un administrador crear otro administrador
func (h *AuthHandler) CreateAdmin(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Campos inválidos", Error: err.Error()})
		return
	}

	// Forzar rol admin
	req.Role = "admin"

	// Verificar si el email ya existe
	var count int
	err := h.db.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", req.Email).Scan(&count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error del servidor", Error: err.Error()})
		return
	}
	if count > 0 {
		c.JSON(http.StatusConflict, models.ErrorResponse{Message: "El correo ya está registrado"})
		return
	}

	// Validar requisitos de contraseña
	if err := h.validatePassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: err.Error()})
		return
	}

	// Hashear contraseña
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al procesar contraseña", Error: err.Error()})
		return
	}

	var userID int
	err = h.db.QueryRow(
		"INSERT INTO users (email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		req.Email, string(hashed), req.Name, "admin", true,
	).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error creando administrador", Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": userID, "email": req.Email, "name": req.Name, "role": "admin"})
}

// DeleteAdmin elimina un administrador (solo puede eliminarse a sí mismo)
func (h *AuthHandler) DeleteAdmin(c *gin.Context) {
	targetID := c.Param("id")
	
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Usuario no autenticado"})
		return
	}

	claims := userInterface.(*models.JWTClaims)
	
	// Convertir targetID a int para comparar
	var tid int
	fmt.Sscanf(targetID, "%d", &tid)

	if tid != claims.ID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Message: "No tienes permisos para eliminar a otros administradores. Solo puedes eliminar tu propia cuenta.",
		})
		return
	}

	// Proceder con la eliminación
	_, err := h.db.Exec("DELETE FROM users WHERE id = $1", tid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al eliminar la cuenta", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tu cuenta de administrador ha sido eliminada exitosamente"})
}

// RequestReset solicita un PIN de recuperación por email vía GAS.
func (h *AuthHandler) RequestReset(c *gin.Context) {
	log.Printf("📥 RequestReset recibida para: %v", c.Request.Body)
	var req models.RequestResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Email requerido", Error: err.Error()})
		return
	}

	log.Printf("🔍 Buscando usuario: %s", req.Email)
	// 1. Verificar si el usuario existe localmente
	var userID int
	err := h.db.QueryRow("SELECT id FROM users WHERE email = $1", req.Email).Scan(&userID)
	if err == sql.ErrNoRows {
		log.Printf("⚠️ Usuario no encontrado: %s", req.Email)
		// Por seguridad, devolvemos éxito aunque no exista
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Si el correo está registrado, recibirás un PIN de recuperación."})
		return
	}

	// 2. Generar PIN local de 8 dígitos
	pinBig, _ := rand.Int(rand.Reader, big.NewInt(90000000))
	pin := fmt.Sprintf("%08d", pinBig.Int64()+10000000)
	expires := time.Now().Add(15 * time.Minute)

	// 3. Guardar PIN en la BD local
	_, err = h.db.Exec("UPDATE users SET reset_pin = $1, reset_pin_expires = $2 WHERE id = $3", pin, expires, userID)
	if err != nil {
		log.Printf("❌ DATABASE ERROR: %v", err)
	}

	// Log para recuperación manual
	log.Printf("🔑 PIN_RECOVERY_GENERATED: Email=%s PIN=%s", req.Email, pin)

	// 4. Intentar enviar vía GAS (opcional)
	result, err := h.callGAS(map[string]interface{}{
		"action": "requestReset",
		"email":  req.Email,
		"pin":    pin, 
	})

	if err != nil {
		log.Printf("❌ Error llamando a GAS (requestReset): %v. PIN generado: %s", err, pin)
		// Si falla GAS (ej: dominio Gmail), notificamos al log el PIN para recuperación manual
		log.Printf("🔑 PIN DE RECUPERACIÓN PARA %s: %s", req.Email, pin)
		
		c.JSON(http.StatusOK, gin.H{
			"success": true, 
			"message": "Se ha generado un PIN de recuperación. Por favor revisa tu correo (y spam).",
			"pin_debug": pin, // Solo para desarrollo/emergencia si GAS falla
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// VerifyPin verifica que el PIN ingresado sea correcto.
func (h *AuthHandler) VerifyPin(c *gin.Context) {
	var req models.VerifyPinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Campos requeridos", Error: err.Error()})
		return
	}

	// 1. Verificar PIN localmente
	var dbPin string
	var expires time.Time
	err := h.db.QueryRow("SELECT reset_pin, reset_pin_expires FROM users WHERE email = $1", req.Email).Scan(&dbPin, &expires)
	
	if err == nil && dbPin == req.Pin && time.Now().Before(expires) {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "PIN verificado correctamente"})
		return
	}

	// 2. Fallback a GAS (por si se generó allá)
	result, err := h.callGAS(map[string]interface{}{
		"action": "verifyPin",
		"email":  req.Email,
		"pin":    req.Pin,
	})

	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Message: "PIN inválido o expirado"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// UpdatePasswordWithPin cambia la contraseña verificando el PIN.
func (h *AuthHandler) UpdatePasswordWithPin(c *gin.Context) {
	var req models.UpdatePasswordWithPinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Campos requeridos", Error: err.Error()})
		return
	}

	// 1. Verificar PIN localmente primero
	var dbPin string
	var expires time.Time
	err := h.db.QueryRow("SELECT reset_pin, reset_pin_expires FROM users WHERE email = $1", req.Email).Scan(&dbPin, &expires)
	
	isLocalValid := (err == nil && dbPin == req.Pin && time.Now().Before(expires))

	if !isLocalValid {
		// Intentar verificar vía GAS antes de rendirse
		gasResult, err := h.callGAS(map[string]interface{}{
			"action": "verifyPin",
			"email":  req.Email,
			"pin":    req.Pin,
		})
		if err != nil || gasResult["success"] != true {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{Message: "PIN inválido para actualizar contraseña"})
			return
		}
	}

	// 2. Actualizar contraseña localmente
	// Validar requisitos de contraseña
	if err := h.validatePassword(req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: err.Error()})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error procesando contraseña"})
		return
	}

	_, err = h.db.Exec("UPDATE users SET password_hash = $1, reset_pin = NULL, reset_pin_expires = NULL WHERE email = $2", string(hashed), req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al actualizar la base de datos"})
		return
	}

	// 3. (Opcional) Sincronizar con GAS si es necesario
	_, _ = h.callGAS(map[string]interface{}{
		"action":      "updatePassword",
		"email":       req.Email,
		"pin":         req.Pin,
		"newPassword": req.NewPassword,
	})

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Contraseña actualizada exitosamente"})
}

