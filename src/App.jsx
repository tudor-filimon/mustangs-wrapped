import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import MustangWrapped from './pages/wrappedScreen.jsx'
import PlaylistView from './pages/playlistScreen.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MustangWrapped />} />
        <Route path="/playlist" element={<PlaylistView />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App