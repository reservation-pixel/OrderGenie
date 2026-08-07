'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AikoIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/aiko/overview');
  }, [router]);
  return null;
}
