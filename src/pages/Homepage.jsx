import React, { useState } from 'react';
import '../components/styles.css';

// === IMPORT YOUR IMAGES HERE ===
// import profilePic from '../assets/images/my-profile.png';


function HomePage() {
  // Toggle this to see the Light/Dark mode changes
  const [theme, setTheme] = useState('dark'); 

  return (
    <div className={`home-container ${theme}`}>
      
      {/* === HEADER === */}
      <header className="header">
        <div className="header-left">
          {/* Toggle Button */}
          <button 
             className="pill-btn" 
             style={{ padding: '8px 16px', fontSize: '1.2rem', minWidth: 'auto' }}
             onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          
          <div className="search-bar">
            <span>🔍</span>
            <input type="text" placeholder="Find what Mustangs are listening to" />
          </div>
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
          <button className="pill-btn side-btn"> Account</button>

    {/*Wrapped Sign in the middle. Each individual letter in a span so i can put hover effect animations on them  */}
          <h1 className="title">
            <span>M</span><span>u</span><span>s</span><span>t</span><span>a</span><span>n</span><span>g</span>
            <span> </span><span>W</span><span>r</span><span>a</span><span>p</span><span>p</span><span>e</span><span>d</span>
            </h1>
          
          <button className="pill-btn side-btn">👥 Friends</button>
        </div>

        {/* ROW 3 */}
        <div className="row bottom-row">
          <button className="pill-btn">⚙️ Settings</button>
          <button className="pill-btn">🦄 Mustang Wrapped</button>
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
          <div className="album-art"></div>
        </div>
      </div>

    </div>
  );
}

export default HomePage;