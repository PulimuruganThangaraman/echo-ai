import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Calendar,
  ImageIcon,
  Ruler,
  FileText,
  BarChart3,
  Cog,
  Power,
  User,
  Shield,
} from 'lucide-react'
import EchoLogo from './EchoLogo'
import { getCurrentUser } from '../api/authService'

function Sidebar() {
  const location = useLocation()
  const currentPath = location.pathname
  const [currentUser, setCurrentUser] = useState(getCurrentUser())

  useEffect(() => {
    const handleUserUpdate = () => {
      setCurrentUser(getCurrentUser())
    }
    window.addEventListener('echoai_user_updated', handleUserUpdate)
    window.addEventListener('doctor_profile_updated', handleUserUpdate)
    return () => {
      window.removeEventListener('echoai_user_updated', handleUserUpdate)
      window.removeEventListener('doctor_profile_updated', handleUserUpdate)
    }
  }, [])

  // Front desk assistant has minimal access strictly limited to intake, search, and scheduling
  const navItems = currentUser.isFrontDesk
    ? [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/patients/new', icon: UserPlus, label: 'New Patient Intake' },
        { path: '/patients', icon: Users, label: 'Patients Directory' },
        { path: '/visits', icon: Calendar, label: 'Appointments & Visits' },
      ]
    : [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/patients/new', icon: UserPlus, label: 'New Patient' },
        { path: '/patients', icon: Users, label: 'Patients' },
        { path: '/visits', icon: Calendar, label: 'Visits & Appointments' },
        { path: '/images', icon: ImageIcon, label: 'Images' },
        { path: '/measurements', icon: Ruler, label: 'Measurements' },
        { path: '/reports', icon: FileText, label: 'Reports' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/settings', icon: Cog, label: 'Settings' },
        // { path: '/profile', icon: User, label: 'Doctor Profile' }, // Temporarily disabled Doctor Profile menu item
      ]

  const isItemActive = (itemPath) => {
    if (itemPath === '/patients/new') {
      return currentPath === '/patients/new' || currentPath === '/new-patient'
    }
    if (itemPath === '/patients') {
      return (
        currentPath === '/patients' ||
        (currentPath.startsWith('/patients/') && !currentPath.startsWith('/patients/new'))
      )
    }
    if (itemPath === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/'
    }
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/')
  }

  return (
    <aside className="no-print flex h-screen w-64 shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white p-4 font-sans text-slate-700 select-none overflow-y-auto no-scrollbar">
      <div className="space-y-4">
        {/* Logo Section */}
        <div className="px-2 py-2">
          <EchoLogo compact />
        </div>

        {/* Role Badge Indicator */}
        {currentUser.isFrontDesk ? (
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2 text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Front Desk Assistant</span>
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5">Intake, search & scheduling access</p>
          </div>
        ) : (
          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 px-3 py-2 text-blue-900 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Clinical / Doctor</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Full clinical reporting & system access</p>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isItemActive(item.path)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[#e6f4f1] text-[#0f5449] font-bold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}

          <form action="/" method="get" className="pt-1">
            <input type="hidden" name="signout" value="1" />
            <button
              type="submit"
              className="flex w-full items-center space-x-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-700"
            >
              <Power className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </form>
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar
