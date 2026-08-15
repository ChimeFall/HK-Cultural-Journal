import useStore from '../store/useStore'

function CheckinModal({ location, distance, isMock, onConfirm, onDismiss }) {
  const { lang } = useStore()
  const movieTitle = lang === 'hant' ? location.movie_title_hant : location.movie_title_hans
  const sceneDesc = location.scene_desc || ''
  const shortDesc = sceneDesc.length > 50 ? sceneDesc.slice(0, 50) + '…' : sceneDesc

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onDismiss}
      />
      <div className="relative bg-white w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl p-5 z-50 animate-slide-up">
        <h3 className="text-lg font-bold text-journal-stamp mb-1">
          你已到达《{movieTitle}》取景地
        </h3>
        <p className="text-xl font-bold text-gray-800 mb-2">{location.location_name}</p>
        <p className="text-sm text-gray-500 mb-3">
          {isMock ? '模拟位置' : `距离约 ${distance} 米`}
        </p>
        <p className="text-sm text-gray-600 mb-5">{shortDesc}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-journal-stamp text-white font-medium text-sm"
          >
            立即打卡
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-700 font-medium text-sm"
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckinModal
