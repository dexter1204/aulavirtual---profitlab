'use client';

import { useEffect, useState } from 'react';
import { listUsers, type Enrollment, type Profile } from '@/lib/api';
import { listCourseEnrollments, adminEnroll, adminUnenroll } from '@/lib/enrollments';
import { Spinner, Button, Modal, inputStyle, Empty } from './ui';
import { useToast } from './Toast';

export function CourseStudents({ courseId }: { courseId: string }) {
  const toast = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState(false);
  const [allStudents, setAllStudents] = useState<Profile[]>([]);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setEnrollments(await listCourseEnrollments(courseId));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [courseId]);

  const openPicker = async () => {
    setPicker(true);
    try {
      setAllStudents(await listUsers());
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const enroll = async (userId: string) => {
    try {
      await adminEnroll(userId, courseId);
      toast('Alumno inscrito', 'success');
      setPicker(false);
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const unenroll = async (e: Enrollment) => {
    if (!confirm(`¿Quitar a ${e.profile?.name ?? 'este alumno'} del curso?`)) return;
    try {
      await adminUnenroll(e.id);
      setEnrollments((prev) => prev.filter((x) => x.id !== e.id));
      toast('Inscripción retirada', 'info');
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const enrolledIds = new Set(enrollments.map((e) => e.user_id));
  const candidates = allStudents.filter(
    (s) =>
      !enrolledIds.has(s.id) &&
      (s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.email.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ color: '#94A3B8', fontSize: 13 }}>{enrollments.length} inscritos</span>
        <Button size="sm" onClick={openPicker}>+ Inscribir alumno</Button>
      </div>

      {loading ? (
        <Spinner />
      ) : enrollments.length === 0 ? (
        <Empty icon="👥" title="Sin alumnos" message="Inscribe alumnos o deja que se auto-inscriban si el curso es gratis." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {enrollments.map((e) => (
            <div key={e.id} style={styles.row}>
              <div style={styles.avatar}>
                {(e.profile?.name ?? '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }} className="clamp-2">{e.profile?.name}</div>
                <div style={{ color: '#64748B', fontSize: 11 }}>{e.profile?.email}</div>
              </div>
              <span style={{ color: '#64748B', fontSize: 10 }}>
                {new Date(e.enrolled_at).toLocaleDateString('es')}
              </span>
              <button onClick={() => unenroll(e)} style={styles.removeBtn}>✕</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={picker} onClose={() => setPicker(false)} title="Inscribir alumno">
        <input
          placeholder="🔍 Buscar por nombre o email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {candidates.length === 0 ? (
            <p style={{ color: '#64748B', fontSize: 13, textAlign: 'center', padding: 16 }}>
              No hay alumnos disponibles.
            </p>
          ) : (
            candidates.map((s) => (
              <button key={s.id} onClick={() => enroll(s.id)} style={styles.candidate}>
                <div style={styles.avatar}>
                  {s.name.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ color: '#64748B', fontSize: 11 }}>{s.email}</div>
                </div>
                {s.role === 'admin' && <span style={{ color: '#C7F94C', fontSize: 10 }}>ADMIN</span>}
                <span style={{ color: '#C7F94C', fontSize: 18 }}>+</span>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 10, padding: '9px 12px' },
  avatar: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#C7F94C', color: '#0A0B0E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 },
  removeBtn: { background: 'transparent', border: 'none', color: '#FCA5A5', fontSize: 14, cursor: 'pointer', padding: 4, flexShrink: 0 },
  candidate: { display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#0A0B0E', border: '1px solid #1F222B', borderRadius: 10, padding: '9px 12px', cursor: 'pointer', fontFamily: 'inherit' },
};
