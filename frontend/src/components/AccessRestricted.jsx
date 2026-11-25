import { ShieldAlert, UserPlus, Users, Calendar, ArrowRight, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, switchRole } from '../api/authService'

export default function AccessRestricted({ title = 'Clinical Workspace Restricted', message }) {
  const navigate = useNavigate()
  const user = getCurrentUser()

  const handleSwitchToDoctor = () => {
    switchRole('Founder')
    window.location.reload()
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50 mb-5">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 mb-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Active Role: Front Desk Assistant
        </div>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {message ||
            'This clinical reporting workspace is restricted to Doctors & Cardiologists for clinical study finalization. As a Front Desk Assistant, your role is focused on Patient Intake, Patient Search, and Appointment Scheduling.'}
        </p>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Available Front Desk Actions
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => navigate('/patients/new')}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-center text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 transition"
            >
              <UserPlus className="h-5 w-5 mb-1.5 text-teal-600" />
              <span>New Patient Intake</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/visits')}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-center text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 transition"
            >
              <Calendar className="h-5 w-5 mb-1.5 text-teal-600" />
              <span>Schedule Visit</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-center text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 transition"
            >
              <Users className="h-5 w-5 mb-1.5 text-teal-600" />
              <span>Search Patients</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            <span>Back to Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleSwitchToDoctor}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
            title="Switch active role to Doctor to test clinical reporting"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Switch to Doctor View</span>
          </button>
        </div>
      </div>
    </div>
  )
}
