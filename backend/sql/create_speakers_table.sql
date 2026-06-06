-- Crear tabla de ponentes
CREATE TABLE speakers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  academic_level VARCHAR(50) NOT NULL CHECK (academic_level IN ('Doctorado', 'Maestría', 'Licenciatura')),
  institution VARCHAR(255),
  career VARCHAR(255),
  profile_photo_url TEXT,
  institutional_logo_url TEXT,
  conference_name VARCHAR(255) NOT NULL,
  suggested_date DATE,
  audience_capacity INTEGER,
  phone VARCHAR(20),
  social_media VARCHAR(255),
  accepted_terms BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_speakers_full_name ON speakers(full_name);
CREATE INDEX idx_speakers_created_at ON speakers(created_at);
