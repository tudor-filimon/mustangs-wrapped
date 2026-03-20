import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapGraphic from '../components/MapGraphic'; 
import '../components/styles.css';

export default function CampusMaps() {
  
  const [activeBuilding, setActiveBuilding] = useState(null);
  const navigate = useNavigate(); 

  const liveUsers = {
    'Weldon Library': 24,
    'Building 2': 0,
    'Building 3': 12,
  };

  const handleBuildingClick = (buildingName) => {
    setActiveBuilding(buildingName);
  };

  return (
    <div className="campus-page-wrapper">
      
      {/* Background Elements */}
      <div className="global-gradient-bg"></div>
      <div className="infinite-grid-bg"></div>

      {/* Navigation (Updated to match Feed Page) */}
      <button 
        className="feed-back-btn" 
        style={{ position: 'absolute', top: '30px', left: '40px', zIndex: 100 }} 
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      {/* Main Interactive Map */}
      <div className="campus-maps-container" style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
        {/* WE INJECT THE MAP HERE */}
        <MapGraphic handleBuildingClick={handleBuildingClick} liveUsers={liveUsers} />
      </div>

      {/* The Split Screen Modal*/}
      {activeBuilding && (
        <div className="campus-modal-overlay" onClick={() => setActiveBuilding(null)}>
          <div className="campus-modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* LEFT SIDE: 3D Hologram */}
            <div className="modal-left-3d">
              <div className="tilted-hologram">
                {/* WE INJECT THE EXACT SAME MAP HERE (But disabled clicking inside the modal) */}
                <MapGraphic handleBuildingClick={() => {}} liveUsers={liveUsers} />
              </div>
            </div>

            {/* RIGHT SIDE: Live Feed */}
            <div className="modal-right-feed">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(167, 139, 250, 0.3)', paddingBottom: '1.5rem' }}>
                <div>
                  <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', textTransform: 'uppercase' }}>{activeBuilding}</h1>
                  <p style={{ color: '#1db954', fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#1db954', borderRadius: '50%', boxShadow: '0 0 10px #1db954' }}></span>
                    {liveUsers[activeBuilding] || 0} Active Listeners
                  </p>
                </div>
                
                <button 
                  onClick={() => setActiveBuilding(null)} 
                  style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '2rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginTop: '2rem', flex: 1, overflowY: 'auto' }}>
                <h3 style={{ color: '#a78bfa', letterSpacing: '2px' }}>LIVE FREQUENCIES</h3>
                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', marginTop: '1rem', borderLeft: '4px solid #1db954' }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>🎧 User_492 is listening to:</p>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#a78bfa' }}>"FE!N" - Travis Scott</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}