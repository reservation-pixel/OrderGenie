'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CapicheIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/capiche/overview');
  }, [router]);
  return null;
}
