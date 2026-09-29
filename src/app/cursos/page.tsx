'use client';

import { useEffect, useMemo, useState } from 'react';
import { listPublishedCourses } from '@/lib/courses';
import type { Course } from '@/lib/supabase';
import { CourseCard } from '@/components/CourseCard';
import { Page, PageTitle, Spinner, Empty, inputStyle } from '@/components/ui';

export default function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Todos');

  useEffect(() => {
    listPublishedCourses()
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set(courses.map((c) => c.category));
    return ['Todos', ...Array.from(set)];
  }, [courses]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchCat = cat === 'Todos' || c.category === cat;
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.subtitle ?? '').toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [courses, cat, query]);

  return (
    <Page>
      <PageTitle title="Catálogo" subtitle="Cursos de trading de Profit Lab Academy" />

      <input
        placeholder="🔍  Buscar curso, tema o instructor…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ ...inputStyle, marginBottom: 14 }}
      />

      <div style={styles.chips}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{
              ...styles.chip,
              backgroundColor: cat === c ? '#C7F94C' : '#14161C',
              color: cat === c ? '#0A0B0E' : '#94A3B8',
              borderColor: cat === c ? '#C7F94C' : '#1F222B',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty
          icon="📚"
          title="Aún no hay cursos"
          message="Cuando la academia publique un curso, aparecerá aquí."
        />
      ) : (
        <div style={styles.grid}>
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} href={`/cursos/${c.slug}`} />
          ))}
        </div>
      )}
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  chips: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 18 },
  chip: {
    flexShrink: 0,
    border: '1px solid',
    borderRadius: 999,
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16,
  },
};
