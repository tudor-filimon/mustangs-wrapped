import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const defaultAvatar = '/src/assets/images/default-avatar.png';

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
  const [filterGenre, setFilterGenre] = useState('all');

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

  const availableGenres = useMemo(() => {
    const allGenres = posts.flatMap(p => p.genre ? p.genre.split(', ') : []);
    return [...new Set(allGenres)].sort();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = post.song_name.toLowerCase().includes(searchTerm.toLowerCase()) || post.artist_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGenre = filterGenre === 'all' || (post.genre && post.genre.toLowerCase().includes(filterGenre.toLowerCase()));
      return matchesSearch && matchesGenre;
    });
  }, [posts, searchTerm, filterGenre]);

  const handleSendToFeed = async () => {
    if (!nowPlaying || !nowPlaying.track_id) return;
    setFeedStatus('Loading...');
    try {
      await api.postToFeed({ 
        song_name: nowPlaying.song, artist_name: nowPlaying.artists, album_image_url: nowPlaying.image, 
        spotify_track_id: nowPlaying.track_id, username: name, album_name: nowPlaying.album, 
        release_date: nowPlaying.release_date, genre: nowPlaying.genre 
      });
      setFeedStatus('Added!'); fetchPosts(); 
      setTimeout(() => { setFeedStatus(''); setShowNowPlayingModal(false); }, 2000);
    } catch (error) { setFeedStatus('Error'); setTimeout(() => setFeedStatus(''), 3000); }
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

  const startX = (window.innerWidth / 2) - 2000;
  const startY = ((window.innerHeight - 80) / 2) - 2000;
  const maxRing = posts.length > 0 ? Math.floor(posts.length / 5) : 2; 
  const ringsArray = Array.from({ length: Math.max(3, maxRing + 2) }, (_, i) => i);

  return (
    <div className="home-container dark page-transition feed-page-container">
      <AnimatedBackground />
      <header className="feed-header">
        <button className="feed-back-btn" onClick={() => navigate('/home')}>← Back</button>
        <h1 className="feed-title">{name}'s Feed</h1>
        {nowPlaying?.playing && (
          <div className="feed-header-pill" onClick={() => setShowNowPlayingModal(true)}>
            <img src={nowPlaying.image} alt="playing" className="pill-art" />
            <div className="pill-glow-ring"></div>
          </div>
        )}
      </header>

      {showNowPlayingModal && nowPlaying && (
        <div className="modal-overlay" onClick={() => setShowNowPlayingModal(false)}>
          <div className="feed-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="red-close-btn" onClick={() => setShowNowPlayingModal(false)}>✕</button>
            <img src={nowPlaying.image} alt={nowPlaying.song} className="feed-modal-image" />
            <h3 className="feed-modal-song">{nowPlaying.song}</h3>
            <p className="feed-modal-artist">{nowPlaying.artists}</p>
            <p className="feed-modal-detail">Preview Genre: {nowPlaying.genre}</p> 
            <button className="feed-spotify-btn" onClick={handleSendToFeed} disabled={feedStatus === 'Loading...' || feedStatus === 'Added!'} style={{ backgroundColor: feedStatus === 'Added!' ? '#9333ea' : '#1DB954' }}> {feedStatus || 'Add to Feed'} </button>
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
                <select className="list-filter-select" value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)}>
                  <option value="all">All Genres</option>
                  {availableGenres.map(g => ( <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option> ))}
                </select>
              </div>
            </div>
            <div className="list-modal-content">
              {filteredPosts.length === 0 ? ( <p className="empty-list-text">No matches.</p> ) : (
                filteredPosts.map((post) => (
                  <div key={post.id} className="list-item-row">
                    <img src={post.album_image_url} alt="art" className="list-item-art" />
                    <div className="list-item-info"> <span className="list-item-song">{post.song_name}</span> <span className="list-item-artist">{post.artist_name}</span> <span className="list-item-meta">{post.genre || 'unknown'}</span> </div>
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
            <p className="feed-modal-detail">Genre: {activeModal.genre || 'Unknown'}</p>
            <div className="feed-modal-actions">
              <button className="feed-spotify-btn" onClick={() => window.open(`https://open.spotify.com/track/${activeModal.spotify_track_id}`, '_blank')}>Listen on Spotify</button>
              {activeModal.user_id === user?.id && <button className="feed-remove-btn" onClick={() => handleRemovePost(activeModal.id)} disabled={deleteLoading}>Remove Post</button>}
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="canvas-container">
          <TransformWrapper initialScale={1} minScale={0.1} maxScale={2} initialPositionX={startX} initialPositionY={startY} limitToBounds={false} wheel={{ step: 0.1 }}>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="canvas-controls"> <button className="control-btn" onClick={() => zoomIn()}>+</button> <button className="control-btn" onClick={() => zoomOut()}>-</button> <button className="control-btn" onClick={() => resetTransform()}><img src="src/assets/images/HomeViewFeedPage.svg" alt="Home"/></button> </div>
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "4000px", height: "4000px" }}>
                  <div className="feed-environment">
                    <div className="feed-center owner-clickable" onClick={() => setShowListModal(true)}> <img src={avatar} alt="User" className="feed-center-avatar" draggable={false} /> <div className="feed-center-label">{name}</div> </div>
                    {posts.map((post, index) => {
                      const { x, y } = calculatePosition(index);
                      return ( <div key={post.id} className="feed-orbit-node" style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }} onClick={() => setActiveModal(post)}> <img src={post.album_image_url} alt="album" className="feed-node-image" draggable={false} /> <div className="feed-node-label">{post.song_name}</div> </div> );
                    })}
                    {ringsArray.map(ring => { const radius = 260 + (ring * 220); return <div key={ring} className="orbit-ring-line" style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }} />; })}
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