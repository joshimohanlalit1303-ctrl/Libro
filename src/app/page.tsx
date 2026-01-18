"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import { Auth } from "@/components/Auth/Auth";
import { useRouter } from "next/navigation";
import styles from "./Landing.module.css";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  // If user is already logged in, we can either redirect them or show "Go to Dashboard"
  // Let's redirect for convenience if they visit root and are logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) return <div style={{ background: '#000', height: '100vh' }} />;

  if (showAuth) {
    return <Auth onBack={() => setShowAuth(false)} />;
  }

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.logo}>Libro</div>
        <div className={styles.navLinks}>
          <a href="#how-it-works" className={styles.navLink}>How it Works</a>
          <a href="#impact" className={styles.navLink}>Impact</a>
          <button
            onClick={() => setShowAuth(true)}
            className={styles.navLink}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#fff' }}
          >
            Log in
          </button>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.badge}>EdVentures 2026 Batch</div>
        <h1 className={styles.title}>
          Read Together.<br />
          Focus Better.
        </h1>
        <p className={styles.subtitle}>
          Libro is a distraction-free digital space where readers build discipline, attention, and deep reading habits through shared reading sessions.
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <button className={styles.ctaButton} onClick={() => setShowAuth(true)}>
            Start a Reading Session
          </button>
          <button className={styles.secondaryButton} onClick={() => document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })}>
            See How It Works
          </button>
        </div>
      </section>

      <section id="problem" className={styles.section} style={{ background: '#111' }}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>The Problem</h2>
          <p className={styles.sectionText}>
            Digital reading is filled with distractions, lack of discipline, and isolation. Many readers struggle to stay consistent and focused while reading alone.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>The Solution</h2>
          <p className={styles.sectionText}>
            Libro provides focused reading rooms where users read together in real time with a clear intention. Shared presence, time-bound sessions, and contextual discussion create accountability and deep engagement.
          </p>
        </div>
      </section>

      <section id="how-it-works" className={styles.section} style={{ background: '#111' }}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.grid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>01</div>
              <h3>Choose a Book</h3>
              <p>Read public-domain fiction literature designed for deep reading.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>02</div>
              <h3>Set Intention</h3>
              <p>Define your goal (e.g., "Read 20 pages") before starting.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>03</div>
              <h3>Read Together</h3>
              <p>Join others in a calm, focused reading environment with a session timer.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>04</div>
              <h3>Reflect</h3>
              <p>Take notes and discuss themes without noise or distraction.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureTitle}>Focused Rooms</div>
          <p className={styles.featureText}>
            Distraction-free shared spaces designed for serious reading.
          </p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureTitle}>Session Intention</div>
          <p className={styles.featureText}>
            Clear goals before every session to build accountability.
          </p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureTitle}>Knowledge Capture</div>
          <p className={styles.featureText}>
            In-session note-taking to improve comprehension.
          </p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureTitle}>Contextual Discussion</div>
          <p className={styles.featureText}>
            Meaningful conversation limited to the reading context.
          </p>
        </div>
      </section>

      <section id="impact" className={styles.section} style={{ background: '#000', borderTop: '1px solid #333' }}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>Why It Matters</h2>
          <p className={styles.sectionText}>
            Libro promotes literacy and deep reading habits by providing structured, distraction-free reading environments—especially valuable for learners without access to quiet study spaces.
          </p>
          <div className={styles.badge} style={{ marginTop: 24, background: '#0071E3', color: 'white', border: 'none' }}>
            SDG 4 – Quality Education
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <a href="#">About</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Contact</a>
        </div>
        <p className={styles.footerNote}>Libro does not track users or store personal reading data.</p>
      </footer>
    </div>
  );
}
