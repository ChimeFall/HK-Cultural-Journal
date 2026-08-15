import { useMemo } from 'react'

function BadgeCard({ badge }) {
  const pct = badge.target > 0 ? (badge.progress / badge.target) * 100 : 0

  return (
    <div
      className={`rounded-lg p-3 ${
        badge.unlocked
          ? 'badge-unlocked'
          : 'bg-white border border-gray-200 opacity-70'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
            badge.unlocked ? 'bg-yellow-100' : 'bg-gray-100 grayscale'
          }`}
        >
          {badge.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-sm truncate">{badge.name}</h4>
            {badge.unlocked && <span className="text-green-500 text-xs">&#10003;</span>}
          </div>
          <p className="text-xs text-gray-500 truncate">{badge.description}</p>
          {!badge.unlocked && (
            <div className="mt-1.5">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-journal-stamp h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {badge.progress}/{badge.target}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BadgeSection({ title, icon, badges }) {
  if (!badges || badges.length === 0) return null

  const unlocked = badges.filter((b) => b.unlocked).length

  return (
    <div>
      <div className="movie-bar mb-3">
        <h3 className="font-bold text-sm text-gray-800">
          {icon} {title}
          <span className="text-xs font-normal text-gray-500 ml-2">
            {unlocked}/{badges.length}
          </span>
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {badges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  )
}

function AchievementsView({ badges, totalCheckins }) {
  const grouped = useMemo(() => {
    const milestones = []
    const districts = []
    const directors = []
    const music = []

    badges.forEach((b) => {
      if (b.type === 'milestone') milestones.push(b)
      else if (b.type === 'district') districts.push(b)
      else if (b.type === 'director') directors.push(b)
      else if (b.type === 'music') music.push(b)
    })

    const sort = (list) =>
      list.sort((a, b) => {
        if (a.unlocked !== b.unlocked) return b.unlocked - a.unlocked
        return b.progress / b.target - a.progress / a.target
      })

    return {
      milestones: sort(milestones),
      districts: sort(districts),
      directors: sort(directors),
      music: sort(music),
    }
  }, [badges])

  const unlockedCount = badges.filter((b) => b.unlocked).length

  return (
    <div className="space-y-6">
      <div className="text-center py-4 bg-white rounded-lg shadow">
        <div className="text-3xl font-bold text-journal-stamp">{totalCheckins}</div>
        <div className="text-sm text-gray-500">总打卡次数</div>
        <div className="text-xs text-gray-400 mt-1">
          已解锁 {unlockedCount}/{badges.length} 个成就
        </div>
      </div>

      <BadgeSection title="里程碑" icon="🏅" badges={grouped.milestones} />
      <BadgeSection title="音乐漫步" icon="🎵" badges={grouped.music} />
      <BadgeSection title="区域达人" icon="📍" badges={grouped.districts} />
      <BadgeSection title="影迷" icon="🎥" badges={grouped.directors} />
    </div>
  )
}

export default AchievementsView
