package handlers

import (
	"database/sql"
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/jornada-academica/backend/internal/models"
)

// RegisterForSpeaker maneja la inscripción de un alumno a una conferencia
func (h *SpeakerHandler) RegisterForSpeaker(c *gin.Context) {
	speakerID := c.Param("id")
	
	userInterface, _ := c.Get("user")
	claims := userInterface.(*models.JWTClaims)

	// 1. Buscar el ID del estudiante asociado al usuario y calcular su prioridad
	var studentID int
	err := h.db.QueryRow(`
		SELECT s.id
		FROM students s
		WHERE s.user_id = $1
	`, claims.ID).Scan(&studentID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Message: "No tienes un perfil de estudiante asociado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al buscar perfil de estudiante", Error: err.Error()})
		return
	}

	// 2. Verificar si ya está inscrito
	var existsReg bool
	err = h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM speaker_registrations WHERE speaker_id = $1 AND student_id = $2)", speakerID, studentID).Scan(&existsReg)
	if existsReg {
		c.JSON(http.StatusConflict, models.ErrorResponse{Message: "Ya estás inscrito en esta conferencia"})
		return
	}

	// 3. Verificar capacidad y calcular estatus (confirmed vs waitlist)
	var capacity int
	var registeredCount int
	err = h.db.QueryRow(`
		SELECT COALESCE(s.audience_capacity, v.capacity, 0),
		       (SELECT COUNT(*) FROM speaker_registrations WHERE speaker_id = $1 AND status = 'confirmed')
		FROM speakers s
		LEFT JOIN venues v ON s.venue_id = v.id
		WHERE s.id = $1
	`, speakerID).Scan(&capacity, &registeredCount)
	
	status := "confirmed"
	if capacity > 0 && registeredCount >= capacity {
		status = "waitlist"
	}

	// 4. Insertar inscripción
	_, err = h.db.Exec(`
		INSERT INTO speaker_registrations (speaker_id, student_id, status)
		VALUES ($1, $2, $3)
	`, speakerID, studentID, status)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al procesar inscripción", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Inscripción procesada exitosamente",
		"status": status,
	})
}

// UnregisterFromSpeaker permite al alumno marcar que no participara en una sesion.
func (h *SpeakerHandler) UnregisterFromSpeaker(c *gin.Context) {
	speakerID := c.Param("id")

	userInterface, _ := c.Get("user")
	claims := userInterface.(*models.JWTClaims)

	var studentID int
	err := h.db.QueryRow(`
		SELECT id
		FROM students
		WHERE user_id = $1
	`, claims.ID).Scan(&studentID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Message: "No tienes un perfil de estudiante asociado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al buscar perfil de estudiante", Error: err.Error()})
		return
	}

	result, err := h.db.Exec(`
		DELETE FROM speaker_registrations
		WHERE speaker_id = $1 AND student_id = $2
	`, speakerID, studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al cancelar participacion", Error: err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Message: "No tenias participacion registrada en esta sesion"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Participacion cancelada correctamente"})
}

// GetStudentRegistrations obtiene las inscripciones del alumno actual
func (h *SpeakerHandler) GetStudentRegistrations(c *gin.Context) {
	userInterface, _ := c.Get("user")
	claims := userInterface.(*models.JWTClaims)

	rows, err := h.db.Query(`
		SELECT sr.id, sr.status, sr.registered_at,
		       s.id, s.full_name, s.conference_name, s.suggested_date, s.suggested_time,
		       v.name
		FROM speaker_registrations sr
		JOIN speakers s ON sr.speaker_id = s.id
		LEFT JOIN venues v ON s.venue_id = v.id
		JOIN students st ON sr.student_id = st.id
		WHERE st.user_id = $1
		ORDER BY s.suggested_date ASC, s.suggested_time ASC
	`, claims.ID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al obtener inscripciones", Error: err.Error()})
		return
	}
	defer rows.Close()

	var regs []gin.H
	for rows.Next() {
		var id int
		var status string
		var registeredAt string
		var speakerID int
		var fullName, conferenceName, venueName sql.NullString
		var date sql.NullTime
		var timeStr sql.NullString

		rows.Scan(&id, &status, &registeredAt, &speakerID, &fullName, &conferenceName, &date, &timeStr, &venueName)
		
		regs = append(regs, gin.H{
			"id": id,
			"status": status,
			"registered_at": registeredAt,
			"speaker": gin.H{
				"id": speakerID,
				"full_name": fullName.String,
				"conference_name": conferenceName.String,
				"date": date.Time,
				"time": timeStr.String,
				"venue": venueName.String,
			},
		})
	}

	if regs == nil { regs = []gin.H{} }
	c.JSON(http.StatusOK, regs)
}
