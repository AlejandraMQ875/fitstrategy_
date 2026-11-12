# FITSTRATEGY

> No gana el que más socios tiene, sino el que forja un negocio que perdura.

Simulador educativo multijugador de gestión de gimnasios para la clase de Modelado y Simulación.
**7 jugadores** (un gimnasio cada uno) + **1 administrador** compiten durante **6 rondas** (enero–junio)
por el mejor ranking **FIGE** (Fitness Gym Enterprise Index).

Gimnasios: Body Xtreme, Spazio, Energym, UFC Gym, Smash Fitness, Essential Gym, Megatlon.
Todos arrancan idénticos: Bs 800.000, 200 socios, mensualidad Bs 190, reputación y satisfacción 70, sin servicios ni colaboraciones.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express, Socket.IO, Prisma, SQLite (PostgreSQL en producción), JWT |
| Frontend | React 18 + Vite, TailwindCSS, Recharts, Socket.IO Client |
| Infra | Docker Compose, GitHub Actions, Render / Vercel |

## Estructura

```
fitstrategy/
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── index.js · socket.js · seed.js · db.js
│   │   ├── config.js          ← TODOS los parámetros calibrables del juego
│   │   ├── catalog.js         ← gimnasios, segmentos, 7 servicios, 14 colaboraciones
│   │   ├── routes/            ← auth, game, decisions, admin
│   │   └── services/
│   │       ├── simulator.js   ← motor: procesa la ronda de los 7 gimnasios en conjunto
│   │       ├── softmax.js · retention.js · collaboration.js (pujas)
│   │       ├── finance.js · ranking.js (FIGE) · validation.js · gameService.js
│   └── test/simulator.test.js
├── frontend/src/ (pages, components, GameContext, api, socket)
├── docker-compose.yml · render.yaml · .github/workflows/deploy.yml
└── docs/MANUAL.md
```

## Instalación local (desarrollo)

Requisitos: Node 20+.

```bash
# 1) Backend
cd backend
cp .env.example .env
npm install
npm run setup        # prisma generate + db push + seed
npm run dev          # http://localhost:4000

# 2) Frontend (otra terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Pruebas del motor: `cd backend && npm test`.

### Usuarios iniciales

| Rol | Usuario | Contraseña por defecto |
|---|---|---|
| Admin | `admin` | `ADMIN_PASSWORD` (admin123) |
| Jugadores | `bodyxtreme`, `spazio`, `energym`, `ufcgym`, `smash`, `essential`, `megatlon` | `PLAYER_PASSWORD` (jugador123) |

**Cambia las contraseñas y `JWT_SECRET` antes de desplegar** (variables de entorno).

## Docker

```bash
docker compose up --build
```
Frontend en http://localhost:8080 (nginx con proxy a la API y WebSocket). La base SQLite queda en un volumen y el seed se ejecuta solo la primera vez.

## Despliegue

**Opción A: todo en Render (más simple).** Conecta el repo y usa `render.yaml` (Blueprint). Sirve API + frontend compilado desde un solo servicio (`STATIC_DIR`). Configura `ADMIN_PASSWORD` y `PLAYER_PASSWORD`.
El plan gratuito de Render duerme el servicio y puede borrar el disco: para una clase usa una instancia activa o PostgreSQL.

**Opción B: Render (backend) + Vercel (frontend).**
1. Backend en Render con `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN=https://tu-app.vercel.app`, contraseñas.
2. En Vercel, carpeta `frontend`, variable `VITE_API_URL=https://tu-backend.onrender.com`.

**PostgreSQL:** en `backend/prisma/schema.prisma` cambia `provider = "sqlite"` por `"postgresql"` y define `DATABASE_URL` con tu cadena de conexión.

