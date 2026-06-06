package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jornada-academica/backend/internal/models"
)

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Obtener token del header Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Message: "Token no proporcionado",
			})
			c.Abort()
			return
		}

		// Extraer el token del formato "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Message: "Formato de token inválido",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Verificar y parsear el token
		token, err := jwt.ParseWithClaims(tokenString, jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("método de firma inesperado: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Message: "Token inválido",
			})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Message: "Claims inválidos",
			})
			c.Abort()
			return
		}

		// Convertir claims a JWTClaims
		userClaims := &models.JWTClaims{
			ID:    int(claims["id"].(float64)),
			Email: claims["email"].(string),
			Role:  claims["role"].(string),
		}

		// Guardar claims en el contexto
		c.Set("user", userClaims)
		c.Next()
	}
}

// RequireRole middleware para verificar que el usuario tiene un rol específico
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userInterface, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Message: "Usuario no autenticado",
			})
			c.Abort()
			return
		}

		user := userInterface.(*models.JWTClaims)

		// Verificar si el rol del usuario está en la lista de roles permitidos
		hasRole := false
		for _, role := range roles {
			if user.Role == role {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, models.ErrorResponse{
				Message: "Acceso denegado",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
