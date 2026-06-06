-- Crear tabla de estudiantes cargados por el administrador
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    matricula VARCHAR(32) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    career VARCHAR(255) NOT NULL,
    user_id INTEGER UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_students_matricula ON students(matricula);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- Ejemplo de carga manual por parte del administrador:
-- INSERT INTO students (matricula, first_name, last_name, career)
-- VALUES ('13220030', 'Cristofer', 'Piña Rodríguez', 'Ingeniería en Sistemas');