import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeftRight, User, Stethoscope, ClipboardList } from 'lucide-react'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import NotificationDropdown from './NotificationDropdown'
import { getCurrentUser, switchRole } from '../api/authService'

function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard'

  // Dynamic user profile info (synced with echoai_user and updates)
  const [currentUser, setCurrentUser] = useState(getCurrentUser())

  useEffect(() => {
    const handleProfileUpdate = () => {
      setCurrentUser(getCurrentUser())
    }

    window.addEventListener('echoai_user_updated', handleProfileUpdate)
    window.addEventListener('doctor_profile_updated', handleProfileUpdate)
    return () => {
      window.removeEventListener('echoai_user_updated', handleProfileUpdate)
      window.removeEventListener('doctor_profile_updated', handleProfileUpdate)
    }
  }, [])

  const handleRoleToggle = () => {
    const targetRole = currentUser.isFrontDesk ? 'Founder' : 'Front desk assistant'
    switchRole(targetRole)
    if (currentUser.isFrontDesk) {
      // Switching to Doctor: stay on current page or dashboard
    } else {
      // Switching to Front Desk: if on clinical page, redirect to dashboard or visits
      const restrictedPrefixes = ['/echo-studies', '/fetal-echo-report', '/adult-echo-report', '/pediatric-echo-report', '/reports', '/measurements', '/analytics', '/settings', '/profile']
      if (restrictedPrefixes.some(p => location.pathname.startsWith(p))) {
        navigate('/dashboard')
      }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f8] text-slate-900 font-sans">
      <Sidebar />
      <div className="flex h-full min-w-0 flex-1 flex-col px-4 py-4 lg:px-6">
        {/* Modern Header Navigation Bar */}
        <header className="no-print mb-4 flex shrink-0 items-center justify-between gap-4">
          {/* Welcome Title & Role Indicator */}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Welcome back, {currentUser.name} 👋
              </h1>
              {currentUser.isFrontDesk ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Front Desk Assistant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
                  <Stethoscope className="h-3 w-3 text-blue-700" />
                  Doctor / Clinical
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentUser.isFrontDesk
                ? 'Patient intake, patient search, and appointment scheduling desk.'
                : "Here's what's happening with your echoAI system today."}
            </p>
          </div>

          {/* Right Area: Role Switcher + Global Search + Notifications + User Avatar */}
          <div className="flex items-center gap-3">
            {/* Quick Role Switcher Pill */}
            <button
              type="button"
              onClick={handleRoleToggle}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs border cursor-pointer ${
                currentUser.isFrontDesk
                  ? 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                  : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-50'
              }`}
              title="Click to toggle between Doctor and Front Desk Assistant role"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>
                Switch to {currentUser.isFrontDesk ? 'Doctor View' : 'Front Desk View'}
              </span>
            </button>

            {/* Global Search Component */}
            <div className="w-56 sm:w-72 md:w-80">
              <GlobalSearch />
            </div>

            {/* Interactive Notification Bell Dropdown */}
            <NotificationDropdown />

            {/* User Avatar Circle */}
            <button
              type="button"
              id="header-user-avatar-button"
              onClick={() => {
                if (currentUser.isFrontDesk) {
                  navigate('/patients')
                } else {
                  // navigate('/profile') // Temporarily disabled Doctor Profile navigation
                }
              }}
              className={`group relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs hover:ring-2 transition cursor-pointer ${
                currentUser.isFrontDesk
                  ? 'bg-teal-700 hover:bg-teal-800 hover:ring-teal-500/50'
                  : 'bg-emerald-700 hover:bg-emerald-800 hover:ring-emerald-500/50'
              }`}
              title={`${currentUser.name} (${currentUser.roleLabel || currentUser.role})`}
              aria-label="User Profile"
            >
              <span>{currentUser.initials}</span>
              <span
                className={`absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                  currentUser.isFrontDesk ? 'bg-teal-400' : 'bg-emerald-400'
                }`}
                title="Online"
              />
            </button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto no-scrollbar pb-4">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
