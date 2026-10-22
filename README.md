# FinRuta Inteligente — MVP

> **v0.2.1 — hardening**: trigger de alta forzado a `asesor`, autorización
> transaccional vía RPC, bloqueo de usuarios inactivos, importación con
> detalle fila-por-fila, rutas en MODO DEMO permanente hasta implementar
> geolocalización real, botones pendientes marcados visualmente.



Sistema de administración de **créditos, cobranza, expedientes y rutas** para una financiera que coloca crédito a negocios con flujo de efectivo diario (tiendas, tortillerías, papelerías, ferreterías, cremerías…).

> **Objetivo:** demostrar la operación completa al gerente con datos ficticios. Después se integra la cartera real con autorización de la financiera y controles de seguridad.

---

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (tema oscuro, acentos cian/verde)
- **Supabase** (PostgreSQL + Auth + Storage privado + RLS)
- **Zod** para validación cliente↔servidor compartida
- **xlsx** para importación de .xlsx / .xls / .csv
- **Vitest** para pruebas de reglas de negocio

---

## Qué está implementado (Fase 2)

| Módulo                     | Estado                                                                 |
| -------------------------- | ---------------------------------------------------------------------- |
| Autenticación              | ✅ Email + password con Supabase Auth; cookies seguras; middleware     |
| Roles Gerente / Asesor     | ✅ Resueltos server-side + enforced por **RLS** en PostgreSQL          |
| Tablero gerencial          | ✅ KPIs y desempeño por asesor, calculados desde la DB                 |
| Clientes y cartera         | ✅ Lista real desde `clientes` con RLS                                  |
| Expediente del cliente     | ✅ Vista con historial de créditos, solicitudes y documentos           |
| Solicitudes                | ✅ Lista; muestra reglas vigentes y pendientes                          |
| Semáforo de autorización   | ✅ Bandeja + decisión **gris → naranja → verde/rojo** (sólo gerente)    |
| Historial de autorizaciones| ✅ Tabla `autorizaciones` conserva estado anterior, monto, decisor      |
| Créditos y renovaciones    | ✅ Simulador en vivo (bruto − tarifa = neto); respeta política         |
| Cobranza                   | ✅ Registro + conciliación por gerente; separa "reportado" vs oficial  |
| Rutas y visitas            | ⚠ Modo DEMO si no hay API key de mapas; UI y tabla reales              |
| Metas y comisiones         | ✅ Vista con porcentajes; comisiones marcadas como "pendiente"         |
| Reportes y auditoría       | ✅ Tiles + bitácora real desde `auditoria`                              |
| Importación de cartera     | ✅ xlsx/xls/csv real, preview, duplicados, asignación por correo       |
| Usuarios y roles           | ✅ Admin de usuarios (gerente)                                          |
| Configuración              | ✅ Lectura de reglas; detección de integraciones conectadas            |
| Pruebas automatizadas      | ✅ Reglas de crédito (vitest)                                          |

**Reglas de negocio ya codificadas:**

- Cliente nuevo: mínimo **$7,000**, máximo **$10,000** MXN (validado client + server).
- Renovación: propone +$3,000 sobre el crédito anterior. **Nunca** se autoriza si hay saldo pendiente.
- Tarifa de renovación: **pendiente**; el sistema la deja en blanco hasta que la financiera la confirme.
- Comisiones: no se fijan porcentajes por defecto; se marcan como pendientes.
- Autorización final: siempre el **gerente**, con registro de quién/cuándo/monto.

---

## Lo que NO está implementado (pendiente consciente)

- Formulario de alta/edición de cliente (UI; API y RLS listas).
- Formulario de prevaluación en 11 campos (los datos ya se leen en Autorización).
- Carga de documentos a Supabase Storage (bucket privado) — el metadata sí.
- Reportes detallados por tipo (están los tiles).
- Reglas de comisión configurables (JSON ya está en la tabla `configuracion`).
- Aviso de privacidad definitivo (lo redacta la financiera / asesor legal).
- Rutas reales con geocodificación — requiere API key de Mapbox o Google Maps en el servidor.

---

## Requisitos

- **Node.js** 18.17 o superior
- Cuenta en **Supabase** (gratuita sirve para el MVP)
- Windows / macOS / Linux

---

## Instalación local (Windows)

```powershell
# 1. Entra a la carpeta del proyecto
cd finruta-inteligente\app

# 2. Instala dependencias
npm install

# 3. Copia el archivo de variables
copy .env.example .env.local

# 4. (Edita .env.local y pega tus llaves de Supabase — ver abajo)

# 5. Arranca en modo desarrollo
npm run dev
```

Abre http://localhost:3000.

---

## Instalación local (macOS / Linux)

```bash
cd finruta-inteligente/app
npm install
cp .env.example .env.local
# editar .env.local
npm run dev
```

---

## Configurar Supabase

