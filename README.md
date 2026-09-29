# Profit Lab · Aula Virtual 🎓

Aula virtual (LMS) para **Profit Lab Academy**. Permite alojar los cursos de la
academia con videos de **YouTube**, gestionar inscripciones y que los alumnos
vean las clases tras iniciar sesión. Incluye un panel de administración estilo
**Master Study** para crear cursos, ordenar módulos y clases, programar el
lanzamiento (goteo/drip) y gestionar alumnos.

Construida con el mismo stack e identidad visual que el resto de ProfitLab:
**Next.js 16 · React 19 · Tailwind v4 · Supabase**, tema oscuro con acento lima
`#C7F94C`, fondo aurora animado y tarjetas *glassmorphism*.

---

## ✨ Funcionalidades

### Para alumnos
- Registro e inicio de sesión (Supabase Auth).
- Catálogo de cursos con búsqueda y filtro por categoría.
- Ficha del curso con currículo, clases de muestra gratis e inscripción.
- Reproductor de YouTube integrado con seguimiento de progreso.
- Marcar clases como completadas y avance automático a la siguiente.
- "Mis cursos" con barra de progreso por curso.
- Perfil editable.

### Panel Master Study (administrador)
- **Resumen** con métricas (cursos, alumnos, inscripciones).
- **Cursos**: crear, editar, reordenar (▲▼), publicar/despublicar y eliminar.
- **Constructor de currículo**: módulos y clases con reordenamiento.
- **Clases**: título, video de YouTube (cualquier formato de enlace), duración,
  descripción, recursos y **clase de muestra gratuita**.
- **Lanzamiento / goteo (drip)** por clase:
  - Disponible de inmediato.
  - En una fecha específica.
  - X días después de que el alumno se inscribe.
- **Alumnos por curso**: inscribir/retirar manualmente.
- **Gestión global de alumnos**: buscar y cambiar roles (Master/Alumno).

---

## 🚀 Puesta en marcha

### 1. Instala dependencias
```bash
npm install
```

### 2. Configura Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
   Crea todas las tablas, funciones, triggers y políticas de seguridad (RLS).
3. En **Settings → API** copia la *Project URL* y la *anon public key*.

### 3. Variables de entorno
```bash
cp .env.example .env.local
```
Rellena en `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Ejecuta en desarrollo
```bash
npm run dev
```
Abre http://localhost:3000

> ℹ️ Las variables `NEXT_PUBLIC_*` se **incrustan en el build**. Si cambias de
> proyecto Supabase, vuelve a generar el build.

### 5. Crea tu primer administrador (Master Study)
1. Regístrate desde `/signup`.
2. En Supabase → SQL Editor:
   ```sql
   update public.profiles set role = 'admin'
   where email = 'tu-correo@ejemplo.com';
   ```
3. Recarga la app: verás el panel **Master Study** en la barra inferior.

---

---

## 🌐 Desplegar en SiteGround (hosting estático)

La app está configurada como **exportación estática** (`output: 'export'` en
`next.config.ts`): al compilar genera una carpeta `out/` con HTML/JS puro que
funciona en cualquier plan de SiteGround, sin necesidad de Node.js.

### 1. Genera el build con tus credenciales
En tu equipo (con `.env.local` ya configurado):
```bash
npm install
npm run build
```
Esto crea la carpeta **`out/`** con todo el sitio (incluye un `.htaccess` listo
para Apache).

### 2. Sube el contenido de `out/` a SiteGround
En **Site Tools → Sitio → Administrador de archivos** (o por FTP):
1. Entra a la carpeta de tu dominio/subdominio (ej. `public_html/` o
   `public_html/aula/`).
2. Sube **todo el contenido de `out/`** (no la carpeta `out` en sí, sino lo que
   hay dentro: `index.html`, `_next/`, `curso/`, `.htaccess`, etc.).
3. Asegúrate de que el `.htaccess` se subió (activa "mostrar archivos ocultos").

> **Subdominio recomendado:** crea `aula.tudominio.com` en
> **Site Tools → Dominios → Subdominios**, apúntalo a una carpeta y sube ahí el
> contenido de `out/`.

### 3. Configura Supabase para tu dominio
En Supabase → **Authentication → URL Configuration**, pon tu URL real en
*Site URL* y en *Redirect URLs* (ej. `https://aula.tudominio.com`).

### 4. Listo
Abre tu dominio: la app carga y habla directamente con Supabase desde el
navegador. Para actualizar el sitio, repite `npm run build` y vuelve a subir
`out/`.

> **Nota:** como es estático, cada vez que cambies el código debes regenerar
> `out/` y volver a subirlo. La base de datos (Supabase) se actualiza sola.

---

## 🗂️ Estructura

```
src/
├── app/
│   ├── login, signup            → autenticación
│   ├── cursos                   → catálogo
│   ├── curso  (?slug=)          → ficha del curso + inscripción
│   ├── aprender  (?curso=&lesson=) → reproductor + progreso
│   ├── mis-cursos               → cursos inscritos
│   ├── perfil                   → perfil del usuario
│   └── admin/                   → panel Master Study
│       ├── (resumen)
│       ├── cursos               → lista + reordenar + publicar
│       ├── cursos/nuevo         → crear curso
│       ├── curso  (?id=)        → constructor de currículo + ajustes + alumnos
│       └── estudiantes          → gestión de alumnos
├── components/                  → UI (header, nav, cards, editor de clases…)
├── contexts/AuthContext.tsx     → sesión y perfil
└── lib/                         → supabase, courses, enrollments, progress, youtube
supabase/schema.sql              → esquema completo + RLS
```

## 🎨 Identidad visual
Reutiliza el sistema de diseño de ProfitLab: paleta oscura (`#0A0B0E`), acento
lima (`#C7F94C`), fuentes *Bricolage Grotesque* + *Manrope*, fondo aurora
animado y `glassmorphism`, definidos en `src/app/globals.css` y
`tailwind.config.ts`.

## 🔒 Seguridad
El acceso a las clases está protegido por **Row Level Security** en Supabase:
solo los administradores o los alumnos inscritos pueden leer las clases de un
curso publicado. El goteo por fecha se aplica además en la aplicación.

## 📜 Scripts
| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run start` | Servir la build |
| `npm run typecheck` | Verificación de tipos TypeScript |
