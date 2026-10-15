'use client';

import { useEffect, useMemo, useState } from 'react';
import { listPublishedCourses } from '@/lib/courses';
import type { Course } from '@/lib/api';
import { CourseCard } from '@/components/CourseCard';
import { Page, PageTitle, Spinner, Empty, inputStyle } from '@/components/ui';
import { IconSearch, IconX, IconBook } from '@/components/icons';

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

      <div className="searchField" style={{ marginBottom: 14 }}>
        <span className="searchIcon" aria-hidden="true">
          <IconSearch size={17} />
        </span>
        <input
          type="search"
          placeholder="Buscar curso, tema o instructor…"
          aria-label="Buscar cursos"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={inputStyle}
        />
        {query && (
          <button
            type="button"
            className="searchClear"
            aria-label="Limpiar búsqueda"
            onClick={() => setQuery('')}
          >
            <IconX size={16} />
          </button>
        )}
      </div>

      <div style={styles.chips} role="group" aria-label="Filtrar por categoría">
        {categories.map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={active}
              onClick={() => setCat(c)}
              style={{
                ...styles.chip,
                backgroundColor: active ? '#C7F94C' : '#14161C',
                color: active ? '#0A0B0E' : '#94A3B8',
                borderColor: active ? '#C7F94C' : '#1F222B',
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty
          icon={<IconBook size={38} color="#C7F94C" style={{ opacity: 0.6 }} />}
          title={query || cat !== 'Todos' ? 'Sin resultados' : 'Aún no hay cursos'}
          message={
            query || cat !== 'Todos'
              ? 'Prueba con otra búsqueda o cambia de categoría.'
              : 'Cuando la academia publique un curso, aparecerá aquí.'
          }
        />
      ) : (
        <>
          <p style={styles.count} aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'curso' : 'cursos'}
          </p>
          <div style={styles.grid}>
            {filtered.map((c) => (
              <CourseCard key={c.id} course={c} href={`/curso/?slug=${c.slug}`} students={c.students} />
            ))}
          </div>
        </>
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
    transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
  },
  count: { color: '#64748B', fontSize: 12, fontWeight: 500, margin: '0 0 12px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16,
  },
};
