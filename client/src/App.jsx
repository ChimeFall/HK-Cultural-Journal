import { Routes, Route, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import MovieDetailPage from './pages/MovieDetailPage'
import MapPage from './pages/MapPage'
import JournalPage from './pages/JournalPage'
import SharePage from './pages/SharePage'
import BottomNav from './components/BottomNav'
import BadgeNotification from './components/BadgeNotification'
import useStore from './store/useStore'

function App() {
  const location = useLocation()
  const isSharePage = location.pathname.startsWith('/share/')
  const newlyUnlockedBadges = useStore((s) => s.newlyUnlockedBadges)
  const clearNewlyUnlockedBadges = useStore((s) => s.clearNewlyUnlockedBadges)

  return (
    <div className="min-h-screen pb-16">
      <Routes>
        <Route path="/" element={<HomePage workType="Film" />} />
        <Route path="/music" element={<HomePage workType="Music" />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/share/:id" element={<SharePage />} />
      </Routes>
      {!isSharePage && <BottomNav />}
      {newlyUnlockedBadges.length > 0 && (
        <BadgeNotification
          badges={newlyUnlockedBadges}
          onDismiss={clearNewlyUnlockedBadges}
        />
      )}
    </div>
  )
}

export default App
