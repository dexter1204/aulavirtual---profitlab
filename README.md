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

### 5. Crea tu primer administrador (Master Study)
1. Regístrate desde `/signup`.
2. En Supabase → SQL Editor:
   ```sql
   update public.profiles set role = 'admin'
   where email = 'tu-correo@ejemplo.com';
   ```
3. Recarga la app: verás el panel **Master Study** en la barra inferior.

---

## 🗂️ Estructura

```
src/
├── app/
│   ├── login, signup            → autenticación
│   ├── cursos                   → catálogo
│   ├── cursos/[slug]            → ficha del curso + inscripción
│   ├── aprender/[courseId]      → reproductor + progreso
│   ├── mis-cursos               → cursos inscritos
│   ├── perfil                   → perfil del usuario
│   └── admin/                   → panel Master Study
│       ├── (resumen)
│       ├── cursos               → lista + reordenar + publicar
│       ├── cursos/nuevo         → crear curso
│       ├── cursos/[id]          → constructor de currículo + ajustes + alumnos
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
