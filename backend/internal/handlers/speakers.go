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
	"github.com/lib/pq"
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

func isValidAcademicLevel(level string) bool {
	return level == "Doctorado" || level == "MaestrÃ­a" || level == "Licenciatura"
}

func isValidSessionTime(value string) bool {
	if value == "" {
		return true
	}
	_, err := time.Parse("15:04", value)
	return err == nil
}

func (h *SpeakerHandler) venueExists(id int) bool {
	var exists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM venues WHERE id = $1)", id).Scan(&exists)
	return err == nil && exists
}

// GetAllSpeakers obtiene todos los ponentes
func (h *SpeakerHandler) GetAllSpeakers(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT s.id, s.full_name, s.academic_level, s.institution, s.career, s.biografia,
		       s.profile_photo_url, s.institutional_logo_url, s.conference_name,
		       s.suggested_date, s.suggested_time, s.audience_capacity, s.phone, s.social_media,
		       s.accepted_terms, s.venue_id, s.created_at, s.updated_at,
		       v.id, v.name, v.type, v.building, v.floor, v.capacity, v.status, v.amenities, v.image_url
		FROM speakers s
		LEFT JOIN venues v ON s.venue_id = v.id
		ORDER BY s.created_at DESC
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
		var v models.Venue
		var vID sql.NullInt64
		var vName, vType, vBuilding, vFloor, vStatus, vImageURL sql.NullString
		var vCapacity sql.NullInt64
		var vAmenities pq.StringArray

		err := rows.Scan(
			&speaker.ID, &speaker.FullName, &speaker.AcademicLevel, &speaker.Institution, &speaker.Career, &speaker.Biografia,
			&speaker.ProfilePhotoURL, &speaker.InstitutionalLogoURL, &speaker.ConferenceName,
			&speaker.SuggestedDate, &speaker.SuggestedTime, &speaker.AudienceCapacity, &speaker.Phone, &speaker.SocialMedia,
			&speaker.AcceptedTerms, &speaker.VenueID, &speaker.CreatedAt, &speaker.UpdatedAt,
			&vID, &vName, &vType, &vBuilding, &vFloor, &vCapacity, &vStatus, &vAmenities, &vImageURL,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Message: "Error procesando datos",
				Error:   err.Error(),
			})
			return
		}

		if vID.Valid {
			v.ID = int(vID.Int64)
			v.Name = vName.String
			v.Type = vType.String
			if vBuilding.Valid { v.Building = &vBuilding.String }
			if vFloor.Valid { v.Floor = &vFloor.String }
			if vCapacity.Valid { capVal := int(vCapacity.Int64); v.Capacity = &capVal }
			v.Status = vStatus.String
			v.Amenities = []string(vAmenities)
			if vImageURL.Valid { v.ImageURL = &vImageURL.String }
			speaker.Venue = &v
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
	var v models.Venue
	var vID sql.NullInt64
	var vName, vType, vBuilding, vFloor, vStatus, vImageURL sql.NullString
	var vCapacity sql.NullInt64
	var vAmenities pq.StringArray

	err := h.db.QueryRow(`
		SELECT s.id, s.full_name, s.academic_level, s.institution, s.career, s.biografia,
		       s.profile_photo_url, s.institutional_logo_url, s.conference_name,
		       s.suggested_date, s.suggested_time, s.audience_capacity, s.phone, s.social_media,
		       s.accepted_terms, s.venue_id, s.created_at, s.updated_at,
		       v.id, v.name, v.type, v.building, v.floor, v.capacity, v.status, v.amenities, v.image_url
		FROM speakers s
		LEFT JOIN venues v ON s.venue_id = v.id
		WHERE s.id = $1
	`, id).Scan(
		&speaker.ID, &speaker.FullName, &speaker.AcademicLevel, &speaker.Institution, &speaker.Career, &speaker.Biografia,
		&speaker.ProfilePhotoURL, &speaker.InstitutionalLogoURL, &speaker.ConferenceName,
		&speaker.SuggestedDate, &speaker.SuggestedTime, &speaker.AudienceCapacity, &speaker.Phone, &speaker.SocialMedia,
		&speaker.AcceptedTerms, &speaker.VenueID, &speaker.CreatedAt, &speaker.UpdatedAt,
		&vID, &vName, &vType, &vBuilding, &vFloor, &vCapacity, &vStatus, &vAmenities, &vImageURL,
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

	if vID.Valid {
		v.ID = int(vID.Int64)
		v.Name = vName.String
		v.Type = vType.String
		if vBuilding.Valid { v.Building = &vBuilding.String }
		if vFloor.Valid { v.Floor = &vFloor.String }
		if vCapacity.Valid { capVal := int(vCapacity.Int64); v.Capacity = &capVal }
		v.Status = vStatus.String
		v.Amenities = []string(vAmenities)
		if vImageURL.Valid { v.ImageURL = &vImageURL.String }
		speaker.Venue = &v
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
	suggestedTime := c.PostForm("suggested_time")
	audienceCapacityStr := c.PostForm("audience_capacity")
	phone := c.PostForm("phone")
	socialMedia := c.PostForm("social_media")
	venueIDStr := c.PostForm("venue_id")

	// Validar campos requeridos
	if fullName == "" || academicLevel == "" || conferenceName == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Message: "Faltan campos requeridos: full_name, academic_level, conference_name",
		})
		return
	}
	if !isValidAcademicLevel(academicLevel) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Nivel academico invalido"})
		return
	}
	if suggestedTime != "" && !isValidSessionTime(suggestedTime) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Hora invalida. Usa formato HH:MM"})
		return
	}

	acceptedTerms := acceptedTermsStr == "true" || acceptedTermsStr == "on"

	// Procesar archivos
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

	// Campos opcionales
	var institutionPtr *string
	if institution != "" { institutionPtr = &institution }
	var careerPtr *string
	if career != "" { careerPtr = &career }
	var biografiaPtr *string
	if biografia != "" { biografiaPtr = &biografia }
	var suggestedDatePtr *time.Time
	if suggestedDate != "" {
		parsedDate, err := time.Parse("2006-01-02", suggestedDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Fecha invalida. Usa formato YYYY-MM-DD"})
			return
		}
		suggestedDatePtr = &parsedDate
	}
	var suggestedTimePtr *string
	if suggestedTime != "" { suggestedTimePtr = &suggestedTime }
	var audienceCapacityPtr *int
	if audienceCapacityStr != "" {
		capacity, err := strconv.Atoi(audienceCapacityStr)
		if err != nil || capacity <= 0 {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "El cupo debe ser un numero mayor a cero"})
			return
		}
		audienceCapacityPtr = &capacity
	}
	var phonePtr *string
	if phone != "" { phonePtr = &phone }
	var socialMediaPtr *string
	if socialMedia != "" { socialMediaPtr = &socialMedia }
	
	var venueIDPtr *int
	if venueIDStr != "" && venueIDStr != "null" {
		vID, err := strconv.Atoi(venueIDStr)
		if err != nil || !h.venueExists(vID) {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Recinto invalido"})
			return
		}
		venueIDPtr = &vID
	}

	// Insertar en BD
	var createdSpeaker models.Speaker
	err := h.db.QueryRow(`
		INSERT INTO speakers (
			full_name, academic_level, institution, career, biografia,
			profile_photo_url, institutional_logo_url,
			conference_name, suggested_date, suggested_time, audience_capacity,
			phone, social_media, accepted_terms, venue_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, full_name, academic_level, institution, career, biografia,
		          profile_photo_url, institutional_logo_url, conference_name,
		          suggested_date, suggested_time, audience_capacity, phone, social_media,
		          accepted_terms, venue_id, created_at, updated_at
	`,
		fullName, academicLevel, institutionPtr, careerPtr, biografiaPtr,
		profilePhotoURL, institutionalLogoURL, conferenceName,
		suggestedDatePtr, suggestedTimePtr, audienceCapacityPtr, phonePtr, socialMediaPtr, acceptedTerms, venueIDPtr,
	).Scan(
		&createdSpeaker.ID, &createdSpeaker.FullName, &createdSpeaker.AcademicLevel,
		&createdSpeaker.Institution, &createdSpeaker.Career, &createdSpeaker.Biografia,
		&createdSpeaker.ProfilePhotoURL, &createdSpeaker.InstitutionalLogoURL,
		&createdSpeaker.ConferenceName, &createdSpeaker.SuggestedDate,
		&createdSpeaker.SuggestedTime, &createdSpeaker.AudienceCapacity,
		&createdSpeaker.Phone, &createdSpeaker.SocialMedia,
		&createdSpeaker.AcceptedTerms, &createdSpeaker.VenueID, &createdSpeaker.CreatedAt, &createdSpeaker.UpdatedAt,
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
	suggestedTime := c.PostForm("suggested_time")
	audienceCapacityStr := c.PostForm("audience_capacity")
	phone := c.PostForm("phone")
	socialMedia := c.PostForm("social_media")
	venueIDStr := c.PostForm("venue_id")

	query := "UPDATE speakers SET updated_at = NOW()"
	args := []interface{}{}
	argNum := 1

	if fullName != "" {
		query += fmt.Sprintf(", full_name = $%d", argNum)
		args = append(args, fullName)
		argNum++
	}
	if academicLevel != "" {
		if !isValidAcademicLevel(academicLevel) {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Nivel academico invalido"})
			return
		}
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
		if err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Fecha invalida. Usa formato YYYY-MM-DD"})
			return
		}
		query += fmt.Sprintf(", suggested_date = $%d", argNum)
		args = append(args, parsedDate)
		argNum++
	}
	if suggestedTime != "" {
		if !isValidSessionTime(suggestedTime) {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Hora invalida. Usa formato HH:MM"})
			return
		}
		query += fmt.Sprintf(", suggested_time = $%d", argNum)
		args = append(args, suggestedTime)
		argNum++
	}
	if audienceCapacityStr != "" {
		capacity, err := strconv.Atoi(audienceCapacityStr)
		if err != nil || capacity <= 0 {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "El cupo debe ser un numero mayor a cero"})
			return
		}
		query += fmt.Sprintf(", audience_capacity = $%d", argNum)
		args = append(args, capacity)
		argNum++
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
	
	if venueIDStr != "" {
		if venueIDStr == "null" {
			query += ", venue_id = NULL"
		} else if vID, err := strconv.Atoi(venueIDStr); err == nil {
			if !h.venueExists(vID) {
				c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Recinto invalido"})
				return
			}
			query += fmt.Sprintf(", venue_id = $%d", argNum)
			args = append(args, vID)
			argNum++
		} else {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Recinto invalido"})
			return
		}
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
		          suggested_date, suggested_time, audience_capacity, phone, social_media,
		          accepted_terms, venue_id, created_at, updated_at`, argNum)
	args = append(args, id)

	var speaker models.Speaker
	err := h.db.QueryRow(query, args...).Scan(
		&speaker.ID, &speaker.FullName, &speaker.AcademicLevel,
		&speaker.Institution, &speaker.Career, &speaker.Biografia,
		&speaker.ProfilePhotoURL, &speaker.InstitutionalLogoURL,
		&speaker.ConferenceName, &speaker.SuggestedDate,
		&speaker.SuggestedTime,
		&speaker.AudienceCapacity, &speaker.Phone, &speaker.SocialMedia,
		&speaker.AcceptedTerms, &speaker.VenueID, &speaker.CreatedAt, &speaker.UpdatedAt,
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
