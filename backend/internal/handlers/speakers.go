package handlers

import (
	"bytes"
	"database/sql"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jornada-academica/backend/internal/models"
)

type SpeakerHandler struct {
	db         *sql.DB
	uploadsDir string
}

func NewSpeakerHandler(db *sql.DB, uploadsDir string) *SpeakerHandler {
	// Crear directorio de uploads si no existe
	os.MkdirAll(uploadsDir, os.ModePerm)
	return &SpeakerHandler{
		db:         db,
		uploadsDir: uploadsDir,
	}
}

// GetAllSpeakers obtiene todos los ponentes
func (h *SpeakerHandler) GetAllSpeakers(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT id, full_name, academic_level, institution, career, biografia,
		       profile_photo_url, institutional_logo_url, conference_name,
		       suggested_date, audience_capacity, phone, social_media,
		       accepted_terms, created_at, updated_at
		FROM speakers
		ORDER BY created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Message: "Error al obtener ponentes",
			Error:   err.Error(),
		})
		return
	}
	defer rows.Close()

	var speakers []models.Speaker
	for rows.Next() {
		var speaker models.Speaker
		err := rows.Scan(
			&speaker.ID,
			&speaker.FullName,
			&speaker.AcademicLevel,
			&speaker.Institution,
			&speaker.Career,
			&speaker.Biografia,
			&speaker.ProfilePhotoURL,
			&speaker.InstitutionalLogoURL,
			&speaker.ConferenceName,
			&speaker.SuggestedDate,
			&speaker.AudienceCapacity,
			&speaker.Phone,
			&speaker.SocialMedia,
			&speaker.AcceptedTerms,
			&speaker.CreatedAt,
			&speaker.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Message: "Error procesando datos",
				Error:   err.Error(),
			})
			return
		}
		speakers = append(speakers, speaker)
	}

	if speakers == nil {
		speakers = []models.Speaker{}
	}

	c.JSON(http.StatusOK, speakers)
}

// GetSpeakerByID obtiene un ponente por ID
func (h *SpeakerHandler) GetSpeakerByID(c *gin.Context) {
	id := c.Param("id")

	var speaker models.Speaker
	err := h.db.QueryRow(`
		SELECT id, full_name, academic_level, institution, career, biografia,
		       profile_photo_url, institutional_logo_url, conference_name,
		       suggested_date, audience_capacity, phone, social_media,
		       accepted_terms, created_at, updated_at
		FROM speakers WHERE id = $1
	`, id).Scan(
		&speaker.ID,
		&speaker.FullName,
		&speaker.AcademicLevel,
		&speaker.Institution,
		&speaker.Career,
		&speaker.Biografia,
		&speaker.ProfilePhotoURL,
		&speaker.InstitutionalLogoURL,
		&speaker.ConferenceName,
		&speaker.SuggestedDate,
		&speaker.AudienceCapacity,
		&speaker.Phone,
		&speaker.SocialMedia,
		&speaker.AcceptedTerms,
		&speaker.CreatedAt,
		&speaker.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "Ponente no encontrado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Message: "Error al obtener ponente",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, speaker)
}

// CreateSpeaker crea un nuevo ponente
func (h *SpeakerHandler) CreateSpeaker(c *gin.Context) {
	fullName := c.PostForm("full_name")
	academicLevel := c.PostForm("academic_level")
	conferenceName := c.PostForm("conference_name")
	acceptedTermsStr := c.PostForm("accepted_terms")
	institution := c.PostForm("institution")
	career := c.PostForm("career")
	biografia := c.PostForm("biografia")
	suggestedDate := c.PostForm("suggested_date")
	audienceCapacityStr := c.PostForm("audience_capacity")
	phone := c.PostForm("phone")
	socialMedia := c.PostForm("social_media")

	// Validar campos requeridos
	if fullName == "" || academicLevel == "" || conferenceName == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Message: "Faltan campos requeridos: full_name, academic_level, conference_name",
		})
		return
	}

	acceptedTerms := acceptedTermsStr == "true" || acceptedTermsStr == "on"

	// Procesar archivos — se guardan en ./uploads/
	var profilePhotoURL *string
	var institutionalLogoURL *string

	if file, err := c.FormFile("profile_photo"); err == nil {
		photoURL, err := h.saveFile(file, "profile")
		if err == nil {
			profilePhotoURL = &photoURL
		}
	}

	if file, err := c.FormFile("institutional_logo"); err == nil {
		logoURL, err := h.saveFile(file, "logo")
		if err == nil {
			institutionalLogoURL = &logoURL
		}
	}

	// Punteros para campos opcionales
	var institutionPtr *string
	if institution != "" {
		institutionPtr = &institution
	}

	var careerPtr *string
	if career != "" {
		careerPtr = &career
	}

	var biografiaPtr *string
	if biografia != "" {
		biografiaPtr = &biografia
	}

	var suggestedDatePtr *time.Time
	if suggestedDate != "" {
		if parsedDate, err := time.Parse("2006-01-02", suggestedDate); err == nil {
			suggestedDatePtr = &parsedDate
		}
	}

	var audienceCapacityPtr *int
	if audienceCapacityStr != "" {
		if capacity, err := strconv.Atoi(audienceCapacityStr); err == nil {
			audienceCapacityPtr = &capacity
		}
	}

	var phonePtr *string
	if phone != "" {
		phonePtr = &phone
	}

	var socialMediaPtr *string
	if socialMedia != "" {
		socialMediaPtr = &socialMedia
	}

	// Insertar en BD
	var createdSpeaker models.Speaker
	err := h.db.QueryRow(`
		INSERT INTO speakers (
			full_name, academic_level, institution, career, biografia,
			profile_photo_url, institutional_logo_url,
			conference_name, suggested_date, audience_capacity,
			phone, social_media, accepted_terms
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, full_name, academic_level, institution, career, biografia,
		          profile_photo_url, institutional_logo_url, conference_name,
		          suggested_date, audience_capacity, phone, social_media,
		          accepted_terms, created_at, updated_at
	`,
		fullName, academicLevel, institutionPtr, careerPtr, biografiaPtr,
		profilePhotoURL, institutionalLogoURL, conferenceName,
		suggestedDatePtr, audienceCapacityPtr, phonePtr, socialMediaPtr, acceptedTerms,
	).Scan(
		&createdSpeaker.ID, &createdSpeaker.FullName, &createdSpeaker.AcademicLevel,
		&createdSpeaker.Institution, &createdSpeaker.Career, &createdSpeaker.Biografia,
		&createdSpeaker.ProfilePhotoURL, &createdSpeaker.InstitutionalLogoURL,
		&createdSpeaker.ConferenceName, &createdSpeaker.SuggestedDate,
		&createdSpeaker.AudienceCapacity, &createdSpeaker.Phone, &createdSpeaker.SocialMedia,
		&createdSpeaker.AcceptedTerms, &createdSpeaker.CreatedAt, &createdSpeaker.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Message: "Error al crear ponente",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, createdSpeaker)
}

