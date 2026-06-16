package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jornada-academica/backend/internal/models"
)

type ContestHandler struct {
	db *sql.DB
}

func NewContestHandler(db *sql.DB) *ContestHandler {
	return &ContestHandler{db: db}
}

func (h *ContestHandler) CreateContest(c *gin.Context) {
	var req models.Contest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Datos inválidos", Error: err.Error()})
		return
	}

	err := h.db.QueryRow(
		"INSERT INTO contests (name, category, status, date) VALUES ($1, $2, $3, $4) RETURNING id, created_at",
		req.Name, req.Category, "Planificado", req.Date,
	).Scan(&req.ID, &req.CreatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al crear certamen", Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *ContestHandler) GetContests(c *gin.Context) {
	rows, err := h.db.Query("SELECT id, name, category, status, date, created_at FROM contests ORDER BY date ASC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al obtener certámenes", Error: err.Error()})
		return
	}
	defer rows.Close()

	var contests []models.Contest
	for rows.Next() {
		var ct models.Contest
		if err := rows.Scan(&ct.ID, &ct.Name, &ct.Category, &ct.Status, &ct.Date, &ct.CreatedAt); err != nil {
			continue
		}
		contests = append(contests, ct)
	}

	if contests == nil {
		contests = []models.Contest{}
	}

	c.JSON(http.StatusOK, contests)
}

func (h *ContestHandler) RegisterToContest(c *gin.Context) {
	var req struct {
		ContestID        int    `json:"contest_id" binding:"required"`
		Student1ID       int    `json:"student1_id" binding:"required"`
		Student2ID       *int   `json:"student2_id"`
		ArtisticActivity string `json:"artistic_activity"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Datos inválidos", Error: err.Error()})
		return
	}

	var id int
	err := h.db.QueryRow(
		"INSERT INTO contest_registrations (contest_id, student1_id, student2_id, artistic_activity) VALUES ($1, $2, $3, $4) RETURNING id",
		req.ContestID, req.Student1ID, req.Student2ID, req.ArtisticActivity,
	).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al registrar participación", Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Inscripción exitosa"})
}

func (h *ContestHandler) GetContestRegistrations(c *gin.Context) {
	contestID, _ := strconv.Atoi(c.Param("id"))
	if contestID == 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "ID de certamen inválido"})
		return
	}

	query := `
		SELECT 
			r.id, r.contest_id, r.artistic_activity, r.created_at,
			s1.id, s1.matricula, s1.first_name, s1.last_name, s1.career,
			s2.id, s2.matricula, s2.first_name, s2.last_name, s2.career
		FROM contest_registrations r
		JOIN students s1 ON r.student1_id = s1.id
		LEFT JOIN students s2 ON r.student2_id = s2.id
		WHERE r.contest_id = $1
	`
	rows, err := h.db.Query(query, contestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al obtener inscripciones", Error: err.Error()})
		return
	}
	defer rows.Close()

	var registrations []models.ContestRegistration
	for rows.Next() {
		var r models.ContestRegistration
		var s1 models.Student
		var s2ID sql.NullInt64
		var s2Mat, s2Fn, s2Ln, s2Car sql.NullString

		err := rows.Scan(
			&r.ID, &r.ContestID, &r.ArtisticActivity, &r.CreatedAt,
			&s1.ID, &s1.Matricula, &s1.FirstName, &s1.LastName, &s1.Career,
			&s2ID, &s2Mat, &s2Fn, &s2Ln, &s2Car,
		)
		if err != nil {
			continue
		}

		r.Student1 = &s1
		if s2ID.Valid {
			id := int(s2ID.Int64)
			r.Student2ID = &id
			r.Student2 = &models.Student{
				ID:        id,
				Matricula: s2Mat.String,
				FirstName: s2Fn.String,
				LastName:  s2Ln.String,
				Career:    s2Car.String,
			}
		}

		registrations = append(registrations, r)
	}

	if registrations == nil {
		registrations = []models.ContestRegistration{}
	}

	c.JSON(http.StatusOK, registrations)
}

func (h *ContestHandler) DeleteRegistration(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("regId"))
	if id == 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "ID de inscripción inválido"})
		return
	}

	_, err := h.db.Exec("DELETE FROM contest_registrations WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al eliminar inscripción", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Inscripción eliminada"})
}

func (h *ContestHandler) DeleteContest(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if id == 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "ID de certamen inválido"})
		return
	}

	// Evitar que se elimine el certamen permanente
	var name string
	err := h.db.QueryRow("SELECT name FROM contests WHERE id = $1", id).Scan(&name)
	if err == nil && name == "Señorita y Joven UES" {
		c.JSON(http.StatusForbidden, models.ErrorResponse{Message: "No se puede eliminar el certamen permanente"})
		return
	}

	_, err = h.db.Exec("DELETE FROM contests WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al eliminar certamen", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Certamen eliminado correctamente"})
}
