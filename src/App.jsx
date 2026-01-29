import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

// Import all your pages here
import HomePage from './pages/Homepage.jsx'
import MustangWrapped from './pages/wrappedScreen.jsx'
import PlaylistView from './pages/playlistScreen.jsx'
import ProfilePage from './pages/ProfilePage'
// import LoginPage from './pages/LoginPage' // <-- Uncomment this if/when you have a Login page file

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route "/" is the default page. 
          I set this to HomePage as you requested.
        */}
        <Route path="/" element={<HomePage />} />

        {/* These are the other pages.
          You can navigate to them using <Link to="/wrapped"> or navigate('/wrapped')
        */}
        <Route path="/wrapped" element={<MustangWrapped />} />
        <Route path="/playlist" element={<PlaylistView />} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* <Route path="/login" element={<LoginPage />} /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default App