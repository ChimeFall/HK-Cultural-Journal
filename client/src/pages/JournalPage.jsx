import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import JournalCard from '../components/JournalCard'
import CheckinForm from '../components/CheckinForm'
import SharePoster from '../components/SharePoster'
import MovieFootprintView from '../components/MovieFootprintView'
import MapFootprintView from '../components/MapFootprintView'
import AchievementsView from '../components/AchievementsView'
import { NearbyStorePanel } from '../components/NearbyPanel'
import { getDeviceId } from '../utils/deviceId'

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
}

function JournalPage() {
  const { lang, checkinRecords, fetchCheckinRecords, favorites, achievements, totalCheckins, fetchAchievements } = useStore()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('timeline')
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCheckinForm, setShowCheckinForm] = useState(false)
  const [checkinLocation, setCheckinLocation] = useState(null)
  const [requireLocationVerify, setRequireLocationVerify] = useState(false)
  const [favoriteLocations, setFavoriteLocations] = useState([])
  const [shareCheckin, setShareCheckin] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        await fetchCheckinRecords()
        await fetchAchievements()
        const res = await fetch('/api/locations')
        const json = await res.json()
        if (json.success) {
          setFavoriteLocations(json.data.filter((loc) => favorites.includes(loc.id)))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [fetchCheckinRecords, favorites])

  useEffect(() => {
    setCheckins(checkinRecords)
  }, [checkinRecords])

  useEffect(() => {
    const checkinId = searchParams.get('checkin')
    const verify = searchParams.get('verify')
    if (checkinId && favoriteLocations.length > 0) {
      const loc = favoriteLocations.find((l) => l.id === checkinId)
      if (loc) {
        setCheckinLocation(loc)
        setRequireLocationVerify(verify === '1')
        setShowCheckinForm(true)
      }
    }
  }, [searchParams, favoriteLocations])

  const handleCheckinSuccess = () => {
    setShowCheckinForm(false)
    setCheckinLocation(null)
    setRequireLocationVerify(false)
    navigate('/journal', { replace: true })
  }

  // 删除打卡记录
  const handleDeleteCheckin = async (checkinId) => {
    if (!confirm('确定要删除这条打卡记录吗？')) return
    try {
      const res = await fetch(`/api/checkins/${checkinId}`, {
        method: 'DELETE',
        headers: { 'x-device-id': getDeviceId() },
      })
      const json = await res.json()
      if (json.success) {
        await fetchCheckinRecords()
      } else {
        alert(json.message || '删除失败')
      }
    } catch (e) {
      alert('网络错误，删除失败')
      console.error(e)
    }
  }

  if (loading) return <div className="p-4 text-center">加载中...</div>

  const tabs = [
    { key: 'timeline', label: lang === 'hant' ? '时间线' : '时间线' },
    { key: 'movie', label: lang === 'hant' ? '作品足迹' : '作品足迹' },
    { key: 'map', label: lang === 'hant' ? '地图足迹' : '地图足迹' },
    { key: 'achievements', label: '成就' },
  ]

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-journal-stamp mb-4 font-serif">
        {lang === 'hant' ? '我的手账' : '我的手账'}
      </h1>

      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              activeTab === tab.key
                ? 'bg-journal-stamp text-white'
                : 'bg-white text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'achievements' ? (
        <AchievementsView badges={achievements} totalCheckins={totalCheckins} />
      ) : checkins.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">📔</div>
          <p className="mb-4">
            你的香港文化手账还是空白的，去地图上收藏几个地点，开始你的电影朝圣之旅吧
          </p>
          <Link
            to="/map"
            className="inline-block px-6 py-2 bg-journal-stamp text-white rounded-full text-sm"
          >
            去探索地图
          </Link>
        </div>
      ) : (
        <>
          {activeTab === 'timeline' && (
            <TimelineView
              checkins={checkins}
              onShare={setShareCheckin}
              onDelete={handleDeleteCheckin}
            />
          )}
          {activeTab === 'movie' && (
            <MovieFootprintView
              checkins={checkins}
              lang={lang}
              onDelete={handleDeleteCheckin}
            />
          )}
          {activeTab === 'map' && <MapFootprintView checkins={checkins} />}
        </>
      )}

      {showCheckinForm && (
        <CheckinForm
          location={checkinLocation}
          fallbackLocations={favoriteLocations}
          requireLocation={requireLocationVerify}
          onSuccess={handleCheckinSuccess}
          onCancel={() => {
            setShowCheckinForm(false)
            setCheckinLocation(null)
            setRequireLocationVerify(false)
            navigate('/journal', { replace: true })
          }}
        />
      )}

      {shareCheckin && (
        <SharePoster
          checkin={shareCheckin}
          onClose={() => setShareCheckin(null)}
        />
      )}

      <NearbyStorePanel />
    </div>
  )
}

function TimelineView({ checkins, onShare, onDelete }) {
  const groups = checkins.reduce((acc, item) => {
    const dateKey = item.checkin_time
      ? item.checkin_time.split('T')[0]
      : item.checkinTime.split('T')[0]
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(item)
    return acc
  }, {})

  const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a))

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <div className="stamp-circle">{new Date(date).getDate()}</div>
            <div className="text-sm font-bold text-gray-700">{formatDate(date)}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {groups[date].map((item) => (
              <div key={item.id} className="timeline-card">
                <JournalCard
                  photoUrl={item.photo_path || item.photoUrl}
                  locationName={item.location_name || item.locationName}
                  movieTitle={
                    item.movie_title_hant || item.movieTitle || '《未知电影》'
                  }
                  note={item.note}
                  checkinTime={item.checkin_time || item.checkinTime}
                  onShare={() => onShare(item)}
                  onDelete={() => onDelete(item.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default JournalPage
