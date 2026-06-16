package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

type SystemHandler struct {
	db         *sql.DB
	uploadsDir string
}

func NewSystemHandler(db *sql.DB, uploadsDir string) *SystemHandler {
	os.MkdirAll(uploadsDir, os.ModePerm)
	return &SystemHandler{
		db:         db,
		uploadsDir: uploadsDir,
	}
}

func (h *SystemHandler) GetSettings(c *gin.Context) {
	rows, err := h.db.Query("SELECT key, value FROM system_settings")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		settings[key] = value
	}

	c.JSON(http.StatusOK, settings)
}

func (h *SystemHandler) UpdateLogos(c *gin.Context) {
	// Manejar sidebar_logo
	sidebarFile, _ := c.FormFile("sidebar_logo")
	if sidebarFile != nil {
		path, err := h.saveFile(c, "sidebar_logo")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar sidebar_logo"})
			return
		}
		_, err = h.db.Exec("UPDATE system_settings SET value = $1 WHERE key = 'sidebar_logo'", path)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar DB"})
			return
		}
	}

	// Manejar login_logo
	loginFile, _ := c.FormFile("login_logo")
	if loginFile != nil {
		path, err := h.saveFile(c, "login_logo")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar login_logo"})
			return
		}
		_, err = h.db.Exec("UPDATE system_settings SET value = $1 WHERE key = 'login_logo'", path)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar DB"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logos actualizados correctamente"})
}

func (h *SystemHandler) saveFile(c *gin.Context, fieldName string) (string, error) {
	file, err := c.FormFile(fieldName)
	if err != nil {
		return "", err
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("system-%s-%d%s", fieldName, time.Now().UnixNano(), ext)
	dst := filepath.Join(h.uploadsDir, filename)

	if err := c.SaveUploadedFile(file, dst); err != nil {
		return "", err
	}

	return fmt.Sprintf("/uploads/%s", filename), nil
}
