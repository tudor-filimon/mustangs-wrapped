import React, { useState, useEffect } from 'react';
import '../components/styles.css';
import blackSpotify from '../assets/images/blackSpotifyBackgroundIcon.svg';
import purpleSpotify from '../assets/images/purpleSpotifyBackgroundIcon.svg';
import blackHorse from '../assets/images/movingBackgroundBlackHorse.svg';
import whiteHorse from '../assets/images/whiteHorseBackgroundIcon.svg';
import Mustang from '../assets/images/WesternMustangLogo1.svg';

const FLOATER_ICONS = [
  <img src={blackSpotify} alt="Black Spotify" />, 
  <img src={whiteHorse} alt="White Horse" />, 
  <img src={blackHorse} alt="Black Horse" />, 
  <img src={Mustang} alt="Mustang Logo" />,
  <img src={purpleSpotify} alt="Purple Spotify" />
];

const FLOATER_COUNT = 25; 

export default function AnimatedBackground({ customItems = [] }) {
  // Combine the default icons with any custom text/items passed in
  const allItems = [...FLOATER_ICONS, ...customItems];

  return (
    <div className="floating-bg-container">
      {[...Array(FLOATER_COUNT)].map((_, i) => (
        <BackgroundFloater 
          key={i} 
          icon={allItems[i % allItems.length]} 
        />
      ))}
    </div>
  );
}

function BackgroundFloater({ icon }) {
  // Lazily initialize state. If they've already dispersed this session, 
  // start them immediately at a random location instead of 0,0.
  const [position, setPosition] = useState(() => {
    const hasDispersed = sessionStorage.getItem('backgroundDispersed');
    if (hasDispersed) {
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight
      };
    }
    return { x: 0, y: 0 };
  });

  useEffect(() => {
    // Flag that the explosion has happened for this session
    const hasDispersed = sessionStorage.getItem('backgroundDispersed');
    if (!hasDispersed) {
      sessionStorage.setItem('backgroundDispersed', 'true');
    }

    const move = () => {
      const newX = Math.random() * (window.innerWidth - 50);
      const newY = Math.random() * (window.innerHeight - 50);
      setPosition({ x: newX, y: newY });
    };

    // FIX: Always trigger a move 100ms after the page loads so the CSS 
    // transition kicks in instantly, instead of waiting 8 seconds!
    const initialTimer = setTimeout(move, 100);
    const interval = setInterval(move, 8000);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <div 
      className="floater" 
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      {icon}
    </div>
  );
}
