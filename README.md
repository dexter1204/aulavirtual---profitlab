# Profit Lab · Aula Virtual 🎓

Aula virtual (LMS) para **Profit Lab Academy**. Aloja los cursos de la academia
con videos de **YouTube**, gestiona **inscripciones** y permite que los alumnos
vean las clases tras **iniciar sesión**. Incluye un panel de administración
estilo **Master Study** para crear cursos, ordenar módulos y clases, programar
el lanzamiento (goteo/drip) y gestionar alumnos.

## 🧱 Arquitectura (todo en SiteGround, sin servicios externos)

```
Navegador ──►  Frontend estático (Next.js export)   →  archivos en public_html/
           ──►  API REST en PHP  (/api)              →  se conecta a…
                                                        MySQL (SiteGround)
```

- **Frontend:** Next.js 16 + React 19 + Tailwind v4, exportado como sitio
  **estático** (`out/`). Identidad visual de ProfitLab (tema oscuro, acento lima
  `#C7F94C`, aurora y glassmorphism, fuentes Bricolage + Manrope).
- **Backend:** API REST en **PHP puro** (sin dependencias) con **PDO** y
  autenticación por **JWT**. Se ejecuta de forma nativa en SiteGround.
- **Base de datos:** **MySQL / MariaDB**.

---

## ✨ Funcionalidades

### Para alumnos
- Registro e inicio de sesión (JWT, contraseñas cifradas con `password_hash`).
- Catálogo con búsqueda y filtro por categoría.
- Ficha del curso con currículo, clases de muestra gratis e inscripción.
- Reproductor de YouTube con seguimiento de progreso y avance automático.
- "Mis cursos" con barra de progreso; perfil editable.

### Panel Master Study (administrador)
- Resumen con métricas (cursos, alumnos, inscripciones).
- Cursos: crear, editar, **reordenar**, **publicar/despublicar**, eliminar.
- Constructor de currículo: módulos y clases con reordenamiento.
- Editor de clases: **cualquier enlace de YouTube**, duración, recursos,
  **clase de muestra gratuita** y **lanzamiento por goteo** (inmediato / fecha /
  X días tras inscribirse).
- Gestión de alumnos por curso (inscribir/retirar) y global (roles).

### Seguridad
- El `youtube_id` de las clases **no se entrega** a quien no esté inscrito (salvo
  clases marcadas como muestra). Las acciones de administración exigen rol admin.
- Las contraseñas se guardan cifradas; el acceso se valida con tokens JWT.

---

## 🚀 Puesta en marcha en local (desarrollo)

Necesitas Node.js y PHP con MySQL (o usa el modo SQLite de prueba).

```bash
# 1. Frontend
npm install
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:8000

# 2. API
cp api/config.example.php api/config.php   # y edita tus credenciales MySQL
# en local, como el frontend (3000) y la API (8000) son distinto origen,
# pon en config.php:  'cors_origin' => 'http://localhost:3000'

# 3. Arranca la API (PHP) y el frontend (Next) en dos terminales
php -S localhost:8000 -t api api/index.php
npm run dev
```

---

## 🌐 Desplegar en SiteGround

### 1. Crear la base de datos MySQL
1. **Site Tools → Bases de datos → Bases de datos MySQL**: crea una base y un
   usuario, y asígnale todos los permisos.
2. Abre **phpMyAdmin** de esa base → pestaña **Importar** (o **SQL**) y ejecuta
   el archivo **`api/schema.sql`**.

### 2. Subir la API (PHP)
1. Copia `api/config.example.php` a `api/config.php` y rellena `db_name`,
   `db_user`, `db_pass` y un `jwt_secret` largo y aleatorio
   (`php -r "echo bin2hex(random_bytes(32));"`).
2. Sube **toda la carpeta `api/`** a `public_html/api/` (incluye `index.php`,
   `lib/`, `.htaccess` y tu `config.php`). **No subas** `schema.sql` a un lugar
   público (el `.htaccess` ya lo bloquea, pero mejor bórralo del servidor).

### 3. Compilar y subir el frontend
```bash
npm install
npm run build          # genera la carpeta out/
```
Sube **el contenido de `out/`** a `public_html/` (junto a la carpeta `api/`).
Como frontend y API comparten dominio, `NEXT_PUBLIC_API_URL` puede quedar en
`/api` (valor por defecto), así que normalmente **no necesitas** tocar el `.env`
para producción.

> Estructura final en el servidor:
> ```
> public_html/
> ├── index.html, _next/, curso/, cursos/ …   ← frontend (out/)
> ├── .htaccess                                 ← del frontend
> └── api/
>     ├── index.php, lib/, .htaccess
>     └── config.php   ← tus credenciales (NO en git)
> ```

### 4. Crear tu primer administrador (Master Study)
1. Regístrate desde la app (`/signup`).
2. En phpMyAdmin ejecuta con tu email:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'tu-correo@ejemplo.com';
   ```
3. Vuelve a iniciar sesión: verás el panel **Master Study**.

---

## 🗂️ Estructura del proyecto

```
api/                         → API REST en PHP
├── index.php                → router / front controller
├── lib/{db,jwt,helpers}.php  → PDO, JWT, utilidades
├── config.example.php        → plantilla de credenciales
├── schema.sql                → esquema MySQL
└── .htaccess                 → enruta /api/* → index.php

src/
├── app/
│   ├── login, signup         → autenticación
│   ├── cursos                → catálogo
│   ├── curso  (?slug=)       → ficha del curso + inscripción
│   ├── aprender (?curso=&lesson=) → reproductor + progreso
│   ├── mis-cursos            → cursos inscritos
│   ├── perfil                → perfil
│   └── admin/                → panel Master Study
│       ├── (resumen), cursos, cursos/nuevo, curso (?id=), estudiantes
├── components/               → UI (header, nav, cards, editor de clases…)
├── contexts/AuthContext.tsx  → sesión JWT
└── lib/
    ├── api.ts                → cliente REST + tipos + token
    ├── courses.ts, enrollments.ts, progress.ts, youtube.ts
```

## 📜 Scripts
| Comando | Descripción |
|---|---|
| `npm run dev` | Frontend en desarrollo |
| `npm run build` | Genera `out/` (sitio estático) |
| `npm run typecheck` | Verificación de tipos |
| `php -S localhost:8000 -t api api/index.php` | API en local |
