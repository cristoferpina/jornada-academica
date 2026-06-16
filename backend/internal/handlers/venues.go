package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jornada-academica/backend/internal/models"
	"github.com/lib/pq"
)

type VenueHandler struct {
	db *sql.DB
}

func NewVenueHandler(db *sql.DB) *VenueHandler {
	return &VenueHandler{db: db}
}

// GetVenues obtiene todos los recintos
func (h *VenueHandler) GetVenues(c *gin.Context) {
	rows, err := h.db.Query("SELECT id, name, type, building, floor, capacity, status, amenities, observations, image_url, created_at, updated_at FROM venues ORDER BY id DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar recintos"})
		return
	}
	defer rows.Close()

	venues := []models.Venue{}
	for rows.Next() {
		var v models.Venue
		var amenities pq.StringArray
		err := rows.Scan(&v.ID, &v.Name, &v.Type, &v.Building, &v.Floor, &v.Capacity, &v.Status, &amenities, &v.Observations, &v.ImageURL, &v.CreatedAt, &v.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al escanear recinto"})
			return
		}
		v.Amenities = []string(amenities)
		venues = append(venues, v)
	}

	c.JSON(http.StatusOK, venues)
}

// CreateVenue crea un nuevo recinto
func (h *VenueHandler) CreateVenue(c *gin.Context) {
	name := c.PostForm("name")
	vType := c.PostForm("type")
	building := c.PostForm("building")
	floor := c.PostForm("floor")
	capacityStr := c.PostForm("capacity")
	status := c.PostForm("status")
	amenities := c.PostFormArray("amenities")
	observations := c.PostForm("observations")

	var capacity *int
	if capacityStr != "" {
		capVal, _ := strconv.Atoi(capacityStr)
		capacity = &capVal
	}

	// Manejo de imagen
	var imageURL *string
	file, err := c.FormFile("image")
	if err == nil {
		filename := fmt.Sprintf("venue-%d%s", time.Now().UnixNano(), filepath.Ext(file.Filename))
		path := filepath.Join("uploads", filename)
		if err := c.SaveUploadedFile(file, path); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar imagen"})
			return
		}
		url := "/uploads/" + filename
		imageURL = &url
	}

	var id int
	err = h.db.QueryRow(
		"INSERT INTO venues (name, type, building, floor, capacity, status, amenities, observations, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
		name, vType, building, floor, capacity, status, pq.Array(amenities), observations, imageURL,
	).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear recinto: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Recinto creado correctamente"})
}

// UpdateVenue actualiza un recinto existente
func (h *VenueHandler) UpdateVenue(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	name := c.PostForm("name")
	vType := c.PostForm("type")
	building := c.PostForm("building")
	floor := c.PostForm("floor")
	capacityStr := c.PostForm("capacity")
	status := c.PostForm("status")
	amenities := c.PostFormArray("amenities")
	observations := c.PostForm("observations")

	var capacity *int
	if capacityStr != "" {
		capVal, _ := strconv.Atoi(capacityStr)
		capacity = &capVal
	}

	// Manejo de imagen (opcional)
	var imageURL *string
	file, err := c.FormFile("image")
	if err == nil {
		filename := fmt.Sprintf("venue-%d%s", time.Now().UnixNano(), filepath.Ext(file.Filename))
		path := filepath.Join("uploads", filename)
		if err := c.SaveUploadedFile(file, path); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar imagen"})
			return
		}
		url := "/uploads/" + filename
		imageURL = &url
	}

	query := "UPDATE venues SET name=$1, type=$2, building=$3, floor=$4, capacity=$5, status=$6, amenities=$7, observations=$8, updated_at=NOW()"
	args := []interface{}{name, vType, building, floor, capacity, status, pq.Array(amenities), observations}

	if imageURL != nil {
		query += ", image_url=$9 WHERE id=$10"
		args = append(args, *imageURL, id)
	} else {
		query += " WHERE id=$9"
		args = append(args, id)
	}

	_, err = h.db.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar recinto: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Recinto actualizado correctamente"})
}

// DeleteVenue elimina un recinto
func (h *VenueHandler) DeleteVenue(c *gin.Context) {
	id := c.Param("id")

	// Opcional: Borrar archivo físico de imagen
	var imageURL sql.NullString
	h.db.QueryRow("SELECT image_url FROM venues WHERE id = $1", id).Scan(&imageURL)
	if imageURL.Valid && imageURL.String != "" {
		path := filepath.Join(".", strings.TrimPrefix(imageURL.String, "/"))
		os.Remove(path)
	}

	_, err := h.db.Exec("DELETE FROM venues WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar recinto"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Recinto eliminado correctamente"})
}