**GitHub Actions** (`.github/workflows/deploy.yml`): en cada push corre pruebas y build; en `main` dispara el deploy si defines los secretos `RENDER_DEPLOY_HOOK_URL` y/o `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login |
| GET | `/api/gym/me` | Estado de mi gimnasio |
| GET | `/api/round/current` | Ronda actual y estado general |
| POST | `/api/decision/:roundId` | Guardar/actualizar decisión (idempotente) |
| POST | `/api/decision/preview` | Vista previa de costos |
| GET | `/api/round/:id/results` | Resultados (solo rondas cerradas) |
| GET | `/api/ranking/:roundId` · `/api/ranking/history` | Ranking FIGE |
| GET | `/api/market` · `/api/catalog` | Mercado, colaboraciones, servicios |
| POST | `/api/admin/open-round` · `next-round` · `process-round` · `reset-game` | Control del admin |
| GET | `/api/admin/status` · `/api/admin/report?format=csv\|json` | Panel y reporte final |

Eventos Socket.IO: `round:opened`, `decision:saved`, `round:processing`, `round:closed`, `ranking:updated`, `game:finished`, `game:reset`, y `admin:force-process` (admin → servidor).

## Cómo funciona el motor (resumen)

Al procesar, `simulator.js` hace en conjunto: validar decisiones → resolver pujas → demanda Softmax por segmento → capacidad → satisfacción y retención → socios → finanzas → ranking FIGE.

- **Demanda:** `A = β1·(190−P)/190 + β2·ΔServicios + β3·ΔMáquinas + β4·ΔReputación + β5·ΔUbicación + β6·ΔColaboraciones`; `P = e^A / (Σe^A + e^A_no_ir)`; `Demanda = Población × Estacional × P`. Los atributos se miden contra el estado inicial, por eso los 7 gimnasios idénticos obtienen exactamente la misma demanda.
- **Capacidad:** `min(máquinas, instructores, vestidores, espacio)`.
- **Retención:** `0.5 + 0.3·Satisfacción + 0.1·Servicios − 0.2·Promoción`.
- **Finanzas:** `EBITDA = Ingresos − Variables − Fijos`; `Neta = EBITDA − Depreciación − Intereses`; `Caja = Caja + Neta − Inversiones + Préstamos − Pagos`. Caja < 0 → crédito de emergencia y reputación −5.
- **FIGE:** 30% rentabilidad, 25% mercado, 20% satisfacción, 15% retención, 10% innovación. Desempate: rentabilidad → retención → satisfacción → posición compartida.

### Supuestos que la especificación no fijaba (editables en `backend/src/config.js`)

- Población total de 4.000 personas (Jóvenes 35%, Adultos 25%, Atletas 25%, Corporativos 15%) y utilidad de "no ir" calibrada para que 7 gimnasios neutrales capten 200 socios cada uno.
- Capacidad por hora: máquinas 8/nivel, instructor 20, especialista 25, vestidores 30/nivel, espacio 50/nivel (coincide con los valores iniciales de la especificación). Cada unidad soporta 10 socios.
- Beneficios porcentuales de servicios y colaboraciones: multiplicadores sobre la demanda de ese segmento (tope ×1,6). La publicidad suma hasta +25% de demanda.
- Una colaboración cobra la oferta ganadora en cada ronda de su duración. Cada convenio devuelve un ingreso fijo del 40% de su costo base.
- Sauna y spa se cobran como adicional mensual (Bs 300 y Bs 450) con 15% y 10% de uso; los insumos cuestan Bs 200 por usuario.
- Rentabilidad del FIGE: utilidad acumulada ÷ Bs 800.000, escalada entre −0,5 y 2,0. Mercado: socios ÷ socios del líder.
- Pares de convenios que compiten (no combinables): UMSA / EMI / Universidad Católica, y Farmacorp / Clínica Los Olivos.
- Las pujas viajan dentro de la decisión y se resuelven al procesar. Un empate total comparte la colaboración al 50% (cada uno paga su oferta).

## Licencia

Uso académico.
