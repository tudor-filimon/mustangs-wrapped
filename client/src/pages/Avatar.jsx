import React, { useEffect, useState, useRef } from 'react';
import multiavatar from '@multiavatar/multiavatar';
import { toPng } from 'html-to-image';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import '../App.css';

const clothingOptions = [
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'jersey', label: 'Jersey' },
  { id: 'tshirt', label: 'T-Shirt' },
];

const clothingColorOptions = [
  { id: 'purple', label: 'Purple', value: '#8b5cf6' },
  { id: 'black', label: 'Black', value: '#111827' },
  { id: 'white', label: 'White', value: '#f9fafb' },
  { id: 'red', label: 'Red', value: '#ef4444' },
];

const hairStyleOptions = [
  { id: 'short', label: 'Short' },
  { id: 'long', label: 'Long' },
  { id: 'afro', label: 'Afro' },
  { id: 'buzz', label: 'Buzz Cut' },
];

const hairColorOptions = [
  { id: 'black', label: 'Black', value: '#111827' },
  { id: 'brown', label: 'Brown', value: '#92400e' },
  { id: 'blonde', label: 'Blonde', value: '#eab308' },
  { id: 'red', label: 'Red', value: '#b91c1c' },
  { id: 'purple', label: 'Purple', value: '#7c3aed' },
];

const expressionOptions = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'happy', label: 'Happy' },
  { id: 'chill', label: 'Chill' },
  { id: 'surprised', label: 'Surprised' },
];

const skinToneOptions = [
  { id: 'light', label: 'Light', value: '#f9e0d2' },
  { id: 'tan', label: 'Tan', value: '#e0b898' },
  { id: 'medium', label: 'Medium', value: '#c27a4f' },
  { id: 'dark', label: 'Dark', value: '#8b5a3c' },
];

const bodyTypeOptions = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
  { id: 'chud', label: 'Chud' },
];

const multiavatarNameOptions = [
  'Weldon Warrior', 'Mus-DANG', 'Delilah’s Regular', 'Middlesex Maverick', 'Spoke Cowboy',
  'UC Library Lurker', 'Mustang Midnight Rider', 'Thames River Ranger', 'TD Stadium Superstar',
  'O-Week Outlaw', 'Exam Season Survivor', 'Cramming in Weldon', 'Retro Mustang',
  'Western World Wonder', 'Kings College Cowboy', 'Residence Ringleader', 'Talbot Time Traveler',
  'The Purple Pony', 'Campus Coffee Bandit', 'Bus 2 Wonderland', 'Mustang Mix Master',
  'Delaware Hall Deputy', 'Saugeen Sheriff', 'Mustang Mythic', 'Western Legend',
  'Health Sci Hero', 'Comp Sci Gremlin', 'Ivey Spreadsheet Samurai', 'AEO Flexer',
  'BMOS Breadwinner', 'Econ Graph Goblin', 'Med Sci Molecule Wrangler', 'Nursing Night Shift Ninja',
  'Engineering Problem Set Paladin', 'Psych Lecture Daydreamer', 'English Essay Enchanter',
  'Philosophy Thought Wrangler', 'History Exam Time-Traveler', 'Music Practice Room Phantom',
  'Chem Lab Cauldron Stirrer', 'Bio Lecture Bug Collector', 'Stats Curve Crusader',
  'Math Proof Pal', 'FIMS Media Goblin', 'Law Library Vampire', 'HBA Case Study Cowboy',
  'Social Sci Seminar Sleeper', 'Arts & Humanities Hallway Poet', 'Kin Gym Class Gladiator',
];

