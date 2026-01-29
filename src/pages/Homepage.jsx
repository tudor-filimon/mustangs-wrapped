import React, { useState, useEffect } from 'react';
import '../components/styles.css';
import sunIcon from '../assets/images/sunIcon.svg';
import moonIcon from '../assets/images/moonIcon.svg';
import blackSpotify from '../assets/images/blackSpotifyBackgroundIcon.svg';
import purpleSpotify from '../assets/images/purpleSpotifyBackgroundIcon.svg';
import blackHorse from '../assets/images/movingBackgroundBlackHorse.svg';
import whiteHorse from '../assets/images/whiteHorseBackgroundIcon.svg';
import Mustang from '../assets/images/WesternMustangLogo1.svg';



// === BACKGROUND ICONS CONFIGURATION ===
// Placeholders (Emojis) - Replace these with your SVG components or <img> tags later
const FLOATER_ICONS = [
  <img src={blackSpotify} alt="Black Spotify"/>, 
  <img src={whiteHorse} alt="Black Spotify"/>, 
  <img src={blackHorse} alt="Black Spotify" />, 
  <img src={Mustang} alt="Black Spotify"/>,
  <img src={purpleSpotify} alt="Black Spotify"/>
]; 
const FLOATER_COUNT = 25; // Number of floating items

function HomePage() {
  // Toggle this to see the Light/Dark mode changes
  const [theme, setTheme] = useState('dark'); 

  return (
    <div className={`home-container ${theme}`}>
      
      {/* === FLOATING BACKGROUND LAYER === */}
      <div className="floating-bg-container">
        {[...Array(FLOATER_COUNT)].map((_, i) => (
          <BackgroundFloater key={i} icon={FLOATER_ICONS[i % FLOATER_ICONS.length]} />
        ))}
      </div>

      {/* === HEADER === */}
      <header className="header">
        
          <button 
             className="pill-btn theme-toggle" 
             onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
            <img src={sunIcon} alt="Sun Icon" className='darklightmode' />
          ) : (
            <img src={moonIcon} alt="Moon Icon" className='darklightmode' />
          )}
          </button>
          
          <div className="search-bar">
            <span className='searchIcon'><img src="src\assets\images\searchIcon.svg" alt="search icon" /></span>
            <input type="text" placeholder="Find what Mustangs are listening to" />
          </div>
      

        <div className="header-center">
          <h2>Hi, Username</h2>
        </div>

        <div className="header-right">
          <div className="circle-icon wfn"><img src="src\assets\images\WFNLogo-WhiteRound.png" alt="WFN logo" /></div>
          <div className="circle-icon mustangs"><img src="src\assets\images\WesternMustangLogo1.svg" alt="Mustangs Logo"/></div>
          <div className="circle-icon spotify"><img src="src\assets\images\Spotify Logo.png" alt="Spotify Logo" /></div>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <main className="main-layout">
        
        {/* ROW 1: Top Row For Campus Maps */}
        <div className="row top-row">
          <button className="pill-btn"><img src="src\assets\images\mapsIcon.svg" alt="Map Icon"/> Campus Maps</button>
          <button className="pill-btn"><img src="src\assets\images\musicalNote.svg" alt="Musical Note Icon" /> Top Songs</button>
        </div>

        {/* ROW 2 - STRAIGHT LINE */}
        <div className="row middle-row">
          <button className="pill-btn side-btn"><img src="src\assets\images\Account.svg" alt="Account Icon" />Account</button>

    {/*Wrapped Sign in the middle. Each individual letter in a span so i can put hover effect animations on them  */}
          <h1 className="title">
            <span>M</span><span>u</span><span>s</span><span>t</span><span>a</span><span>n</span><span>g</span>
            <span> </span><span>W</span><span>r</span><span>a</span><span>p</span><span>p</span><span>e</span><span>d</span>
            </h1>
          
          <button className="pill-btn side-btn"><img src="src\assets\images\friendsButtonIcon.svg" alt="Friends Icon" /> Friends</button>
        </div>

        {/* ROW 3 */}
        <div className="row bottom-row">
          <button className="pill-btn"><img src="src\assets\images\SettingsIcon.svg" alt="Settings Icons"/>Settings</button>
          <button className="pill-btn"><img src="src\assets\images\horseIcon.svg" alt="Mustang Wrapped Icon" />Mustang Wrapped</button>
        </div>

      </main>

      {/* === FOOTER === */}
      <div className="now-playing">
        <div className="np-left">Now Playing:</div>
        <div className="np-center">
          <div className="visualizer-container">
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
        </div>
        <div className="np-right">
          <span>Smoking out the Window</span>
          <div className="album-art"><img src="src\assets\images\albumArtIcon.svg" alt="Album Art" /></div>
        </div>
      </div>

    </div>
  );
}

// === BACKGROUND FLOATER COMPONENT ===
// This component handles the random movement logic for each individual icon
function BackgroundFloater({ icon }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // 1. Initial random placement
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight;
    setPosition({ x: startX, y: startY });

    // 2. Logic to pick a new random spot
    const move = () => {
      // Subtract 50px to keep it mostly on screen
      const newX = Math.random() * (window.innerWidth - 50);
      const newY = Math.random() * (window.innerHeight - 50);
      setPosition({ x: newX, y: newY });
    };

    // 3. Start moving shortly after mounting
    const initialTimer = setTimeout(move, 100);

    // 4. Repeat move every 8 seconds (matches CSS transition)
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

export default HomePage;