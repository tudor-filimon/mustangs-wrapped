import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="home-container dark page-transition">
      <AnimatedBackground />
      <div className="coming-soon-content">
        <h1 className="coming-soon-title">coming soon...</h1>
        <button className="pill-btn coming-soon-back" onClick={() => navigate('/home')}>
          ← Back
        </button>
      </div>
    </div>
  );
}
