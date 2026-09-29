'use client';

import { useState } from 'react';
import type { Course, CourseLevel, CourseStatus, AccessType } from '@/lib/api';
import { parseYouTubeId, youTubeThumbnail } from '@/lib/youtube';
import { Field, inputStyle, Button } from './ui';

export type CourseFormValues = {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: CourseLevel;
  instructor: string;
  thumbnail_url: string;
  status: CourseStatus;
  published_at: string | null;
  access_type: AccessType;
};

export function CourseForm({
  initial,
  onSubmit,
  submitLabel = 'Guardar',
  busy,
}: {
  initial?: Partial<Course>;
  onSubmit: (values: CourseFormValues) => void;
  submitLabel?: string;
  busy?: boolean;
}) {
  const [v, setV] = useState<CourseFormValues>({
    title: initial?.title ?? '',
    subtitle: initial?.subtitle ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? 'General',
    level: (initial?.level as CourseLevel) ?? 'principiante',
    instructor: initial?.instructor ?? 'Profit Lab',
    thumbnail_url: initial?.thumbnail_url ?? '',
    status: (initial?.status as CourseStatus) ?? 'draft',
    published_at: initial?.published_at ?? null,
    access_type: (initial?.access_type as AccessType) ?? 'free',
  });

  const set = <K extends keyof CourseFormValues>(k: K, val: CourseFormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  // Autocompletar miniatura desde un enlace de YouTube pegado
  const onThumbChange = (val: string) => {
    const yt = parseYouTubeId(val);
    if (yt) set('thumbnail_url', youTubeThumbnail(yt, 'max'));
    else set('thumbnail_url', val);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(v);
  };

  return (
    <form onSubmit={submit}>
      <Field label="Título del curso">
        <input value={v.title} onChange={(e) => set('title', e.target.value)} style={inputStyle} placeholder="Ej. Trading desde cero" />
      </Field>

      <Field label="Subtítulo">
        <input value={v.subtitle} onChange={(e) => set('subtitle', e.target.value)} style={inputStyle} placeholder="Una línea que resuma el curso" />
      </Field>

      <div style={styles.two}>
        <Field label="Categoría">
          <input value={v.category} onChange={(e) => set('category', e.target.value)} style={inputStyle} placeholder="Ej. Forex" />
        </Field>
        <Field label="Nivel">
          <select value={v.level} onChange={(e) => set('level', e.target.value as CourseLevel)} style={inputStyle}>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </Field>
      </div>

      <Field label="Instructor">
        <input value={v.instructor} onChange={(e) => set('instructor', e.target.value)} style={inputStyle} />
      </Field>

      <Field label="Miniatura (URL de imagen o enlace de YouTube)" hint="Si pegas un enlace de YouTube usamos su miniatura automáticamente.">
        <input value={v.thumbnail_url} onChange={(e) => onThumbChange(e.target.value)} style={inputStyle} placeholder="https://…" />
      </Field>
      {v.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v.thumbnail_url} alt="preview" style={styles.preview} />
      )}

      <Field label="Descripción">
        <textarea
          value={v.description}
          onChange={(e) => set('description', e.target.value)}
          style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
          placeholder="¿Qué aprenderá el alumno?"
        />
      </Field>

      <div style={styles.two}>
        <Field label="Acceso">
          <select value={v.access_type} onChange={(e) => set('access_type', e.target.value as AccessType)} style={inputStyle}>
            <option value="free">Gratis (auto-inscripción)</option>
            <option value="enrollment">Solo por inscripción (admin)</option>
          </select>
        </Field>
        <Field label="Estado / Lanzamiento">
          <select value={v.status} onChange={(e) => set('status', e.target.value as CourseStatus)} style={inputStyle}>
            <option value="draft">Borrador (oculto)</option>
            <option value="published">Publicado</option>
            <option value="scheduled">Programado</option>
          </select>
        </Field>
      </div>

      {v.status === 'scheduled' && (
        <Field label="Fecha de lanzamiento" hint="El curso será visible como 'próximamente' hasta esta fecha.">
          <input
            type="datetime-local"
            value={v.published_at ? toLocalInput(v.published_at) : ''}
            onChange={(e) => set('published_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
            style={inputStyle}
          />
        </Field>
      )}

      <Button type="submit" full disabled={busy || !v.title.trim()} style={{ marginTop: 8 }}>
        {busy ? '...' : submitLabel}
      </Button>
    </form>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

const styles: Record<string, React.CSSProperties> = {
  two: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  preview: { width: '100%', maxWidth: 280, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 10, marginBottom: 14, border: '1px solid #1F222B' },
};
