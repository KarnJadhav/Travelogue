import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AboutPage.css';

const ROLE_SECTIONS = [
  {
    label: 'Tourists',
    title: 'Plan with confidence',
    copy: 'Explore destinations, compare verified guides and hotels, build itineraries, and keep your journey history in one place.',
  },
  {
    label: 'Guides',
    title: 'Showcase local expertise',
    copy: 'Manage profiles, availability, tours, bookings, payments, reviews, and traveler conversations from a focused dashboard.',
  },
  {
    label: 'Hotels',
    title: 'Connect with better guests',
    copy: 'Publish hotel details, rooms, amenities, booking status, guest insights, and service feedback in a dedicated workspace.',
  },
];

const PRINCIPLES = [
  'Verified local participation',
  'Practical planning over generic suggestions',
  'Clear dashboards for each travel role',
  'Travel stories that stay connected to real trips',
];

const STATS = [
  { value: '3', label: 'role-based dashboards' },
  { value: '24/7', label: 'trip support workflows' },
  { value: 'AI', label: 'itinerary and guide assistance' },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <main className="about-shell">
      <header className="about-header">
        <button type="button" className="about-brand" onClick={() => navigate('/')}>
          Travelogue
        </button>
        <nav className="about-nav" aria-label="About page navigation">
          <button type="button" onClick={() => navigate('/')}>Home</button>
          <button type="button" onClick={() => navigate('/login')}>Sign In</button>
        </nav>
      </header>

      <section className="about-hero">
        <div className="about-hero-media" aria-hidden="true" />
        <div className="about-hero-copy">
          <p className="about-kicker">About Travelogue</p>
          <h1>Travel planning, local trust, and shared stories in one platform.</h1>
          <p>
            Travelogue brings tourists, professional guides, and hotels into a single connected
            experience, so every trip can move from discovery to booking to memory-making without
            losing context.
          </p>
          <div className="about-actions">
            <button type="button" className="about-primary" onClick={() => navigate('/register')}>
              Join Travelogue
            </button>
            <button type="button" className="about-secondary" onClick={() => navigate('/login')}>
              Open Dashboard
            </button>
          </div>
        </div>
      </section>

      <section className="about-intro" aria-label="Platform overview">
        <div>
          <p className="about-section-label">Why it exists</p>
          <h2>Modern travel needs more than a list of places.</h2>
        </div>
        <p>
          Travelers need reliable people, live context, routes that make sense, safe booking flows,
          and a way to remember the experience afterward. Travelogue is designed around that full
          journey instead of treating planning, service providers, and travel stories as separate
          tools.
        </p>
      </section>

      <section className="about-stats" aria-label="Platform highlights">
        {STATS.map((item) => (
          <div key={item.label} className="about-stat">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="about-roles" aria-label="Who Travelogue serves">
        <div className="about-section-heading">
          <p className="about-section-label">Built for the whole trip network</p>
          <h2>One platform, three connected experiences.</h2>
        </div>
        <div className="about-role-grid">
          {ROLE_SECTIONS.map((role) => (
            <article key={role.label} className="about-role-card">
              <span>{role.label}</span>
              <h3>{role.title}</h3>
              <p>{role.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-trust">
        <div className="about-trust-copy">
          <p className="about-section-label">Trust model</p>
          <h2>Designed around verified identities, visible service history, and clear action.</h2>
          <p>
            Guide approval, hotel profile management, booking records, reviews, moderation tools,
            notifications, and real-time chat all work together to reduce uncertainty before and
            during a trip.
          </p>
        </div>
        <div className="about-principles" aria-label="Travelogue principles">
          {PRINCIPLES.map((item) => (
            <div key={item} className="about-principle">
              <span aria-hidden="true" />
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-story">
        <div className="about-story-image" aria-hidden="true" />
        <div className="about-story-copy">
          <p className="about-section-label">The bigger idea</p>
          <h2>Trips should become useful stories, not scattered screenshots.</h2>
          <p>
            Travelogue keeps the practical side of travel close to the emotional side: plans,
            routes, bookings, chats, reviews, photos, and travelogues can all support each other.
            The result is a platform that helps people travel better now and remember it better
            later.
          </p>
        </div>
      </section>

      <section className="about-cta">
        <h2>Start building your travel network.</h2>
        <p>Choose Tourist, Guide, or Hotel during registration and enter the dashboard made for you.</p>
        <button type="button" onClick={() => navigate('/register')}>Create Account</button>
      </section>
    </main>
  );
}
