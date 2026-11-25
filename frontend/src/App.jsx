import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import AccessRestricted from './components/AccessRestricted'
import Dashboard from './pages/Dashboard'
import Search from './pages/Search'
import NewPatient from './pages/NewPatient'
import Patients from './pages/Patients'
import EditPatient from './pages/EditPatient'
import Visits from './pages/Visits'
import ReferralDoctors from './pages/ReferralDoctors'
import NewReferralDoctor from './pages/NewReferralDoctor'
import EditReferralDoctor from './pages/EditReferralDoctor'
import ClinicalWorkspace from './pages/ClinicalWorkspace'
import ImagesViewer from './pages/ImagesViewer'
import Measurements from './pages/Measurements'
import Reports from './pages/Reports'
import Analytics from './pages/Analytics'
import Administration from './pages/Administration'
import Settings from './pages/Settings'
import Home from './pages/Home'
import FetalEchoReport from './pages/FetalEchoReport'
import AdultEchoReport from './pages/AdultEchoReport'
import PediatricEchoReport from './pages/PediatricEchoReport'
import EchoScan from './pages/EchoScan'
import Profile from './pages/Profile'
import { getCurrentUser } from './api/authService'

function isSignedIn() {
  return Boolean(
    sessionStorage.getItem('echoai_user') ||
    localStorage.getItem('echoai_user') ||
    localStorage.getItem('echoai_google_access_token'),
  )
}

function ProtectedPage({ children }) {
  if (!isSignedIn()) {
    return <Navigate to="/" replace />
  }

  return <Layout>{children}</Layout>
}

// Clinical routes restricted to Doctors/Cardiologists; Front Desk sees AccessRestricted screen
function ClinicalPage({ children }) {
  if (!isSignedIn()) {
    return <Navigate to="/" replace />
  }

  const user = getCurrentUser()
  if (user.isFrontDesk) {
    return (
      <Layout>
        <AccessRestricted />
      </Layout>
    )
  }

  return <Layout>{children}</Layout>
}

function LoginRoute() {
  const searchParams = new URLSearchParams(window.location.search)
  if (searchParams.get('signout') === '1') {
    sessionStorage.removeItem('echoai_user')
    localStorage.removeItem('echoai_user')
    localStorage.removeItem('echoai_google_access_token')
    window.history.replaceState({}, document.title, '/')
    return <Home />
  }

  return isSignedIn() ? <Navigate to="/dashboard" replace /> : <Home />
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginRoute />} />
        <Route path="/dashboard" element={
          <ProtectedPage><Dashboard /></ProtectedPage>
        } />
        <Route path="/search" element={
          <ProtectedPage><Search /></ProtectedPage>
        } />
        <Route path="/new-patient" element={
          <ProtectedPage><NewPatient /></ProtectedPage>
        } />
        <Route path="/patients" element={
          <ProtectedPage><Patients /></ProtectedPage>
        } />
        <Route path="/patients/new" element={
          <ProtectedPage><NewPatient /></ProtectedPage>
        } />
        <Route path="/patients/:id/edit" element={
          <ProtectedPage><EditPatient /></ProtectedPage>
        } />
        <Route path="/visits" element={
          <ProtectedPage><Visits /></ProtectedPage>
        } />
        <Route path="/referral-doctors" element={
          <ProtectedPage><ReferralDoctors /></ProtectedPage>
        } />
        <Route path="/referral-doctors/new" element={
          <ProtectedPage><NewReferralDoctor /></ProtectedPage>
        } />
        <Route path="/referral-doctors/edit/:id" element={
          <ProtectedPage><EditReferralDoctor /></ProtectedPage>
        } />
        <Route path="/echo-studies" element={
          <ClinicalPage><ClinicalWorkspace initialType="Adult Echo" /></ClinicalPage>
        } />
        <Route path="/fetal-echo-report" element={
          <ClinicalPage><FetalEchoReport /></ClinicalPage>
        } />
        <Route path="/fetal-echo-report/:scanId" element={
          <ClinicalPage><FetalEchoReport /></ClinicalPage>
        } />
        <Route path="/adult-echo-report" element={
          <ClinicalPage><AdultEchoReport /></ClinicalPage>
        } />
        <Route path="/adult-echo-report/:scanId" element={
          <ClinicalPage><AdultEchoReport /></ClinicalPage>
        } />
        <Route path="/pediatric-echo-report" element={
          <ClinicalPage><PediatricEchoReport /></ClinicalPage>
        } />
        <Route path="/pediatric-echo-report/:scanId" element={
          <ClinicalPage><PediatricEchoReport /></ClinicalPage>
        } />
        <Route path="/echo-scan" element={
          <ClinicalPage><EchoScan /></ClinicalPage>
        } />
        <Route path="/echo-scan/:scanId" element={
          <ClinicalPage><EchoScan /></ClinicalPage>
        } />
        <Route path="/images" element={
          <ClinicalPage><ImagesViewer /></ClinicalPage>
        } />
        <Route path="/measurements" element={
          <ClinicalPage><Measurements /></ClinicalPage>
        } />
        <Route path="/ai-assistant" element={
          <Navigate to="/dashboard" replace />
        } />
        <Route path="/reports" element={
          <ClinicalPage><Reports /></ClinicalPage>
        } />
        <Route path="/crm" element={
          <Navigate to="/dashboard" replace />
        } />
        <Route path="/analytics" element={
          <ClinicalPage><Analytics /></ClinicalPage>
        } />
        <Route path="/administration" element={
          <ClinicalPage><Administration /></ClinicalPage>
        } />
        <Route path="/settings" element={
          <ClinicalPage><Settings /></ClinicalPage>
        } />
        <Route path="/profile" element={
          <ClinicalPage><Profile /></ClinicalPage>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
