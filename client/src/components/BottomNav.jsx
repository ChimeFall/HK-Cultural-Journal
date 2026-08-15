import { NavLink } from 'react-router-dom'

function BottomNav() {
  const navItems = [
    { to: '/', label: '电影', icon: '🎬' },
    { to: '/music', label: '音乐', icon: '🎵' },
    { to: '/map', label: '地图', icon: '🗺️' },
    { to: '/journal', label: '手账', icon: '📔' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full text-xs ${
                isActive ? 'text-journal-stamp font-bold' : 'text-gray-500'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
