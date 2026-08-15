import { useEffect } from 'react'

function BadgeNotification({ badges, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  if (!badges || badges.length === 0) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pointer-events-none">
      <div
        className="mt-12 pointer-events-auto animate-badge-pop bg-white rounded-2xl shadow-xl border-2 border-journal-gold p-4 mx-4 max-w-sm w-full cursor-pointer"
        onClick={onDismiss}
      >
        <div className="text-center">
          <div className="text-3xl mb-2 animate-badge-pop">
            {badges.length === 1 ? badges[0].icon : '🎉'}
          </div>
          <h3 className="font-bold text-journal-stamp text-base">
            {badges.length === 1 ? '成就解锁！' : `解锁 ${badges.length} 个成就！`}
          </h3>
          <div className="mt-2 space-y-1">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="text-sm text-gray-700 flex items-center justify-center gap-1.5"
              >
                <span>{badge.icon}</span>
                <span className="font-medium">{badge.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">点击关闭</p>
        </div>
      </div>
    </div>
  )
}

export default BadgeNotification
