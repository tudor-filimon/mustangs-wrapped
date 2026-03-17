import React, { useState, useEffect } from 'react';
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
  const [deleteLoading, setDeleteLoading] = useState(false);

  const name = user?.display_name || user?.displayName || user?.email || 'Guest';
  const avatar = user?.avatar_url || defaultAvatar;

  useEffect(() => {
    if (user?.id) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
      const data = await api.getFeedPosts();
      const myPosts = data.posts.filter(p => p.user_id === user.id);
      setPosts(myPosts);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleListenOnSpotify = (trackId) => {
    window.open(`https://open.spotify.com/track/${trackId}`, '_blank');
  };

  const handleRemovePost = async (postId) => {
    setDeleteLoading(true);
    try {
      await api.deleteFeedPost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setActiveModal(null);
    } catch (error) {
      alert('Failed to remove post');
    } finally {
      setDeleteLoading(false);
    }
  };

  const calculatePosition = (index) => {
    const ringCapacities = [5, 8, 12, 16, 20]; 
    let currentRing = 0;
    let indexInRing = index;

    while (currentRing < ringCapacities.length && indexInRing >= ringCapacities[currentRing]) {
      indexInRing -= ringCapacities[currentRing];
      currentRing++;
    }

    const radius = 180 + (currentRing * 140); 
    const itemsInThisRing = ringCapacities[currentRing] || 25; 
    const angle = (indexInRing / itemsInThisRing) * 2 * Math.PI;

    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    return { x, y, ringIndex: currentRing };
  };

  const startX = (window.innerWidth / 2) - 2000;
  const startY = ((window.innerHeight - 80) / 2) - 2000;

  return (
    <div className="home-container dark page-transition feed-page-container">
      <AnimatedBackground />

      <header className="feed-header">
        <button className="feed-back-btn" onClick={() => navigate('/home')}>
          ← Back
        </button>
        <h1 className="feed-title">Your Feed</h1>
      </header>

      {loading && (
        <div className="feed-loading-text">Loading posts...</div>
      )}

      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)} style={{ zIndex: 9999 }}>
          <div className="feed-modal-box" onClick={e => e.stopPropagation()}>
            {/* UPDATED: Red circular close button positioned top right */}
            <button className="red-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            <img 
              src={activeModal.album_image_url} 
              alt={activeModal.song_name} 
              className="feed-modal-image" 
            />
            <h3 className="feed-modal-song">{activeModal.song_name}</h3>
            <p className="feed-modal-artist">{activeModal.artist_name}</p>
            
            <div className="feed-modal-actions">
              <button 
                className="feed-spotify-btn" 
                onClick={() => handleListenOnSpotify(activeModal.spotify_track_id)}
              >
                Listen on Spotify
              </button>
              
              {activeModal.user_id === user?.id && (
                <button 
                  className="feed-remove-btn"
                  onClick={() => handleRemovePost(activeModal.id)}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Removing...' : 'Remove Post'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="canvas-container">
          <TransformWrapper
            initialScale={1}
            minScale={0.1}
            maxScale={2}
            initialPositionX={startX} 
            initialPositionY={startY}
            limitToBounds={false} 
            wheel={{ step: 0.1 }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="canvas-controls">
                  <button className="control-btn" onClick={() => zoomIn()}>+</button>
                  <button className="control-btn" onClick={() => zoomOut()}>-</button>
                  <button className="control-btn" onClick={() => resetTransform()}>Reset</button>
                </div>

                <TransformComponent 
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ width: "4000px", height: "4000px" }} 
                >
                  <div className="feed-environment">
                    
                    <div className="feed-center">
                      <img src={avatar} alt="You" className="feed-center-avatar" />
                      <div className="feed-center-label">{name}</div>
                    </div>

                    {posts.map((post, index) => {
                      const { x, y } = calculatePosition(index);
                      
                      return (
                        <div 
                          key={post.id} 
                          className="feed-orbit-node"
                          style={{
                            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                            animationDelay: `${index * -0.5}s`
                          }}
                          onClick={() => setActiveModal(post)}
                        >
                          <img src={post.album_image_url} alt="album" className="feed-node-image" />
                          {/* UPDATED: Song name directly under the orbit node */}
                          <div className="feed-node-label">{post.song_name}</div>
                        </div>
                      );
                    })}

                    {/* UPDATED: Only draws 3 rings instead of 4 ([0, 1, 2]) */}
                    {[0, 1, 2].map(ring => {
                      const radius = 180 + (ring * 140);
                      return (
                        <div 
                          key={ring}
                          className="orbit-ring-line"
                          style={{
                            width: `${radius * 2}px`,
                            height: `${radius * 2}px`,
                          }}
                        />
                      );
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