1. Crea un proyecto nuevo en https://app.supabase.com
2. Ve a **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` *(sólo en el servidor; nunca en código del cliente)*
3. Pega estos valores en tu archivo `.env.local`.
4. Ve a **SQL Editor** y ejecuta en orden:
   - `supabase/migrations/20261021_000_schema.sql`
   - `supabase/migrations/20261021_001_rls.sql`
   - `supabase/migrations/20261021_002_seed.sql`
5. Ve a **Authentication → Users** y crea las cuentas:
   - `gerente@finruta.mx` — luego en SQL Editor:
     ```sql
     update public.usuarios set rol = 'gerente' where correo = 'gerente@finruta.mx';
     ```
   - `ana@finruta.mx`, `luis@finruta.mx`, `marco@finruta.mx`, `sofia@finruta.mx` — quedan como asesores por defecto.
6. (Opcional) Crea un **bucket privado** llamado `expedientes` para documentos:
   - **Storage → New bucket → Private**
   - Añade policy: `authenticated users can select/insert/delete their own folder`

> ⚠ **Nunca** pegues tus llaves de Supabase en el chat, en el repositorio ni en código del navegador. Van en `.env.local` o en las variables de entorno de Vercel.

---

## Configurar el proveedor de mapas (opcional)

Hasta que configures uno, el módulo **Rutas y visitas** muestra un mapa demo claramente etiquetado.

**Mapbox (recomendado):**

1. Crea cuenta en https://mapbox.com
2. Copia tu `Access Token`
3. Agrégalo a `.env.local`:
   ```
   MAPBOX_ACCESS_TOKEN=pk.ey...
   ```

**Google Maps:**

```
GOOGLE_MAPS_API_KEY=AIza...
```

Reinicia `npm run dev`. El banner "MODO DEMO" desaparecerá.

---

## Deploy en Vercel

```bash
# Desde la carpeta app/
npx vercel
```

En el dashboard de Vercel, agrega todas las variables de entorno de `.env.example` en **Project Settings → Environment Variables**.

---

## Pruebas

```bash
npm run test
```

Cubre:
- Validación de montos para cliente nuevo (mínimo/máximo)
- Validación de renovación (saldo pendiente, límite máximo)
- Cálculo del simulador de renovación (bruto − tarifa = neto)

Para type-check completo:

```bash
npm run typecheck
```

---

## Credenciales y configuraciones faltantes

Esto es lo que necesitas conseguir para pasar de MVP a producción:

| Qué falta                              | Dónde se configura                              |
| -------------------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `.env.local` y Vercel                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | `.env.local` y Vercel                            |
| `SUPABASE_SERVICE_ROLE_KEY`            | `.env.local` y Vercel (solo server)              |
| `MAPBOX_ACCESS_TOKEN` o Google Maps    | `.env.local` y Vercel (para rutas reales)        |
| **Tarifa de renovación**               | tabla `configuracion` (una vez confirmada)       |
| **Límite máximo de renovación**        | tabla `configuracion`                            |
| **Regla de comisión (%)**              | tabla `configuracion.regla_comision_json`        |
| **Aviso de privacidad definitivo**     | tabla `configuracion.aviso_privacidad_md`        |
| Correos reales de los 4 asesores       | Supabase Auth + update `usuarios.rol`            |

---

## Arquitectura

```
app/
├── src/
│   ├── app/
│   │   ├── (auth)/login/       # pantalla de ingreso
│   │   ├── (app)/              # app autenticada (layout con sidebar + topbar)
│   │   │   ├── dashboard/
│   │   │   ├── clientes/
│   │   │   ├── expedientes/[id]/
│   │   │   ├── solicitudes/
│   │   │   ├── autorizacion/
│   │   │   ├── creditos/
│   │   │   ├── cobranza/
│   │   │   ├── rutas/
│   │   │   ├── comisiones/
│   │   │   ├── reportes/
│   │   │   ├── importaciones/
│   │   │   ├── usuarios/
│   │   │   └── configuracion/
│   │   └── api/
│   │       ├── autorizacion/        # POST — gerente autoriza/rechaza
│   │       ├── pagos/conciliar/     # POST — gerente concilia pago
│   │       └── importar/            # POST — gerente importa cartera
│   ├── components/
│   │   ├── layout/        # sidebar, topbar
│   │   ├── ui/            # chip, kpi, banner, empty
│   │   ├── autorizacion/  # formulario interactivo
│   │   ├── cobranza/      # botón conciliar
│   │   ├── creditos/      # simulador de renovación
│   │   └── importaciones/ # UI de importación con xlsx
│   ├── lib/
│   │   ├── supabase/      # client / server / middleware
│   │   ├── auth/          # getCurrentUser, requireGerente
│   │   ├── validations/   # schemas Zod
│   │   ├── config/        # reglas-credito.ts + test
│   │   └── utils/         # format (centavos), semaforo, cn
│   └── types/database.ts  # tipos manuales (regénera con supabase gen types)
├── supabase/migrations/
│   ├── 20261021_000_schema.sql
│   ├── 20261021_001_rls.sql
│   └── 20261021_002_seed.sql
├── public/plantilla-cartera-finruta.csv
└── middleware.ts
```

**Principios clave:**

- Montos en **centavos** (bigint) para evitar errores de redondeo.
- Validación en el cliente **y** en el servidor (mismos schemas Zod).
- Permisos en **tres capas**: UI (ocultar botones), Server (`requireGerente`), DB (RLS).
- Nada se borra silenciosamente: `autorizaciones` es historial inmutable y `auditoria` registra cada acción crítica.
- Secretos NUNCA en el cliente — `.env.local` y variables de Vercel.

---

## Próximos pasos sugeridos

Antes de abrir esto a la financiera real:

1. Completar formulario de prevaluación con los 11 campos y la vista del cálculo.
2. Habilitar carga real de documentos a Supabase Storage con URLs firmadas.
3. Confirmar tarifa y límite de renovación con la financiera y escribirlos en `configuracion`.
4. Capturar regla de comisión en `configuracion.regla_comision_json`.
5. Redactar aviso de privacidad y guardarlo en `configuracion.aviso_privacidad_md`.
6. Integrar proveedor de mapas (Mapbox) para rutas reales.
7. Añadir reportes exportables (xlsx/pdf) por módulo.
8. Pruebas E2E con Playwright del flujo completo (login → crear → autorizar → conciliar).

---

**Fix-Ya Tech Services & Solutions** · Querétaro, México
