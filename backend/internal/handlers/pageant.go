package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jornada-academica/backend/internal/models"
)

type PageantHandler struct {
	db *sql.DB
}

func NewPageantHandler(db *sql.DB) *PageantHandler {
	return &PageantHandler{db: db}
}

func (h *PageantHandler) GetCandidates(c *gin.Context) {
	query := `
		SELECT 
			p.id, p.student_id, p.partner_id, p.category, p.representative_of, p.artistic_activity, p.photo_url, p.bio, p.created_at,
			s.id, s.matricula, s.first_name, s.last_name, s.career,
			part.id, part.matricula, part.first_name, part.last_name, part.career
		FROM pageant_candidates p
		JOIN students s ON p.student_id = s.id
		LEFT JOIN students part ON p.partner_id = part.id
		ORDER BY p.category DESC, s.last_name ASC
	`
	rows, err := h.db.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al obtener candidatos", Error: err.Error()})
		return
	}
	defer rows.Close()

	var candidates []models.PageantCandidate
	for rows.Next() {
		var p models.PageantCandidate
		var s models.Student
		var partnerID sql.NullInt64
		var partID sql.NullInt64
		var partMat, partFN, partLN, partCar sql.NullString
		
		err := rows.Scan(
			&p.ID, &p.StudentID, &partnerID, &p.Category, &p.RepresentativeOf, &p.ArtisticActivity, &p.PhotoURL, &p.Bio, &p.CreatedAt,
			&s.ID, &s.Matricula, &s.FirstName, &s.LastName, &s.Career,
			&partID, &partMat, &partFN, &partLN, &partCar,
		)
		if err != nil {
			log.Printf("Error scanning pageant candidate: %v", err)
			continue
		}
		p.Student = &s
		if partID.Valid {
			id := int(partID.Int64)
			p.PartnerID = &id
			p.Partner = &models.Student{
				ID:        id,
				Matricula: partMat.String,
				FirstName: partFN.String,
				LastName:  partLN.String,
				Career:    partCar.String,
			}
		}
		candidates = append(candidates, p)
	}

	if candidates == nil {
		candidates = []models.PageantCandidate{}
	}

	c.JSON(http.StatusOK, candidates)
}

func (h *PageantHandler) RegisterCandidate(c *gin.Context) {
	var req models.PageantCandidate
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Error binding pageant candidate request: %v", err)
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Datos inválidos", Error: err.Error()})
		return
	}

	log.Printf("Registering candidate: student_id=%d, partner_id=%v, category=%s", req.StudentID, req.PartnerID, req.Category)

	err := h.db.QueryRow(
		"INSERT INTO pageant_candidates (student_id, partner_id, category, representative_of, artistic_activity, photo_url, bio) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at",
		req.StudentID, req.PartnerID, req.Category, req.RepresentativeOf, req.ArtisticActivity, req.PhotoURL, req.Bio,
	).Scan(&req.ID, &req.CreatedAt)

	if err != nil {
		log.Printf("Error inserting pageant candidate: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al registrar candidato", Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req)
}

func (h *PageantHandler) DeleteCandidate(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if id == 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "ID inválido"})
		return
	}

	_, err := h.db.Exec("DELETE FROM pageant_candidates WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Error al eliminar candidato", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Candidato eliminado correctamente"})
}