// UpdateSpeaker actualiza un ponente
func (h *SpeakerHandler) UpdateSpeaker(c *gin.Context) {
	id := c.Param("id")

	fullName := c.PostForm("full_name")
	academicLevel := c.PostForm("academic_level")
	institution := c.PostForm("institution")
	career := c.PostForm("career")
	biografia := c.PostForm("biografia")
	conferenceName := c.PostForm("conference_name")
	suggestedDate := c.PostForm("suggested_date")
	audienceCapacityStr := c.PostForm("audience_capacity")
	phone := c.PostForm("phone")
	socialMedia := c.PostForm("social_media")

	query := "UPDATE speakers SET updated_at = NOW()"
	args := []interface{}{}
	argNum := 1

	if fullName != "" {
		query += fmt.Sprintf(", full_name = $%d", argNum)
		args = append(args, fullName)
		argNum++
	}
	if academicLevel != "" {
		query += fmt.Sprintf(", academic_level = $%d", argNum)
		args = append(args, academicLevel)
		argNum++
	}
	if institution != "" {
		query += fmt.Sprintf(", institution = $%d", argNum)
		args = append(args, institution)
		argNum++
	}
	if career != "" {
		query += fmt.Sprintf(", career = $%d", argNum)
		args = append(args, career)
		argNum++
	}
	if biografia != "" {
		query += fmt.Sprintf(", biografia = $%d", argNum)
		args = append(args, biografia)
		argNum++
	}
	if conferenceName != "" {
		query += fmt.Sprintf(", conference_name = $%d", argNum)
		args = append(args, conferenceName)
		argNum++
	}
	if suggestedDate != "" {
		parsedDate, err := time.Parse("2006-01-02", suggestedDate)
		if err == nil {
			query += fmt.Sprintf(", suggested_date = $%d", argNum)
			args = append(args, parsedDate)
			argNum++
		}
	}
	if audienceCapacityStr != "" {
		if capacity, err := strconv.Atoi(audienceCapacityStr); err == nil {
			query += fmt.Sprintf(", audience_capacity = $%d", argNum)
			args = append(args, capacity)
			argNum++
		}
	}
	if phone != "" {
		query += fmt.Sprintf(", phone = $%d", argNum)
		args = append(args, phone)
		argNum++
	}
	if socialMedia != "" {
		query += fmt.Sprintf(", social_media = $%d", argNum)
		args = append(args, socialMedia)
		argNum++
	}

	// Procesar nueva foto de perfil si se envió
	if file, err := c.FormFile("profile_photo"); err == nil {
		photoURL, err := h.saveFile(file, "profile")
		if err == nil {
			query += fmt.Sprintf(", profile_photo_url = $%d", argNum)
			args = append(args, photoURL)
			argNum++
		}
	}

	// Procesar nuevo logo si se envió
	if file, err := c.FormFile("institutional_logo"); err == nil {
		logoURL, err := h.saveFile(file, "logo")
		if err == nil {
			query += fmt.Sprintf(", institutional_logo_url = $%d", argNum)
			args = append(args, logoURL)
			argNum++
		}
	}

	query += fmt.Sprintf(` WHERE id = $%d
		RETURNING id, full_name, academic_level, institution, career, biografia,
		          profile_photo_url, institutional_logo_url, conference_name,
		          suggested_date, audience_capacity, phone, social_media,
		          accepted_terms, created_at, updated_at`, argNum)
	args = append(args, id)

	var speaker models.Speaker
	err := h.db.QueryRow(query, args...).Scan(
		&speaker.ID, &speaker.FullName, &speaker.AcademicLevel,
		&speaker.Institution, &speaker.Career, &speaker.Biografia,
		&speaker.ProfilePhotoURL, &speaker.InstitutionalLogoURL,
		&speaker.ConferenceName, &speaker.SuggestedDate,
		&speaker.AudienceCapacity, &speaker.Phone, &speaker.SocialMedia,
		&speaker.AcceptedTerms, &speaker.CreatedAt, &speaker.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "Ponente no encontrado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Message: "Error al actualizar ponente",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, speaker)
}

// DeleteSpeaker elimina un ponente
func (h *SpeakerHandler) DeleteSpeaker(c *gin.Context) {
	id := c.Param("id")

	result, err := h.db.Exec("DELETE FROM speakers WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Message: "Error al eliminar ponente",
			Error:   err.Error(),
		})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "Ponente no encontrado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ponente eliminado exitosamente"})
}

