import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/styles.css';
import AnimatedBackground from '../components/AnimatedBackground';
import TiltedCard from '../components/TiltedCard';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    zIndex: 1,
    padding: '40px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    margin: 0,
    border: 'none',
    outline: 'none',
    animation: 'slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
    overflow: 'auto', 
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '60px'
  },
  title: {
    fontSize: '50px',
    fontWeight: '400px',
    color: 'white',
    margin: 0,
    letterSpacing: '2px',
    fontFamily: "'Jersey 25', cursive",
    textShadow: "10px 5px 2px #2e1052, 0 0 20px rgba(138, 56, 245, 0.4)",
  },
  backButton: {
    backgroundColor: '#e9d5ff',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '9999px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#581c87',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    outline: 'none',
    boxShadow: 'none'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '32px',
    marginBottom: '64px'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  coverTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    margin: 0,
    fontFamily: "'Press Start 2P', cursive",
    textShadow: `
      2px 2px 0px rgba(0, 0, 0, 0.45),
      -1px -1px 0px rgba(139, 92, 246, 0.6),
      1px 1px 0px rgba(139, 92, 246, 0.6)
    `,
    lineHeight: '1.35',
    transform: 'translateZ(32px)'
  },
  playlistButton: {
    backgroundColor: '#e9d5ff',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '9999px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#581c87',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    outline: 'none',
    boxShadow: 'none'
  },
  addMoreButtonWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '12px',
    marginBottom: '36px'
  },
  addMoreButton: {
    backgroundColor: '#e9d5ff',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '9999px',
    fontSize: '15px',
    fontWeight: '700',
    color: '#581c87',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    outline: 'none',
    boxShadow: 'none'
  },
  cardWrap: {
    position: 'relative',
    width: '100%',
    marginBottom: '24px'
  },
  deletePlaylistButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: 5,
    minWidth: '72px',
    height: '34px',
    padding: '0 12px',
    borderRadius: '9999px',
    border: 'none',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.02em',
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(7, 2, 19, 0.7)',
    backdropFilter: 'blur(4px)',
    zIndex: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modalCard: {
    width: '100%',
    maxWidth: '520px',
    borderRadius: '18px',
    border: '1px solid rgba(255, 255, 255, 0.24)',
    background: `
      radial-gradient(circle at 16% 14%, rgba(255, 255, 255, 0.18) 0%, transparent 40%),
      linear-gradient(145deg, rgba(168, 85, 247, 0.9) 0%, rgba(124, 58, 237, 0.88) 55%, rgba(67, 56, 202, 0.9) 100%)
    `,
    boxShadow: '0 20px 56px rgba(76, 29, 149, 0.52)',
    padding: '26px 22px',
    color: 'white'
  },
  modalTitle: {
    margin: '0 0 10px 0',
    fontSize: '20px',
    fontFamily: "'Press Start 2P', cursive",
    lineHeight: '1.45'
  },
  modalInput: {
    width: '100%',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(10, 6, 34, 0.45)',
    color: 'white',
    padding: '12px 14px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '16px'
  },
  modalCancelButton: {
    border: '1px solid rgba(255, 255, 255, 0.35)',
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'white',
    borderRadius: '9999px',
    padding: '10px 18px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  modalCreateButton: {
    border: 'none',
    background: '#e9d5ff',
    color: '#581c87',
    borderRadius: '9999px',
    padding: '10px 18px',
    fontWeight: 800,
    cursor: 'pointer'
  },
  coverOverlay: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px'
  }
};

