import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

// Import all your pages here
import HomePage from './pages/Homepage.jsx'
import MustangWrapped from './pages/wrappedScreen.jsx'
import PlaylistView from './pages/playlistScreen.jsx'
import ProfilePage from './pages/ProfilePage'
import MustangWrappedLogin from './pages/loginScreen.jsx'
import ComingSoon from './pages/ComingSoon.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route "/" is the default page. */}
        <Route path="/" element={<MustangWrappedLogin />} />

        {/* Route "/home" is now the main dashboard. */}
        <Route path="/home" element={<HomePage />} />

        {/* These are the other pages.
          You can navigate to them using <Link to="/wrapped"> or navigate('/wrapped')
        */}
        <Route path="/wrapped" element={<MustangWrapped />} />
        <Route path="/playlist" element={<PlaylistView />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/coming-soon" element={<ComingSoon />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App