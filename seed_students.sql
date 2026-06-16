INSERT INTO students (matricula, first_name, last_name, career) VALUES
('13220045', 'DANIEL', 'BENITEZ', 'Ingeniería en Sistemas Computacionales'),
('13220003', 'RODOLFO', 'CRUZ IBARRA', 'Ingeniería en Sistemas Computacionales'),
('13220042', 'JUAN EDUARDO', 'FUENTES CRUZ', 'Ingeniería en Sistemas Computacionales'),
('13220063', 'MARCO ANTONIO', 'GARCIA CRUZ', 'Ingeniería en Sistemas Computacionales'),
('13220011', 'SOFIA', 'GARCIA CRUZ', 'Ingeniería en Sistemas Computacionales'),
('13220014', 'JESUS', 'MARTINEZ NARCISO', 'Ingeniería en Sistemas Computacionales'),
('13220024', 'JESUS ANDRES', 'MONDRAGON TENORIO', 'Ingeniería en Sistemas Computacionales'),
('13220038', 'LIZETH', 'MORENO PIÑA', 'Ingeniería en Sistemas Computacionales'),
('13220056', 'MAURICIO', 'NOLAZCO LONJINO', 'Ingeniería en Sistemas Computacionales'),
('13220001', 'MIGUEL ANGEL', 'PASCUAL MARTINEZ', 'Ingeniería en Sistemas Computacionales'),
('13220040', 'IVAN', 'POSADAS REYES', 'Ingeniería en Sistemas Computacionales'),
('13220009', 'ALEJANDRO', 'SANCHEZ GARCIA', 'Ingeniería en Sistemas Computacionales'),
('13220021', 'MAURICIO', 'SANCHEZ GARCIA', 'Ingeniería en Sistemas Computacionales'),
('13220064', 'ENRIQUE', 'SANCHEZ RAMIREZ', 'Ingeniería en Sistemas Computacionales'),
('13220018', 'ALAN FERNANDO', 'SANCHEZ ROMERO', 'Ingeniería en Sistemas Computacionales'),
('13220035', 'LUIS ANTONIO', 'SANCHEZ SANCHEZ', 'Ingeniería en Sistemas Computacionales')
ON CONFLICT (matricula) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    career = EXCLUDED.career,
    updated_at = NOW();
