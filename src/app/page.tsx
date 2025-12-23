"use client";

import { useAuth } from "@/context/AuthContext";
import { AuthProvider } from "@/context/AuthContext";
import { Auth } from "@/components/Auth/Auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function HomePageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');

  useEffect(() => {
    if (!loading && user) {
      if (next) {
        router.push(next);
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router, next]);

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  return <Auth />;
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
