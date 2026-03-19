import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const defaultAvatar = '/src/assets/images/default-avatar.png';

// Lucas's Avatar Configuration Options
const clothingColorOptions = [
  { id: 'purple', value: '#8b5cf6' },
  { id: 'black', value: '#111827' },
  { id: 'white', value: '#f9fafb' },
  { id: 'red', value: '#ef4444' },
];
const hairColorOptions = [
  { id: 'black', value: '#111827' },
  { id: 'brown', value: '#92400e' },
  { id: 'blonde', value: '#eab308' },
  { id: 'red', value: '#b91c1c' },
  { id: 'purple', value: '#7c3aed' },
];
const skinToneOptions = [
  { id: 'light', value: '#f9e0d2' },
  { id: 'asian', value: '#e8c4a8' },
  { id: 'tan', value: '#e0b898' },
  { id: 'medium', value: '#c27a4f' },
  { id: 'dark', value: '#8b5a3c' },
  { id: 'ultra-dark', value: '#4a3228' },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  
  const { user, updateUserInContext } = useAuth();
  
  // User & Friend State
  const [profileUser, setProfileUser] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [loading, setLoading] = useState(!!userId);
  const [actionLoading, setActionLoading] = useState(false);
  
  // UI State
  const [activeModal, setActiveModal] = useState(null);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Lucas's Avatar State
  const [savedAvatar, setSavedAvatar] = useState(null);

  const isViewingOther = userId && user?.id && userId !== user.id;

  // Spotify State
  const [spotifyStats, setSpotifyStats] = useState(null);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState(null);

  // Fetch Spotify Data
  useEffect(() => {
    if (isViewingOther) return;

    let cancelled = false;
    setSpotifyLoading(true);
    api.getSpotifyStats()
      .then((data) => {
        if (!cancelled) setSpotifyStats(data);
      })
      .catch((err) => {
        if (!cancelled) setSpotifyError(err.message || 'Could not load Spotify stats');
      })
      .finally(() => { if (!cancelled) setSpotifyLoading(false); });

    return () => { cancelled = true; };
  }, [isViewingOther]);

  // Fetch User Profile
  useEffect(() => {
    if (!isViewingOther) {
      setProfileUser(null);
      setRelationship(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.getUserProfile(userId)
      .then((data) => {
        if (!cancelled) {
          setProfileUser(data.user);
          setRelationship({
            isSelf: data.isSelf,
            areFriends: data.areFriends,
            requestStatus: data.requestStatus,
            requestId: data.requestId
          });
        }
      })
      .catch(() => {
        if (!cancelled) setProfileUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId, isViewingOther]);

  // Load Avatar from Local Storage
  useEffect(() => {
    const stored = window.localStorage.getItem('mustangsWrappedAvatar');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSavedAvatar(parsed);
      } catch {
        setSavedAvatar(null);
      }
    }
  }, []);

  const handleAvatar = () => {
    navigate('/avatar');
  };

  const handleAddFriend = async () => {
    if (actionLoading || !profileUser) return;
    setActionLoading(true);
    try {
      await api.sendFriendRequest(profileUser.id);
      setRelationship((r) => ({ ...r, requestStatus: 'sent' }));
    } catch (e) {
      alert(e.message || 'Could not send request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (actionLoading || !relationship?.requestId) return;
    setActionLoading(true);
    try {
      await api.acceptFriendRequest(relationship.requestId);
      setRelationship((r) => ({ ...r, areFriends: true, requestStatus: 'none', requestId: null }));
    } catch (e) {
      alert(e.message || 'Could not accept');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (actionLoading || !relationship?.requestId) return;
    setActionLoading(true);
    try {
      await api.declineFriendRequest(relationship.requestId);
      setRelationship((r) => ({ ...r, requestStatus: 'none', requestId: null }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (field, currentValue) => {
    if (isViewingOther) return; 
    setEditField(field);
    setEditValue(currentValue || '');
    setActiveModal('edit_node');
  };

  const handleUpdateProfile = async () => {
    if (updateLoading || isViewingOther) return;
    setUpdateLoading(true);
    try {
      const payload = {};
      payload[editField] = editValue; 

      const response = await api.updateProfile(payload);
      updateUserInContext(response.user);
      setActiveModal(null);
    } catch (e) {
      alert(e.message || 'Failed to update profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  const displayUser = isViewingOther ? profileUser : user;
  const name = displayUser?.display_name || displayUser?.displayName || displayUser?.email || 'Guest';
  const fallbackAvatar = displayUser?.avatar_url || defaultAvatar;

  const userStats = {
    faculty: displayUser?.faculty || 'Unknown Faculty',
    year: displayUser?.classYear || displayUser?.class_year || 'Unknown Year', 
    major: displayUser?.major || 'Undeclared'
  };

  const listeningStats = (() => {
    if (!spotifyStats) {
      return { obsessionLevel: '—', attentionSpan: '—', currentAnthem: '—', artistOfMonth: '—', rawObsessionInt: 0 };
    }

    const topArtistName = spotifyStats.topArtists?.[0]?.name || '';
    const topTracksArr = spotifyStats.topTracks || [];
    
    let matchCount = 0;
    if (topArtistName && topTracksArr.length > 0) {
      topTracksArr.forEach(track => {
        if (track.artists && track.artists.includes(topArtistName)) matchCount++;
      });
    }
    const rawObsessionInt = topTracksArr.length > 0 ? Math.round((matchCount / topTracksArr.length) * 100) : 0;
    const obsessionLevel = topTracksArr.length > 0 && topArtistName ? `${rawObsessionInt}%` : '—';

    const tracksWithDuration = topTracksArr.filter(t => t.duration_ms);
    let attentionSpan = '—';
    if (tracksWithDuration.length > 0) {
      const totalMs = tracksWithDuration.reduce((acc, t) => acc + t.duration_ms, 0);
      const avgDurationMs = totalMs / tracksWithDuration.length;
      const mins = Math.floor(avgDurationMs / 60000);
      const secs = ((avgDurationMs % 60000) / 1000).toFixed(0);
      attentionSpan = `${mins}m ${secs.padStart(2, '0')}s`;
    }

    const currentAnthem = spotifyStats.topTracks?.[0]?.name || '—';

    return { obsessionLevel, attentionSpan, currentAnthem, artistOfMonth: topArtistName || '—', rawObsessionInt };
  })();

  const topTracks = spotifyStats?.topTracks?.slice(0, 3).map(t => ({
    title: t.name || t.title,
    artist: t.artists || t.artist || ''
  })) || [
    { title: "I'll Be Missing You", artist: "Diddy" },
    { title: "Nocturnes (Op. 9 No. 2 in E-Flat Major)", artist: "Chopin" },
    { title: "Santa Claus is Comin' to Town", artist: "Santa Claus (Ft. Elves & Ms. Claus)" }
  ];

  const renderModalContent = () => {
    switch(activeModal) {
      case 'edit_node':
        const fieldLabels = { faculty: "Faculty", classYear: "Class Year", major: "Major" };
        return (
          <>
            <h3 style={styles.modalHeader}>Edit Profile Info</h3>
            <p style={styles.modalLabel}>{fieldLabels[editField]}</p>
            <input 
              type="text" 
              value={editValue} 
              onChange={e => setEditValue(e.target.value)} 
              style={styles.modalInput}
              placeholder={`Enter new ${fieldLabels[editField]}`}
            />
            <button onClick={handleUpdateProfile} style={styles.submitBtn} disabled={updateLoading}>
              {updateLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        );
      case 'obsession':
        return (
          <>
            <h3 style={styles.modalHeader}>Obsession Level</h3>
            <p style={styles.modalText}>
              Your music taste is <strong>{listeningStats.obsessionLevel}</strong> obsessed with <strong>{listeningStats.artistOfMonth}</strong>. 
              {listeningStats.rawObsessionInt > 15 ? " You've practically got them on loop. We respect the dedication." : " You like to keep your rotation beautifully diverse!"}
            </p>
          </>
        );
      case 'attention':
        return (
          <>
            <h3 style={styles.modalHeader}>Attention Span</h3>
            <p style={styles.modalText}>
              On average, your favorite songs are exactly <strong>{listeningStats.attentionSpan}</strong> long. 
            </p>
          </>
        );
      case 'anthem':
        return (
          <>
            <h3 style={styles.modalHeader}>Current Anthem</h3>
            <p style={styles.modalText}>
              Right now, you simply cannot get enough of <strong>{listeningStats.currentAnthem}</strong>.
            </p>
          </>
        );
      case 'artist':
        return (
          <>
            <h3 style={styles.modalHeader}>Top Artist</h3>
            <p style={styles.modalText}>
              Out of all the artists in the entire world, <strong>{listeningStats.artistOfMonth}</strong> holds the #1 spot in your heart.
            </p>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="home-container dark page-transition" style={styles.pageContainer}>
      <AnimatedBackground />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jersey+25&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes counter-spin { 100% { transform: rotate(-360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeOverlay { from { opacity: 0; } to { opacity: 1; } }
        
        .orbit-system {
          position: relative;
          width: 350px;
          height: 350px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 40px auto 60px auto;
        }

        .orbit-path {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px dashed rgba(167, 139, 250, 0.3);
          animation: spin 25s linear infinite;
        }

        .stat-node {
          position: absolute;
          background: rgba(151, 53, 216, 0.2);
          backdrop-filter: blur(25px);
          border: 2px solid #a78bfa;
          border-radius: 30px;
          padding: 15px 25px;
          text-align: center;
          animation: counter-spin 25s linear infinite;
          box-shadow: 0 8px 32px rgba(147, 51, 234, 0.3);
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .editable-node:hover {
          background: rgba(167, 139, 250, 0.3);
          cursor: pointer;
          transform: scale(1.05) counter-spin 25s linear infinite !important;
          box-shadow: 0 8px 32px rgba(188, 19, 254, 0.6);
          border-color: #d8b4fe;
        }

        .node-top { top: -35px; left: calc(50% - 65px); }
        .node-bottom-right { bottom: 25px; right: -45px; }
        .node-bottom-left { bottom: 25px; left: -45px; }

        .glass-card {
          background: rgba(151, 53, 216, 0.15);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(167, 139, 250, 0.4);
          border-radius: 20px;
          padding: 20px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
        }
        
        .glass-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(147, 51, 234, 0.5);
          border-color: #d8b4fe;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 15px;
          margin-bottom: 40px;
        }

        .tracks-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 60px;
        }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 5, 30, 0.85);
          backdrop-filter: blur(10px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeOverlay 0.2s ease-out forwards;
          padding: 20px;
        }

        .modal-content-box {
          background: linear-gradient(135deg, rgba(91, 48, 133, 0.9), rgba(31, 16, 65, 0.95));
          border: 2px solid #a78bfa;
          border-radius: 24px;
          padding: 40px 30px;
          max-width: 450px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(188, 19, 254, 0.4);
          position: relative;
          animation: fadeIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .close-button {
          position: absolute;
          top: 15px;
          right: 20px;
          background: none;
          border: none;
          color: #d8b4fe;
          font-size: 28px;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        
        .close-button:hover {
          color: white;
        }
      `}</style>

      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content-box" onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={() => setActiveModal(null)}>×</button>
            {renderModalContent()}
          </div>
        </div>
      )}

      <header style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate(isViewingOther ? '/friends' : '/home')}>
          ← Back
        </button>
      </header>

      {loading && isViewingOther && (
        <main style={styles.mainContent}>
          <p style={{ color: '#d8b4fe' }}>Loading profile...</p>
        </main>
      )}
      {isViewingOther && !loading && !profileUser && (
        <main style={styles.mainContent}>
          <p style={{ color: '#d8b4fe' }}>User not found.</p>
        </main>
      )}
      {(!isViewingOther || profileUser) && !loading && (
      <main style={styles.mainContent}>
        {isViewingOther && relationship && (
          <div style={styles.friendActions}>
            {relationship.areFriends && (
              <span style={styles.friendBadge}>Friends</span>
            )}
            {relationship.requestStatus === 'sent' && (
              <span style={styles.friendBadge}>Request sent</span>
            )}
            {relationship.requestStatus === 'received' && (
              <>
                <button style={{ ...styles.actionBtn, background: '#22c55e' }} onClick={handleAccept} disabled={actionLoading}>
                  Accept
                </button>
                <button style={{ ...styles.actionBtn, background: 'rgba(255,255,255,0.2)' }} onClick={handleDecline} disabled={actionLoading}>
                  Decline
                </button>
              </>
            )}
            {relationship.requestStatus === 'none' && !relationship.areFriends && (
              <button style={{ ...styles.actionBtn, background: '#a78bfa', color: '#1f1041' }} onClick={handleAddFriend} disabled={actionLoading}>
                {actionLoading ? 'Sending...' : 'Add friend'}
              </button>
            )}
          </div>
        )}

        <h1 style={styles.pageTitle}>{name.split(' ')[0]}</h1>

        <div className="orbit-system">
          <div style={styles.centerProfile}>
            <div style={styles.avatarContainer}>
              {savedAvatar ? (
                savedAvatar.mode === 'multiavatar' && savedAvatar.svg ? (
                  <div
                    style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}
                    dangerouslySetInnerHTML={{ __html: savedAvatar.svg }}
                  />
                ) : savedAvatar.mode === 'custom' ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', overflow: 'hidden', borderRadius: '50%' }}>
                    <div style={{ transform: 'scale(0.55)', position: 'relative', top: '-15px' }}>
                      {(() => {
                        const selectedClothingColor = clothingColorOptions.find((c) => c.id === savedAvatar.clothingColor)?.value;
                        const selectedHairColor = hairColorOptions.find((c) => c.id === savedAvatar.hairColor)?.value;
                        const selectedSkinTone = skinToneOptions.find((c) => c.id === savedAvatar.skinTone)?.value;

                        return (
                          <>
                            <div className={`avatar-head avatar-hair-${savedAvatar.hairStyle}`} style={{ '--hair-color': selectedHairColor, '--skin-color': selectedSkinTone }}>
                              <div className="avatar-head-skin" style={{ backgroundColor: selectedSkinTone }} />
                              <div className={`avatar-face avatar-expression-${savedAvatar.expression}`}>
                                <div className="avatar-eyes">
                                  <span className="avatar-eye left-eye" />
                                  <span className="avatar-eye right-eye" />
                                </div>
                                <div className="avatar-mouth" />
                              </div>
                            </div>
                            <div className={`avatar-body avatar-body-size-${savedAvatar.bodyType} avatar-clothing-${savedAvatar.clothing}`} style={{ '--clothing-color': selectedClothingColor, '--skin-color': selectedSkinTone }}>
                              <div className="avatar-arm avatar-arm-left" />
                              <div className="avatar-arm avatar-arm-right" />
                              <div className="avatar-leg avatar-leg-left" />
                              <div className="avatar-leg avatar-leg-right" />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : <img src={fallbackAvatar} alt="Profile" style={styles.avatar} />
              ) : (
                <img src={fallbackAvatar} alt="Profile" style={styles.avatar} />
              )}
            </div>
            <h2 style={styles.username}>@{name.split(' ')[0]}</h2>
            
            {/* Customize Avatar Button injected natively into the layout */}
            {!isViewingOther && (
              <button 
                onClick={handleAvatar}
                style={{ ...styles.actionBtn, background: 'rgba(167, 139, 250, 0.3)', marginTop: '12px', fontSize: '11px', padding: '6px 14px' }}
              >
                Customize Avatar
              </button>
            )}
          </div>

          <div className="orbit-path">
            <div 
              className={`stat-node node-top ${!isViewingOther ? 'editable-node' : ''}`}
              onClick={() => handleOpenEdit('faculty', userStats.faculty)}
              title={!isViewingOther ? 'Click to edit Faculty' : ''}
            >
              <p style={styles.statLabel}>Faculty</p>
              <p style={styles.statValue}>{userStats.faculty}</p>
            </div>
            
            <div 
              className={`stat-node node-bottom-right ${!isViewingOther ? 'editable-node' : ''}`}
              onClick={() => handleOpenEdit('classYear', userStats.year)}
              title={!isViewingOther ? 'Click to edit Class Year' : ''}
            >
              <p style={styles.statLabel}>Year</p>
              <p style={styles.statValue}>{userStats.year}</p>
            </div>
            
            <div 
              className={`stat-node node-bottom-left ${!isViewingOther ? 'editable-node' : ''}`}
              onClick={() => handleOpenEdit('major', userStats.major)}
              title={!isViewingOther ? 'Click to edit Major' : ''}
            >
              <p style={styles.statLabel}>Major</p>
              <p style={styles.statValue}>{userStats.major}</p>
            </div>
          </div>
        </div>

        <div style={styles.contentWrapper}>
          <h3 style={styles.sectionHeader}>Your Stats</h3>
          <div className="stats-grid">
            <div className="glass-card" onClick={() => setActiveModal('obsession')} title="Click for details!">
              <p style={styles.statLabel}>Obsession Level</p>
              <p style={styles.statValueBig}>{listeningStats.obsessionLevel}</p>
            </div>

            <div className="glass-card" onClick={() => setActiveModal('attention')} title="Click for details!">
              <p style={styles.statLabel}>Attention Span</p>
              <p style={styles.statValueBig}>{listeningStats.attentionSpan}</p>
            </div>

            <div className="glass-card" onClick={() => setActiveModal('anthem')} title="Click for details!">
              <p style={styles.statLabel}>Current Anthem</p>
              <p style={styles.statValueBig}>{listeningStats.currentAnthem}</p>
            </div>

            <div className="glass-card" onClick={() => setActiveModal('artist')} title="Click for details!">
              <p style={styles.statLabel}>Top Artist</p>
              <p style={styles.statValueBig}>{listeningStats.artistOfMonth}</p>
            </div>
          </div>

          <h3 style={styles.sectionHeader}>Your Top Tracks</h3>
          <div className="tracks-list">
            {topTracks.map((track, index) => (
              <div key={index} className="glass-card" style={styles.trackItem}>
                <div style={styles.trackNumber}>#{index + 1}</div>
                <div>
                  <p style={styles.trackTitle}>{track.title}</p>
                  <p style={styles.trackArtist}>{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
      )}
    </div>
  );
}

const styles = {
  pageContainer: {
    overflowY: 'auto', 
    overflowX: 'hidden',
  },
  header: {
    padding: '30px',
    display: 'flex',
    justifyContent: 'flex-start',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  backButton: {
    backgroundColor: '#e9d5ff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '9999px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#581c87',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, background-color 0.3s',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    zIndex: 10,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: '800px',
    padding: '0 30px',
  },
  pageTitle: {
    fontFamily: "'Jersey 25', sans-serif",
    fontSize: '70px',
    color: 'white',
    letterSpacing: '0.2em',
    marginBottom: '10px',
    textShadow: "0 0 10px #bc13fe, 0 0 40px #bc13fe",
  },
  sectionHeader: {
    fontFamily: "'Jersey 25', sans-serif",
    fontSize: '45px',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '20px',
    textShadow: "0 0 5px #bc13fe, 0 0 20px #bc13fe",
    borderBottom: '2px solid rgba(167, 139, 250, 0.3)',
    paddingBottom: '10px',
  },
  centerProfile: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5, 
  },
  avatarContainer: {
    width: '130px',
    height: '130px',
    borderRadius: '50%',
    padding: '4px',
    background: 'linear-gradient(135deg, #bc13fe, #5b3085)',
    boxShadow: '0 0 30px rgba(188, 19, 254, 0.6)',
    marginBottom: '15px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #1f1041',
  },
  username: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '14px',
    color: 'white',
    textShadow: '2px 2px 0px #5b3085',
    margin: 0,
  },
  statLabel: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '8px',
    color: '#d8b4fe',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '800',
    fontSize: '16px',
    color: 'white',
    margin: 0,
  },
  statValueBig: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '900',
    fontSize: '28px',
    color: 'white',
    margin: 0,
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
  trackItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '15px 25px',
    cursor: 'default',
  },
  trackNumber: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '24px',
    color: '#a78bfa',
    opacity: 0.8,
  },
  trackTitle: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '800',
    fontSize: '18px',
    color: 'white',
    marginBottom: '4px',
  },
  trackArtist: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    fontSize: '14px',
    color: '#d8b4fe',
  },
  friendActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  friendBadge: {
    padding: '10px 20px',
    borderRadius: '9999px',
    background: 'rgba(167, 139, 250, 0.3)',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
  },
  actionBtn: {
    padding: '10px 20px',
    borderRadius: '9999px',
    border: 'none',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  modalHeader: {
    fontFamily: "'Jersey 25', sans-serif",
    fontSize: '40px',
    color: 'white',
    letterSpacing: '0.05em',
    marginBottom: '15px',
    textShadow: "0 0 15px #bc13fe",
    marginTop: 0,
  },
  modalText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '18px',
    color: '#e9d5ff',
    lineHeight: '1.6',
    margin: 0,
  },
  modalLabel: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '12px',
    color: '#a78bfa',
    textTransform: 'uppercase',
    marginBottom: '10px',
    textAlign: 'left',
    width: '100%',
  },
  modalInput: {
    width: '100%',
    padding: '15px',
    background: 'rgba(0,0,0,0.3)',
    border: '2px solid #a78bfa',
    borderRadius: '12px',
    color: 'white',
    fontFamily: "'Inter', sans-serif",
    fontSize: '16px',
    marginBottom: '25px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  submitBtn: {
    width: '100%',
    padding: '15px',
    background: '#a78bfa',
    border: 'none',
    borderRadius: '12px',
    color: '#1f1041',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '800',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  },
};