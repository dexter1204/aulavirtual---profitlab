'use client';

import { useEffect, useState } from 'react';
import {
  listAssignments,
  getMySubmission,
  uploadSubmissionFile,
  submitAssignment,
  materialHref,
  type Assignment,
  type Submission,
} from '@/lib/api';
import { Spinner, Button, inputStyle, Pill } from './ui';
import { useToast } from './Toast';
import { IconClipboard, IconPaperclip, IconTrash, IconUpload, IconCheck } from './icons';

type PendingFile = { title: string; url: string; mime: string | null; size: number | null };

/**
 * Lista las tareas de un curso con el flujo de entrega del alumno.
 * Se usa dentro del curso (junto a las clases) y en la sección "Tareas".
 * Si `hideWhenEmpty` y no hay tareas, no renderiza nada.
 */
export function StudentAssignments({
  courseId,
  courseTitle,
  hideWhenEmpty = false,
  showHeading = true,
}: {
  courseId: string;
  courseTitle?: string;
  hideWhenEmpty?: boolean;
  showHeading?: boolean;
}) {
  const toast = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listAssignments(courseId)
      .then((a) => { if (alive) setAssignments(a); })
      .catch((e: any) => { if (alive) toast(e.message, 'error'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (loading) {
    if (hideWhenEmpty) return null;
    return <Spinner size={20} />;
  }
  if (assignments.length === 0 && hideWhenEmpty) return null;

  return (
    <div style={{ marginTop: 22 }}>
      {showHeading && (
        <h2 style={styles.heading}>
          <IconClipboard size={16} color="#C7F94C" /> Tareas del curso
        </h2>
      )}
      {assignments.length === 0 ? (
        <p style={{ color: '#64748B', fontSize: 13, margin: '6px 0 0' }}>
          Aún no hay tareas en este curso.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {assignments.map((a) => (
            <AssignmentCard key={a.id} assignment={a} courseTitle={courseTitle} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AssignmentCard({ assignment: a, courseTitle }: { assignment: Assignment; courseTitle?: string }) {
  const toast = useToast();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const s = await getMySubmission(a.id);
      setSubmission(s);
      if (s) {
        setComment(s.comment ?? '');
        setFiles((s.files ?? []).map((f) => ({ title: f.title, url: f.url, mime: f.mime, size: f.size })));
      }
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [a.id]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;
    setUploading(true);
    try {
      for (const file of picked) {
        const r = await uploadSubmissionFile(a.id, file);
        setFiles((prev) => [...prev, { title: r.name, url: r.url, mime: r.mime, size: r.size }]);
      }
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (files.length === 0) { toast('Sube al menos un archivo', 'error'); return; }
    setSaving(true);
    try {
      await submitAssignment(a.id, { comment: comment.trim() || null, files });
      toast('¡Tarea entregada!', 'success');
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const overdue = a.due_date ? new Date(a.due_date) < new Date() : false;

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        {courseTitle && <Pill color="#94A3B8">{courseTitle}</Pill>}
        {submission && (
          <Pill color={submission.status === 'revisada' ? '#22C55E' : '#3B82F6'}>
            {submission.status === 'revisada' ? 'Revisada' : 'Entregada'}
          </Pill>
        )}
        {a.due_date && (
          <Pill color={overdue && !submission ? '#EF4444' : '#F59E0B'}>
            Entrega: {new Date(a.due_date).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
          </Pill>
        )}
      </div>

      <h3 style={styles.title}>{a.title}</h3>
      {a.description && <p style={styles.desc}>{a.description}</p>}

      {loading ? (
        <Spinner size={20} />
      ) : (
        <>
          {submission?.status === 'revisada' && (submission.grade || submission.feedback) && (
            <div style={styles.feedback}>
              {submission.grade && <div style={{ color: '#C7F94C', fontSize: 14, fontWeight: 700 }}>Nota: {submission.grade}</div>}
              {submission.feedback && <p style={{ color: '#CBD5E1', fontSize: 13, margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{submission.feedback}</p>}
            </div>
          )}

          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0' }}>
              {files.map((f, i) => (
                <div key={i} style={styles.fileRow}>
                  <IconPaperclip size={14} color="#C7F94C" />
                  <a href={materialHref(f.url)} target="_blank" rel="noopener noreferrer" style={styles.fileLink}>{f.title}</a>
                  <button onClick={() => removeFile(i)} style={styles.fileDel} aria-label="Quitar archivo"><IconTrash size={13} /></button>
                </div>
              ))}
            </div>
          )}

          <label style={styles.uploadBtn}>
            <input type="file" multiple onChange={onPick} style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mp3,.wav" />
            <IconUpload size={15} /> {uploading ? 'Subiendo…' : 'Adjuntar archivo'}
          </label>

          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentario (opcional)…" rows={2}
            style={{ ...inputStyle, marginTop: 10, resize: 'vertical' }} />

          <Button full onClick={submit} disabled={saving || uploading} style={{ marginTop: 10 }}>
            <IconCheck size={15} /> {submission ? 'Actualizar entrega' : 'Entregar tarea'}
          </Button>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { color: '#F1F5F9', fontSize: 16, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-bricolage), sans-serif' },
  card: { backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 16, padding: 16 },
  title: { color: '#F1F5F9', fontSize: 16, fontWeight: 700, margin: '2px 0 0', fontFamily: 'var(--font-bricolage), sans-serif' },
  desc: { color: '#94A3B8', fontSize: 13, margin: '6px 0 0', whiteSpace: 'pre-wrap' },
  feedback: { backgroundColor: 'rgba(199,249,76,0.08)', border: '1px solid rgba(199,249,76,0.25)', borderRadius: 10, padding: 12, margin: '12px 0' },
  fileRow: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#0A0B0E', border: '1px solid #1F222B', borderRadius: 9, padding: '8px 10px' },
  fileLink: { flex: 1, minWidth: 0, color: '#F1F5F9', fontSize: 12, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileDel: { background: 'transparent', border: 'none', color: '#FCA5A5', cursor: 'pointer', padding: 2, flexShrink: 0 },
  uploadBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 12, background: 'transparent', border: '1px dashed #262932', color: '#C7F94C', borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
