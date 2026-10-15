'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listMyEnrollments } from '@/lib/enrollments';
import {
  listAssignments,
  getMySubmission,
  uploadSubmissionFile,
  submitAssignment,
  materialHref,
  type Assignment,
  type Course,
  type Submission,
} from '@/lib/api';
import { Page, PageTitle, Spinner, Empty, Button, inputStyle, Pill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { IconClipboard, IconPaperclip, IconDownload, IconTrash, IconUpload, IconCheck } from '@/components/icons';

type AssignmentWithCourse = Assignment & { course_title: string };

export default function TareasPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [assignments, setAssignments] = useState<AssignmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const enrollments = await listMyEnrollments(session.user.id);
        const courses = enrollments.map((e) => e.course).filter(Boolean) as Course[];
        const lists = await Promise.all(
          courses.map(async (c) => {
            const items = await listAssignments(c.id);
            return items.map((a) => ({ ...a, course_title: c.title }));
          })
        );
        setAssignments(lists.flat());
      } catch (e: any) {
        toast(e.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (loading) return <Spinner />;

  return (
    <Page>
      <PageTitle title="Tareas" subtitle="Entrega tus trabajos subiendo PDF, documentos u otros archivos." />
      {assignments.length === 0 ? (
        <Empty icon={<IconClipboard size={34} color="#64748B" />} title="Sin tareas" message="Cuando tu instructor cree una tarea en tus cursos, aparecerá aquí." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {assignments.map((a) => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </div>
      )}
    </Page>
  );
}

type PendingFile = { title: string; url: string; mime: string | null; size: number | null };

function AssignmentCard({ assignment: a }: { assignment: AssignmentWithCourse }) {
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
        <Pill color="#94A3B8">{a.course_title}</Pill>
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
  card: { backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 16, padding: 16 },
  title: { color: '#F1F5F9', fontSize: 16, fontWeight: 700, margin: '2px 0 0', fontFamily: 'var(--font-bricolage), sans-serif' },
  desc: { color: '#94A3B8', fontSize: 13, margin: '6px 0 0', whiteSpace: 'pre-wrap' },
  feedback: { backgroundColor: 'rgba(199,249,76,0.08)', border: '1px solid rgba(199,249,76,0.25)', borderRadius: 10, padding: 12, margin: '12px 0' },
  fileRow: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#0A0B0E', border: '1px solid #1F222B', borderRadius: 9, padding: '8px 10px' },
  fileLink: { flex: 1, minWidth: 0, color: '#F1F5F9', fontSize: 12, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileDel: { background: 'transparent', border: 'none', color: '#FCA5A5', cursor: 'pointer', padding: 2, flexShrink: 0 },
  uploadBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 12, background: 'transparent', border: '1px dashed #262932', color: '#C7F94C', borderRadius: 10, padding: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
