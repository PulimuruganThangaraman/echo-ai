// Authentication and Role-Based Access Control (RBAC) Service

export const ROLES = {
  FOUNDER: 'Founder',
  DOCTOR: 'Doctor',
  FRONT_DESK: 'Front desk assistant',
}

export const DEMO_USERS = [
  {
    id: 'user_founder',
    name: 'Dr Shanthi',
    role: 'Founder',
    roleLabel: 'Doctor / Founder',
    email: 'dr.shanthi@echoai.com',
    userName: 'dr.shanthi',
    password: 'password123',
    initials: 'DS',
    department: 'Pediatric & Fetal Cardiology',
  },
  {
    id: 'user_frontdesk',
    name: 'Priya Sharma',
    role: 'Front desk assistant',
    roleLabel: 'Front Desk Assistant',
    email: 'frontdesk@echoai.com',
    userName: 'frontdesk',
    password: 'password123',
    initials: 'PS',
    department: 'Patient Intake & Reception',
  },
]

export function isFrontDeskRole(role) {
  if (!role) return false
  const r = String(role).toLowerCase()
  return r.includes('front') || r.includes('desk') || r.includes('reception') || r.includes('intake')
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('echoai_user') || sessionStorage.getItem('echoai_user')
    if (raw) {
      const parsed = JSON.parse(raw)
      const role = parsed.role || 'Founder'
      const isFrontDesk = isFrontDeskRole(role)
      return {
        name: parsed.name || (isFrontDesk ? 'Priya Sharma' : 'Dr Shanthi'),
        role: role,
        roleLabel: isFrontDesk ? 'Front Desk Assistant' : 'Doctor / Founder',
        email: parsed.email || (isFrontDesk ? 'frontdesk@echoai.com' : 'dr.shanthi@echoai.com'),
        initials: parsed.initials || (isFrontDesk ? 'PS' : 'DS'),
        department: parsed.department || (isFrontDesk ? 'Patient Intake & Reception' : 'Pediatric & Fetal Cardiology'),
        isFrontDesk,
      }
    }
  } catch (e) {
    console.error('Error parsing echoai_user', e)
  }

  // Default to Founder / Doctor
  return {
    name: 'Dr Shanthi',
    role: 'Founder',
    roleLabel: 'Doctor / Founder',
    email: 'dr.shanthi@echoai.com',
    initials: 'DS',
    department: 'Pediatric & Fetal Cardiology',
    isFrontDesk: false,
  }
}

export function setCurrentUser(user, remember = false) {
  const isFrontDesk = isFrontDeskRole(user.role)
  const userPayload = {
    ...user,
    roleLabel: isFrontDesk ? 'Front Desk Assistant' : 'Doctor / Founder',
    isFrontDesk,
  }
  const storage = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  other.removeItem('echoai_user')
  storage.setItem('echoai_user', JSON.stringify(userPayload))
  window.dispatchEvent(new Event('echoai_user_updated'))
  window.dispatchEvent(new Event('doctor_profile_updated'))
}

export function switchRole(targetRole = 'Front desk assistant') {
  const wantFrontDesk = isFrontDeskRole(targetRole)
  const matchedDemo = DEMO_USERS.find(u => wantFrontDesk ? isFrontDeskRole(u.role) : !isFrontDeskRole(u.role)) || DEMO_USERS[0]

  const storage = localStorage.getItem('echoai_user') ? localStorage : sessionStorage
  const userPayload = {
    name: matchedDemo.name,
    role: matchedDemo.role,
    roleLabel: matchedDemo.roleLabel,
    email: matchedDemo.email,
    initials: matchedDemo.initials,
    department: matchedDemo.department,
    isFrontDesk: wantFrontDesk,
  }
  storage.setItem('echoai_user', JSON.stringify(userPayload))
  window.dispatchEvent(new Event('echoai_user_updated'))
  window.dispatchEvent(new Event('doctor_profile_updated'))
  return userPayload
}