// saveFile guarda un archivo en ./uploads/ y retorna la URL relativa
func (h *SpeakerHandler) saveFile(file *multipart.FileHeader, fileType string) (string, error) {
	allowedMimes := map[string]bool{
		"image/jpeg":    true,
		"image/png":     true,
		"image/svg+xml": true,
	}
	// Abrir archivo
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Leer primeros bytes para detectar tipo MIME de forma fiable
	buf := make([]byte, 512)
	n, _ := src.Read(buf)
	detected := http.DetectContentType(buf[:n])

	// Si el header viene vacío, usar el detectado; si viene, preferir detectado
	contentType := detected
	if contentType == "" {
		contentType = file.Header.Get("Content-Type")
	}

	if !allowedMimes[contentType] {
		// Intentar también detectar por extensión como fallback
		ext := filepath.Ext(file.Filename)
		switch ext {
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
		case ".png":
			contentType = "image/png"
		case ".svg":
			contentType = "image/svg+xml"
		}
	}

	if !allowedMimes[contentType] {
		return "", fmt.Errorf("tipo de archivo no permitido: %s", contentType)
	}

	if file.Size > 5*1024*1024 {
		return "", fmt.Errorf("archivo demasiado grande (máx 5MB)")
	}

	// Reconstruir reader para copiar todo el contenido (incluyendo los bytes leídos)
	if _, err := src.Seek(0, io.SeekStart); err != nil {
		// si Seek no está soportado, usar MultiReader con lo ya leido
		reader := io.MultiReader(bytes.NewReader(buf[:n]), src)
		// Nombre único: tipo-timestamp-nanosegundos.ext
		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%s-%d%s", fileType, time.Now().UnixNano(), ext)
		destPath := filepath.Join(h.uploadsDir, filename)

		out, err := os.Create(destPath)
		if err != nil {
			return "", err
		}
		defer out.Close()

		if _, err := io.Copy(out, reader); err != nil {
			return "", err
		}

		return fmt.Sprintf("/uploads/%s", filename), nil
	}

	// Nombre único: tipo-timestamp-nanosegundos.ext
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s-%d%s", fileType, time.Now().UnixNano(), ext)
	destPath := filepath.Join(h.uploadsDir, filename)

	out, err := os.Create(destPath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	if _, err := io.Copy(out, src); err != nil {
		return "", err
	}

	// Retorna la ruta accesible desde el frontend
	return fmt.Sprintf("/uploads/%s", filename), nil
}
