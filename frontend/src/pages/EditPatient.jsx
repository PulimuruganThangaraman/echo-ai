import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save,
  X,
  Calendar,
  MapPin,
  Phone,
  Mail,
  User,
  Plus,
  Trash2,
  Printer,
  Activity,
  ArrowLeft,
  ArrowRight,
  Building,
  CheckCircle2,
  UserCheck,
  Stethoscope,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { patientService } from '../api/patientService'
import { scanService } from '../api/scanService'
import { workspaceService } from '../api/workspaceService'
import { referralDoctorService } from '../api/referralDoctorService'
import AddableSelect from '../components/AddableSelect'
import ReferralDoctorModal from '../components/ReferralDoctorModal'
import {
  getStatesForCountry,
  getCitiesForState,
  getDialCode,
  lookupPincode,
  calculateAge,
  calculateAgeWithUnit,
  calculateAgeForUnit,
  COUNTRY_DIAL_CODES,
} from '../data/locationData'

function getInitials(first, last) {
  const f = (first || '').trim()[0] || ''
  const l = (last || '').trim()[0] || ''
  if (!f && !l) return 'PT'
  return (f + l).toUpperCase()
}

function EditPatient() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [formData, setFormData] = useState({
    patient_id: '',
    salutation: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    age: '',
    age_unit: 'Years',
    dob: '',
    gender: 'M',
    marital_status: '',
    ethnic_origin: '',
    street: '',
    zip_code: '',
    country: 'India',
    state: '',
    district_city: '',
    email: '',
    phone1: '',
    phone2: '',
    mobile: '',
    fax: '',
    aadhaar_no: '',
    abha_no: '',
    family_doctor: '',
    taluk: '',
    area: '',
    area_po: '',
  })

  const [formErrors, setFormErrors] = useState({})
  const [visitFormError, setVisitFormError] = useState('')
  const [visits, setVisits] = useState([])
  const [selectedScans, setSelectedScans] = useState([])
  const [templates, setTemplates] = useState([])
  const [existingScans, setExistingScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false)
  const [zipLookupStatus, setZipLookupStatus] = useState('')

  const getInitialVisitDate = () => {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

  const [newVisitInput, setNewVisitInput] = useState({
    visit_date: getInitialVisitDate(),
    scan_type: 'Adult Echo',
    report_template_id: '',
    referral_doctor: '',
    notes: '',
  })

  const countries = Object.keys(COUNTRY_DIAL_CODES)
  const availableStates = getStatesForCountry(formData.country)
  const availableCities = getCitiesForState(formData.state)
  const ethnicOrigins = ['Indian', 'Asian', 'African', 'European', 'Other']
  const salutations = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Baby', 'Master']
  const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed']
  const [referralOptions, setReferralOptions] = useState([
    'Dr. Arvind Swamy',
    'Dr. Sunita Kulkarni',
    'Dr. Rajesh V. Varma',
    'Dr. Meenakshi Sundaram',
    'Dr. Suresh Hegde',
    'Dr. Anil Kumar Mehta',
    'Dr. Preeti Deshmukh',
    'Dr. Vikramaditya Singh',
    'Dr. Farhan Ahmed',
    'Dr. Shalini Reddy',
    'Dr. Sanjay Joshi',
    'Dr. Gayatri Nair',
    'Dr. Harish Chandra',
    'Dr. Radhika Agarwal',
    'Dr. Pradeep Rao',
    'Fortis Heart Institute',
    'Motherhood Hospital',
    "Rainbow Children's Hospital",
    'Apollo Hospitals',
    'Max Super Speciality Hospital',
    'Manipal Hospital',
    'AIIMS Cardiology Center',
    'Lilavati Hospital & Research Centre',
    'Narayana Health City',
    'Cloudnine Hospital',
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
        setReferralOptions((prev) => Array.from(new Set([...prev, ...list])))
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadReferralDoctors()
  }, [loadReferralDoctors])

  // Fetch patient data, visits, and scans
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    Promise.all([
      patientService.getPatient(id),
      patientService.getVisits(id).catch(() => ({ data: [] })),
      scanService.getScans().catch(() => ({ data: [] })),
      workspaceService.getTemplates().catch(() => ({ data: [] })),
    ])
      .then(([patientRes, visitsRes, scansRes, tmplRes]) => {
        if (!isMounted) return
        const tmplList = tmplRes?.data || []
        setTemplates(tmplList)
        setNewVisitInput((prev) => {
          if (!prev.report_template_id && prev.scan_type) {
            const matched = tmplList.find(
              (t) =>
                (t.scan_type && t.scan_type.toLowerCase() === prev.scan_type.toLowerCase()) ||
                (t.title && t.title.toLowerCase().includes(prev.scan_type.toLowerCase())) ||
                (t.name && t.name.toLowerCase().includes(prev.scan_type.toLowerCase()))
            )
            if (matched) {
              return { ...prev, report_template_id: String(matched.id) }
            }
          }
          return prev
        })
        if (patientRes?.success || patientRes?.data || patientRes?.patient_id) {
          const patientData = patientRes.data || patientRes
          setFormData((prev) => ({
            ...prev,
            ...patientData,
            age_unit: patientData.age_unit || 'Years',
            country: patientData.country || 'India',
          }))

          // Load visits
          const vList = visitsRes?.data || (Array.isArray(visitsRes) ? visitsRes : [])
          if (Array.isArray(vList) && vList.length > 0) {
            setVisits(vList)
          }

          // Pre-select patient's scans
          const allScans = scansRes?.data || (Array.isArray(scansRes) ? scansRes : [])
          const patientScans = allScans.filter(
            (s) =>
              String(s.patient_id) === String(id) ||
              String(s.patient_id) === String(patientData.patient_id),
          )
          setExistingScans(patientScans)
          const scanTypes = Array.from(new Set(patientScans.map((s) => s.scan_type).filter(Boolean)))
          setSelectedScans(scanTypes)
        }
      })
      .catch((error) => {
        console.error('Error fetching patient data:', error)
        if (isMounted) {
          setSubmitError('Error loading patient data. Please try again.')
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id])

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    if (visitFormError) setVisitFormError('')
  }

  const clearFieldError = (field) => {
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    if (visitFormError) setVisitFormError('')
  }

  const validatePatientInfo = () => {
    const errors = {}
    if (!formData.patient_id?.trim()) errors.patient_id = 'Patient ID is required'
    if (!formData.first_name?.trim()) errors.first_name = 'First Name is required'
    if (!formData.last_name?.trim()) errors.last_name = 'Parent / Spouse Name is required'
    if (!formData.dob?.trim()) errors.dob = 'Date of Birth is required'
    if (!formData.gender?.trim()) errors.gender = 'Gender is required'
    if (!formData.street?.trim()) errors.street = 'Street Address is required'
    if (!formData.country?.trim()) errors.country = 'Country is required'
    if (!formData.state?.trim()) errors.state = 'State is required'
    if (!formData.mobile?.trim() && !formData.phone1?.trim()) {
      errors.mobile = 'Mobile number (Primary phone) is required'
    }

    setFormErrors(errors)
    return errors
  }

  const handleDobChange = useCallback((dob) => {
    const calculated = calculateAgeWithUnit(dob)
    setFormData((prev) => ({
      ...prev,
      dob,
      age: calculated.age,
      age_unit: calculated.unit || prev.age_unit || 'Years'
    }))
    clearFieldError('dob')
  }, [])

  const handleCountryChange = useCallback((country) => {
    setFormData((prev) => ({
      ...prev,
      country,
      state: '',
      district_city: '',
    }))
    setZipLookupStatus('')
    clearFieldError('country')
  }, [])

  const handleStateChange = useCallback((state) => {
    setFormData((prev) => ({ ...prev, state, district_city: '' }))
    clearFieldError('state')
  }, [])

  const handleZipChange = useCallback((zip) => {
    setFormData((prev) => ({ ...prev, zip_code: zip }))
    if (zip.trim().length === 6) {
      const info = lookupPincode(zip.trim())
      if (info) {
        setFormData((prev) => ({
          ...prev,
          zip_code: zip,
          taluk: info.taluk,
          area_po: info.post,
          district_city: info.district || prev.district_city,
        }))
        setZipLookupStatus('found')
      } else {
        setZipLookupStatus('notfound')
      }
    } else {
      setZipLookupStatus('')
    }
  }, [])

  const handleAddVisitDirect = () => {
    const errors = validatePatientInfo()
    if (Object.keys(errors).length > 0) {
      setVisitFormError('Please fill in all mandatory patient information before adding a visit.')
      const firstField = Object.keys(errors)[0]
      const el = document.getElementById(`field-${firstField}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus?.()
      }
      return
    }
    setVisitFormError('')
    if (!newVisitInput.visit_date) return
    const selectedTmpl = templates.find((t) => String(t.id) === String(newVisitInput.report_template_id))
    const entryScanType = newVisitInput.scan_type || selectedTmpl?.scan_type || selectedScans[0] || 'Adult Echo'
    const entryReferralDoctor = newVisitInput.referral_doctor || formData.family_doctor || ''
    const newEntry = {
      id: Date.now(),
      visit_date: newVisitInput.visit_date,
      scan_type: entryScanType,
      report_template_id: newVisitInput.report_template_id,
      referral_doctor: entryReferralDoctor,
      notes: newVisitInput.notes || '',
      image_count: 0,
      avi: 0,
      pregnancy: 0,
      ob: '',
      isNew: true,
    }
    setVisits((prev) => [...prev, newEntry])
    if (entryReferralDoctor) {
      setFormData((prev) => ({ ...prev, family_doctor: entryReferralDoctor }))
    }
    if (entryScanType && !selectedScans.includes(entryScanType)) {
      setSelectedScans((prev) => [...prev, entryScanType])
    }
    setNewVisitInput((prev) => ({
      ...prev,
      notes: '',
    }))
  }

  const handleAddVisit = () => {
    handleAddVisitDirect()
  }

  const handleUpdateVisit = (visitId, field, value) => {
    setVisits(visits.map((v) => (v.id === visitId ? { ...v, [field]: value } : v)))
  }

  const handleDeleteVisit = (visitId) => {
    setVisits(visits.filter((v) => v.id !== visitId))
  }

  const toggleScan = (scanType) => {
    setSelectedScans((prev) =>
      prev.includes(scanType) ? prev.filter((s) => s !== scanType) : [...prev, scanType],
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validatePatientInfo()
    if (Object.keys(errors).length > 0) {
      setSubmitError('Please fill in all mandatory patient fields before updating.')
      const firstField = Object.keys(errors)[0]
      const el = document.getElementById(`field-${firstField}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus?.()
      }
      return
    }
    if (selectedScans.length === 0) {
      setSubmitError('Please select at least one scan type (Adult Echo, Fetal Echo, or Pediatric Echo) from the List of Scans before updating.')
      return
    }
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const payload = {
        ...formData,
        aadhar_number: formData.aadhaar_no,
        abha_number: formData.abha_no,
      }
      await patientService.updatePatient(id, payload)

      // Save any newly added visits
      for (const visit of visits.filter((v) => v.visit_date)) {
        if (visit.isNew || typeof visit.id === 'number') {
          const { id: _vid, isNew, ...visitPayload } = visit
          await patientService.addVisit(id, visitPayload).catch(() => {})
        }
      }

      // Ensure any newly selected scan types are created
      for (const scanType of selectedScans) {
        const alreadyHasScan = existingScans.some((s) => s.scan_type === scanType)
        if (!alreadyHasScan) {
          await scanService.createScan({
            patient_id: id,
            patient_display_id: formData.patient_id,
            visit_id: visits[0]?.id || '',
            scan_type: scanType,
            status: 'draft',
          }).catch(() => {})
        }
      }

      // Check if user clicked "Go to Scan"
      const shouldGoToScan = e.nativeEvent?.submitter?.value === 'reporting'
      if (shouldGoToScan) {
        const targetType = selectedScans[0] || 'Adult Echo'
        navigate(`/echo-studies?type=${encodeURIComponent(targetType)}&patient=${id}`)
      } else {
        navigate('/patients')
      }
    } catch (error) {
      console.error('Error updating patient:', error)
      setSubmitError(
        error.response?.data?.detail ||
          'Unable to update the patient. Please verify the required fields.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-xs sm:text-sm text-slate-800 bg-white'
  const selectClass =
    'w-full px-3 py-2 pr-8 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white text-xs sm:text-sm text-slate-800'
  const labelClass = 'block text-xs font-semibold text-slate-700 mb-1.5'
  const dialCode = getDialCode(formData.country)
  const patientInitials = getInitials(formData.first_name, formData.last_name)
  const fullName = `${formData.salutation || ''} ${formData.first_name || ''} ${formData.last_name || ''}`.trim() || 'Patient'

  const getInputClass = (field) =>
    formErrors[field]
      ? 'w-full px-3 py-2 border border-red-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-500 transition ring-1 ring-red-500 bg-red-50/10 text-xs sm:text-sm text-slate-800'
      : inputClass

  const getSelectClass = (field) =>
    formErrors[field]
      ? 'w-full px-3 py-2 pr-8 border border-red-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-500 transition appearance-none bg-white ring-1 ring-red-500 text-xs sm:text-sm text-slate-800'
      : selectClass

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          <span className="text-xs font-medium text-slate-500">Loading patient record...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 p-2 lg:p-3"
      >
        <div className="w-full">
          {/* Top Page Header Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/patients')}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition"
                title="Back to Patients"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span
                    onClick={() => navigate('/patients')}
                    className="cursor-pointer hover:text-slate-700 transition"
                  >
                    Patients
                  </span>
                  <span>/</span>
                  <span className="font-mono text-emerald-700 font-semibold">
                    {formData.patient_id || id}
                  </span>
                  <span>/</span>
                  <span className="text-slate-600 font-semibold">Edit Patient Details</span>
                </div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                  Update Patient Information · {fullName}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Existing Patient Record</span>
              </span>
            </div>
          </div>

          {/* Responsive 4-Column Layout (Matching New Patient Page) */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {/* Left 3 Columns: Main Form Sections */}
            <div className="xl:col-span-3 space-y-6">
              {/* Basic Information Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-white">
                  <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-600" /> Basic Information
                  </h2>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className={labelClass}>Patient ID *</label>
                      <input
                        id="field-patient_id"
                        type="text"
                        className={getInputClass('patient_id')}
                        value={formData.patient_id}
                        onChange={(e) => updateFormField('patient_id', e.target.value)}
                        placeholder="e.g., TM00100"
                      />
                      {formErrors.patient_id && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.patient_id}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Salutation</label>
                      <AddableSelect
                        field="patient_salutation"
                        className={selectClass}
                        options={salutations}
                        value={formData.salutation}
                        onChange={(value) => updateFormField('salutation', value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>First Name *</label>
                      <input
                        id="field-first_name"
                        type="text"
                        className={getInputClass('first_name')}
                        value={formData.first_name}
                        onChange={(e) => updateFormField('first_name', e.target.value)}
                      />
                      {formErrors.first_name && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.first_name}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Parent / Spouse Name *</label>
                      <input
                        id="field-last_name"
                        type="text"
                        className={getInputClass('last_name')}
                        value={formData.last_name}
                        onChange={(e) => updateFormField('last_name', e.target.value)}
                        placeholder="Parent / Spouse Name"
                      />
                      {formErrors.last_name && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.last_name}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Middle Name</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.middle_name}
                        onChange={(e) => updateFormField('middle_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Date of Birth *</label>
                      <div className="relative">
                        <input
                          id="field-dob"
                          type="date"
                          className={`${getInputClass('dob')} pr-10`}
                          value={formData.dob}
                          onChange={(e) => handleDobChange(e.target.value)}
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                      {formErrors.dob && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.dob}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>Age</label>
                        <input
                          type="number"
                          className={inputClass}
                          value={formData.age}
                          onChange={(e) => updateFormField('age', e.target.value)}
                          placeholder="Age"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Unit</label>
                        <select
                          className={selectClass}
                          value={formData.age_unit || 'Years'}
                          onChange={(e) => {
                            const newUnit = e.target.value;
                            const newAge = formData.dob ? calculateAgeForUnit(formData.dob, newUnit) : formData.age;
                            setFormData({ ...formData, age_unit: newUnit, age: newAge });
                          }}
                        >
                          <option value="Years">Years</option>
                          <option value="Months">Months</option>
                          <option value="Days">Days</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Gender *</label>
                      <div
                        id="field-gender"
                        className={`flex items-center gap-3 mt-1.5 transition ${
                          formErrors.gender ? 'p-1.5 rounded-lg border border-red-500 ring-1 ring-red-500 bg-red-50/40' : 'p-1.5'
                        }`}
                      >
                        {['M', 'F', 'UA'].map((g) => (
                          <label key={g} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="gender"
                              value={g}
                              checked={formData.gender === g}
                              onChange={(e) => updateFormField('gender', e.target.value)}
                              className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-slate-700 font-medium">{g}</span>
                          </label>
                        ))}
                      </div>
                      {formErrors.gender && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.gender}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Marital Status</label>
                      <AddableSelect
                        field="patient_marital_status"
                        className={selectClass}
                        options={maritalStatuses}
                        value={formData.marital_status}
                        onChange={(value) => updateFormField('marital_status', value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Ethnic Origin</label>
                      <AddableSelect
                        field="patient_ethnic_origin"
                        className={selectClass}
                        options={ethnicOrigins}
                        value={formData.ethnic_origin}
                        onChange={(value) => updateFormField('ethnic_origin', value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-white">
                  <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600" /> Address Information
                  </h2>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <label className={labelClass}>Street Address *</label>
                      <input
                        id="field-street"
                        type="text"
                        className={getInputClass('street')}
                        value={formData.street}
                        onChange={(e) => updateFormField('street', e.target.value)}
                        placeholder="House / Flat No., Street Name"
                      />
                      {formErrors.street && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.street}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Taluk</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.taluk}
                        onChange={(e) => updateFormField('taluk', e.target.value)}
                        placeholder="Auto-filled by zip code"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Area</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.area}
                        onChange={(e) => updateFormField('area', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Area (P.O.)</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.area_po}
                        onChange={(e) => updateFormField('area_po', e.target.value)}
                        placeholder="Auto-filled by zip code"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Zip Code</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.zip_code}
                        onChange={(e) => handleZipChange(e.target.value)}
                        maxLength={10}
                        placeholder="Enter zip / pincode"
                      />
                      {zipLookupStatus === 'found' && (
                        <p className="mt-1 text-xs text-teal-600 font-medium">
                          Taluk and Post auto-filled
                        </p>
                      )}
                      {zipLookupStatus === 'notfound' && (
                        <p className="mt-1 text-xs text-amber-500 font-medium">
                          Pincode not in database - fill manually
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Country *</label>
                      <div id="field-country">
                        <AddableSelect
                          field="patient_country"
                          className={getSelectClass('country')}
                          options={countries}
                          value={formData.country}
                          onChange={handleCountryChange}
                        />
                      </div>
                      {formErrors.country && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.country}</p>
                      )}
                      {dialCode && (
                        <p className="mt-1 text-xs text-slate-500">
                          Dial code:{' '}
                          <span className="font-semibold text-slate-700">{dialCode}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>State *</label>
                      <div id="field-state">
                        <AddableSelect
                          field="patient_state"
                          className={getSelectClass('state')}
                          options={availableStates}
                          value={formData.state}
                          onChange={handleStateChange}
                        />
                      </div>
                      {formErrors.state && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.state}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>District/City</label>
                      <AddableSelect
                        field="patient_district_city"
                        className={selectClass}
                        options={availableCities}
                        value={formData.district_city}
                        onChange={(value) => updateFormField('district_city', value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-white">
                  <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-teal-600" /> Contact Information
                  </h2>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Mobile * <span className="text-xs text-slate-500 font-normal">(Primary phone)</span></label>
                      <div className="flex gap-1" id="field-mobile">
                        {dialCode && (
                          <span className="flex items-center px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap select-none">
                            {dialCode}
                          </span>
                        )}
                        <input
                          type="tel"
                          className={`${getInputClass('mobile')} flex-1`}
                          value={formData.mobile}
                          onChange={(e) => updateFormField('mobile', e.target.value)}
                          placeholder="Mobile number"
                        />
                      </div>
                      {formErrors.mobile && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{formErrors.mobile}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Phone 1</label>
                      <input
                        type="tel"
                        className={inputClass}
                        value={formData.phone1}
                        onChange={(e) => updateFormField('phone1', e.target.value)}
                        placeholder="Phone 1"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Phone 2</label>
                      <input
                        type="tel"
                        className={inputClass}
                        value={formData.phone2}
                        onChange={(e) => updateFormField('phone2', e.target.value)}
                        placeholder="Phone 2"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Fax</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.fax}
                        onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                        placeholder="Fax"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        className={inputClass}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="patient@example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-white">
                  <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-teal-600" /> Additional Information
                  </h2>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Aadhaar No</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.aadhaar_no}
                        onChange={(e) =>
                          setFormData({ ...formData, aadhaar_no: e.target.value })
                        }
                        placeholder="XXXX XXXX XXXX"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>ABHA No</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.abha_no}
                        onChange={(e) =>
                          setFormData({ ...formData, abha_no: e.target.value })
                        }
                        placeholder="14-digit ABHA Number"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Visits Section - Exactly as mockup */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-teal-600" />
                      <span>Visits ({visits.length})</span>
                    </h2>
                    <p className="text-xs text-slate-500">Add and review clinical visits for the selected patient.</p>
                  </div>
                </div>

                {/* Banner: Linked patient */}
                <div className="flex items-center gap-3 border-b border-teal-200/70 bg-teal-50/70 px-4 py-2.5 text-sm text-teal-900">
                  <UserCheck className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>
                    New visits will be linked to{' '}
                    <strong>
                      {formData.patient_id || 'PATIENT'} — {formData.first_name || ''} {formData.last_name || ''}
                    </strong>
                  </span>
                </div>

                {/* Error Banner: Missing mandatory patient info */}
                {visitFormError && (
                  <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      <span className="font-semibold">{visitFormError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVisitFormError('')}
                      className="text-red-500 hover:text-red-700 p-0.5 rounded"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Form Row: Visit date and time, Scan type, Report template, Referral Doctor / Institute, Visit notes, Add visit button */}
                <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 xl:grid-cols-[180px_140px_1fr_1.3fr_1fr_auto] md:grid-cols-2 lg:grid-cols-3 grid-cols-1 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Visit date and time *
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      value={newVisitInput.visit_date}
                      onChange={(e) => setNewVisitInput({ ...newVisitInput, visit_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Scan type
                    </label>
                    <select
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      value={newVisitInput.scan_type}
                      onChange={(e) => {
                        const nextScanType = e.target.value
                        const matchingTmpl = templates.find(
                          (t) =>
                            (t.scan_type && t.scan_type.toLowerCase() === nextScanType.toLowerCase()) ||
                            (t.title && t.title.toLowerCase().includes(nextScanType.toLowerCase())) ||
                            (t.name && t.name.toLowerCase().includes(nextScanType.toLowerCase()))
                        )
                        setNewVisitInput((prev) => ({
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
                      value={newVisitInput.report_template_id}
                      onChange={(e) => {
                        const tmplId = e.target.value
                        const tmpl = templates.find((t) => String(t.id) === String(tmplId))
                        setNewVisitInput((prev) => ({
                          ...prev,
                          report_template_id: tmplId,
                          scan_type: tmpl?.scan_type || prev.scan_type,
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

                  <div className="min-w-[220px]">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-600">
                        Referral Doctor / Institute
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsReferralModalOpen(true)}
                        className="text-[11px] font-semibold text-teal-600 hover:text-teal-800 hover:underline"
                        title="Open Referral Doctors & Hospitals manager"
                      >
                        Manage
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <select
                        className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                        value={newVisitInput.referral_doctor}
                        onChange={(e) => {
                          const val = e.target.value
                          setNewVisitInput((prev) => ({ ...prev, referral_doctor: val }))
                          setFormData((prev) => ({ ...prev, family_doctor: val }))
                        }}
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
                        onClick={() => setIsReferralModalOpen(true)}
                        title="Add or Manage Referral Doctor / Institute"
                        className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 shadow-xs transition"
                      >
                        <Plus className="h-4 w-4 text-teal-600" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Visit notes
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-400"
                      placeholder="Visit notes"
                      value={newVisitInput.notes}
                      onChange={(e) => setNewVisitInput({ ...newVisitInput, notes: e.target.value })}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddVisitDirect}
                    disabled={!newVisitInput.visit_date}
                    className="h-10 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium text-sm transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <Save className="h-4 w-4" />
                    <span>Add visit</span>
                  </button>
                </div>

                {/* Visits Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">No.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Visit date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Scan type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Referral doctor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visits.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-sm text-slate-500">
                            No visits recorded. Use the form above to add a visit.
                          </td>
                        </tr>
                      ) : (
                        visits.map((visit, index) => {
                          const displayDate = visit.visit_date
                            ? new Date(visit.visit_date).toLocaleString('en-US', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true,
                              })
                            : '—'
                          return (
                            <tr key={visit.id || index} className="hover:bg-slate-50/80 transition">
                              <td className="px-4 py-3 text-slate-700">{index + 1}</td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900">{formData.patient_id || '—'}</div>
                                <div className="text-xs text-slate-500">
                                  {formData.first_name} {formData.last_name}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{displayDate}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                  {visit.scan_type || visit.visit_type || selectedScans[0] || 'Adult Echo'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {visit.referral_doctor || formData.family_doctor || '—'}
                              </td>
                              <td className="px-4 py-3 text-slate-500">{visit.notes || '—'}</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVisit(visit.id)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded transition hover:bg-red-50"
                                  title="Delete visit"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Sidebar (List of Scans, Patient Summary & Quick Actions) */}
            <div className="space-y-4">
              {/* Quick Patient Profile Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e3a8a] text-sm font-bold text-white shadow-2xs">
                    {patientInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{fullName}</p>
                    <p className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                      {formData.patient_id || 'ID Pending'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-medium">Age & Sex:</span>
                    <p className="font-semibold text-slate-700">
                      {[formData.age ? `${formData.age} ${formData.age_unit || 'Years'}` : '', formData.gender]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">City:</span>
                    <p className="font-semibold text-slate-700 truncate">
                      {formData.district_city || formData.state || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* List of Scans Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-white flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-600" /> List of Scans *
                  </h2>
                  {selectedScans.length === 0 ? (
                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                      Required
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ {selectedScans.length} Selected
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  {['Adult Echo', 'Fetal Echo', 'Pediatric Echo'].map((scanType) => (
                    <div
                      key={scanType}
                      role="button"
                      tabIndex={0}
                      onDoubleClick={(event) => {
                        event.preventDefault()
                        navigate(
                          `/echo-studies?type=${encodeURIComponent(scanType)}&patient=${id}`,
                        )
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter')
                          navigate(
                            `/echo-studies?type=${encodeURIComponent(scanType)}&patient=${id}`,
                          )
                      }}
                      title={`Double-click to open ${scanType}`}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-teal-300 hover:bg-teal-50 group cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedScans.includes(scanType)}
                        onChange={() => toggleScan(scanType)}
                        className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-700 group-hover:text-teal-700">
                          {scanType}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          Double-click to open
                        </span>
                      </span>
                    </div>
                  ))}
                  {selectedScans.length === 0 && (
                    <p className="mt-2 text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center gap-1.5">
                      ⚠️ Select at least one scan to update patient
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleAddVisit}
                  className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition flex items-center justify-center gap-2 font-medium shadow-sm text-sm"
                >
                  <Plus className="w-4 h-4" /> Add New Visit
                </button>

                <button
                  type="button"
                  onClick={() => setIsReferralModalOpen(true)}
                  title="Click to manage referral doctors and hospitals"
                  className="w-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg transition flex items-center justify-center gap-2 font-medium text-sm"
                >
                  <User className="w-4 h-4" /> Referral Doctor
                </button>

                <div className="pt-2 border-t border-slate-200">
                  <button
                    type="submit"
                    value="reporting"
                    disabled={selectedScans.length === 0}
                    title={selectedScans.length === 0 ? "Please select at least one scan type first" : "Go to Scan"}
                    className={`w-full px-4 py-3 rounded-lg transition flex items-center justify-center gap-2 font-medium shadow-sm text-sm ${
                      selectedScans.length === 0
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    <Activity className="w-4 h-4" /> Go to Scan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons Bar */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200/90 p-3.5 sm:px-6 sm:py-4">
            {submitError && (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {submitError}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/patients')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium shadow-xs hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900 active:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-teal-600 bg-teal-50/70 text-teal-800 text-sm font-semibold shadow-xs hover:bg-teal-100 hover:border-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4 text-teal-700" />
                )}
                <span>Save</span>
              </button>

              <button
                type="submit"
                value="reporting"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold shadow-xs hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4 text-white" />
                )}
                <span>Save & Report</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Referral Doctor Modal */}
      <ReferralDoctorModal
        open={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
        onSelect={(record) => {
          const docName =
            record.name ||
            (record.doctor_type === 'hospital'
              ? record.institution_name
              : `${record.first_name || ''} ${record.last_name || ''}`.trim()) ||
            record.hospital ||
            ''
          setFormData((prev) => ({
            ...prev,
            family_doctor: docName,
          }))
          setNewVisitInput((prev) => ({
            ...prev,
            referral_doctor: docName,
          }))
          const itemsToAdd = [docName, record.name, record.hospital, record.institution_name].filter(Boolean)
          if (itemsToAdd.length > 0) {
            setReferralOptions((prev) => Array.from(new Set([...prev, ...itemsToAdd])))
          }
        }}
        onSaved={loadReferralDoctors}
      />
    </>
  )
}

export default EditPatient
