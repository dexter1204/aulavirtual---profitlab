'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { HOME_ROUTE } from '@/lib/basePath';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(HOME_ROUTE);
  }, [router]);
  return <Spinner />;
}
