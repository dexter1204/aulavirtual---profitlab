'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/inicio');
  }, [router]);
  return <Spinner />;
}
