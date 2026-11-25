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

export default function Visits() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(getCurrentUser())
  const [searchParams, setSearchParams] = useSearchParams()
  const patientParam =
    searchParams.get('patient') || searchParams.get('patientId') || searchParams.get('patient_id') || ''
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [visits, setVisits] = useState([])
  const [allVisits, setAllVisits] = useState([])
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [templates, setTemplates] = useState([])
  const [referralOpen, setReferralOpen] = useState(false)
  const [appointmentCategory, setAppointmentCategory] = useState('Scan') // 'Scan' | 'Doctor'
  const [consultantDoctor, setConsultantDoctor] = useState('Dr. Shanthi (Pediatric Cardiologist & Fetal Specialist)')

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
      }
    })
  }, [patients, visitCountsByPatient])

  // Initial data fetch
  useEffect(() => {
    Promise.all([
      patientService.getPatients(),
      workspaceService.getTemplates(),
      patientService.getAllVisits().catch(() => ({ data: [] })),
    ])
      .then(([patientResult, templateResult, allVisitsResult]) => {
        const patientList = patientResult.data || []
        setPatients(patientList)
        setTemplates(templateResult.data || [])
        setAllVisits(allVisitsResult.data || [])
      })
      .catch(() => {
        setPatients([])
        setTemplates([])
        setAllVisits([])
      })
  }, [])

  // Sync selected patient when URL patientParam or patientList changes
  useEffect(() => {
    if (!patients.length) return
    if (patientParam) {
      const found = patients.find(
        (p) => String(p.id) === String(patientParam) || String(p.patient_id) === String(patientParam)
      )
      if (found && String(found.id) !== String(selectedPatient)) {
        selectPatient(found.id, false)
      }
    }
  }, [patientParam, patients, selectedPatient])

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
      setVisits([])
      setScans([])
      return
    }

    const patientRecord = patients.find((p) => String(p.id) === String(patientId))
    if (patientRecord) {
      const docName = patientRecord.family_doctor || patientRecord.referral_doctor || ''
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
      const [visitResult, scanResult] = await Promise.all([
        patientService.getVisits(patientId),
        scanService.getScansByPatient(patientId),
      ])
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

  const deleteVisit = async (visitId) => {
    if (!selectedPatient || !visitId) return
    await patientService.deleteVisit(selectedPatient, visitId)
    setVisits(visits.filter((visit) => visit.id !== visitId))
    setAllVisits(allVisits.filter((visit) => visit.id !== visitId))
    setScans(scans.filter((scan) => String(scan.visit_id) !== String(visitId)))
    setStatus('Visit removed from this patient')
  }

  const patient = patients.find((item) => String(item.id) === String(selectedPatient))

  const getScanBadgeClass = (scanType) => {
    if (scanType === 'Adult Echo') return 'bg-sky-50 text-sky-700 border-sky-200'
    if (scanType === 'Fetal Echo') return 'bg-purple-50 text-purple-700 border-purple-200'
    return 'bg-amber-50 text-amber-700 border-amber-200'
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

      {/* Patient Info Card */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 bg-slate-50">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Patient Information</span>
          {patient && (
            <button
              type="button"
              onClick={() => navigate(`/patients/${patient.id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-teal-200 bg-white hover:bg-teal-50 text-teal-700 text-xs font-semibold shadow-2xs transition"
              title="Edit Patient Phone, Email & Address"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Phone, Email & Address
            </button>
          )}
        </div>
        <div className="grid gap-4 p-4 xl:grid-cols-[1fr_180px]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PatientField label="Patient ID" value={patient?.patient_id} />
            <PatientField label="First name" value={patient?.first_name} />
            <PatientField label="Last name" value={patient?.last_name} />
            <PatientField label="Aadhaar number" value={patient?.aadhaar_no} />
            <PatientField label="Gender" value={patient?.gender} />
            <PatientField
              label="Age"
              value={patient?.age ? `${patient.age} ${patient.age_unit || 'Years'}` : ''}
            />
            <PatientField label="Date of birth" value={patient?.dob} />
            <PatientField label="Ethnic origin" value={patient?.ethnic_origin} />
            <PatientField label="Street" value={patient?.street} wide />
            <PatientField label="Taluk" value={patient?.taluk} />
            <PatientField label="Area" value={patient?.area} />
            <PatientField label="Area (P.O.)" value={patient?.area_po} />
            <PatientField label="Zip code" value={patient?.zip_code} />
            <PatientField label="City" value={patient?.district_city} />
            <PatientField label="State" value={patient?.state} />
            <PatientField label="Country" value={patient?.country} />
            <PatientField label="Phone #1" value={patient?.phone1} />
            <PatientField label="Phone #2" value={patient?.phone2} />
            <PatientField label="Mobile" value={patient?.mobile} />
            <PatientField label="Fax" value={patient?.fax} />
            <PatientField label="Email" value={patient?.email} wide />
            <PatientField label="Family doctor" value={patient?.family_doctor} wide />
          </div>
          <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            {patient ? (
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
            ) : (
              <div className="h-28 w-28 rounded-lg border-2 border-dashed border-slate-300" />
            )}
            <span className="mt-2 text-xs font-medium text-slate-500">
              {patient?.patient_id || 'Patient QR code'}
            </span>
          </div>
        </div>
      </section>

      {/* Main Visits Section (Full Width, No Right Go to Scan Sidebar) */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden w-full">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              <span>Schedule Appointment & Visits ({visits.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Schedule appointments for Echo Scans or Doctor Consultations for new or existing patients.
            </p>
          </div>
          {loading && <span className="text-xs font-medium text-teal-700 animate-pulse">Loading appointments…</span>}
        </div>

        {patient ? (
          <div className="flex items-center gap-3 border-b border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
            <UserCheck className="h-5 w-5 text-primary-600 shrink-0" />
            <span>
              Appointment will be scheduled for{' '}
              <strong>
                {patient.patient_id} — {patient.first_name} {patient.last_name}
              </strong>
            </span>
          </div>
        ) : (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Select or search a patient above before scheduling an appointment.
          </div>
        )}

        {status && (
          <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{status}</span>
          </div>
        )}

        {/* Appointment Type Selection Tabs: Echo Scan vs Doctor Consultation */}
        <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 mr-1 uppercase tracking-wider">Appointment For:</span>
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
              <span>Echo Scan (Adult, Fetal, Pediatric)</span>
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
        </div>

        {/* Add Visit / Schedule Appointment Form */}
        <form
          onSubmit={(e) => addVisit(e, false)}
          className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 xl:grid-cols-[180px_1fr_1fr_1.2fr_1fr_auto] md:grid-cols-2 lg:grid-cols-3 grid-cols-1 items-end"
        >
          {/* Appointment Date & Time */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Appointment date & time *
            </label>
            <input
              required
              disabled={!patient || saving}
              type="datetime-local"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
              value={visitData.visit_date}
              onChange={(e) => setVisitData({ ...visitData, visit_date: e.target.value })}
            />
          </div>

          {/* Conditional: Scan Type vs Consultant Doctor */}
          {appointmentCategory === 'Scan' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Scan type *
                </label>
                <select
                  disabled={!patient || saving}
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
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
                  disabled={!patient || saving}
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
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
                disabled={!patient || saving}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100 font-medium text-slate-800"
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

          {/* Referral Doctor / Institute */}
          <div className="min-w-[190px]">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-600">
                Referral Doctor / Hospital *
              </label>
              <button
                type="button"
                disabled={!patient || saving}
                onClick={() => setReferralOpen(true)}
                className="text-[11px] font-semibold text-teal-600 hover:text-teal-800 hover:underline disabled:opacity-40 cursor-pointer"
                title="Manage referral doctors & hospitals"
              >
                Manage
              </button>
            </div>
            <div className="flex gap-1.5">
              <select
                disabled={!patient || saving}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100 transition"
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
                disabled={!patient || saving}
                onClick={() => setReferralOpen(true)}
                title="Add or Manage Referral Doctor / Institute"
                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 shadow-xs transition disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-4 w-4 text-teal-600" />
              </button>
            </div>
          </div>

          {/* Notes / Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {appointmentCategory === 'Doctor' ? 'Reason / Clinical Notes' : 'Visit notes'}
            </label>
            <input
              disabled={!patient || saving}
              type="text"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-400 disabled:bg-slate-100"
              placeholder={appointmentCategory === 'Doctor' ? 'e.g. Follow-up consultation, murmur evaluation' : 'Visit notes'}
              value={visitData.notes}
              onChange={(e) => setVisitData({ ...visitData, notes: e.target.value })}
            />
          </div>

          {/* Action Buttons: Tailored for Front Desk vs Doctor */}
          {currentUser.isFrontDesk ? (
            <button
              type="submit"
              disabled={!patient || saving || !visitData.visit_date}
              title="Book and confirm appointment"
              className="inline-flex items-center justify-center gap-2 h-10 px-5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition shrink-0 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <CalendarCheck className="h-4 w-4" />
              {saving ? 'Scheduling…' : 'Book & Confirm Appointment'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => addVisit(e, false)}
                disabled={!patient || saving || !visitData.visit_date}
                title="Book appointment without opening reporting workspace"
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-300 hover:bg-teal-100 rounded-lg shadow-2xs transition shrink-0 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                <span>Book Appointment</span>
              </button>
              {appointmentCategory === 'Scan' && (
                <button
                  type="button"
                  onClick={(e) => addVisit(e, true)}
                  disabled={!patient || saving || !visitData.visit_date}
                  title="Book appointment and immediately open clinical reporting workspace"
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition shrink-0 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Book & Open Report</span>
                </button>
              )}
            </div>
          )}
        </form>

        {/* Visits Table */}
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>No.</th>
                <th>Patient</th>
                <th>Visit date</th>
                <th>Scan Type</th>
                <th>Referral doctor</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit, index) => {
                const visitTypes = getVisitScanTypes(visit)
                return (
                  <tr
                    key={visit.id || index}
                    onClick={() => {
                      if (currentUser.isFrontDesk) return
                      const targetType = visitTypes[0] || visitData.scan_type || 'Adult Echo'
                      navigate(
                        `/echo-studies?patient=${selectedPatient}&visit=${visit.id || ''}&type=${encodeURIComponent(
                          targetType
                        )}`
                      )
                    }}
                    title={currentUser.isFrontDesk ? `Appointment for ${visit.patient_name || 'patient'}` : 'Click to view study and report'}
                    className={`${currentUser.isFrontDesk ? 'cursor-default' : 'cursor-pointer hover:bg-teal-50/60'} transition`}
                  >
                    <td>{index + 1}</td>
                    <td>
                      <div className="font-medium text-slate-900">
                        {visit.patient_display_id || patient?.patient_id}
                      </div>
                      <div className="text-xs text-slate-500">
                        {visit.patient_name || `${patient?.first_name || ''} ${patient?.last_name || ''}`}
                      </div>
                    </td>
                    <td>{visit.visit_date ? new Date(visit.visit_date).toLocaleString() : '-'}</td>
                    <td>
                      {visit.visit_type === 'Doctor Consultation' || String(visit.visit_type || '').includes('Consultation') ? (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold border bg-teal-50 text-teal-800 border-teal-200 inline-flex items-center gap-1">
                          <Stethoscope className="h-3 w-3 text-teal-600" />
                          <span>Doctor Consultation</span>
                        </span>
                      ) : visitTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {visitTypes.map((st) => (
                            <span
                              key={st}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${getScanBadgeClass(st)}`}
                            >
                              {st}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td>{visit.referral_doctor || '—'}</td>
                    <td>{visit.notes || '—'}</td>
                    <td>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteVisit(visit.id)
                        }}
                        className="rounded p-2 text-red-600 hover:bg-red-50"
                        title="Delete visit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!loading && visits.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              No visits recorded. Click &quot;Add visit&quot; to create one.
            </p>
          )}
        </div>
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
