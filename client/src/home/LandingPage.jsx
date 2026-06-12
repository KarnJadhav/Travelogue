import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const FEATURES = [
  {
    title: 'Smart Route Planner',
    copy: 'Plan realistic routes with live alternatives for road, rail, and local transfers.',
  },
  {
    title: 'Verified Local Experts',
    copy: 'Connect with trusted guides, hotels, and local operators directly in one dashboard.',
  },
  {
    title: 'Travelogue Timeline',
    copy: 'Capture, organize, and share your complete journey with rich media and notes.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    const node = document.getElementById(id);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="lp-shell">
      <header className="lp-header">
        <button type="button" className="lp-brand" onClick={() => scrollToSection('top')}>
          <span className="lp-brand-mark">Travelogue</span>
        </button>
        <nav className="lp-nav">
          <button type="button" onClick={() => scrollToSection('features')}>Features</button>
          <button type="button" onClick={() => navigate('/about')}>About</button>
        </nav>
        <button type="button" className="lp-login-btn" onClick={() => navigate('/login')}>
          Login / Sign Up
        </button>
      </header>

      <section id="top" className="lp-hero">
        <div className="lp-hero-overlay" />
        <div className="lp-hero-content">
          <h1>
            Discover Your Next
            <span>Adventure</span>
          </h1>
          <p>
            Explore breathtaking destinations, connect with expert guides, and create unforgettable memories.
          </p>
        </div>
      </section>

      <section id="features" className="lp-section lp-features">
        <div className="lp-heading">
          <h2>Built for Modern Travel</h2>
          <p>Everything you need to plan, navigate, and share your journey.</p>
        </div>
        <div className="lp-feature-grid">
          {FEATURES.map((item) => (
            <article key={item.title} className="lp-feature-card">
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="lp-section lp-cta">
        <h2>Ready to Start Your Journey?</h2>
        <p>Join thousands of travelers who trust Travelogue for their adventures</p>
        <p className="lp-admin-note">
          Admin access is issued by the system only. New registrations are available for Tourist, Guide, and Hotel accounts.
        </p>
        <button type="button" onClick={() => navigate('/register')}>Get Started Today</button>
      </section>

      <footer className="lp-footer">
        <h3>Travelogue</h3>
        <p>Your gateway to extraordinary adventures</p>
        <small>© 2026 Travelogue. All rights reserved.</small>
      </footer>
    </div>
  );
}



