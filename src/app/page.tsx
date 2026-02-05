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
  const [microcopyIndex, setMicrocopyIndex] = useState(0);

  const microcopyLines = [
    "Someone is reading right now.",
    "A page was turned a moment ago.",
    "Silence is shared here."
  ];

  // Rotate microcopy every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMicrocopyIndex((prev) => (prev + 1) % microcopyLines.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) return <div style={{ background: '#F6F2ED', height: '100vh' }} />;

  if (showAuth) {
    return <Auth onBack={() => setShowAuth(false)} />;
  }

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.logo}>Libro</div>
        <div className={styles.navLinks}>
          <a href="#how-it-works" className={styles.navLink}>Philosophy</a>
          <button
            onClick={() => setShowAuth(true)}
            className={styles.navLink}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          >
            Enter
          </button>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.badge}>EDVENTURES 2026 BATCH</div>
        <h1 className={styles.title}>
          Read Together.<br />
          Focus Better.
        </h1>
        <p className={styles.subtitle}>
          A distraction-free digital space where readers build discipline, attention, and deep reading habits through shared silence.
        </p>
        <div className={styles.ctaContainer}>
          <button className={styles.ctaButton} onClick={() => setShowAuth(true)}>
            Start a Reading Session
          </button>
          <button className={styles.secondaryButton} onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
            See How It Works
          </button>
        </div>
      </section>

      {/* Mystery Element: Rotating Microcopy */}
      <div className={styles.mysterySection}>
        <div className={styles.microcopy} key={microcopyIndex}>
          {microcopyLines[microcopyIndex]}
        </div>
      </div>

      <section id="how-it-works" className={styles.section}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>The Problem of Noise</h2>
          <p className={styles.sectionText}>
            Digital reading is filled with distractions, notifications, and infinite feeds.
            We have lost the ability to sit still with a single idea.
            The modern web is designing us to be shallow.
          </p>
        </div>
      </section>

      <section id="about" className={styles.section}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>The Sanctuary</h2>
          <p className={styles.sectionText}>
            Libro is an antithesis to the noisy internet.
            It is a place where attention is treated as a sacred resource.
            We gather in real-time, set intentions, and read in shared presence.
          </p>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureTitle}>Monastic Focus</div>
          <p className={styles.featureText}>
            Distraction-free rooms designed entirely for the act of reading. No gamification, just presence.
          </p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureTitle}>Shared Intention</div>
          <p className={styles.featureText}>
            Declare your goal before you begin. The act of commitment creates the discipline to follow through.
          </p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureTitle}>Deep Retention</div>
          <p className={styles.featureText}>
            Capture your thoughts as they arise. Notes are tied to the context of the session.
          </p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureTitle}>Contextual Discourse</div>
          <p className={styles.featureText}>
            Discussion is limited and intentional. We speak only to deepen understanding, not to make noise.
          </p>
        </div>
      </section>

      <section id="impact" className={styles.section} style={{ borderTop: 'none' }}>
        <div className={styles.sectionContent} style={{ maxWidth: '1000px' }}>
          <h2 className={styles.sectionTitle}>Aligned with UN SDG 4</h2>
          <p className={styles.sectionText} style={{ maxWidth: '700px', margin: '0 auto' }}>
            Libro is built to directly support the United Nations Sustainable Development Goal 4: Quality Education.
          </p>

          <div className={styles.sdgGrid}>
            <div className={styles.sdgCard}>
              <span className={styles.sdgNumber}>Target 4.3</span>
              <h3 className={styles.sdgTitle}>Equal Access</h3>
              <p className={styles.sdgText}>
                Democratizing access to technical and vocational resources. The Archives ensure every student has the tools to succeed, regardless of background.
              </p>
            </div>

            <div className={styles.sdgCard}>
              <span className={styles.sdgNumber}>Target 4.5</span>
              <h3 className={styles.sdgTitle}>Equity & Inclusion</h3>
              <p className={styles.sdgText}>
                Eliminating disparities in education. By digitizing knowledge, we level the playing field for first-generation learners and marginalized groups.
              </p>
            </div>

            <div className={styles.sdgCard}>
              <span className={styles.sdgNumber}>Target 4.4</span>
              <h3 className={styles.sdgTitle}>Relevant Skills</h3>
              <p className={styles.sdgText}>
                Building deep literacy and focus. In an age of distraction, the ability to read deeply is the most valuable skill for employment and life.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <a href="#about">About</a>
          <a href="#how-it-works">Manifesto</a>
          <a href="mailto:help@libro.co.in">Contact</a>
        </div>
        <p className={styles.footerNote}>Quietly built for the EdVentures 2026 Batch.</p>
      </footer>
    </div>
  );
}
