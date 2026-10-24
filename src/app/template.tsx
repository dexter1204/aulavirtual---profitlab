'use client';

import { motion, useReducedMotion } from 'framer-motion';

// template.tsx se re-monta en cada navegación → anima la entrada del
// contenido de cada página. El chrome (header/nav) vive en el layout y
// permanece estable: solo el contenido hace cross-fade + rise sutil.
// Rápido (<300ms), curva ease-out fuerte, y plano si reduced-motion.
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.18 : 0.28, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
