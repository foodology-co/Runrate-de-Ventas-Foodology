# Runrate Mexico Live — dashboard standalone

Convertido desde un artefacto de Cowork. Ya no depende de `window.cowork.*`:
todo pasa por un backend propio (`server.js`) que este ZIP incluye.

## Qué cambió respecto al artefacto original

- `public/index.html`: el front-end. Las funciones `callSQL()` y `askClaude()`
  ahora hacen `fetch()` a `/api/query` y `/api/ask-claude` en vez de llamar a
  `window.cowork.callMcpTool` / `window.cowork.askClaude`.
- `server.js`: backend Express con dos endpoints:
  - `POST /api/query` — recibe `{ sql }`, valida que sea un SELECT/CTE-SELECT
    de una sola sentencia (misma restricción que tenía el conector de
    Cowork), lo corre contra Redshift con `pg`, y devuelve `{ columns, rows }`.
  - `POST /api/ask-claude` — recibe `{ prompt }` y le pega a la API de
    Anthropic (para el tab de chat y los resúmenes con IA). Si no se
    configura `ANTHROPIC_API_KEY`, el resto del dashboard funciona igual,
    solo el chat muestra un error.
- `render.yaml`, `package.json`, `.gitignore`, `.env.example` — para desplegar
  en Render como Blueprint.

## 1. Subir a GitHub

```bash
cd runrate-mexico-live   # esta carpeta descomprimida
git init
git add .
git commit -m "Runrate Mexico Live standalone"
git branch -M main
git remote add origin <URL_DEL_REPO_DE_DASHBOARDS>
git push -u origin main
```

Si va dentro de un repo de dashboards ya existente (varios dashboards en el
mismo repo), copia el contenido de esta carpeta a una subcarpeta propia
(ej. `runrate-mexico-live/`) en vez de a la raíz, y ajusta `rootDir` en
Render (paso 2) a esa ruta.

## 2. Desplegar en Render

**Opción rápida (Blueprint):** en Render → New → Blueprint, apunta al repo.
Render lee `render.yaml` y crea el servicio solo. Si el proyecto vive en una
subcarpeta del repo, agrega `rootDir: nombre-carpeta` dentro de `render.yaml`.

**Opción manual:** New → Web Service → conectar el repo →
- Build command: `npm install`
- Start command: `npm start`

En cualquiera de los dos casos, después hay que ir a **Environment** en el
servicio y cargar los valores reales (Render no los toma de `render.yaml`
por seguridad, solo los nombres):

- `REDSHIFT_HOST`, `REDSHIFT_PORT` (5439 por defecto), `REDSHIFT_DB`,
  `REDSHIFT_USER`, `REDSHIFT_PASSWORD` — pídelos al equipo de datos/IT (yo
  solo tengo acceso al warehouse a través del conector MCP, no a las
  credenciales crudas).
- `ANTHROPIC_API_KEY` — opcional, solo si quieren que funcione el tab de
  chat/resúmenes con IA.

Redshift normalmente vive en una VPC privada — si Render no puede alcanzarlo
por IP pública, van a necesitar abrir el security group al rango de salida
de Render o usar un túnel/proxy (pregúntenle a IT).

## 3. Editar después con Claude Code

Con el repo clonado, Claude Code puede tocar tanto `public/index.html`
(front-end) como `server.js` (backend) como cualquier archivo normal del
proyecto — no hay nada especial que configurar.
