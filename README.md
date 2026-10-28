<div align="center">

# 🗓️ Jornada académica

Proyecto organizado en frontend y backend, con recursos de base de datos y documentación de pruebas.

**React · Vite · Docker**

[Explorar código](https://github.com/cristoferpina/jornada-academica) · [Reportar un problema](https://github.com/cristoferpina/jornada-academica/issues)

</div>

---

## Explorar el proyecto

| Ruta | Contenido |
| --- | --- |
| [frontend/](frontend/) | Interfaz React con Vite |
| [backend/](backend/) | Código del servidor |
| [docker-compose.yml](docker-compose.yml) | Configuración de servicios |
| [Plan_de_Pruebas_Jornada_Academica.docx](Plan_de_Pruebas_Jornada_Academica.docx) | Plan de pruebas |

## Iniciar el frontend

Requiere Node.js y npm compatibles con [frontend/package.json](frontend/package.json).

```bash
git clone https://github.com/cristoferpina/jornada-academica.git
cd jornada-academica/frontend
npm install
npm run dev
```

Abre la dirección que muestre Vite. Para utilizar las funciones conectadas al servidor, revisa la configuración del backend y de la base de datos.

## Comandos del frontend

| Comando | Acción |
| --- | --- |
| `npm run dev` | Desarrollo local |
| `npm run build` | Compilar |
| `npm run preview` | Revisar la compilación |
| `npm run lint` | Revisar el código |
