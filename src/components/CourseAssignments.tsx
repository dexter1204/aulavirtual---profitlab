'use client';

import { useEffect, useState } from 'react';
import {
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  listAssignmentSubmissions,
  gradeSubmission,
  materialHref,
  type Assignment,
  type Submission,
} from '@/lib/api';
import { Spinner, Button, Modal, inputStyle, Empty, Pill } from './ui';
import { useToast } from './Toast';
import { IconClipboard, IconTrash, IconPencil, IconDownload, IconCheck, IconPaperclip } from './icons';

export function CourseAssignments({ courseId }: { courseId: string }) {
  const toast = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ assignment?: Assignment } | null>(null);
  const [viewing, setViewing] = useState<Assignment | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setAssignments(await listAssignments(courseId));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [courseId]);

  const remove = async (a: Assignment) => {
    if (!confirm(`¿Eliminar la tarea "${a.title}" y todas sus entregas?`)) return;
    try {
      await deleteAssignment(a.id);
      setAssignments((prev) => prev.filter((x) => x.id !== a.id));
      toast('Tarea eliminada', 'info');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ color: '#94A3B8', fontSize: 13 }}>{assignments.length} tareas</span>
        <Button size="sm" onClick={() => setEditor({})}>+ Nueva tarea</Button>
      </div>

      {loading ? (
        <Spinner />
      ) : assignments.length === 0 ? (
        <Empty icon={<IconClipboard size={34} color="#64748B" />} title="Sin tareas" message="Crea una tarea para que tus alumnos suban sus trabajos (PDF, documentos, etc.)." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {assignments.map((a) => (
            <div key={a.id} style={styles.card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700 }} className="clamp-2">{a.title}</div>
                  {a.description && (
                    <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }} className="clamp-2">{a.description}</div>
                  )}
                  {a.due_date && (
                    <div style={{ marginTop: 6 }}>
                      <Pill color="#F59E0B">Entrega: {new Date(a.due_date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</Pill>
                    </div>
                  )}
                </div>
                <button onClick={() => setEditor({ assignment: a })} style={styles.iconBtn} aria-label="Editar tarea">
                  <IconPencil size={15} />
                </button>
                <button onClick={() => remove(a)} style={{ ...styles.iconBtn, color: '#FCA5A5' }} aria-label="Eliminar tarea">
                  <IconTrash size={15} />
                </button>
              </div>
              <Button variant="outline" size="sm" full onClick={() => setViewing(a)} style={{ marginTop: 12 }}>
                Ver entregas
              </Button>
            </div>
          ))}
        </div>
      )}

      {editor && (
        <AssignmentEditor
          courseId={courseId}
          assignment={editor.assignment}
          position={assignments.length}
          onClose={() => setEditor(null)}
          onSaved={async () => { setEditor(null); await load(); }}
        />
      )}

      {viewing && (
        <SubmissionsModal assignment={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

function AssignmentEditor({
  courseId,
  assignment,
  position,
  onClose,
  onSaved,
}: {
  courseId: string;
  assignment?: Assignment;
  position: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(assignment?.title ?? '');
  const [description, setDescription] = useState(assignment?.description ?? '');
  // input type=date quiere YYYY-MM-DD
  const [due, setDue] = useState(assignment?.due_date ? assignment.due_date.slice(0, 10) : '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast('El título es obligatorio', 'error'); return; }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        due_date: due ? `${due} 23:59:59` : null,
      };
      if (assignment) {
        await updateAssignment(assignment.id, payload);
      } else {
        await createAssignment({ course_id: courseId, position, ...payload });
      }
      toast('Tarea guardada', 'success');
      onSaved();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={assignment ? 'Editar tarea' : 'Nueva tarea'}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</Button>
        </>
      }
    >
      <label style={styles.lbl}>Título</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Análisis de un activo" style={{ ...inputStyle, marginBottom: 12 }} />
      <label style={styles.lbl}>Instrucciones (opcional)</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe qué debe entregar el alumno…" rows={4} style={{ ...inputStyle, marginBottom: 12, resize: 'vertical' }} />
      <label style={styles.lbl}>Fecha límite (opcional)</label>
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={inputStyle} />
    </Modal>
  );
}

function SubmissionsModal({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const toast = useToast();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setSubs(await listAssignmentSubmissions(assignment.id));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [assignment.id]);

  const grade = async (s: Submission, grade: string, feedback: string) => {
    try {
      await gradeSubmission(s.id, { status: 'revisada', grade: grade || null, feedback: feedback || null });
      toast('Entrega revisada', 'success');
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <Modal open onClose={onClose} title={`Entregas · ${assignment.title}`}>
      {loading ? (
        <Spinner />
      ) : subs.length === 0 ? (
        <p style={{ color: '#64748B', fontSize: 13, textAlign: 'center', padding: 16 }}>Aún no hay entregas.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {subs.map((s) => (
            <SubmissionRow key={s.id} submission={s} onGrade={grade} />
          ))}
        </div>
      )}
    </Modal>
  );
}

function SubmissionRow({ submission: s, onGrade }: { submission: Submission; onGrade: (s: Submission, grade: string, feedback: string) => void }) {
  const [grade, setGrade] = useState(s.grade ?? '');
  const [feedback, setFeedback] = useState(s.feedback ?? '');

  return (
    <div style={styles.subCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={styles.avatar}>
          {(s.user_name ?? '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>{s.user_name}</div>
          <div style={{ color: '#64748B', fontSize: 11 }}>{new Date(s.updated_at || s.created_at).toLocaleString('es')}</div>
        </div>
        <Pill color={s.status === 'revisada' ? '#22C55E' : '#3B82F6'}>{s.status === 'revisada' ? 'Revisada' : 'Entregada'}</Pill>
      </div>

      {s.comment && <p style={{ color: '#CBD5E1', fontSize: 12, margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{s.comment}</p>}

      {(s.files ?? []).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {(s.files ?? []).map((f) => (
            <a key={f.id} href={materialHref(f.url)} target="_blank" rel="noopener noreferrer" style={styles.fileRow}>
              <IconPaperclip size={14} color="#C7F94C" />
              <span style={{ flex: 1, minWidth: 0, color: '#F1F5F9', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
              <IconDownload size={14} color="#94A3B8" />
            </a>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Nota (ej. 9/10)" style={{ ...inputStyle, flex: '0 0 110px', padding: '8px 10px', fontSize: 12 }} />
        <input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Retroalimentación…" style={{ ...inputStyle, flex: 1, padding: '8px 10px', fontSize: 12 }} />
      </div>
      <Button size="sm" full onClick={() => onGrade(s, grade, feedback)} style={{ marginTop: 8 }}>
        <IconCheck size={14} /> Marcar como revisada
      </Button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 14 },
  iconBtn: { background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 14, cursor: 'pointer', padding: 4, flexShrink: 0 },
  lbl: { display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  subCard: { backgroundColor: '#0A0B0E', border: '1px solid #1F222B', borderRadius: 12, padding: 12 },
  avatar: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#C7F94C', color: '#0A0B0E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 },
  fileRow: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 9, padding: '8px 10px', textDecoration: 'none' },
};
