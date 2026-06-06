-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'speaker', 'attendee')),
    recovery_question TEXT,
    recovery_answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insertar un usuario admin de prueba (contraseña: admin123)
-- La contraseña debe ser hasheada con bcrypt en la aplicación
-- Para pruebas iniciales, usa bcrypt.hash('admin123') desde Node.js
