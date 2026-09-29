'use client';

import { useState } from 'react';
import type { Lesson, ReleaseType } from '@/lib/supabase';
import { createLesson, updateLesson } from '@/lib/courses';
import { parseYouTubeId, youTubeThumbnail } from '@/lib/youtube';
import { Modal, Field, inputStyle, Button } from './ui';
import { useToast } from './Toast';

export function LessonEditor({
  courseId,
  moduleId,
  lesson,
  position,
  onClose,
  onSaved,
}: {
  courseId: string;
  moduleId: string;
  lesson?: Lesson;
  position: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [youtube, setYoutube] = useState(lesson?.youtube_id ?? '');
  const [duration, setDuration] = useState(lesson?.duration ?? '');
  const [description, setDescription] = useState(lesson?.description ?? '');
  const [resources, setResources] = useState(lesson?.resources ?? '');
  const [isPreview, setIsPreview] = useState(lesson?.is_preview ?? false);
  const [releaseType, setReleaseType] = useState<ReleaseType>(lesson?.release_type ?? 'immediate');
  const [releaseAt, setReleaseAt] = useState<string | null>(lesson?.release_at ?? null);
  const [dripDays, setDripDays] = useState<number>(lesson?.drip_days ?? 7);
  const [busy, setBusy] = useState(false);

  const ytId = parseYouTubeId(youtube);

  const save = async () => {
    if (!title.trim()) return toast('Escribe un título', 'error');
    if (!ytId) return toast('Enlace o ID de YouTube no válido', 'error');
    setBusy(true);
    try {
      const payload = {
        module_id: moduleId,
        course_id: courseId,
        title: title.trim(),
        youtube_id: ytId,
        duration: duration.trim() || null,
        description: description.trim() || null,
        resources: resources.trim() || null,
        is_preview: isPreview,
        release_type: releaseType,
        release_at: releaseType === 'scheduled' ? releaseAt : null,
        drip_days: releaseType === 'drip_days' ? dripDays : null,
        position: lesson?.position ?? position,
      };
      if (lesson) await updateLesson(lesson.id, payload);
      else await createLesson(payload as Omit<Lesson, 'id' | 'created_at'>);
      toast(lesson ? 'Clase actualizada' : 'Clase añadida', 'success');
      onSaved();
    } catch (e: any) {
      toast(e?.message ?? 'Error al guardar', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={lesson ? 'Editar clase' : 'Nueva clase'}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={busy}>{busy ? '...' : 'Guardar'}</Button>
        </>
      }
    >
      <Field label="Título de la clase">
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="Ej. Qué es el spread" />
      </Field>

      <Field label="Video de YouTube (enlace o ID)" hint="Acepta youtu.be, watch?v=, /embed/, /shorts/ o el ID directo.">
        <input value={youtube} onChange={(e) => setYoutube(e.target.value)} style={inputStyle} placeholder="https://youtu.be/…" />
      </Field>
      {ytId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={youTubeThumbnail(ytId, 'mq')} alt="preview" style={styles.preview} />
      ) : youtube ? (
        <p style={{ color: '#FCA5A5', fontSize: 12, marginTop: -6, marginBottom: 12 }}>Enlace no reconocido</p>
      ) : null}

      <Field label="Duración (opcional)" hint="Solo informativo. Ej. 12:34">
        <input value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle} placeholder="12:34" />
      </Field>

      <Field label="Descripción (opcional)">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
      </Field>

      <Field label="Recursos / notas (opcional)">
        <textarea value={resources} onChange={(e) => setResources(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Enlaces, PDFs, indicadores…" />
      </Field>

      <label style={styles.checkRow}>
        <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#C7F94C' }} />
        <span style={{ color: '#F1F5F9', fontSize: 13 }}>Clase de muestra gratuita (visible sin inscripción)</span>
      </label>

      <Field label="Lanzamiento de la clase (goteo)">
        <select value={releaseType} onChange={(e) => setReleaseType(e.target.value as ReleaseType)} style={inputStyle}>
          <option value="immediate">Disponible de inmediato</option>
          <option value="scheduled">En una fecha específica</option>
          <option value="drip_days">X días después de inscribirse</option>
        </select>
      </Field>

      {releaseType === 'scheduled' && (
        <Field label="Fecha de disponibilidad">
          <input
            type="datetime-local"
            value={releaseAt ? toLocalInput(releaseAt) : ''}
            onChange={(e) => setReleaseAt(e.target.value ? new Date(e.target.value).toISOString() : null)}
            style={inputStyle}
          />
        </Field>
      )}
      {releaseType === 'drip_days' && (
        <Field label="Días tras la inscripción">
          <input type="number" min={0} value={dripDays} onChange={(e) => setDripDays(Number(e.target.value))} style={inputStyle} />
        </Field>
      )}
    </Modal>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

const styles: Record<string, React.CSSProperties> = {
  preview: { width: 140, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, marginBottom: 12, border: '1px solid #1F222B' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' },
};
