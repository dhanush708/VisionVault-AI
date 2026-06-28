import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import DashboardPage from './pages/DashboardPage';
import PlaybackPage from './pages/PlaybackPage';
import LibraryPage from './pages/LibraryPage';
import OpenVideoPage from './pages/OpenVideoPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/playback" element={<PlaybackPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/open/:videoId" element={<OpenVideoPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
