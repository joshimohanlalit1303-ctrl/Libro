"use client";

import { useAuth } from "@/context/AuthContext";
import { AuthProvider } from "@/context/AuthContext";
import { Auth } from "@/components/Auth/Auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function HomePageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  return <Auth />;
}

export default function Home() {
  return <HomePageContent />;
}
