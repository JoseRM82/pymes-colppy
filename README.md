## Stack elegido

React + Vite + NestJS + TypeScript + SQLite + Prisma + Recharts con opción de migrar a una DB diferente para producción (como PostgreSQL)

## Requisitos

- Node.js 20+
- npm

## Cómo correrlo

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

API en `http://localhost:3000/api`

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

UI en `http://localhost:5173`

La base SQLite se crea automáticamente en `backend/prisma/dev.db`.

### Datos iniciales

La app arranca con la base vacía. Se sube los CSV de ejemplo desde **Subir ventas** (carpeta `ventas/` u otros csv que se puedan usar).

## Tests

```bash
cd backend && npm test
cd frontend && npm test
```

## Decisiones

- **Idempotencia:** se rechazan `id_venta` duplicados (no upsert silencioso).
- **Validación doble capa:** el front pre-filtra CSV; el back re-valida cada fila.
- **Campo `moneda` opcional:** default `$` si no viene en formulario o CSV.
- **Consolidado:** endpoints separados para gráfico mensual/anual y detalle por mes/cliente.
- **Edición inline:** update local en éxito; refetch global solo tras cargas.

## Priorizado

1. Carga individual + CSV con CSVs de corrección/rechazo  
2. Consolidado + gráfico mensual/anual  
3. Tabla mensual con total del mes en cabecera  
4. Modal por cliente  
5. Edición inline  

## Dejado afuera a propósito

- Autenticación  
- Seed automático  
- Docker  
- Tests E2E  
- PostgreSQL en producción (migración trivial vía Prisma)  

## Límites CSV (UI)

- 5 MB  
- 10.000 filas  
- Fecha ≤ hoy (timezone del navegador)  
- Decimales con punto (`.`)  

## Performance

Con muchos registros, el consolidado usa `GROUP BY` con índice en `fecha`. El modal de cliente pagina de a 20. Se puede medir con logs en el service y `EXPLAIN` en SQLite.

## Resetear datos

Borrar `backend/prisma/dev.db` y ejecutar `npx prisma migrate dev` desde `backend/`.

Útil si se quiere volver a importar los CSV de ejemplo: la app rechaza `id_venta` duplicados, así que re-subir los mismos archivos generará el CSV de "ya existentes" sin importar nada nuevo.
