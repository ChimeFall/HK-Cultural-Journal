import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'

function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${meters} m`
}

function NearbyPanel({ locations, onClose, lang }) {
  const navigate = useNavigate()

  if (!locations || locations.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl p-5 z-50 max-h-[70vh] overflow-y-auto animate-slide-up">
        <h3 className="text-lg font-bold text-journal-stamp mb-1">附近取景地</h3>
        <p className="text-xs text-gray-500 mb-4">500 米内还有这些地点等你探索</p>

        <div className="space-y-3">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
            >
              <div className="w-8 h-8 rounded-full bg-journal-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">📍</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">
                  {loc.location_name}
                </h4>
                <p className="text-xs text-gray-500 truncate">
                  {lang === 'hant' ? loc.movie_title_hant : loc.movie_title_hans}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-medium text-journal-stamp">
                  {formatDistance(loc.distance)}
                </div>
                <button
                  onClick={() => {
                    onClose()
                    navigate(`/map?location=${loc.id}`)
                  }}
                  className="text-[10px] text-journal-gold mt-0.5"
                >
                  查看地图
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-gray-200 text-gray-700 font-medium text-sm"
        >
          关闭
        </button>
      </div>
    </div>
  )
}

function NearbyStorePanel({ onClose }) {
  const nearbyLocations = useStore((s) => s.nearbyLocations)
  const clearNearbyLocations = useStore((s) => s.clearNearbyLocations)
  const lang = useStore((s) => s.lang)

  const handleClose = () => {
    clearNearbyLocations()
    if (onClose) onClose()
  }

  if (!nearbyLocations || nearbyLocations.length === 0) return null

  return <NearbyPanel locations={nearbyLocations} onClose={handleClose} lang={lang} />
}

export { NearbyPanel, NearbyStorePanel }
export default NearbyPanel
