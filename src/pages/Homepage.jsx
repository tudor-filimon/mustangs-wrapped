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
          <div className="circle-icon wfn">WFN</div>
          <div className="circle-icon red">♫</div>
          <div className="circle-icon dark">🐎</div>
          <div className="circle-icon green">Spotify</div>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <main className="main-layout">
        
        {/* ROW 1 */}
        <div className="row top-row">
          <button className="pill-btn">🗺️ Campus Maps</button>
          <button className="pill-btn">🎵 Top Songs</button>
        </div>

        {/* ROW 2 - STRAIGHT LINE */}
        <div className="row middle-row">
          <button className="pill-btn side-btn">👤 Account</button>
          
          <h1 className="central-title">Mustang Wrapped</h1>
          
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