export default function MustangWrapped() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topTracks, setTopTracks] = useState([]);
  const [globalTopTracks, setGlobalTopTracks] = useState([]);
  const [yearTopTracks, setYearTopTracks] = useState([]);
  const [facultySchoolTopTracks, setFacultySchoolTopTracks] = useState([]);
  const [majorCohortTopTracks, setMajorCohortTopTracks] = useState([]);
  const [customPlaylists, setCustomPlaylists] = useState([]);
  const [yearPlaylistTitle, setYearPlaylistTitle] = useState('Class Year Top 50 Songs');
  const [facultySchoolPlaylistTitle, setFacultySchoolPlaylistTitle] = useState('Faculty Top 50 Songs');
  const [majorPlaylistTitle, setMajorPlaylistTitle] = useState('Top 50 Songs');
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    api.getTopTracks('medium_term')
      .then((data) => {
        console.log('Top 50 tracks:', data.tracks);
        if (data.tracks?.length) setTopTracks(data.tracks);
        data.tracks?.forEach((t, i) => {
          console.log(`${i + 1}. ${t.name} – ${t.artists}`);
        });
      })
      .catch((err) => {
        console.warn('Could not load top tracks:', err.message);
      });

    api.getGlobalTopTracks()
      .then((data) => {
        console.log('Global top 50 tracks:', data.tracks);
        if (data.tracks?.length) setGlobalTopTracks(data.tracks);
      })
      .catch((err) => {
        console.warn('Could not load global tracks:', err.message);
      });

    api.getYearTopTracks()
      .then((data) => {
        console.log('Class year top 50 tracks:', data.tracks);
        if (data.tracks?.length) setYearTopTracks(data.tracks);
        const y = data?.cohort?.value;
        if (y != null && String(y).trim().length > 0) {
          setYearPlaylistTitle(`Class of ${y} Top 50 Songs`);
        }
      })
      .catch((err) => {
        console.warn('Could not load class year tracks:', err.message);
      });

    api.getFacultySchoolTopTracks()
      .then((data) => {
        console.log('Faculty school top 50 tracks:', data.tracks);
        if (data.tracks?.length) setFacultySchoolTopTracks(data.tracks);
        const facultyName = data?.cohort?.value;
        if (facultyName && String(facultyName).trim().length > 0) {
          setFacultySchoolPlaylistTitle(`${facultyName} — Faculty Top 50 Songs`);
        }
      })
      .catch((err) => {
        console.warn('Could not load faculty school tracks:', err.message);
      });

    api.getFacultyTopTracks()
      .then((data) => {
        console.log('Major cohort top 50 tracks:', data.tracks);
        if (data.tracks?.length) setMajorCohortTopTracks(data.tracks);
        const cohortValue = data?.cohort?.value;
        if (cohortValue != null && String(cohortValue).trim().length > 0) {
          setMajorPlaylistTitle(`${cohortValue} Top 50 Songs`);
        }
      })
      .catch((err) => {
        console.warn('Could not load major cohort tracks:', err.message);
      });
  }, []);

  const top50Songs = topTracks.slice(0, 50).map((t) => ({
    id: t.spotify_id,
    spotifyId: t.spotify_id,
    title: t.name,
    album: t.artists,
    imageUrl: t.image
  }));

  const globalTop50Songs = globalTopTracks.slice(0, 50).map((t) => ({
    id: t.spotify_id,
    spotifyId: t.spotify_id,
    title: t.name,
    album: t.artists || 'Unknown artist',
    imageUrl: t.image_url
  }));

  const yearTop50Songs = yearTopTracks.slice(0, 50).map((t) => ({
    id: t.spotify_id,
    spotifyId: t.spotify_id,
    title: t.name,
    album: t.artists || 'Unknown artist',
    imageUrl: t.image_url
  }));

  const facultySchoolTop50Songs = facultySchoolTopTracks.slice(0, 50).map((t) => ({
    id: t.spotify_id,
    spotifyId: t.spotify_id,
    title: t.name,
    album: t.artists || 'Unknown artist',
    imageUrl: t.image_url
  }));

  const majorCohortTop50Songs = majorCohortTopTracks.slice(0, 50).map((t) => ({
    id: t.spotify_id,
    spotifyId: t.spotify_id,
    title: t.name,
    album: t.artists || 'Unknown artist',
    imageUrl: t.image_url
  }));

  useEffect(() => {
    if (!user?.id) {
      setCustomPlaylists([]);
      return;
    }

    api.getSharedPlaylists()
      .then((data) => {
        const playlists = Array.isArray(data?.playlists) ? data.playlists : [];
        setCustomPlaylists(
          playlists.filter((playlist) => String(playlist?.title || '').trim().toLowerCase() !== 'wrapped 1')
        );
      })
      .catch((error) => {
        console.warn('Could not load shared playlists:', error?.message || error);
        setCustomPlaylists([]);
      });
  }, [user?.id]);

  const handleAddPlaylist = () => {
    if (!user?.id) {
      window.alert('Please sign in first.');
      return;
    }

    if (!top50Songs.length) {
      window.alert('Your Top 50 songs are still loading.');
      return;
    }

    const suggestedName = `Wrapped ${customPlaylists.length + 1}`;
    setNewPlaylistName(suggestedName);
    setSelectedFriendIds([]);
    setIsNameModalOpen(true);
    setIsLoadingFriends(true);
    Promise.allSettled([api.getFriends(), api.getFollowing()])
      .then(([friendsResult, followingResult]) => {
        const legacyFriends = friendsResult.status === 'fulfilled' && Array.isArray(friendsResult.value?.friends)
          ? friendsResult.value.friends
          : [];
        const following = followingResult.status === 'fulfilled' && Array.isArray(followingResult.value?.following)
          ? followingResult.value.following
          : [];

        const mergedMap = new Map();
        [...legacyFriends, ...following].forEach((person) => {
          if (person?.id) mergedMap.set(person.id, person);
        });
        setFriends(Array.from(mergedMap.values()));
      })
      .catch(() => {
        setFriends([]);
      })
      .finally(() => {
        setIsLoadingFriends(false);
      });
  };

  const handleCreatePlaylist = async () => {
    const playlistName = newPlaylistName.trim();
    if (!playlistName || !user?.id || isCreatingPlaylist) return;

    setIsCreatingPlaylist(true);
    try {
      const createData = await api.createSharedPlaylist(playlistName, selectedFriendIds);
      const created = createData?.playlist;
      if (!created) throw new Error('No playlist returned');
      setCustomPlaylists((prev) => [created, ...prev]);
      setIsNameModalOpen(false);
      setNewPlaylistName('');
      setSelectedFriendIds([]);
    } catch (error) {
      console.warn('Could not create friend Wrapped playlist:', error);
      window.alert('Could not build playlist from selected friends.');
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const handleDeletePlaylist = (playlistId) => {
    api.deleteSharedPlaylist(playlistId)
      .then(() => {
        setCustomPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      })
      .catch((error) => {
        console.warn('Could not delete shared playlist:', error?.message || error);
      });
  };

  const wrappedItems = [
    { id: 1, title: 'Your Top 50 Songs', isTop50Playlist: true },
    { id: 2, title: 'Global Top 50 Songs', isGlobalTop50Playlist: true },
    { id: 3, title: yearPlaylistTitle, isYearPlaylist: true },
    { id: 4, title: facultySchoolPlaylistTitle, isFacultySchoolPlaylist: true },
    { id: 5, title: majorPlaylistTitle, isMajorCohortPlaylist: true },
    ...customPlaylists.map((playlist) => ({
      id: playlist.id,
      title: playlist.title,
      isCustomPlaylist: true,
      songs: playlist.songs,
      isOwner: Boolean(playlist.isOwner),
      selectedFriendIds: playlist.selectedFriendIds || [],
      selectedFriendNames: playlist.selectedFriendNames || []
    }))
  ];

  // Group items into chunks of 3
  const groupedItems = [];
  for (let i = 0; i < wrappedItems.length; i += 3) {
    groupedItems.push(wrappedItems.slice(i, i + 3));
  }

  return (
    <div className="home-container dark page-transition">
      <AnimatedBackground />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
      `}</style>
      <div style={styles.container}>
        <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Mustang Wrapped</h1>
          <button style={styles.backButton} onClick={() => navigate('/home')}>
            ← Back
          </button>
        </div>

        {/* Cards Grid with Dividers */}
        {groupedItems.map((group, groupIndex) => (
          <React.Fragment key={`group-${groupIndex}`}>
            <div style={styles.grid}>
              {group.map((item) => (
                <div key={item.id} style={styles.card}>
                  {/* Playlist Cover */}
                  <div
                    style={styles.cardWrap}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/playlist', {
                      state: item.isTop50Playlist
                        ? { playlistName: 'Your Top 50 Songs', songs: top50Songs }
                        : item.isGlobalTop50Playlist
                          ? { playlistName: 'Global Top 50 Songs', songs: globalTop50Songs }
                        : item.isYearPlaylist
                          ? { playlistName: yearPlaylistTitle, songs: yearTop50Songs }
                        : item.isFacultySchoolPlaylist
                          ? { playlistName: facultySchoolPlaylistTitle, songs: facultySchoolTop50Songs }
                        : item.isMajorCohortPlaylist
                          ? { playlistName: majorPlaylistTitle, songs: majorCohortTop50Songs }
                        : item.isCustomPlaylist
                          ? {
                              playlistName: item.title,
                              songs: item.songs || [],
                              isCustomPlaylist: true,
                              isOwner: Boolean(item.isOwner),
                              playlistId: item.id,
                              selectedFriendIds: item.selectedFriendIds || [],
                              selectedFriendNames: item.selectedFriendNames || []
                            }
                        : undefined
                    })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate('/playlist', {
                          state: item.isTop50Playlist
                            ? { playlistName: 'Your Top 50 Songs', songs: top50Songs }
                            : item.isGlobalTop50Playlist
                              ? { playlistName: 'Global Top 50 Songs', songs: globalTop50Songs }
                            : item.isYearPlaylist
                              ? { playlistName: yearPlaylistTitle, songs: yearTop50Songs }
                            : item.isFacultySchoolPlaylist
                              ? { playlistName: facultySchoolPlaylistTitle, songs: facultySchoolTop50Songs }
                            : item.isMajorCohortPlaylist
                              ? { playlistName: majorPlaylistTitle, songs: majorCohortTop50Songs }
                            : item.isCustomPlaylist
                              ? {
                                  playlistName: item.title,
                                  songs: item.songs || [],
                                  isCustomPlaylist: true,
                                  isOwner: Boolean(item.isOwner),
                                  playlistId: item.id,
                                  selectedFriendIds: item.selectedFriendIds || [],
                                  selectedFriendNames: item.selectedFriendNames || []
                                }
                            : undefined
                        });
                      }
                    }}
                  >
                    <TiltedCard
                      containerHeight="280px"
                      containerWidth="100%"
                      cardHeight="280px"
                      cardWidth="100%"
                      captionText={item.title}
                      showTooltip={false}
                      overlayContent={
                        <div style={styles.coverOverlay}>
                          {item.isCustomPlaylist && item.isOwner ? (
                            <button
                              type="button"
                              aria-label={`Delete playlist ${item.title}`}
                              title="Delete playlist"
                              style={styles.deletePlaylistButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePlaylist(item.id);
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              Delete
                            </button>
                          ) : null}
                          <h2 style={styles.coverTitle}>{item.title}</h2>
                          <span className="tilted-card-cta">View Playlist</span>
                        </div>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </React.Fragment>
        ))}

        <div style={styles.addMoreButtonWrap}>
          <button
            style={styles.addMoreButton}
            onClick={handleAddPlaylist}
          >
            + Add More Playlists
          </button>
        </div>

      </div>
    </div>
    {isNameModalOpen ? (
      <div style={styles.modalBackdrop} onClick={() => setIsNameModalOpen(false)}>
        <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
          <h3 style={styles.modalTitle}>Name New Playlist</h3>
          <input
            autoFocus
            type="text"
            style={styles.modalInput}
            value={newPlaylistName}
            maxLength={80}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreatePlaylist();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setIsNameModalOpen(false);
              }
            }}
            placeholder="Enter playlist name"
          />
          <div style={{ marginTop: '14px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', opacity: 0.9 }}>
              Select friends for a shared Wrapped:
            </p>
            {isLoadingFriends ? (
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.85 }}>Loading friends...</p>
            ) : friends.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.85 }}>
                No friends available yet. Follow people first, then create a shared Wrapped.
              </p>
            ) : (
              <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                {friends.map((friend) => {
                  const checked = selectedFriendIds.includes(friend.id);
                  return (
                    <label
                      key={friend.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '7px',
                        fontSize: '14px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setSelectedFriendIds((prev) =>
                            isChecked ? [...prev, friend.id] : prev.filter((id) => id !== friend.id)
                          );
                        }}
                      />
                      <span>{friend.display_name || 'Unknown'}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div style={styles.modalActions}>
            <button
              type="button"
              style={styles.modalCancelButton}
              onClick={() => setIsNameModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              style={styles.modalCreateButton}
              onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim() || isCreatingPlaylist}
            >
                {isCreatingPlaylist ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </div>
  );
}