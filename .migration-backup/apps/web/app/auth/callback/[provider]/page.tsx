'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/login');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <p className="text-muted-foreground">Redirecting to Codeforces login...</p>
    </div>
  );
}
