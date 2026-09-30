'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lesson, ReleaseType, Material } from '@/lib/api';
import { createLesson, updateLesson } from '@/lib/courses';
import {
  listLessonMaterials,
  createMaterial,
  deleteMaterial,
  uploadFile,
} from '@/lib/api';
import { parseYouTubeId, youTubeThumbnail } from '@/lib/youtube';
import { Modal, Field, inputStyle, Button } from './ui';
import { useToast } from './Toast';
import { materialIcon, formatBytes } from './materials';

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
  const [lessonId, setLessonId] = useState<string | null>(lesson?.id ?? null);
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

  // Materiales
  const [materials, setMaterials] = useState<Material[]>([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ytId = parseYouTubeId(youtube);

  const loadMaterials = async (id: string) => {
    try {
      setMaterials(await listLessonMaterials(id));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (lessonId) loadMaterials(lessonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (lessonId) {
        await updateLesson(lessonId, payload);
        toast('Clase guardada', 'success');
      } else {
        const created = await createLesson(payload as Omit<Lesson, 'id' | 'created_at'>);
        setLessonId(created.id);
        toast('Clase creada. Ya puedes adjuntar materiales.', 'success');
      }
    } catch (e: any) {
      toast(e?.message ?? 'Error al guardar', 'error');
    } finally {
      setBusy(false);
    }
  };

  const addLink = async () => {
    if (!lessonId) return;
    if (!linkTitle.trim() || !linkUrl.trim()) return toast('Completa título y enlace', 'error');
    try {
      await createMaterial({
        lesson_id: lessonId,
        course_id: courseId,
        kind: 'link',
        title: linkTitle.trim(),
        url: linkUrl.trim(),
      });
      setLinkTitle(''); setLinkUrl('');
      await loadMaterials(lessonId);
      toast('Enlace añadido', 'success');
    } catch (e: any) {
      toast(e?.message ?? 'Error', 'error');
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lessonId) return;
    setUploading(true);
    try {
      const up = await uploadFile(file);
      await createMaterial({
        lesson_id: lessonId,
        course_id: courseId,
        kind: 'file',
        title: up.name,
        url: up.url,
        mime: up.mime,
        size: up.size,
      });
      await loadMaterials(lessonId);
      toast('Archivo subido', 'success');
    } catch (e: any) {
      toast(e?.message ?? 'No se pudo subir', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeMaterial = async (id: string) => {
    if (!lessonId) return;
    try {
      await deleteMaterial(id);
      await loadMaterials(lessonId);
    } catch (e: any) {
      toast(e?.message ?? 'Error', 'error');
    }
  };

  return (
    <Modal
      open
      onClose={onSaved}
      title={lessonId ? 'Editar clase' : 'Nueva clase'}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onSaved}>Cerrar</Button>
          <Button size="sm" onClick={save} disabled={busy}>{busy ? '...' : lessonId ? 'Guardar cambios' : 'Crear clase'}</Button>
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

      <Field label="Notas (opcional)" hint="Texto libre que verá el alumno junto al video.">
        <textarea value={resources} onChange={(e) => setResources(e.target.value)} style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }} placeholder="Indicaciones, apuntes…" />
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

      {/* ===================== MATERIALES ===================== */}
      <div style={styles.materialsBox}>
        <h4 style={styles.materialsTitle}>📎 Materiales de la clase</h4>

        {!lessonId ? (
          <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>
            Crea la clase (botón de abajo) para poder subir documentos o añadir enlaces.
          </p>
        ) : (
          <>
            {materials.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {materials.map((m) => (
                  <div key={m.id} style={styles.matRow}>
                    <span style={{ fontSize: 15 }}>{materialIcon(m)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#F1F5F9', fontSize: 12, fontWeight: 600 }} className="clamp-2">{m.title}</div>
                      <div style={{ color: '#64748B', fontSize: 10 }}>
                        {m.kind === 'file' ? `Archivo${m.size ? ' · ' + formatBytes(m.size) : ''}` : 'Enlace'}
                      </div>
                    </div>
                    <button onClick={() => removeMaterial(m.id)} style={styles.matDel}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Subir archivo */}
            <input
              ref={fileRef}
              type="file"
              onChange={onPickFile}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm,.mov,.mp3,.wav"
            />
            <Button variant="ghost" size="sm" full onClick={() => fileRef.current?.click()} disabled={uploading} style={{ marginBottom: 10 }}>
              {uploading ? 'Subiendo…' : '⬆ Subir documento / archivo'}
            </Button>
            <p style={{ color: '#64748B', fontSize: 10, margin: '0 0 12px' }}>
              PDF, Word, Excel, PowerPoint, imágenes, ZIP, audio o video (máx. 50 MB).
            </p>

            {/* Añadir enlace */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Título del enlace" />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="https://… (video, drive, web)" />
              <Button size="sm" onClick={addLink}>+ Enlace</Button>
            </div>
          </>
        )}
      </div>
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
  materialsBox: { marginTop: 8, padding: 14, backgroundColor: '#0A0B0E', border: '1px solid #1F222B', borderRadius: 12 },
  materialsTitle: { color: '#F1F5F9', fontSize: 13, fontWeight: 700, margin: '0 0 10px' },
  matRow: { display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 8, padding: '7px 10px' },
  matDel: { background: 'transparent', border: 'none', color: '#FCA5A5', fontSize: 13, cursor: 'pointer', flexShrink: 0 },
};
