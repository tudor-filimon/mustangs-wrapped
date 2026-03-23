import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapGraphic from '../components/MapGraphic'; 
import '../components/styles.css';
import api from '../utils/api'; // Using your real API!

export default function CampusMaps() {
  const [activeBuilding, setActiveBuilding] = useState(null);
  const [networkActivity, setNetworkActivity] = useState([]); 
  const navigate = useNavigate(); 

  // These must match the exact names you used inside MapGraphic.jsx!
  const CAMPUS_BUILDINGS = [
    'Weldon Library', 'UCC', 'Rec Centre', 'Ivey Building', 
    'Taylor Library', 'Social Science Centre', 'Alumni Hall', 'Spencer Eng Building'
  ];

  // 1. FETCH REAL LIVE DATA
  useEffect(() => {
    let mounted = true;

    const fetchNetworkLocations = async () => {
      try {
        // Calls the /api/friends/activity endpoint defined in your friends.js route
        const data = await api.getFriendsActivity(); 
        
        if (mounted && data.activity) {
          // Filter for friends who are actually playing music right now
          const activeFriends = data.activity
            .filter(item => item.playing) 
            .map((item, index) => {
              
              // We assign them to a building deterministically based on their ID character code.
              // This acts as our "location logic" without needing to track physical GPS.
              const buildingIndex = item.user.id 
                ? item.user.id.charCodeAt(0) % CAMPUS_BUILDINGS.length 
                : index % CAMPUS_BUILDINGS.length;

              return {
                id: item.user.id,
                username: item.user.display_name || 'Unknown',
                building: CAMPUS_BUILDINGS[buildingIndex],
                song_name: item.song,
                artist_name: item.artists,
                album_image_url: item.image || 'https://via.placeholder.com/60'
              };
            });
            
          setNetworkActivity(activeFriends);
        }
      } catch (error) {
        console.error("Failed to fetch friends activity", error);
      }
    };

    fetchNetworkLocations();
    
    // Auto-refresh every 10 seconds to keep the map feeling "Live"
    const interval = setInterval(fetchNetworkLocations, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // 2. DYNAMIC MAP COUNTS: Automatically counts how many people are in each building
  const liveUsers = networkActivity.reduce((acc, curr) => {
    if (curr.building) {
      acc[curr.building] = (acc[curr.building] || 0) + 1;
    }
    return acc;
  }, {});

  // 3. MODAL FILTER: Grabs only the specific friends inside the building you just clicked
  const activeListeners = networkActivity.filter(person => person.building === activeBuilding);

  const buildingImages = {
    'Weldon Library': '/src/assets/images/weldon.jpg',
    'UCC': '/src/assets/images/ucc.jpg',
    'Rec Centre': '/src/assets/images/rec-centre.jpg',
    'Ivey Building': '/src/assets/images/ivey.jpg',
    'Taylor Library': '/src/assets/images/taylor.jpg',
    'Social Science Centre': '/src/assets/images/social-science.jpg',
    'Alumni Hall': '/src/assets/images/alumni.jpg',
    'Spencer Eng Building': '/src/assets/images/spencer.jpg',
    'Entrepreneurship Building': '/src/assets/images/entrepreneurship.jpg',
    'Natural Sciences Centre': '/src/assets/images/natural-sciences.jpg',
    'Thompson': '/src/assets/images/thompson.jpg',
    'Amit Chakma Engineering Building': '/src/assets/images/amit-chakma-engineering.jpg',
    'Law Library': '/src/assets/images/law-library.jpg',
    'Thames Hall': '/src/assets/images/thames-hall.jpg',
    '3M Centre': '/src/assets/images/3m-centre.jpg',
    'Sommerville House': '/src/assets/images/sommerville-house.jpg',
    'Middlesex College': '/src/assets/images/middlesex-college.jpg',
    'University College': '/src/assets/images/university-college.jpg',
    'Arts and Humanities': '/src/assets/images/arts-and-humanities.jpg',
    'Music Building': '/src/assets/images/music-building.jpg',
    'Talbot College': '/src/assets/images/talbot-college.jpg',
    'IGAB': '/src/assets/images/igab.jpg',
    'International Graduate Affairs Building': '/src/assets/images/igab.jpg',
  };

  const handleBuildingClick = (buildingName) => {
    setActiveBuilding(buildingName);
  };

  return (
    <div className="campus-page-wrapper">
      
      <div className="global-gradient-bg"></div>
      <div className="infinite-grid-bg"></div>

      <button 
        className="feed-back-btn" 
        style={{ position: 'absolute', top: '30px', left: '40px', zIndex: 100 }} 
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      {/* Main Interactive Map */}
      <div className="campus-maps-container" style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
        {/* The vector map now receives the live, dynamically calculated numbers! */}
        <MapGraphic handleBuildingClick={handleBuildingClick} liveUsers={liveUsers} />
      </div>

      {activeBuilding && (
        <div className="campus-modal-overlay" onClick={() => setActiveBuilding(null)}>
          <div className="campus-modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-left-3d" style={{ padding: '24px', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden', border: '2px solid rgba(167, 139, 250, 0.4)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <img 
                  src={buildingImages[activeBuilding] || `https://via.placeholder.com/600x800/1f1041/a78bfa?text=${activeBuilding.replace(/ /g, '+')}`} 
                  alt={activeBuilding}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            <div className="modal-right-feed">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(167, 139, 250, 0.3)', paddingBottom: '1.5rem' }}>
                <div>
                  <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', textTransform: 'uppercase' }}>{activeBuilding}</h1>
                  <p style={{ color: '#1db954', fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#1db954', borderRadius: '50%', boxShadow: '0 0 10px #1db954' }}></span>
                    {/* Displays the exact length of the filtered array! */}
                    {activeListeners.length} Active Listeners
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
                
                {/* 4. RENDERING THE SPECIFIC FRIENDS IN THE MODAL */}
                {activeListeners.length > 0 ? (
                  activeListeners.map((listener) => (
                    <div key={listener.id} style={{ padding: '1.2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', marginTop: '1rem', borderLeft: '4px solid #1db954', display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <img 
                        src={listener.album_image_url} 
                        alt="album art" 
                        style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }} 
                      />
                      <div>
                        <p style={{ margin: 0, fontWeight: 'bold', color: 'white', fontSize: '1.1rem' }}>🎧 {listener.username}</p>
                        <p style={{ margin: '0.4rem 0 0 0', color: '#a78bfa', fontSize: '0.95rem' }}>"{listener.song_name}" - {listener.artist_name}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ marginTop: '1.5rem', color: '#a78bfa', fontStyle: 'italic' }}>None of your friends are currently listening here.</p>
                )}
                
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}