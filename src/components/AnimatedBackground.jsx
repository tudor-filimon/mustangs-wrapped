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

// Floater Item count
const FLOATER_COUNT = 25; 

export default function AnimatedBackground() {
  return (
    <div className="floating-bg-container">
      {[...Array(FLOATER_COUNT)].map((_, i) => (
        <BackgroundFloater key={i} icon={FLOATER_ICONS[i % FLOATER_ICONS.length]} />
      ))}
    </div>
  );
}


function BackgroundFloater({ icon }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight;
    setPosition({ x: startX, y: startY });


// logic to pick a new random spot. did -50 so that it stays withing screen borders 
    const move = () => {
      const newX = Math.random() * (window.innerWidth - 50);
      const newY = Math.random() * (window.innerHeight - 50);
      setPosition({ x: newX, y: newY });
    };

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