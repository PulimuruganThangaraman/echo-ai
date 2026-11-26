import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Edit3,
  FileText,
  Plus,
  Save,
  Trash2,
  UserCheck,
  Users,
  UserPlus,
  X,
  Stethoscope,
  Activity,
  Heart,
  Baby,
  Smile,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { patientService } from '../api/patientService'
import { referralDoctorService } from '../api/referralDoctorService'
import { scanService } from '../api/scanService'
import { workspaceService } from '../api/workspaceService'
import { getCurrentUser } from '../api/authService'
import ReferralDoctorModal from '../components/ReferralDoctorModal'
import SearchableSelect from '../components/SearchableSelect'

const getLocalISOString = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

const parseVisitDate = (raw) => {
  if (!raw) {
    return {
      text: '—',
      time: '—',
      full: '—',
      isToday: false,
      isUpcoming: false,
      isPast: false,
      rawDate: null,
    }
  }

  const d = new Date(raw)
  if (isNaN(d.getTime())) {
    return {
      text: String(raw),
      time: '—',
      full: String(raw),
      isToday: false,
      isUpcoming: false,
      isPast: false,
      rawDate: null,
    }
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const endOfToday = startOfToday + 86400000 - 1
  const t = d.getTime()

  const isToday = t >= startOfToday && t <= endOfToday
  const isUpcoming = t > endOfToday
  const isPast = t < startOfToday

  const text = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  return {
    text,
    time,
    full: `${text}, ${time}`,
    isToday,
    isUpcoming,
    isPast,
    rawDate: d,
  }
}

export default function Visits() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(getCurrentUser())
  const [searchParams, setSearchParams] = useSearchParams()
  const patientParam =
    searchParams.get('patient') || searchParams.get('patientId') || searchParams.get('patient_id') || ''
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [activePatientRecord, setActivePatientRecord] = useState(null)
  const [visits, setVisits] = useState([])
  const [allVisits, setAllVisits] = useState([])
  const [scans, setScans] = useState([])
  const [allClinicScans, setAllClinicScans] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [templates, setTemplates] = useState([])
  const [referralOpen, setReferralOpen] = useState(false)
  const [appointmentCategory, setAppointmentCategory] = useState('Scan') // 'Scan' | 'Doctor'
  const [consultantDoctor, setConsultantDoctor] = useState('Dr. Shanthi (Pediatric Cardiologist & Fetal Specialist)')

  const filterParam =
    searchParams.get('filter') || searchParams.get('scanType') || searchParams.get('type') || 'all'
  const [activeFilter, setActiveFilter] = useState(filterParam)
  const [tableSearchQuery, setTableSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Keep activeFilter in sync with URL filter param
  useEffect(() => {
    const f = searchParams.get('filter') || searchParams.get('scanType') || searchParams.get('type')
    if (f) {
      setActiveFilter(f)
      setCurrentPage(1)
    }
  }, [searchParams])

  const handleFilterClick = (filterKey) => {
    setActiveFilter(filterKey)
    setCurrentPage(1)
    const newParams = new URLSearchParams(searchParams)
    if (filterKey === 'all') {
      newParams.delete('filter')
      newParams.delete('scanType')
      newParams.delete('type')
    } else {
      newParams.set('filter', filterKey)
    }
    setSearchParams(newParams, { replace: true })
  }

  const consultantDoctors = [
    'Dr. Shanthi (Pediatric Cardiologist & Fetal Specialist)',
    'Dr. Rajesh V. Varma (Senior Consultant Cardiologist)',
    'Dr. Shalini Reddy (Clinical Cardiologist)',
    'Dr. Anand Patel (Cardiology Specialist)',
    'Dr. Priya Sharma (Consultant)',
  ]

  const [visitData, setVisitData] = useState({
    visit_date: getLocalISOString(),
    scan_type: 'Adult Echo',
    referral_doctor: 'Self',
    report_template_id: '',
    notes: '',
  })

  useEffect(() => {
    const handleUserUpdate = () => setCurrentUser(getCurrentUser())
    window.addEventListener('echoai_user_updated', handleUserUpdate)
    return () => window.removeEventListener('echoai_user_updated', handleUserUpdate)
  }, [])

  const [referralOptions, setReferralOptions] = useState([
    'Self',
    'Dr. Rajesh V. Varma',
    'Dr. Shalini Reddy',
    'Dr. Anand Patel',
    'Dr. Priya Sharma',
    'Apollo Hospitals',
    'Fortis Healthcare',
    'Manipal Hospital',
    'Max Super Speciality Hospital',
    'Narayana Health',
    'AIIMS',
    'Christian Medical College (CMC)',
    'Tata Memorial Hospital',
    'KIMS Hospitals',
    'Ruby Hall Clinic',
    'Sir Ganga Ram Hospital',
    'Sahyadri Hospital',
    'Aster Medcity',
    'Columbia Asia Hospital',
    'Medanta The Medicity',
    'Care Hospitals',
  ])

  const loadReferralDoctors = useCallback(async () => {
    try {
      const res = await referralDoctorService.getReferralDoctors()
      const docs = res.data || []
      const list = []
      docs.forEach((d) => {
        if (d.name && !list.includes(d.name)) list.push(d.name)
        if (d.hospital && !list.includes(d.hospital)) list.push(d.hospital)
        if (d.institution_name && !list.includes(d.institution_name)) list.push(d.institution_name)
        const fullName = `${d.first_name || ''} ${d.last_name || ''}`.trim()
        if (fullName && !list.includes(fullName)) list.push(fullName)
      })
      if (list.length > 0) {
        setReferralOptions((prev) => Array.from(new Set(['Self', ...prev, ...list])))
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadReferralDoctors()
  }, [loadReferralDoctors])

  // Map visit count for every patient across the entire system
  const visitCountsByPatient = useMemo(() => {
    const map = {}
    for (const v of allVisits) {
      const pid = String(v.patient_id)
      map[pid] = (map[pid] || 0) + 1
    }
    return map
  }, [allVisits])

  // Patient options for SearchableSelect with real-time visit count badges
  const patientOptions = useMemo(() => {
    return patients.map((item) => {
      const countFromId = visitCountsByPatient[String(item.id)] || 0
      const countFromPatientId = visitCountsByPatient[String(item.patient_id)] || 0
      const vCount = item.visit_count || countFromId || countFromPatientId || 0
      const visitLabel = vCount === 1 ? '1 visit' : `${vCount} visits`
      return {
        value: item.id,
        label: `${item.patient_id || ''} — ${item.first_name || ''} ${item.last_name || ''}`.trim(),
        badge: visitLabel,
        visitCount: vCount,
        phone: item.mobile || item.phone1 || item.phone2 || '',
        aadhaar: item.aadhar_number || item.aadhaar_no || '',
      }
    })
  }, [patients, visitCountsByPatient])

  // Initial data fetch
  useEffect(() => {
    Promise.all([
      patientService.getPatients(),
      workspaceService.getTemplates(),
      patientService.getAllVisits().catch(() => ({ data: [] })),
      scanService.getScans().catch(() => ({ data: [] })),
    ])
      .then(([patientResult, templateResult, allVisitsResult, scansResult]) => {
        const patientList = patientResult.data || []
        setPatients(patientList)
        setTemplates(templateResult.data || [])
        setAllVisits(allVisitsResult.data || [])
        const rawScans = scansResult?.data || (Array.isArray(scansResult) ? scansResult : [])
        setAllClinicScans(rawScans)
      })
      .catch(() => {
        setPatients([])
        setTemplates([])
        setAllVisits([])
        setAllClinicScans([])
      })
  }, [])

  // Sync selected patient when URL patientParam or patientList changes
  useEffect(() => {
    if (!patientParam) {
      if (selectedPatient) {
        setSelectedPatient('')
        setActivePatientRecord(null)
      }
      return
    }

    // First try finding in current patients list
    if (patients.length > 0) {
      const found = patients.find(
        (p) => String(p.id) === String(patientParam) || String(p.patient_id) === String(patientParam)
      )
      if (found) {
        setActivePatientRecord(found)
        if (String(found.id) !== String(selectedPatient)) {
          selectPatient(found.id, false)
        }
        return
      }
    }

    // Direct fetch by ID or PAT ID so direct URL /visits?patient=107 works immediately
    let isCancelled = false
    patientService
      .getPatient(patientParam)
      .then((res) => {
        if (isCancelled) return
        const pData = res?.data || res
        if (pData && (pData.id || pData.patient_id)) {
          setActivePatientRecord(pData)
          setSelectedPatient(pData.id)
          setPatients((prev) => {
            if (prev.some((p) => String(p.id) === String(pData.id))) return prev
            return [pData, ...prev]
          })
          selectPatient(pData.id, false)
        }
      })
      .catch(() => {})

    return () => {
      isCancelled = true
    }
  }, [patientParam, patients])

  const selectPatient = async (patientId, syncUrl = true) => {
    setSelectedPatient(patientId)
    setStatus('')

    // Immediately keep browser URL query parameter in sync
    if (syncUrl) {
      if (patientId) {
        setSearchParams({ patient: String(patientId) }, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
    }

    if (!patientId) {
      setActivePatientRecord(null)
      setVisits([])
      setScans([])
      return
    }

    const patientRecord =
      activePatientRecord && String(activePatientRecord.id) === String(patientId)
        ? activePatientRecord
        : patients.find((p) => String(p.id) === String(patientId))
    if (patientRecord) {
      setActivePatientRecord(patientRecord)
      const docName = patientRecord.family_doctor || patientRecord.referral_doctor || patientRecord.referred_by || ''
      if (docName) {
        setVisitData((prev) => ({
          ...prev,
          referral_doctor: prev.referral_doctor || docName,
        }))
        setReferralOptions((prev) => (prev.includes(docName) ? prev : [docName, ...prev]))
      }
    }

    setLoading(true)
    try {
      const [patientRes, visitResult, scanResult] = await Promise.all([
        patientService.getPatient(patientId).catch(() => null),
        patientService.getVisits(patientId).catch(() => ({ data: [] })),
        scanService.getScansByPatient(patientId).catch(() => ({ data: [] })),
      ])
      if (patientRes?.data) {
        setActivePatientRecord(patientRes.data)
        setPatients((prev) => {
          if (prev.some((p) => String(p.id) === String(patientRes.data.id))) {
            return prev.map((p) => (String(p.id) === String(patientRes.data.id) ? { ...p, ...patientRes.data } : p))
          }
          return [patientRes.data, ...prev]
        })
      }
      setVisits(visitResult.data || [])
      setScans(scanResult.data || [])
    } catch {
      setVisits([])
      setScans([])
    } finally {
      setLoading(false)
    }
  }

  // Determine intelligent default scan type for current patient
  const defaultScanType = useMemo(() => {
    if (scans.length > 0 && scans[0].scan_type) return scans[0].scan_type
    const patientRecord = patients.find((p) => String(p.id) === String(selectedPatient))
    if (patientRecord?.age !== undefined && patientRecord?.age !== null && Number(patientRecord.age) < 18) {
      return 'Pediatric Echo'
    }
    return 'Adult Echo'
  }, [scans, patients, selectedPatient])

  // Auto-select template when scan_type changes or templates load
  useEffect(() => {
    if (!templates.length) return
    const curScanType = visitData.scan_type || defaultScanType || 'Adult Echo'
    const matchingTmpl = templates.find(
      (t) =>
        (t.scan_type && t.scan_type.toLowerCase() === curScanType.toLowerCase()) ||
        (t.title && t.title.toLowerCase().includes(curScanType.toLowerCase())) ||
        (t.name && t.name.toLowerCase().includes(curScanType.toLowerCase()))
    )
    if (matchingTmpl && !visitData.report_template_id) {
      setVisitData((prev) => ({
        ...prev,
        scan_type: curScanType,
        report_template_id: String(matchingTmpl.id),
      }))
    }
  }, [templates, defaultScanType])

  // Determine which scan types a visit belongs to
  const getVisitScanTypes = useCallback(
    (visit) => {
      const types = new Set()
      if (!visit) return []

      // 1. Direct match via scans table visit_id
      for (const s of scans) {
        if (s.scan_type && String(s.visit_id) === String(visit.id)) {
          types.add(s.scan_type)
        }
      }

      // 2. Match via chosen template
      if (visit.report_template_id) {
        const tmpl = templates.find((t) => String(t.id) === String(visit.report_template_id))
        if (tmpl?.scan_type) types.add(tmpl.scan_type)
      }

      // 3. Match via visit_type, notes, diagnosis, or ob text
      const visitType = (visit.visit_type || '').toLowerCase()
      if (visitType.includes('fetal') || visitType.includes('routine fetal scan')) types.add('Fetal Echo')
      if (visitType.includes('pediatric')) types.add('Pediatric Echo')
      if (visitType.includes('adult')) types.add('Adult Echo')

      const text = `${visit.notes || ''} ${visit.diagnosis || ''} ${visit.ob || ''}`.toLowerCase()
      if (text.includes('adult echo') || text.includes('adult')) types.add('Adult Echo')
      if (text.includes('fetal echo') || text.includes('fetal')) types.add('Fetal Echo')
      if (text.includes('pediatric echo') || text.includes('pediatric')) types.add('Pediatric Echo')

      // 4. Fallback: If visit still has no explicit scan type, inherit from patient's scans or age
      if (types.size === 0) {
        if (scans.length > 0) {
          const uniquePatientScanTypes = Array.from(new Set(scans.map((s) => s.scan_type).filter(Boolean)))
          if (uniquePatientScanTypes.length === 1) {
            types.add(uniquePatientScanTypes[0])
          } else {
            for (const s of scans) {
              if (s.scan_type && (!s.visit_id || String(s.visit_id) === String(visit.id))) {
                types.add(s.scan_type)
              }
            }
          }
        } else {
          const patientRecord = patients.find((p) => String(p.id) === String(selectedPatient))
          if (patientRecord?.age !== undefined && patientRecord?.age !== null && Number(patientRecord.age) < 18) {
            types.add('Pediatric Echo')
          } else {
            types.add('Adult Echo')
          }
        }
      }

      return Array.from(types)
    },
    [scans, templates, patients, selectedPatient],
  )

  const addVisit = async (event, shouldOpenReport = false) => {
    if (event?.preventDefault) event.preventDefault()
    if (!selectedPatient) {
      alert('Please select a patient before scheduling an appointment')
      return
    }
    const selectedPatientRecord = patients.find((item) => String(item.id) === String(selectedPatient))
    if (!selectedPatientRecord) {
      alert('The selected patient record could not be found')
      return
    }
    if (!visitData.referral_doctor || !String(visitData.referral_doctor).trim()) {
      alert('Referral Doctor / Institute is required')
      return
    }
    setSaving(true)
    setStatus('')
    try {
      const selectedTmpl = templates.find((t) => String(t.id) === String(visitData.report_template_id))
      const isDoctorConsult = appointmentCategory === 'Doctor'
      const determinedScanType = isDoctorConsult
        ? 'Doctor Consultation'
        : (visitData.scan_type || selectedTmpl?.scan_type || defaultScanType || 'Adult Echo')

      const combinedNotes = isDoctorConsult
        ? `Consultant: ${consultantDoctor}. ${visitData.notes || ''}`.trim()
        : (visitData.notes || '')

      const result = await patientService.addVisit(selectedPatient, {
        ...visitData,
        patient_id: selectedPatient,
        patient_display_id: selectedPatientRecord.patient_id,
        patient_name: `${selectedPatientRecord.first_name || ''} ${selectedPatientRecord.last_name || ''}`.trim(),
        visit_type: determinedScanType,
        referral_doctor: visitData.referral_doctor || 'Self',
        notes: combinedNotes,
      })
      const newVisit = result.data

      // Create scan record in scans table if it is an echo scan
      if (!isDoctorConsult) {
        try {
          const scanResult = await scanService.createScan({
            patient_id: selectedPatient,
            patient_display_id: selectedPatientRecord.patient_id,
            visit_id: newVisit.id,
            scan_type: determinedScanType,
            status: 'draft',
            normal: 1,
          })
          if (scanResult?.data) {
            setScans((prev) => [scanResult.data, ...prev])
          }
        } catch (err) {
          console.warn('Scan auto-create note:', err)
        }
      }

      setVisits([newVisit, ...visits])
      setAllVisits([newVisit, ...allVisits])
      setVisitData({
        visit_date: getLocalISOString(),
        scan_type: isDoctorConsult ? 'Adult Echo' : determinedScanType,
        referral_doctor: visitData.referral_doctor || 'Self',
        report_template_id: visitData.report_template_id || '',
        notes: '',
      })
      setStatus(
        `Appointment scheduled successfully for ${selectedPatientRecord.patient_id} — ${selectedPatientRecord.first_name || ''} ${selectedPatientRecord.last_name || ''} (${determinedScanType})!`
      )

      // Only navigate to clinical reporting workspace if requested and user is a Doctor/Clinical user
      if (shouldOpenReport && !currentUser.isFrontDesk && !isDoctorConsult) {
        navigate(
          `/echo-studies?patient=${selectedPatient}&visit=${newVisit.id}&type=${encodeURIComponent(
            determinedScanType
          )}`
        )
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Unable to schedule appointment')
    } finally {
      setSaving(false)
    }
  }

  const deleteVisit = async (visitId, patientId) => {
    const pid = patientId || selectedPatient
    if (!pid || !visitId) return
    try {
      await patientService.deleteVisit(pid, visitId)
      setVisits((prev) => prev.filter((visit) => visit.id !== visitId))
      setAllVisits((prev) => prev.filter((visit) => visit.id !== visitId))
      setScans((prev) => prev.filter((scan) => String(scan.visit_id) !== String(visitId)))
      setStatus('Appointment removed successfully')
    } catch {
      setStatus('Unable to remove visit')
    }
  }

  const patient =
    activePatientRecord &&
    (String(activePatientRecord.id) === String(selectedPatient) ||
      String(activePatientRecord.patient_id) === String(selectedPatient))
      ? activePatientRecord
      : patients.find(
          (item) => String(item.id) === String(selectedPatient) || String(item.patient_id) === String(selectedPatient)
        ) || activePatientRecord

  const getScanBadgeClass = (scanType) => {
    if (scanType === 'Adult Echo') return 'bg-sky-50 text-sky-700 border-sky-200'
    if (scanType === 'Fetal Echo') return 'bg-purple-50 text-purple-700 border-purple-200'
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }

  // When a patient is selected (e.g. from Patients Directory or search dropdown),
  // display ONLY that patient's visits. When no patient is selected, display all clinic visits.
  const sourceVisits = useMemo(() => {
    if (selectedPatient) {
      const patientVisitsMap = new Map()
      // Include any visits fetched for this specific patient
      visits.forEach((v) => {
        if (v && v.id) patientVisitsMap.set(String(v.id), v)
      })

      // Also match from allVisits for this patient id or PAT code
      const pIdStr = String(selectedPatient)
      const pCodeStr = patient?.patient_id ? String(patient.patient_id) : ''
      const pDbIdStr = patient?.id ? String(patient.id) : ''

      allVisits.forEach((v) => {
        if (!v) return
        const vPid = String(v.patient_id)
        const vDispId = String(v.patient_display_id || '')
        if (
          vPid === pIdStr ||
          vPid === pDbIdStr ||
          (pCodeStr && (vPid === pCodeStr || vDispId === pCodeStr))
        ) {
          if (!patientVisitsMap.has(String(v.id))) {
            patientVisitsMap.set(String(v.id), v)
          }
        }
      })

      return Array.from(patientVisitsMap.values())
    }

    return allVisits
  }, [selectedPatient, patient, visits, allVisits])

  // Map enriched visits
  const enrichedVisits = useMemo(() => {
    const patientMap = new Map()
    patients.forEach((p) => {
      patientMap.set(String(p.id), p)
      patientMap.set(String(p.patient_id), p)
    })

    const scansByVisitId = new Map()
    allClinicScans.forEach((s) => {
      if (s.visit_id) scansByVisitId.set(String(s.visit_id), s)
    })

    return sourceVisits.map((v) => {
      const p = patientMap.get(String(v.patient_id))
      const dateInfo = parseVisitDate(v.visit_date)
      const matchedScan = scansByVisitId.get(String(v.id))

      let rawScanType = matchedScan?.scan_type || v.scan_type || ''
      if (!rawScanType) {
        const vt = (v.visit_type || '').toLowerCase()
        if (vt.includes('fetal')) rawScanType = 'Fetal Echo'
        else if (vt.includes('pediatric')) rawScanType = 'Pediatric Echo'
        else if (vt.includes('adult')) rawScanType = 'Adult Echo'
        else if (v.pregnancy || (v.ob && v.ob.toLowerCase().includes('lmp'))) rawScanType = 'Fetal Echo'
        else if (p?.age && Number(p.age) < 18) rawScanType = 'Pediatric Echo'
        else rawScanType = 'Adult Echo'
      }

      const isConsultation =
        (String(v.visit_type || '').toLowerCase() === 'consultation' ||
          String(v.visit_type || '').toLowerCase().includes('consult')) &&
        !matchedScan

      const scanType = isConsultation ? 'Doctor Consultation' : rawScanType

      const patientName = p
        ? `${p.salutation || ''} ${p.first_name || ''} ${p.last_name || ''}`.trim()
        : v.patient_name || `Patient #${v.patient_id}`

      const patientDisplayId = p?.patient_id || v.patient_display_id || `PAT${v.patient_id}`
      const patientInitials = (p?.first_name || patientName || 'P')
        .split(' ')
        .filter(Boolean)
        .map((s) => s[0].toUpperCase())
        .slice(0, 2)
        .join('')

      return {
        ...v,
        patient: p,
        patientName,
        patientDisplayId,
        patientInitials: patientInitials || 'PT',
        patientAge: p?.age ? `${p.age} ${p.age_unit || 'Years'}` : '—',
        patientGender: p?.gender === 'M' ? 'Male' : p?.gender === 'F' ? 'Female' : p?.gender || '—',
        patientMobile: p?.mobile || p?.phone1 || p?.phone2 || '—',
        patientCity: p?.district_city || p?.city || '—',
        scanType,
        isConsultation,
        dateInfo,
      }
    })
  }, [sourceVisits, patients, patient, allClinicScans])

  const filterCounts = useMemo(() => {
    let today = 0
    let upcoming = 0
    let adult = 0
    let fetal = 0
    let pediatric = 0
    let consult = 0
    let scansCount = 0

    enrichedVisits.forEach((v) => {
      if (v.dateInfo.isToday) today++
      if (v.dateInfo.isUpcoming) upcoming++
      if (v.scanType === 'Adult Echo') adult++
      if (v.scanType === 'Fetal Echo') fetal++
      if (v.scanType === 'Pediatric Echo') pediatric++
      if (v.isConsultation) consult++
      if (!v.isConsultation) scansCount++
    })

    return {
      all: enrichedVisits.length,
      today,
      upcoming,
      adult,
      fetal,
      pediatric,
      consult,
      scans: scansCount,
    }
  }, [enrichedVisits])

  const filterTabs = [
    { key: 'all', label: 'All Visits', count: filterCounts.all, icon: CalendarCheck, color: 'text-purple-600' },
    { key: 'today', label: "Today's Appointments", count: filterCounts.today, icon: Clock, color: 'text-emerald-600' },
    { key: 'upcoming', label: 'Upcoming', count: filterCounts.upcoming, icon: Calendar, color: 'text-blue-600' },
    { key: 'Adult Echo', label: 'Adult Echo', count: filterCounts.adult, icon: Heart, color: 'text-sky-600' },
    { key: 'Fetal Echo', label: 'Fetal Echo', count: filterCounts.fetal, icon: Baby, color: 'text-purple-600' },
    { key: 'Pediatric Echo', label: 'Pediatric Echo', count: filterCounts.pediatric, icon: Smile, color: 'text-amber-600' },
    { key: 'consultation', label: 'Doctor Consultations', count: filterCounts.consult, icon: Stethoscope, color: 'text-teal-600' },
  ]

  const activeTabMeta =
    filterTabs.find((t) => t.key.toLowerCase() === activeFilter.toLowerCase()) ||
    (activeFilter.toLowerCase() === 'scans'
      ? { label: 'All Scans', count: filterCounts.scans }
      : { label: activeFilter, count: 0 })

  const filteredVisits = useMemo(() => {
    return enrichedVisits.filter((v) => {
      // 1. Dashboard card / pill filter
      const af = activeFilter.toLowerCase().trim()
      if (af === 'today') {
        if (!v.dateInfo.isToday) return false
      } else if (af === 'upcoming') {
        if (!v.dateInfo.isUpcoming) return false
      } else if (af === 'adult echo' || af === 'adult') {
        if (v.scanType !== 'Adult Echo') return false
      } else if (af === 'fetal echo' || af === 'fetal') {
        if (v.scanType !== 'Fetal Echo') return false
      } else if (af === 'pediatric echo' || af === 'pediatric') {
        if (v.scanType !== 'Pediatric Echo') return false
      } else if (af === 'consultation' || af === 'doctor') {
        if (!v.isConsultation) return false
      } else if (af === 'scans') {
        if (v.isConsultation) return false
      }

      // 2. Table search query
      if (tableSearchQuery.trim()) {
        const q = tableSearchQuery.toLowerCase().trim()
        const matchName = v.patientName.toLowerCase().includes(q)
        const matchId = v.patientDisplayId.toLowerCase().includes(q)
        const matchMobile = String(v.patientMobile).toLowerCase().includes(q)
        const matchDoc = String(v.referral_doctor || '').toLowerCase().includes(q)
        const matchNotes = String(v.notes || '').toLowerCase().includes(q)
        const matchType = v.scanType.toLowerCase().includes(q)
        const matchDate = v.dateInfo.full.toLowerCase().includes(q)

        if (!matchName && !matchId && !matchMobile && !matchDoc && !matchNotes && !matchType && !matchDate) {
          return false
        }
      }

      return true
    })
  }, [enrichedVisits, activeFilter, tableSearchQuery])

  const totalPages = Math.ceil(filteredVisits.length / pageSize) || 1
  const paginatedVisits = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredVisits.slice(start, start + pageSize)
  }, [filteredVisits, currentPage, pageSize])

  const getScanBadge = (scanType, isConsultation) => {
    if (isConsultation) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
          <span>Doctor Consultation</span>
        </span>
      )
    }
    if (scanType === 'Adult Echo') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Heart className="h-3.5 w-3.5 text-sky-600" />
          <span>Adult Echo</span>
        </span>
      )
    }
    if (scanType === 'Fetal Echo') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Baby className="h-3.5 w-3.5 text-purple-600" />
          <span>Fetal Echo</span>
        </span>
      )
    }
    if (scanType === 'Pediatric Echo') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Smile className="h-3.5 w-3.5 text-amber-600" />
          <span>Pediatric Echo</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
        <Activity className="h-3.5 w-3.5 text-slate-600" />
        <span>{scanType || 'Echo Scan'}</span>
      </span>
    )
  }

  const getTimingBadge = (dateInfo) => {
    if (dateInfo.isToday) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Clock className="h-3 w-3 text-emerald-700" />
          Today
        </span>
      )
    }
    if (dateInfo.isUpcoming) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Calendar className="h-3 w-3 text-blue-600" />
          Upcoming
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <CheckCircle2 className="h-3 w-3 text-slate-400" />
        Completed
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top Patient Search & Quick Intake Selector Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-xl">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-teal-600" />
              <span>Select Patient for Appointment Scheduling</span>
            </label>
            <SearchableSelect
              options={patientOptions}
              value={selectedPatient}
              onChange={(val) => selectPatient(val, true)}
              placeholder="Search patient by ID, name, or phone..."
              searchPlaceholder="Type patient name, PAT ID, or phone..."
            />
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-4">
            <button
              type="button"
              onClick={() => navigate('/patients/new')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              title="Register new patient and assign new patient ID"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ New Patient Intake</span>
            </button>

            {selectedPatient && (
              <button
                type="button"
                onClick={() => selectPatient('', true)}
                className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear Selection</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Patient Info Card (Only shown when a patient is selected) */}
      {selectedPatient && patient && (
        <>
          <section className="rounded-xl border border-teal-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-teal-100 px-4 py-2.5 bg-teal-50/50">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                  Selected Patient Record: {patient.patient_id} — {patient.first_name} {patient.last_name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/patients/${patient.id}/edit`)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-teal-300 bg-white hover:bg-teal-50 text-teal-800 text-xs font-semibold shadow-2xs transition cursor-pointer"
                title="Edit Patient Phone, Email & Address"
              >
                <Edit3 className="h-3.5 w-3.5 text-teal-600" />
                <span>Edit Contact & Address</span>
              </button>
            </div>
            <div className="grid gap-4 p-4 xl:grid-cols-[1fr_180px]">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PatientField label="Patient ID" value={patient?.patient_id} />
                <PatientField label="First name" value={patient?.first_name} />
                <PatientField label="Last name" value={patient?.last_name} />
                <PatientField label="Aadhaar number" value={patient?.aadhaar_no || patient?.aadhar_number} />
                <PatientField label="Gender" value={patient?.gender === 'M' ? 'Male' : patient?.gender === 'F' ? 'Female' : patient?.gender} />
                <PatientField
                  label="Age"
                  value={patient?.age ? `${patient.age} ${patient.age_unit || 'Years'}` : ''}
                />
                <PatientField label="Date of birth" value={patient?.dob} />
                <PatientField label="Ethnic origin" value={patient?.ethnic_origin} />
                <PatientField label="Street" value={patient?.street || patient?.address} wide />
                <PatientField label="Taluk" value={patient?.taluk} />
                <PatientField label="Area" value={patient?.area} />
                <PatientField label="Area (P.O.)" value={patient?.area_po} />
                <PatientField label="Zip code" value={patient?.zip_code || patient?.pincode} />
                <PatientField label="City" value={patient?.district_city || patient?.city} />
                <PatientField label="State" value={patient?.state} />
                <PatientField label="Country" value={patient?.country || 'India'} />
                <PatientField label="Phone #1" value={patient?.phone1} />
                <PatientField label="Phone #2" value={patient?.phone2} />
                <PatientField label="Mobile" value={patient?.mobile} />
                <PatientField label="Fax" value={patient?.fax} />
                <PatientField label="Email" value={patient?.email} wide />
                <PatientField label="Family doctor" value={patient?.family_doctor || patient?.referred_by} wide />
              </div>
              <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: patient.id,
                    patient_id: patient.patient_id,
                    name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
                  })}
                  size={112}
                  level="M"
                  includeMargin
                />
                <span className="mt-2 text-xs font-semibold text-slate-700">
                  {patient.patient_id}
                </span>
              </div>
            </div>
          </section>

          {/* Schedule Appointment Section for Selected Patient */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-teal-600" />
                <h3 className="font-semibold text-sm text-slate-800">
                  Schedule New Appointment for {patient.first_name} {patient.last_name}
                </h3>
              </div>
              {status && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{status}</span>
                </div>
              )}
            </div>

            {/* Appointment Category Switcher */}
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Appointment For:</span>
              <button
                type="button"
                onClick={() => setAppointmentCategory('Scan')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  appointmentCategory === 'Scan'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Echo Scan</span>
              </button>
              <button
                type="button"
                onClick={() => setAppointmentCategory('Doctor')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  appointmentCategory === 'Doctor'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>Doctor Consultation</span>
              </button>
            </div>

            {/* Appointment Form */}
            <form
              onSubmit={(e) => addVisit(e, false)}
              className="grid gap-3 p-4 xl:grid-cols-[180px_1fr_1fr_1.2fr_1fr_auto] md:grid-cols-2 lg:grid-cols-3 grid-cols-1 items-end"
            >
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Appointment date & time *
                </label>
                <input
                  required
                  type="datetime-local"
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  value={visitData.visit_date}
                  onChange={(e) => setVisitData({ ...visitData, visit_date: e.target.value })}
                />
              </div>

              {appointmentCategory === 'Scan' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Scan type *
                    </label>
                    <select
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      value={visitData.scan_type || defaultScanType}
                      onChange={(e) => {
                        const nextScanType = e.target.value
                        const matchingTmpl = templates.find(
                          (t) =>
                            (t.scan_type && t.scan_type.toLowerCase() === nextScanType.toLowerCase()) ||
                            (t.title && t.title.toLowerCase().includes(nextScanType.toLowerCase())) ||
                            (t.name && t.name.toLowerCase().includes(nextScanType.toLowerCase()))
                        )
                        setVisitData((prev) => ({
                          ...prev,
                          scan_type: nextScanType,
                          report_template_id: matchingTmpl ? String(matchingTmpl.id) : prev.report_template_id,
                        }))
                      }}
                    >
                      <option value="Adult Echo">Adult Echo</option>
                      <option value="Fetal Echo">Fetal Echo</option>
                      <option value="Pediatric Echo">Pediatric Echo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Report template
                    </label>
                    <select
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      value={visitData.report_template_id}
                      onChange={(e) => {
                        const tmplId = e.target.value
                        const tmpl = templates.find((t) => String(t.id) === String(tmplId))
                        setVisitData((prev) => ({
                          ...prev,
                          report_template_id: tmplId,
                          scan_type: tmpl?.scan_type || prev.scan_type || defaultScanType,
                        }))
                      }}
                    >
                      <option value="">Select template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.title || template.name || template.scan_type}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Consultant Doctor *
                  </label>
                  <select
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 font-medium text-slate-800"
                    value={consultantDoctor}
                    onChange={(e) => setConsultantDoctor(e.target.value)}
                  >
                    {consultantDoctors.map((doc) => (
                      <option key={doc} value={doc}>
                        {doc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Referral Doctor */}
              <div className="min-w-[190px]">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-600">
                    Referral Doctor / Hospital *
                  </label>
                  <button
                    type="button"
                    onClick={() => setReferralOpen(true)}
                    className="text-[11px] font-semibold text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <select
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    value={visitData.referral_doctor}
                    onChange={(e) => setVisitData({ ...visitData, referral_doctor: e.target.value })}
                  >
                    <option value="">Select</option>
                    {referralOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setReferralOpen(true)}
                    title="Add or Manage Referral Doctor / Institute"
                    className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4 text-teal-600" />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {appointmentCategory === 'Doctor' ? 'Reason / Clinical Notes' : 'Visit notes'}
                </label>
                <input
                  type="text"
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-400"
                  placeholder={appointmentCategory === 'Doctor' ? 'e.g. Follow-up consultation, murmur evaluation' : 'Visit notes'}
                  value={visitData.notes}
                  onChange={(e) => setVisitData({ ...visitData, notes: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              {currentUser.isFrontDesk ? (
                <button
                  type="submit"
                  disabled={saving || !visitData.visit_date}
                  className="inline-flex items-center justify-center gap-2 h-10 px-5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <CalendarCheck className="h-4 w-4" />
                  {saving ? 'Scheduling…' : 'Book & Confirm Appointment'}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => addVisit(e, false)}
                    disabled={saving || !visitData.visit_date}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-4 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-300 hover:bg-teal-100 rounded-lg shadow-2xs transition shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    <CalendarCheck className="h-3.5 w-3.5" />
                    <span>Book Appointment</span>
                  </button>
                  {appointmentCategory === 'Scan' && (
                    <button
                      type="button"
                      onClick={(e) => addVisit(e, true)}
                      disabled={saving || !visitData.visit_date}
                      className="inline-flex items-center justify-center gap-1.5 h-10 px-4 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Book & Open Report</span>
                    </button>
                  )}
                </div>
              )}
            </form>
          </section>
        </>
      )}

      {/* Main Readable Appointments & Visits Directory */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden w-full">
        {/* Header & Controls */}
        <div className="border-b border-slate-200 p-4 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {selectedPatient && patient
                    ? `Visits & Appointments for ${patient.first_name || ''} ${patient.last_name || ''}`.trim()
                    : 'Appointments & Visits Directory'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                  {filteredVisits.length} {filteredVisits.length === 1 ? 'Record' : 'Records'}
                </span>
                {selectedPatient && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Patient Filter Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedPatient && patient
                  ? `Showing appointments and past visit records for ${patient.first_name || ''} ${patient.last_name || ''} (${patient.patient_id}).`
                  : 'Comprehensive directory of clinic appointments, echo scans, and doctor consultations across all patients.'}
              </p>
            </div>

            {/* Search Input Box & Switchers */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {selectedPatient && (
                <button
                  type="button"
                  onClick={() => selectPatient('', true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold shadow-2xs transition shrink-0 cursor-pointer"
                  title="Switch to view all clinic appointments across all patients"
                >
                  <Users className="h-3.5 w-3.5 text-teal-600" />
                  <span>View All Clinic Appointments ({allVisits.length})</span>
                </button>
              )}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient, ID, doctor, scan..."
                  value={tableSearchQuery}
                  onChange={(e) => {
                    setTableSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                />
                {tableSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTableSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  patientService.getAllVisits().then((r) => setAllVisits(r.data || []))
                  scanService.getScans().then((r) => setAllClinicScans(r?.data || (Array.isArray(r) ? r : [])))
                }}
                title="Refresh visits list"
                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Active Filter Banner (if arriving from Dashboard or active filter is selected) */}
          {activeFilter !== 'all' && (
            <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-teal-50/70 border border-teal-200 text-xs text-teal-900">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-teal-600" />
                <span>
                  Showing filtered view: <strong>{activeTabMeta.label}</strong> ({filteredVisits.length} appointments match)
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleFilterClick('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-teal-300 text-teal-800 hover:bg-teal-100 font-semibold text-[11px] transition cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Show All Visits</span>
              </button>
            </div>
          )}

          {/* Filter Pills / Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 border-t border-slate-100 mt-3 no-scrollbar">
            {filterTabs.map((tab) => {
              const Icon = tab.icon
              const isSelected = activeFilter.toLowerCase() === tab.key.toLowerCase()
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleFilterClick(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : tab.color}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-teal-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Readable Visits Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Patient Details</th>
                <th className="py-3 px-4 min-w-[170px]">Appointment Date & Time</th>
                <th className="py-3 px-4 min-w-[160px]">Scan / Appointment Type</th>
                <th className="py-3 px-4 min-w-[180px]">Referral Doctor / Hospital</th>
                <th className="py-3 px-4 min-w-[200px]">Clinical Notes / Indication</th>
                <th className="py-3 px-4 text-right min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedVisits.map((visit, index) => {
                const serialNum = (currentPage - 1) * pageSize + index + 1
                return (
                  <tr
                    key={visit.id || index}
                    className="hover:bg-teal-50/40 transition group"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-3 text-center font-medium text-slate-400">
                      {serialNum}
                    </td>

                    {/* Patient Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-linear-to-br from-teal-500 to-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                          {visit.patientInitials}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{visit.patientName}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {visit.patientDisplayId}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{visit.patientGender} • {visit.patientAge}</span>
                            <span>•</span>
                            <span>{visit.patientMobile}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Appointment Date & Time */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {visit.dateInfo.text}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{visit.dateInfo.time}</span>
                        {getTimingBadge(visit.dateInfo)}
                      </div>
                    </td>

                    {/* Scan / Appointment Type */}
                    <td className="py-3.5 px-4">
                      {getScanBadge(visit.scanType, visit.isConsultation)}
                    </td>

                    {/* Referral Doctor */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]" title={visit.referral_doctor || 'Self'}>
                          {visit.referral_doctor || 'Self'}
                        </span>
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4">
                      <p className="text-slate-600 line-clamp-2 max-w-[240px]" title={visit.notes || visit.diagnosis || '—'}>
                        {visit.notes || visit.diagnosis || '—'}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!selectedPatient && (
                          <button
                            type="button"
                            onClick={() => selectPatient(visit.patient_id, true)}
                            title={`Schedule another appointment for ${visit.patientName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-800 shadow-2xs transition cursor-pointer"
                          >
                            <CalendarCheck className="h-3 w-3 text-teal-600" />
                            <span>Schedule</span>
                          </button>
                        )}

                        {!currentUser.isFrontDesk ? (
                          <button
                            type="button"
                            onClick={() => {
                              navigate(
                                `/echo-studies?patient=${visit.patient_id}&visit=${visit.id || ''}&type=${encodeURIComponent(
                                  visit.scanType || 'Adult Echo'
                                )}`
                              )
                            }}
                            title="Open scan reporting study"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition cursor-pointer"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Report</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/patients/${visit.patient_id}/edit`)}
                            title="View patient contact details"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-2xs transition cursor-pointer"
                          >
                            <Eye className="h-3 w-3 text-slate-500" />
                            <span>View</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteVisit(visit.id, visit.patient_id)}
                          className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Delete visit record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Empty state */}
          {paginatedVisits.length === 0 && (
            <div className="py-12 text-center bg-white">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {selectedPatient && patient
                  ? `No visits recorded yet for ${patient.first_name || ''} ${patient.last_name || ''}`
                  : 'No appointments found'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {selectedPatient && patient
                  ? 'Use the "Schedule New Appointment" form above to book their first visit.'
                  : tableSearchQuery
                  ? `No appointments match your search "${tableSearchQuery}".`
                  : `No appointments match the filter "${activeTabMeta.label}".`}
              </p>
              {selectedPatient ? (
                <button
                  type="button"
                  onClick={() => selectPatient('', true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold hover:bg-teal-100 cursor-pointer"
                >
                  <Users className="h-3.5 w-3.5 text-teal-600" />
                  <span>View All Clinic Appointments ({allVisits.length})</span>
                </button>
              ) : (
                (tableSearchQuery || activeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setTableSearchQuery('')
                      handleFilterClick('all')
                    }}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold hover:bg-teal-100 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Reset All Filters</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {filteredVisits.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 bg-slate-50/70">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Showing</span>
              <strong>{(currentPage - 1) * pageSize + 1}</strong>
              <span>to</span>
              <strong>{Math.min(currentPage * pageSize, filteredVisits.length)}</strong>
              <span>of</span>
              <strong>{filteredVisits.length}</strong>
              <span>appointments</span>

              <span className="mx-2 text-slate-300">|</span>

              <label className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="h-7 px-2 bg-white border border-slate-200 rounded text-xs outline-none"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 7 && currentPage > 4) {
                    pageNum = currentPage - 4 + i
                    if (pageNum > totalPages) pageNum = totalPages - (6 - i)
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-7 w-7 rounded-md text-xs font-semibold transition cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-teal-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      <ReferralDoctorModal
        open={referralOpen}
        onClose={() => setReferralOpen(false)}
        onSaved={loadReferralDoctors}
        onSelect={(record) => {
          const docName =
            record.doctor_type === 'hospital'
              ? record.institution_name
              : `${record.first_name || ''} ${record.last_name || ''}`.trim()
          setVisitData((prev) => ({
            ...prev,
            referral_doctor: docName,
          }))
          if (docName) {
            setReferralOptions((prev) => (prev.includes(docName) ? prev : [docName, ...prev]))
          }
        }}
      />
    </div>
  )
}

function PatientField({ label, value, wide }) {
  return (
    <label className={`field-label ${wide ? 'sm:col-span-2' : ''}`}>
      <span>{label}</span>
      <div className="field-control flex items-center bg-slate-50 text-slate-700">{value || '—'}</div>
    </label>
  )
}
