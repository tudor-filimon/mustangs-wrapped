import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const defaultAvatar = '/src/assets/images/default-avatar.png';

const getEra = (releaseDate) => {
  if (!releaseDate) return 'Unknown';
  const year = parseInt(releaseDate.substring(0, 4), 10);
  if (year >= 2020) return '2020s';
  if (year >= 2010) return '2010s';
  if (year >= 2000) return '2000s';
  if (year >= 1990) return '90s';
  if (year >= 1980) return '80s';
  return 'Classics';
};

export default function FeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [showListModal, setShowListModal] = useState(false); 
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [showNowPlayingModal, setShowNowPlayingModal] = useState(false);
  const [feedStatus, setFeedStatus] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEra, setFilterEra] = useState('all');

  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkTab, setNetworkTab] = useState('following'); 
  const [networkSearch, setNetworkSearch] = useState('');

  const gridRef = useRef(null);

  const isOwner = useMemo(() => {
    if (!posts.length || !user?.id) return true;
    return posts.every(p => p.user_id === user.id);
  }, [posts, user]);

  const name = user?.display_name || user?.displayName || user?.email || 'Guest';
  const avatar = user?.avatar_url || defaultAvatar;

  useEffect(() => { if (user?.id) fetchPosts(); }, [user]);

  useEffect(() => {
    let mounted = true;
    const fetchNow = async () => {
      try { const data = await api.getCurrentPlaying(); if (mounted) setNowPlaying(data); } catch (e) { }
    };
    fetchNow();
    const id = setInterval(fetchNow, 5000); 
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const fetchPosts = async () => {
    try {
      const data = await api.getFeedPosts();
      const currentPosts = data.posts.filter(p => p.user_id === user.id); 
      const sortedPosts = currentPosts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setPosts(sortedPosts);
    } catch (error) { } finally { setLoading(false); }
  };

  const availableEras = useMemo(() => {
    const eras = posts.map(p => getEra(p.release_date));
    return [...new Set(eras)].sort().reverse(); 
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = post.song_name.toLowerCase().includes(searchTerm.toLowerCase()) || post.artist_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEra = filterEra === 'all' || getEra(post.release_date) === filterEra;
      return matchesSearch && matchesEra;
    });
  }, [posts, searchTerm, filterEra]);

  const handleSendToFeed = async () => {
    if (!nowPlaying || !nowPlaying.track_id) return;

    const isAlreadyInFeed = posts.some(p => p.spotify_track_id === nowPlaying.track_id);
    if (isAlreadyInFeed) {
      setFeedStatus('Already in Feed!');
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
      setFeedStatus('Added!'); fetchPosts(); 
      setTimeout(() => { setFeedStatus(''); setShowNowPlayingModal(false); }, 2000);
    } catch (error) { 
      if (error.message && error.message.includes('already in feed')) {
        setFeedStatus('Already in Feed!');
      } else {
        setFeedStatus('Error');
      }
      setTimeout(() => setFeedStatus(''), 3000); 
    }
  };

  const handleRemovePost = async (postId) => {
    setDeleteLoading(true);
    try { await api.deleteFeedPost(postId); setPosts(prev => prev.filter(p => p.id !== postId)); if (activeModal?.id === postId) setActiveModal(null); } catch (error) { } finally { setDeleteLoading(false); }
  };

  const calculatePosition = (index) => {
    let currentRing = 0; let indexInRing = index;
    while (true) { const capacity = 5 + (currentRing * 5); if (indexInRing < capacity) break; indexInRing -= capacity; currentRing++; }
    const radius = 260 + (currentRing * 220); const itemsInThisRing = 5 + (currentRing * 5); const angle = (indexInRing / itemsInThisRing) * 2 * Math.PI;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  };

  const CANVAS_SIZE = 4000; 
  const startX = (window.innerWidth / 2) - (CANVAS_SIZE / 2);
  const startY = ((window.innerHeight - 80) / 2) - (CANVAS_SIZE / 2);
  
  const neededRings = useMemo(() => {
    let required = 0;
    let counted = 0;
    let r = 0;
    while (counted < posts.length) {
      counted += 5 + (r * 5);
      required = r + 1;
      r++;
    }
    return Math.max(1, required);
  }, [posts.length]);

  const ringsArray = Array.from({ length: neededRings }, (_, i) => i);

  return (
    <div className="home-container dark page-transition feed-page-container">
      <AnimatedBackground />
      
      <div 
        ref={gridRef}
        className="infinite-grid-bg"
        style={{
          backgroundSize: '100px 100px',
          backgroundPosition: `${startX}px ${startY}px`
        }}
      />

      <header className="feed-header">
        <div className="feed-header-left">
          <button className="feed-back-btn" onClick={() => navigate('/home')}>← Back</button>
          <h1 className="feed-title">{name}'s Feed</h1>
        </div>

        <div className="feed-header-right">
          <button className="network-btn" onClick={() => setShowNetworkModal(true)}>
            <img src="\src\assets\images\friendsButtonIcon.svg" alt="Friends Icon" /> Friends
          </button>

          {nowPlaying?.playing && (
            <div className="feed-header-pill" onClick={() => setShowNowPlayingModal(true)}>
              <img src={nowPlaying.image} alt="playing" className="pill-art" />
              <div className="pill-glow-ring"></div>
            </div>
          )}
        </div>
      </header>

      {/* Network Modal */}
      {showNetworkModal && (
        <div className="modal-overlay" onClick={() => setShowNetworkModal(false)}>
          <div className="feed-list-modal" onClick={e => e.stopPropagation()}>
            <button className="red-close-btn modal-corner-x" onClick={() => setShowNetworkModal(false)}>✕</button>
            <div className="list-modal-header-combined">
              <h2>{name}'s Network</h2>
              
              <div className="network-tabs-container">
                <button
                  className={`network-tab ${networkTab === 'followers' ? 'active' : ''}`}
                  onClick={() => setNetworkTab('followers')}
                >
                  Followers
                </button>
                <button
                  className={`network-tab ${networkTab === 'following' ? 'active' : ''}`}
                  onClick={() => setNetworkTab('following')}
                >
                  Following
                </button>
              </div>

              <div className="list-controls network-search-container">
                <input 
                  type="text" 
                  placeholder={`Search ${networkTab}...`} 
                  className="list-search-input network-search-input" 
                  value={networkSearch} 
                  onChange={(e) => setNetworkSearch(e.target.value)} 
                />
              </div>
            </div>

            <div className="list-modal-content network-modal-content">
              <p className="empty-list-text network-empty-text">
                Backend logic for {networkTab} coming soon... <br/><br/>
                (This shell is ready for data)
              </p>
            </div>
          </div>
        </div>
      )}

      {showNowPlayingModal && nowPlaying && (
        <div className="modal-overlay" onClick={() => setShowNowPlayingModal(false)}>
          <div className="feed-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="red-close-btn" onClick={() => setShowNowPlayingModal(false)}>✕</button>
            <img src={nowPlaying.image} alt={nowPlaying.song} className="feed-modal-image" />
            <h3 className="feed-modal-song">{nowPlaying.song}</h3>
            <p className="feed-modal-artist">{nowPlaying.artists}</p>
            <p className="feed-modal-detail">Era: {getEra(nowPlaying.release_date)}</p> 
            <button 
              className="feed-spotify-btn" 
              onClick={handleSendToFeed} 
              disabled={feedStatus === 'Loading...' || feedStatus === 'Added!' || feedStatus === 'Already in Feed!'} 
              style={{ backgroundColor: feedStatus === 'Added!' ? '#9333ea' : feedStatus === 'Already in Feed!' ? '#6b7280' : '#1DB954' }}
            > 
              {feedStatus || 'Add to Feed'} 
            </button>
          </div>
        </div>
      )}

      {showListModal && (
        <div className="modal-overlay" onClick={() => setShowListModal(false)}>
          <div className="feed-list-modal" onClick={e => e.stopPropagation()}>
            <button className="red-close-btn modal-corner-x" onClick={() => setShowListModal(false)}>✕</button>
            <div className="list-modal-header-combined">
              <h2>{isOwner ? 'Browse Your Feed' : `Browse ${name}'s Feed`}</h2>
              <div className="list-controls">
                <input type="text" placeholder="Search..." className="list-search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <select className="list-filter-select" value={filterEra} onChange={(e) => setFilterEra(e.target.value)}>
                  <option value="all">All Eras</option>
                  {availableEras.map(era => ( <option key={era} value={era}>{era}</option> ))}
                </select>
              </div>
            </div>
            <div className="list-modal-content">
              {filteredPosts.length === 0 ? ( <p className="empty-list-text">No matches.</p> ) : (
                filteredPosts.map((post) => (
                  <div key={post.id} className="list-item-row">
                    <img src={post.album_image_url} alt="art" className="list-item-art" />
                    <div className="list-item-info"> 
                      <span className="list-item-song">{post.song_name}</span> 
                      <span className="list-item-artist">{post.artist_name}</span> 
                      <span className="list-item-meta">{getEra(post.release_date)}</span> 
                    </div>
                    {post.user_id === user?.id && <button className="list-remove-btn" onClick={() => handleRemovePost(post.id)} disabled={deleteLoading}>Remove</button>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)} style={{ zIndex: 9999 }}>
          <div className="feed-modal-box" onClick={e => e.stopPropagation()}>
            <button className="red-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            <img src={activeModal.album_image_url} alt={activeModal.song_name} className="feed-modal-image" draggable={false} />
            <h3 className="feed-modal-song">{activeModal.song_name}</h3>
            <p className="feed-modal-artist">{activeModal.artist_name}</p>
            <p className="feed-modal-detail">Era: {getEra(activeModal.release_date)}</p>
            <div className="feed-modal-actions">
              <button className="feed-spotify-btn" onClick={() => window.open('https://' + 'open.spotify.com' + '/track/' + activeModal.spotify_track_id, '_blank')}>Listen on Spotify</button>
              {activeModal.user_id === user?.id && <button className="feed-remove-btn" onClick={() => handleRemovePost(activeModal.id)} disabled={deleteLoading}>Remove Post</button>}
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="canvas-container canvas-wrapper">
          <TransformWrapper 
            initialScale={1} 
            minScale={0.1} 
            maxScale={2} 
            initialPositionX={startX} 
            initialPositionY={startY} 
            limitToBounds={false} 
            wheel={{ step: 0.1 }}
            onTransformed={(ref) => {
              if (gridRef.current) {
                const { positionX, positionY, scale } = ref.state;
                gridRef.current.style.backgroundPosition = `${positionX}px ${positionY}px`;
                gridRef.current.style.backgroundSize = `${100 * scale}px ${100 * scale}px`;
              }
            }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="canvas-controls"> <button className="control-btn" onClick={() => zoomIn()}>+</button> <button className="control-btn" onClick={() => zoomOut()}>-</button> <button className="control-btn" onClick={() => resetTransform()}><img src="src/assets/images/HomeViewFeedPage.svg" alt="Home"/></button> </div>
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}>
                  
                  <div className="feed-environment feed-environment-infinite">
                    <div className="feed-center owner-clickable" onClick={() => setShowListModal(true)}> <img src={avatar} alt="User" className="feed-center-avatar" draggable={false} /> <div className="feed-center-label">{name}</div> </div>
                    
                    {posts.map((post, index) => {
                      const { x, y } = calculatePosition(index);
                      return ( <div key={post.id} className="feed-orbit-node" style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }} onClick={() => setActiveModal(post)}> <img src={post.album_image_url} alt="album" className="feed-node-image" draggable={false} /> <div className="feed-node-label">{post.song_name}</div> </div> );
                    })}
                    
                    {ringsArray.map(ring => { 
                      const radius = 260 + (ring * 220); 
                      return <div key={ring} className="orbit-ring-line" style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }} />; 
                    })}
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      )}
    </div>
  );
}