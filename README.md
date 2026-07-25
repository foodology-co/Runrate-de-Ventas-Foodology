# Runrate de Ventas Foodology — dashboard standalone

Convertido desde un artefacto de Cowork. Ya no depende de `window.cowork.*`:
todo pasa por un backend propio (`server.js`).

Repo: `github.com/foodology-co/Runrate-de-Ventas-Foodology`

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
  en Render.

## 1. Subir los cambios a GitHub

Esta carpeta ya está clonada y con el remoto configurado
(`origin` → `github.com/foodology-co/Runrate-de-Ventas-Foodology.git`), así
que solo falta commitear y pushear el contenido:

```bash
cd "Runrate de Ventas Foodology"
git add .
git commit -m "App standalone: front-end + backend Express para Render"
git push origin main
```

## 2. Desplegar en Render

**Opción rápida (Blueprint):** en Render → New → Blueprint, apunta al repo.
Render lee `render.yaml` y crea el servicio solo.

**Opción manual:** New → Web Service → conectar el repo →
- Build command: `npm install`
- Start command: `npm start`

En cualquiera de los dos casos, después hay que ir a **Environment** en el
servicio y cargar los valores reales (Render no los toma de `render.yaml`
por seguridad, solo los nombres):

- `REDSHIFT_HOST`, `REDSHIFT_PORT` (5439 por defecto), `REDSHIFT_DB`,
  `REDSHIFT_USER`, `REDSHIFT_PASSWORD`.
- `ANTHROPIC_API_KEY` — opcional, solo si quieren que funcione el tab de
  chat/resúmenes con IA.

Redshift normalmente vive en una VPC privada — si Render no puede alcanzarlo
por IP pública, van a necesitar abrir el security group al rango de salida
de Render o usar un túnel/proxy.

⚠️ **Las credenciales van solo en Environment de Render (o en GitHub → repo →
Settings → Secrets, si las usa un GitHub Action), nunca committeadas en el
repo.** Si en algún momento un `.env` con valores reales quedó en un commit,
hay que rotar esas credenciales y limpiar el historial (`git filter-repo` /
BFG), no basta con borrar el archivo en un commit nuevo — sobre todo siendo
este un repo público.

## 3. Editar después con Claude Code

Con el repo clonado, Claude Code puede tocar tanto `public/index.html`
(front-end) como `server.js` (backend) como cualquier archivo normal del
proyecto — no hay nada especial que configurar.
