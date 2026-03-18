import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';
import sunIcon from '../assets/images/sunIcon.svg';
import moonIcon from '../assets/images/moonIcon.svg';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

function HomePage() {
  const [theme, setTheme] = useState('dark'); 
  const [showWfnModal, setShowWfnModal] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  
  // NEW: State to track button text/feedback
  const [feedStatus, setFeedStatus] = useState('');
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const name = user?.display_name || user?.displayName || user?.email || 'Guest';
  const avatar = user?.avatar_url || '/src/assets/images/default-avatar.png';
  
  const [nowPlaying, setNowPlaying] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchNow = async () => {
      try {
        const data = await api.getCurrentPlaying(); 
        if (mounted) setNowPlaying(data);
      } catch (e) {
        console.error('NowPlaying fetch error', e);
      }
    };
    fetchNow();
    const id = setInterval(fetchNow, 5000); 
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // NEW: Function to handle sending the song to the feed
  const handleSendToFeed = async () => {
    if (!nowPlaying || !nowPlaying.track_id) {
      setFeedStatus('Error');
      setTimeout(() => setFeedStatus(''), 3000);
      return;
    }
    
    setFeedStatus('Loading...');
    try {
      await api.postToFeed({
        song_name: nowPlaying.song,
        artist_name: nowPlaying.artists,
        album_image_url: nowPlaying.image,
        spotify_track_id: nowPlaying.track_id,
        username: name,
        album_name: nowPlaying.album,
        release_date: nowPlaying.release_date
      });
      setFeedStatus('Successfully sent to feed'); // <-- FIXED: Changed to "feed"
      
      // Clear the message and close modal after 2 seconds
      setTimeout(() => {
        setFeedStatus('');
        setShowAlbumModal(false);
      }, 2000);
      
    } catch (error) {
      console.error('Feed post error:', error);
      setFeedStatus('Error');
      setTimeout(() => setFeedStatus(''), 3000);
    }
  };

  return (
    <div className={`home-container ${theme} page-transition`}>
      <AnimatedBackground />

      {showWfnModal && (
        <div className="modal-overlay" onClick={() => setShowWfnModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowWfnModal(false)}>✕</button>
            <img src="src\assets\images\teamPhoto.JPEG" alt="Projects Group of people" />
          </div>
        </div>
      )}

      {/* Album Click Modal - UPDATED WITH SEND BUTTON */}
      {showAlbumModal && nowPlaying && (
        <div className="modal-overlay" onClick={() => setShowAlbumModal(false)}>
          <div className="modal-content" style={{ textAlign: 'center', padding: '30px' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowAlbumModal(false)}>✕</button>
            <img 
              src={nowPlaying.image} 
              alt={nowPlaying.song} 
              style={{ width: '100%', maxWidth: '300px', height: 'auto', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} 
            />
            <h2 style={{ marginTop: '20px', color: 'white', fontSize: '24px' }}>{nowPlaying.song}</h2>
            <p style={{ color: '#ccc', fontSize: '16px', marginTop: '5px' }}>{nowPlaying.artists}</p>
            
            <button 
              onClick={handleSendToFeed}
              disabled={feedStatus === 'Loading...' || feedStatus === 'Successfully sent to feed'}
              style={{
                marginTop: '25px',
                padding: '12px 24px',
                borderRadius: '25px',
                border: 'none',
                backgroundColor: '#a78bfa',
                color: '#1f1041',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: (feedStatus === 'Loading...' || feedStatus === 'Successfully sent to feed') ? 'default' : 'pointer',
                transition: 'all 0.2s',
                opacity: (feedStatus === 'Loading...' || feedStatus === 'Successfully sent to feed') ? 0.7 : 1
              }}
            >
              {feedStatus || 'Send to Feed'}
            </button>
          </div>
        </div>
      )}

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
              <div className="profile-pic-container">
                <img
                  src={avatar}
                  alt="avatar"
                  className="profile-pic"
                />
              </div>
              <h2>Hi, {name}</h2>
            </div>
        
        <div className="header-right">
          <div className="circle-icon wfn" onClick={() => setShowWfnModal(true)}>
            <img src="src\assets\images\WFNLogo-WhiteRound.png" alt="WFN logo" />
          </div>
          <div className="circle-icon mustangs"><img src="src\assets\images\WesternMustangLogo1.svg" alt="Mustangs Logo"/></div>
          <div className="circle-icon spotify"><img src="src\assets\images\Spotify Logo.png" alt="Spotify Logo" /></div>
        </div>
      </header>

      <main className="main-layout">
        <div className="row top-row">
          <button className="pill-btn" onClick={() => navigate('/campus-maps')}><img src="src\assets\images\mapsIcon.svg" alt="Map Icon"/> Campus Maps</button>
          <button className="pill-btn" onClick={() => navigate('/coming-soon')}><img src="src\assets\images\AvatarIcon.svg" alt="Avatar Icon"/>Avatar</button>
        </div>

        <div className="row middle-row">
          <button className="pill-btn side-btn" onClick={() => navigate('/profile')}><img src="src\assets\images\Account.svg" alt="Account Icon" />Account</button>

          <h1 className="title">
            <span>M</span><span>u</span><span>s</span><span>t</span><span>a</span><span>n</span><span>g</span>
            <span> </span><span>W</span><span>r</span><span>a</span><span>p</span><span>p</span><span>e</span><span>d</span>
          </h1>
          
          <button className="pill-btn side-btn" onClick={() => navigate('/friends')}><img src="src\assets\images\friendsButtonIcon.svg" alt="Friends Icon" /> Friends</button>
        </div>

        <div className="row bottom-row">
           <button className="pill-btn" onClick={() => navigate('/feed')}><img src="src\assets\images\FeedIcon.svg" alt="Feed Icon" /> Your Feed</button>
          <button className="pill-btn" onClick={() => navigate('/wrapped')}><img src="src\assets\images\horseIcon.svg" alt="Mustang Wrapped Icon" />Mustang Wrapped</button>
        </div>
      </main>

      {nowPlaying?.playing ? (
      <div className="now-playing">
        <div className="np-left">Now Playing:</div>
        <div className="np-center">
          <div className="visualizer-container">
            <div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div>
          </div>
        </div>
        <div className="np-right">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {nowPlaying.image && (
              <div 
                className="album-art" 
                onClick={() => setShowAlbumModal(true)} 
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <img src={nowPlaying.image} alt={nowPlaying.song} style={{width:48,height:48,objectFit:'cover', borderRadius: '4px'}} />
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column'}}>
              <span style={{fontWeight:700}}>{nowPlaying.song}</span>
              <span style={{fontSize:12,color:'#ccc'}}>{nowPlaying.artists}</span>
            </div>
          </div>
        </div>
      </div>
    ) : null}

    </div>
  );
}

export default HomePage;