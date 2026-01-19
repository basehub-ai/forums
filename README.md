# Foros

Q&A impulsado por IA para repositorios de GitHub. Haz preguntas sobre cualquier repositorio e los agentes de IA clonarán, explorarán y buscarán en el código fuente para proporcionar respuestas respaldadas por la fuente.

**¿Necesitas ayuda?** Visita [forums.basehub.com/basehub-ai/forums](http://forums.basehub.com/basehub-ai/forums)

## Contribuciones / Desarrollo

### Requisitos Previos

- Tiempo de ejecución [Bun](https://bun.sh)
- [Vercel CLI](https://vercel.com/cli) (para descargar variables de entorno)
- Base de datos PostgreSQL
- Instancia de [Typesense](https://typesense.org)

### Configuración

1. Clona el repositorio:

```bash
git clone https://github.com/basehub-ai/forums.git
cd forums
```

2. Instala las dependencias:

```bash
bun install
```

3. Configura las variables de entorno. Vincúla a un proyecto de Vercel o crea `.env.local` manualmente:

```bash
# Opción A: Descargar desde Vercel (requiere acceso)
vc env pull .env.local

# Opción B: Crear manualmente con variables requeridas (ver sección Auto-hospedaje)
```

4. Ejecuta las migraciones de base de datos:

```bash
bun run db:generate
```

5. Inicia el servidor de desarrollo:

```bash
bun run dev
```

### Scripts

| Comando | Descripción |
|---------|-------------|
| `bun run dev` | Iniciar servidor de desarrollo |
| `bun run build` | Construir para producción |
| `bun run start` | Iniciar servidor de producción |
| `bun run test` | Ejecutar pruebas |
| `bun run lint` | Limpiar y reparar código |
| `bun run typecheck` | Verificación de tipos |
| `bun run db:generate` | Generar migraciones de base de datos |

## Auto-hospedaje

### Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL |
| `TYPESENSE_API_KEY` | Sí | Clave API de Typesense |
| `TYPESENSE_HOST` | Sí | URL de host de Typesense |
| `GITHUB_CLIENT_ID` | Sí | ID de cliente de la aplicación OAuth de GitHub |
| `GITHUB_CLIENT_SECRET` | Sí | Secreto de cliente de la aplicación OAuth de GitHub |
| `GITHUB_TOKEN` | No | Token de acceso personal de GitHub para mayores límites de velocidad de API |
| `REVALIDATE_SECRET` | No | Secreto para webhook de revalidación de caché |
| `ADMIN_USER_EMAILS` | No | Lista separada por comas de correos electrónicos de administrador |

### Desplegar en Vercel

1. Bifurca este repositorio
2. Importa a Vercel
3. Configura las variables de entorno
4. Desplega

### Despliegue Manual

1. Configura una base de datos PostgreSQL
2. Configura una instancia de Typesense
3. Crea una aplicación OAuth de GitHub
4. Configura todas las variables de entorno requeridas
5. Construir y ejecutar:

```bash
bun run build
bun run start
```