// ADDED PROPS HERE to handle the "Registration Mode" logic securely!
export default function Avatar({ isRegistrationMode = false, onSaveOverride, onBackOverride }) {
  const { updateUserInContext } = useAuth();
  const avatarRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  const [avatarMode, setAvatarMode] = useState('multiavatar');
  const [multiavatarSeed, setMultiavatarSeed] = useState(multiavatarNameOptions[0]);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const [clothing, setClothing] = useState('hoodie');
  const [clothingColor, setClothingColor] = useState('purple');
  const [hairStyle, setHairStyle] = useState('short');
  const [hairColor, setHairColor] = useState('black');
  const [expression, setExpression] = useState('neutral');
  const [skinTone, setSkinTone] = useState('light');
  const [bodyType, setBodyType] = useState('medium');

  const selectedClothingColor = clothingColorOptions.find((c) => c.id === clothingColor)?.value;
  const selectedHairColor = hairColorOptions.find((c) => c.id === hairColor)?.value;
  const selectedSkinTone = skinToneOptions.find((c) => c.id === skinTone)?.value;

  useEffect(() => {
    const saved = window.localStorage.getItem('mustangsWrappedAvatar');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.mode === 'multiavatar' && parsed.seed) {
          setAvatarMode('multiavatar');
          setMultiavatarSeed(parsed.seed);
        } else if (parsed.mode === 'custom') {
          setAvatarMode('custom');
          if (parsed.clothing) setClothing(parsed.clothing);
          if (parsed.clothingColor) setClothingColor(parsed.clothingColor);
          if (parsed.hairStyle) setHairStyle(parsed.hairStyle);
          if (parsed.hairColor) setHairColor(parsed.hairColor);
          if (parsed.expression) setExpression(parsed.expression);
          if (parsed.skinTone) setSkinTone(parsed.skinTone);
          if (parsed.bodyType) setBodyType(parsed.bodyType);
        }
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const handleSave = async () => {
    if (!avatarRef.current) return;
    setIsSaving(true);

    try {
      // 1. Keep the local storage config so the editor remembers their choices (Safe for Registration Mode)
      if (avatarMode === 'multiavatar') {
        const svg = multiavatar(multiavatarSeed);
        const payload = { mode: 'multiavatar', seed: multiavatarSeed, svg };
        window.localStorage.setItem('mustangsWrappedAvatar', JSON.stringify(payload));
      } else {
        const payload = { mode: 'custom', clothing, clothingColor, hairStyle, hairColor, expression, skinTone, bodyType };
        window.localStorage.setItem('mustangsWrappedAvatar', JSON.stringify(payload));
      }

      // 2. Take a high-res PNG screenshot of the DOM element
      const dataUrl = await toPng(avatarRef.current, { cacheBust: true, pixelRatio: 2 });

      // 3. CONDITIONAL SAVE LOGIC
      if (isRegistrationMode && onSaveOverride) {
        // If registering, hand the picture back to RegisterComplete.jsx! Do not hit the DB yet!
        onSaveOverride(dataUrl);
      } else {
        // If updating normally, push directly to database
        const response = await api.updateProfile({ avatar_url: dataUrl });
        updateUserInContext(response.user);
        setShowSavedToast(true);
        window.setTimeout(() => setShowSavedToast(false), 1600);
      }
    } catch (err) {
      console.error("Failed to save avatar", err);
      alert("Failed to save avatar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-container avatar-page" style={{ position: isRegistrationMode ? 'fixed' : 'relative', zIndex: isRegistrationMode ? 9999 : 1, width: '100%', height: '100%', top: 0, left: 0, background: '#0D0626' }}>
      <div className="bg-shape shape-top"></div>
      <div className="bg-shape shape-bottom"></div>

      <header className="profile-header" style={{ justifyContent: 'flex-start' }}>
        <button
          className="feed-back-btn"
          type="button"
          onClick={onBackOverride || (() => window.history.back())}
        >
          {/* Dynamically changes text based on where they are! */}
          {isRegistrationMode ? '← Back to Setup' : '← Back'}
        </button>
      </header>

      <main className="profile-content avatar-layout">
        <section className="avatar-preview-card">
          <h2 className="section-title">Your Avatar</h2>

          <div className="avatar-mode-toggle">
            <button
              type="button"
              className={`avatar-pill ${avatarMode === 'custom' ? 'active' : ''}`}
              onClick={() => setAvatarMode('custom')}
            >
              Custom character
            </button>
            <button
              type="button"
              className={`avatar-pill ${avatarMode === 'multiavatar' ? 'active' : ''}`}
              onClick={() => setAvatarMode('multiavatar')}
            >
              Multiavatar
            </button>
          </div>

          <div className="avatar-preview-background">
            <div className="avatar-notes-layer">
              <span className="music-note note-1">♪</span>
              <span className="music-note note-2">♫</span>
              <span className="music-note note-3">♬</span>
              <span className="music-note note-4">♩</span>
            </div>

            {avatarMode === 'custom' ? (
              <div className="avatar-character" ref={avatarRef}>
                <div
                  className={`avatar-head avatar-hair-${hairStyle}`}
                  style={{
                    '--hair-color': selectedHairColor,
                    '--skin-color': selectedSkinTone,
                  }}
                >
                  <div className="avatar-head-skin" style={{ backgroundColor: selectedSkinTone }} />
                  <div className={`avatar-face avatar-expression-${expression}`}>
                    <div className="avatar-eyes">
                      <span className="avatar-eye left-eye" />
                      <span className="avatar-eye right-eye" />
                    </div>
                    <div className="avatar-mouth" />
                  </div>
                </div>
                <div
                  className={`avatar-body avatar-body-size-${bodyType} avatar-clothing-${clothing}`}
                  style={{
                    '--clothing-color': selectedClothingColor,
                    '--skin-color': selectedSkinTone,
                  }}
                >
                  <div className="avatar-arm avatar-arm-left" />
                  <div className="avatar-arm avatar-arm-right" />
                  <div className="avatar-leg avatar-leg-left" />
                  <div className="avatar-leg avatar-leg-right" />
                </div>
              </div>
            ) : (
              <div className="multiavatar-wrapper" ref={avatarRef}>
                <div className="multiavatar-preview" dangerouslySetInnerHTML={{ __html: multiavatar(multiavatarSeed) }} />
              </div>
            )}
          </div>
          <p className="avatar-preview-label">
            {avatarMode === 'custom' ? 'Live preview updates as you choose options' : 'Multiavatar preview based on your seed'}
          </p>
        </section>

        <section className="avatar-controls">
          <h2 className="section-title">
            {avatarMode === 'custom' ? 'Customize your character' : 'Multiavatar options'}
          </h2>

          {avatarMode === 'custom' ? (
            <>
              <div className="avatar-control-group">
                <h3>Hair Style</h3>
                <div className="avatar-pill-row">
                  {hairStyleOptions.map((option) => (
                    <button key={option.id} type="button" className={`avatar-pill ${hairStyle === option.id ? 'active' : ''}`} onClick={() => setHairStyle(option.id)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="avatar-control-group">
                <h3>Hair Color</h3>
                <div className="avatar-pill-row">
                  {hairColorOptions.map((option) => (
                    <button key={option.id} type="button" className={`avatar-pill ${hairColor === option.id ? 'active' : ''}`} style={{ borderColor: option.value }} onClick={() => setHairColor(option.id)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="avatar-control-group">
                <h3>Skin Tone</h3>
                <div className="avatar-pill-row">
                  {skinToneOptions.map((option) => (
                    <button key={option.id} type="button" className={`avatar-pill ${skinTone === option.id ? 'active' : ''}`} style={{ borderColor: option.value }} onClick={() => setSkinTone(option.id)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="avatar-control-group">
                <h3>Body Type</h3>
                <div className="avatar-pill-row">
                  {bodyTypeOptions.map((option) => (
                    <button key={option.id} type="button" className={`avatar-pill ${bodyType === option.id ? 'active' : ''}`} onClick={() => setBodyType(option.id)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="avatar-control-group">
                <h3>Clothing</h3>
                <div className="avatar-pill-row">
                  {clothingOptions.map((option) => (
                    <button key={option.id} type="button" className={`avatar-pill ${clothing === option.id ? 'active' : ''}`} onClick={() => setClothing(option.id)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="avatar-control-group">
                <h3>Clothing Color</h3>
                <div className="avatar-pill-row">
                  {clothingColorOptions.map((option) => (
                    <button key={option.id} type="button" className={`avatar-pill ${clothingColor === option.id ? 'active' : ''}`} style={{ borderColor: option.value }} onClick={() => setClothingColor(option.id)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="avatar-control-group">
                <h3>Expression</h3>
                <div className="avatar-pill-row">
                  {expressionOptions.map((option) => (
                    <button key={option.id} type="button" className={`avatar-pill ${expression === option.id ? 'active' : ''}`} onClick={() => setExpression(option.id)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="avatar-control-group">
                <h3>Avatar name</h3>
                <p className="avatar-preview-label avatar-name-display">{multiavatarSeed}</p>
              </div>
              <div className="avatar-control-group">
                <button type="button" className="primary-button" onClick={() => setMultiavatarSeed(multiavatarNameOptions[Math.floor(Math.random() * multiavatarNameOptions.length)])}>
                  Randomize
                </button>
              </div>
            </>
          )}

          <button className="primary-button" type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : (isRegistrationMode ? 'Confirm Avatar' : 'Save Avatar')}
          </button>
        </section>
      </main>
      {showSavedToast && <div className="avatar-saved-toast">Avatar saved to your profile</div>}
    </div>
  );
}