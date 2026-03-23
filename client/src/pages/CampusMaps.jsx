import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapGraphic from '../components/MapGraphic'; 
import '../components/styles.css';
import api from '../utils/api'; 
import { useAuth } from '../context/AuthContext';

// GPS coordinates for mathematical local geofencing (Privacy First)
const BUILDING_COORDS = [
  { name: 'Weldon Library', lat: 43.0097, lng: -81.2734 },
  { name: 'UCC', lat: 43.0088, lng: -81.2739 },
  { name: 'Social Science Centre', lat: 43.0094, lng: -81.2755 },
  { name: 'Natural Sciences Centre', lat: 43.0110, lng: -81.2743 },
  { name: 'University College', lat: 43.0105, lng: -81.2718 },
  { name: 'Ivey Building', lat: 43.0016, lng: -81.2740 },
  { name: 'Rec Centre', lat: 43.0011, lng: -81.2720 },
  { name: 'Alumni Hall', lat: 43.0076, lng: -81.2735 },
  { name: 'Taylor Library', lat: 43.0116, lng: -81.2764 },
  { name: 'Spencer Eng Building', lat: 43.0069, lng: -81.2766 },
  { name: 'Entrepreneurship Building', lat: 43.0065, lng: -81.2750 },
  { name: 'Music Building', lat: 43.0084, lng: -81.2709 },
  { name: 'Talbot College', lat: 43.0090, lng: -81.2699 },
  { name: 'Middlesex College', lat: 43.0125, lng: -81.2701 },
  { name: 'Arts and Humanities', lat: 43.0095, lng: -81.2720 },
];

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function CampusMaps() {
  const [activeBuilding, setActiveBuilding] = useState(null);
  const [networkActivity, setNetworkActivity] = useState([]); 
  const [myActualBuilding, setMyActualBuilding] = useState(null); 
  const [isLocating, setIsLocating] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // Premium Toast Notification System
  const [toast, setToast] = useState(null);
  
  const navigate = useNavigate(); 
  const { user } = useAuth();

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500); 
  };

  const handleLocateClick = () => setShowPrivacyModal(true); 

  // THE MANUAL CHECK-IN: Beams the building string directly to the DB!
  const handleManualCheckIn = async (buildingName) => {
    try {
      await api.updateProfile({ current_building: buildingName });
      setMyActualBuilding(buildingName);
      showToast(`Successfully checked in to ${buildingName}!`);
    } catch (error) {
      console.error("Failed to manual check-in", error);
      showToast("Failed to check in to building.", true);
    }
  };

  // THE AUTO SCAN: Math done locally, pushes string to DB
  const executeLocationScan = () => {
    setShowPrivacyModal(false);
    
    if (!('geolocation' in navigator)) {
      showToast('Geolocation is not supported by your browser.', true);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        let closest = null;
        let minDistance = Infinity;

        BUILDING_COORDS.forEach(building => {
          const dist = getDistance(latitude, longitude, building.lat, building.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = building;
          }
        });

        if (closest && minDistance < 250) {
          try {
            await api.updateProfile({ current_building: closest.name });
            setMyActualBuilding(closest.name);
            showToast(`Auto-mapped to ${closest.name}!`);
          } catch (err) {
            console.error("Failed to update database", err);
          }
        } else {
          try {
            await api.updateProfile({ current_building: null });
            showToast("Too far from a mapped building. Location hidden.", true);
          } catch (err) {}
        }
        setIsLocating(false);
      },
      (error) => {
        console.error(error);
        showToast('Could not get your location. Check browser permissions.', true);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  useEffect(() => {
    let mounted = true;

    const fetchNetworkLocations = async () => {
      try {
        const [friendsData, myData] = await Promise.all([
          api.getFriendsActivity(),
          api.getCurrentPlaying()
        ]);
        
        let activeUsers = [];

        if (friendsData && friendsData.activity) {
          const activeFriends = friendsData.activity
            // REMOVED item.playing restriction so paused friends still show up!
            .filter(item => item.user.current_building) 
            .map(item => {
              const isPlaying = item.playing;
              // Fallback to their recent track if they paused Spotify
              const trackData = isPlaying ? item : (item.recentTrack || {});

              return {
                id: item.user.id,
                username: item.user.display_name || 'Unknown',
                building: item.user.current_building, 
                song_name: trackData.song || 'Paused',
                artist_name: trackData.artists || 'Nothing playing',
                album_image_url: trackData.image || 'https://via.placeholder.com/60',
                isPlaying: isPlaying
              };
            });
          activeUsers = [...activeFriends];
        }

        // Add yourself to the map as long as you've checked in somewhere
        if (user && myActualBuilding) {
          const isPlaying = myData && myData.playing;
          const trackData = isPlaying ? myData : (myData?.recentTrack || {});

          activeUsers.push({
            id: user.id,
            username: user.display_name || 'You',
            building: myActualBuilding,
            song_name: trackData.song || 'Paused',
            artist_name: trackData.artists || 'Nothing playing',
            album_image_url: trackData.image || 'https://via.placeholder.com/60',
            isPlaying: isPlaying
          });
        }

        if (mounted) {
          setNetworkActivity(activeUsers);
        }
      } catch (error) {
        console.error("Failed to fetch friends activity", error);
      }
    };

    fetchNetworkLocations();
    const interval = setInterval(fetchNetworkLocations, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [myActualBuilding, user]); 

  const liveUsers = networkActivity.reduce((acc, curr) => {
    if (curr.building) acc[curr.building] = (acc[curr.building] || 0) + 1;
    return acc;
  }, {});

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

      {/* PREMIUM TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(31, 16, 65, 0.95)',
          color: toast.isError ? '#ef4444' : '#1db954',
          padding: '16px 32px',
          borderRadius: '50px',
          border: `1px solid ${toast.isError ? '#ef4444' : '#1db954'}`,
          boxShadow: `0 10px 30px ${toast.isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(29, 185, 84, 0.3)'}`,
          zIndex: 99999,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 'bold',
          fontSize: '14px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          backdropFilter: 'blur(10px)',
          animation: 'slideDown 0.3s ease forwards'
        }}>
          {/* Dynamic Toast Content with Icon */}
          <div className="toast-content-wrapper">
            {!toast.isError && <span className="icon-location" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* CSS Animation for the Toast */}
      <style>
        {`
          @keyframes slideDown {
            from { top: -50px; opacity: 0; }
            to { top: 30px; opacity: 1; }
          }
        `}
      </style>

      <button 
        className="feed-back-btn" 
        style={{ position: 'absolute', top: '30px', left: '40px', zIndex: 100 }} 
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      {/* AUTO GPS LOCATOR BUTTON */}
      <div style={{ position: 'absolute', top: '30px', right: '40px', zIndex: 100 }}>
        <button 
          onClick={handleLocateClick}
          disabled={isLocating}
          style={{ 
            background: 'rgba(31, 16, 65, 0.8)', 
            color: '#1db954', 
            padding: '12px 24px', 
            borderRadius: '12px', 
            border: '1px solid #1db954',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 0 20px rgba(29, 185, 84, 0.3)',
            cursor: isLocating ? 'wait' : 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 'bold',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {isLocating ? 'Scanning...' : (
            <>
              <span className="icon-location" /> Auto GPS Scan
            </>
          )}
        </button>
      </div>

      {/* PRIVACY WARNING MODAL */}
      {showPrivacyModal && (
        <div className="campus-modal-overlay" onClick={() => setShowPrivacyModal(false)} style={{ zIndex: 9999 }}>
          <div className="campus-modal-content" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '500px', height: 'auto', padding: '40px', textAlign: 'center', 
            background: 'rgba(13, 6, 38, 0.95)', border: '2px solid #a78bfa', display: 'block'
          }}>
            <h2 style={{ color: 'white', marginTop: 0, fontSize: '2rem', textTransform: 'uppercase' }}>Privacy Notice</h2>
            <div style={{ background: 'rgba(29, 185, 84, 0.1)', borderLeft: '4px solid #1db954', padding: '15px', textAlign: 'left', marginBottom: '30px' }}>
              <p style={{ color: '#a78bfa', fontSize: '1.1rem', lineHeight: '1.6', margin: 0 }}>
                We will ask your browser for your current location to place you on the map. 
                <br/><br/>
                <strong style={{ color: '#1db954' }}>We DO NOT store your exact GPS coordinates.</strong> 
                <br/><br/>
                Your device calculates which building you are in locally, and we only save the name of the building (e.g. "Weldon Library") to our database so your friends can see what you are listening to.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowPrivacyModal(false)}
                style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeLocationScan}
                style={{ background: '#1db954', border: 'none', color: '#1f1041', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                I Understand, Locate Me
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Map */}
      <div className="campus-maps-container" style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
        <MapGraphic handleBuildingClick={handleBuildingClick} liveUsers={liveUsers} />
      </div>

      {activeBuilding && (
        <div className="campus-modal-overlay" onClick={() => setActiveBuilding(null)}>
          <div className="campus-modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-left-3d" style={{ padding: '24px', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden', border: '2px solid rgba(167, 139, 250, 0.4)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative' }}>
                <img 
                  src={buildingImages[activeBuilding] || `https://via.placeholder.com/600x800/1f1041/a78bfa?text=${activeBuilding.replace(/ /g, '+')}`} 
                  alt={activeBuilding}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                
                {/* MANUAL CHECK-IN BUTTON: Overlaid on the building image! */}
                <div style={{ position: 'absolute', bottom: '20px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    onClick={() => handleManualCheckIn(activeBuilding)}
                    style={{ background: '#1db954', color: '#1f1041', border: 'none', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}
                  >
                    <span className="icon-location" style={{ filter: 'brightness(0)' }} /> Check in to {activeBuilding}
                  </button>
                </div>

              </div>
            </div>

            <div className="modal-right-feed">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(167, 139, 250, 0.3)', paddingBottom: '1.5rem' }}>
                <div>
                  <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', textTransform: 'uppercase' }}>{activeBuilding}</h1>
                  <p style={{ color: '#1db954', fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#1db954', borderRadius: '50%', boxShadow: '0 0 10px #1db954' }}></span>
                    {activeListeners.length} People Here
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
                <h3 style={{ color: '#a78bfa', letterSpacing: '2px' }}>PEOPLE & FREQUENCIES</h3>
                {activeListeners.length > 0 ? (
                  activeListeners.map((listener) => (
                    <div key={listener.id} style={{ padding: '1.2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', marginTop: '1rem', borderLeft: listener.isPlaying ? '4px solid #1db954' : '4px solid #4b5563', display: 'flex', gap: '15px', alignItems: 'center', opacity: listener.isPlaying ? 1 : 0.6 }}>
                      <img 
                        src={listener.album_image_url} 
                        alt="album art" 
                        style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }} 
                      />
                      <div>
                        <p style={{ margin: 0, fontWeight: 'bold', color: 'white', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                          <span className={listener.id === user?.id ? "icon-online" : "icon-headphone"} />
                          {listener.username}
                        </p>
                        <p style={{ margin: '0.4rem 0 0 0', color: listener.isPlaying ? '#a78bfa' : '#9ca3af', fontSize: '0.95rem' }}>
                          {listener.isPlaying ? `"${listener.song_name}" - ${listener.artist_name}` : 'Paused / Offline'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ marginTop: '1.5rem', color: '#a78bfa', fontStyle: 'italic' }}>No one is currently here.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}