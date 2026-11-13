import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Building,
  ArrowRight,
  UserPlus,
} from 'lucide-react'
import { patientService } from '../api/patientService'
import { scanService } from '../api/scanService'
import { referralDoctorService } from '../api/referralDoctorService'
import AddableSelect from '../components/AddableSelect'
import ReferralDoctorModal from '../components/ReferralDoctorModal'
import { workspaceService } from '../api/workspaceService'
import {
  getStatesForCountry,
  getCitiesForState,
  getDialCode,
  lookupPincode,
  calculateAgeWithUnit,
  calculateAgeForUnit,
  COUNTRY_DIAL_CODES,
} from '../data/locationData'

function NewPatient() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    patient_id: '',
    salutation: 'Mr.',
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
    family_doctor: '',
    taluk: '',
    area: '',
    area_po: '',
  })

  const getInitialVisit = () => {
    const now = new Date()
    const formattedDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    return [
      {
        id: Date.now(),
        visit_date: formattedDateTime,
        scan_type: 'Adult Echo',
        report_template: 'Standard Echo Report',
        referral_doctor: '',
        notes: '',
      },
    ]
  }

  const [visits, setVisits] = useState(getInitialVisit)
  const [referralDoctorsList, setReferralDoctorsList] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false)
  const [zipLookupStatus, setZipLookupStatus] = useState('')

  const countries = Object.keys(COUNTRY_DIAL_CODES)
  const availableStates = getStatesForCountry(formData.country)
  const availableCities = getCitiesForState(formData.state)
  const ethnicOrigins = ['Indian', 'Asian', 'African', 'European', 'Other']
  const salutations = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Baby', 'Master']
  const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed']

  // Auto-generate next Patient ID as a suggested default (fully editable manually)
  useEffect(() => {
    workspaceService
      .getNextPatientId()
      .then((result) => {
        if (result.data?.patient_id) {
          setFormData((prev) => (prev.patient_id ? prev : { ...prev, patient_id: result.data.patient_id }))
        }
      })
      .catch(() => {})
  }, [])

  // Load referral doctors for dropdown / datalist
  const loadReferralDoctors = useCallback(async () => {
    try {
      const res = await referralDoctorService.getReferralDoctors()
      if (res?.data) {
        setReferralDoctorsList(res.data)
      }
    } catch (err) {
      console.error('Error fetching referral doctors:', err)
    }
  }, [])

  useEffect(() => {
    loadReferralDoctors()
  }, [loadReferralDoctors])

  const handleDobChange = useCallback((dob) => {
    const calculated = calculateAgeWithUnit(dob)
    setFormData((prev) => ({
      ...prev,
      dob,
      age: calculated.age,
      age_unit: calculated.unit || prev.age_unit || 'Years',
    }))
  }, [])

  const handleCountryChange = useCallback((country) => {
    const code = getDialCode(country)
    setFormData((prev) => ({
      ...prev,
      country,
      state: '',
      district_city: '',
      mobile: code ? code + ' ' : '',
    }))
    setZipLookupStatus('')
  }, [])

  const handleStateChange = useCallback((state) => {
    setFormData((prev) => ({ ...prev, state, district_city: '' }))
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

  const handleAddVisit = () => {
    const now = new Date()
    const formattedDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setVisits((prev) => [
      ...prev,
      {
        id: Date.now(),
        visit_date: formattedDateTime,
        scan_type: 'Adult Echo',
        report_template: 'Standard Echo Report',
        referral_doctor: formData.family_doctor || '',
        notes: '',
      },
    ])
  }

  const handleUpdateVisit = (id, field, value) => {
    setVisits((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
  }

  const handleDeleteVisit = (id) => {
    if (visits.length <= 1) return
    setVisits((prev) => prev.filter((v) => v.id !== id))
  }

  // Handle Form Submission: 'save' vs 'next' (Save & Next -> Scan Report Entry Page)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    // 1. Mobile number is mandatory and checked first
    if (!formData.mobile?.trim()) {
      setSubmitError('Mobile number is mandatory. Please enter the patient mobile number.')
      return
    }

    // 2. First name is mandatory
    if (!formData.first_name?.trim()) {
      setSubmitError('First name is mandatory. Please enter the patient name.')
      return
    }

    const submitAction = e.nativeEvent.submitter?.value || 'save'
    setIsSubmitting(true)

    try {
      // 1. Create Patient
      const patientResult = await patientService.createPatient(formData)
      const patient = patientResult.data

      // 2. Create Visits and corresponding Scans
      const createdVisits = []
      const createdScans = []
      const validVisits = visits.length > 0 ? visits : getInitialVisit()

      for (const v of validVisits) {
        const visitPayload = {
          visit_date: v.visit_date || new Date().toISOString(),
          visit_type: v.scan_type || 'Adult Echo',
          scan_type: v.scan_type || 'Adult Echo',
          report_template: v.report_template || 'Standard Echo Report',
          referral_doctor: v.referral_doctor || formData.family_doctor || '',
          notes: v.notes || '',
          diagnosis: v.notes || '',
        }
        const vResult = await patientService.addVisit(patient.id, visitPayload)
        const visitRecord = vResult.data
        createdVisits.push(visitRecord)

        const scanType = v.scan_type || 'Adult Echo'
        const scanPayload = {
          patient_id: patient.id,
          patient_display_id: patient.patient_id,
          visit_id: visitRecord.id,
          scan_type: scanType,
          status: 'draft',
          referralDoctor: v.referral_doctor || formData.family_doctor || '',
          indication: v.notes || '',
        }
        const sResult = await scanService.createScan(scanPayload)
        createdScans.push(sResult.data)
      }

      // 3. Navigation based on button clicked
      if (submitAction === 'next') {
        const firstScan = createdScans[0]
        const scanType = firstScan?.scan_type || 'Adult Echo'
        const scanId = firstScan?.id
        const visitId = createdVisits[0]?.id || ''

        if (scanType === 'Fetal Echo') {
          navigate(scanId ? `/fetal-echo-report/${scanId}?patientId=${patient.id}&visitId=${visitId}` : `/fetal-echo-report?patientId=${patient.id}`)
        } else if (scanType === 'Pediatric Echo') {
          navigate(scanId ? `/pediatric-echo-report/${scanId}?patientId=${patient.id}&visitId=${visitId}` : `/pediatric-echo-report?patientId=${patient.id}`)
        } else {
          navigate(scanId ? `/adult-echo-report/${scanId}?patientId=${patient.id}&visitId=${visitId}` : `/adult-echo-report?patientId=${patient.id}`)
        }
      } else {
        navigate('/patients')
      }
    } catch (error) {
      console.error('Error creating patient:', error)
      setSubmitError(error.response?.data?.detail || 'Unable to save patient. Please check required fields.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition'
  const selectClass =
    'w-full px-3 py-2 pr-8 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none'
  const labelClass = 'block text-xs font-medium text-slate-700 mb-1.5'
  const dialCode = getDialCode(formData.country)

  return (
    <>
      <form onSubmit={handleSubmit} className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-5">
        <div className="w-full max-w-7xl mx-auto space-y-6">

          {/* 1. Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-white flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" /> Basic Patient Information
              </h2>
              <span className="text-xs text-slate-500">
                Fields marked with <span className="text-red-500 font-bold">*</span> are mandatory
              </span>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Mobile Number - MUST COME VERY FIRST AND IS MANDATORY */}
                <div className="bg-teal-50/40 p-2.5 rounded-lg border border-teal-200/80">
                  <label className="block text-xs font-semibold text-teal-900 mb-1">
                    Mobile Number <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    {dialCode && (
                      <span className="flex items-center px-2 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700 whitespace-nowrap select-none">
                        {dialCode}
                      </span>
                    )}
                    <input
                      type="tel"
                      className={`${inputClass} font-medium`}
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="e.g. 9845012345"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* 2. Patient ID - AUTO INCREMENT => MANUAL ENTRY */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>Patient ID</label>
                    <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-medium">Auto / Manual</span>
                  </div>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    placeholder="e.g. PAT000108"
                  />
                </div>

                {/* 3. Salutation */}
                <div>
                  <label className={labelClass}>Salutation</label>
                  <AddableSelect
                    field="patient_salutation"
                    className={selectClass}
                    options={salutations}
                    value={formData.salutation}
                    onChange={(value) => setFormData({ ...formData, salutation: value })}
                  />
                </div>

                {/* 4. First Name */}
                <div>
                  <label className={labelClass}>
                    First Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    placeholder="First name"
                  />
                </div>

                {/* 5. Parent / Spouse Name */}
                <div>
                  <label className={labelClass}>Parent / Spouse Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Parent / Spouse name"
                  />
                </div>

                {/* 6. Middle Name */}
                <div>
                  <label className={labelClass}>Middle Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.middle_name}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                    placeholder="Middle name"
                  />
                </div>

                {/* 7. Date of Birth */}
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <div className="relative">
                    <input
                      type="date"
                      className={`${inputClass} pr-10`}
                      value={formData.dob}
                      onChange={(e) => handleDobChange(e.target.value)}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {formData.dob && formData.age && (
                    <p className="mt-1 text-xs text-teal-600 font-medium">
                      Age: {formData.age} {formData.age_unit || 'Years'}
                    </p>
                  )}
                </div>

                {/* 8. Age & Unit */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Age</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="Age"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Unit</label>
                    <select
                      className={selectClass}
                      value={formData.age_unit || 'Years'}
                      onChange={(e) => {
                        const newUnit = e.target.value
                        const newAge = formData.dob ? calculateAgeForUnit(formData.dob, newUnit) : formData.age
                        setFormData({ ...formData, age_unit: newUnit, age: newAge })
                      }}
                    >
                      <option value="Years">Years</option>
                      <option value="Months">Months</option>
                      <option value="Days">Days</option>
                    </select>
                  </div>
                </div>

                {/* 9. Gender */}
                <div>
                  <label className={labelClass}>Gender</label>
                  <div className="flex items-center gap-3 mt-2">
                    {[
                      { id: 'M', label: 'M (Male)' },
                      { id: 'F', label: 'F (Female)' },
                      { id: 'UA', label: 'UA (Other)' },
                    ].map((g) => (
                      <label key={g.id} className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                        <input
                          type="radio"
                          name="gender"
                          value={g.id}
                          checked={formData.gender === g.id}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                        />
                        <span>{g.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 10. Marital Status */}
                <div>
                  <label className={labelClass}>Marital Status</label>
                  <AddableSelect
                    field="patient_marital_status"
                    className={selectClass}
                    options={maritalStatuses}
                    value={formData.marital_status}
                    onChange={(value) => setFormData({ ...formData, marital_status: value })}
                  />
                </div>

                {/* 11. Ethnic Origin */}
                <div>
                  <label className={labelClass}>Ethnic Origin</label>
                  <AddableSelect
                    field="patient_ethnic_origin"
                    className={selectClass}
                    options={ethnicOrigins}
                    value={formData.ethnic_origin}
                    onChange={(value) => setFormData({ ...formData, ethnic_origin: value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Address Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" /> Address Information
              </h2>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className={labelClass}>Street Address</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Door / Building / Street address"
                  />
                </div>
                <div>
                  <label className={labelClass}>Taluk</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.taluk}
                    onChange={(e) => setFormData({ ...formData, taluk: e.target.value })}
                    placeholder="Auto-filled by zip code"
                  />
                </div>
                <div>
                  <label className={labelClass}>Area</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="Area / Locality"
                  />
                </div>
                <div>
                  <label className={labelClass}>Area (P.O.)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={inputClass}
                      value={formData.area_po}
                      onChange={(e) => setFormData({ ...formData, area_po: e.target.value })}
                      placeholder="Auto-filled by zip code"
                    />
                    <button
                      type="button"
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-xs font-medium whitespace-nowrap"
                    >
                      Add / Modify
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Zip / Pincode</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.zip_code}
                    onChange={(e) => handleZipChange(e.target.value)}
                    maxLength={10}
                    placeholder="Enter zip / pincode"
                  />
                  {zipLookupStatus === 'found' && <p className="mt-1 text-xs text-teal-600 font-medium">✓ Taluk &amp; Post auto-filled</p>}
                  {zipLookupStatus === 'notfound' && <p className="mt-1 text-xs text-amber-500 font-medium">Pincode not in database — fill manually</p>}
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <AddableSelect
                    field="patient_country"
                    className={selectClass}
                    options={countries}
                    value={formData.country}
                    onChange={handleCountryChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <AddableSelect
                    field="patient_state"
                    className={selectClass}
                    options={availableStates}
                    value={formData.state}
                    onChange={handleStateChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>District / City</label>
                  <AddableSelect
                    field="patient_district_city"
                    className={selectClass}
                    options={availableCities}
                    value={formData.district_city}
                    onChange={(value) => setFormData({ ...formData, district_city: value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Contact & Referral Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-purple-600" /> Contact &amp; Referral Details
              </h2>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Phone #1</label>
                  <input
                    type="tel"
                    className={inputClass}
                    value={formData.phone1}
                    onChange={(e) => setFormData({ ...formData, phone1: e.target.value })}
                    placeholder="Primary landline / phone"
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone #2</label>
                  <input
                    type="tel"
                    className={inputClass}
                    value={formData.phone2}
                    onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                    placeholder="Alternate phone"
                  />
                </div>
                <div>
                  <label className={labelClass}>Fax #</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.fax}
                    onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                    placeholder="Fax number"
                  />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      className={`${inputClass} pl-10`}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="patient@example.com"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Aadhaar / National ID</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.aadhaar_no}
                    onChange={(e) => setFormData({ ...formData, aadhaar_no: e.target.value })}
                    placeholder="XXXX XXXX XXXX"
                  />
                </div>

                {/* Referral Doctor / Institution column with + New Referral Doctor button right beside it */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className={labelClass}>Referral Doctor / Institution</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        list="referral-doctors-list"
                        type="text"
                        className={inputClass}
                        value={formData.family_doctor}
                        onChange={(e) => setFormData({ ...formData, family_doctor: e.target.value })}
                        placeholder="Type doctor or institution name, or choose from dropdown"
                      />
                      <datalist id="referral-doctors-list">
                        {referralDoctorsList.map((doc) => {
                          const name =
                            doc.doctor_type === 'hospital'
                              ? doc.institution_name
                              : `${doc.first_name || ''} ${doc.last_name || ''}`.trim() || doc.name
                          return <option key={doc.id} value={name} />
                        })}
                      </datalist>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReferralModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg transition text-xs font-semibold whitespace-nowrap shadow-xs shrink-0"
                    >
                      <UserPlus className="w-4 h-4 text-teal-600" />
                      <span>New Referral Doctor</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Visits & Scan Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-teal-50/70 to-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Visits &amp; Scan Registration</h2>
                  <p className="text-xs text-slate-500">Record visit date, scan type, template, and referral details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddVisit}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-lg transition text-xs font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Visit</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">
                      No.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[190px]">
                      Visit Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[170px]">
                      Scan Type
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[190px]">
                      Report Template
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[200px]">
                      Referral Doctor
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[220px]">
                      Notes
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visits.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-sm text-slate-500">
                        No visits added. Click &quot;Add New Visit&quot; to add a visit.
                      </td>
                    </tr>
                  ) : (
                    visits.map((visit, index) => (
                      <tr key={visit.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 text-center text-xs font-bold text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="datetime-local"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                            value={visit.visit_date?.slice(0, 16)}
                            onChange={(e) => handleUpdateVisit(visit.id, 'visit_date', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none font-medium"
                            value={visit.scan_type || 'Adult Echo'}
                            onChange={(e) => handleUpdateVisit(visit.id, 'scan_type', e.target.value)}
                          >
                            <option value="Adult Echo">Adult Echo</option>
                            <option value="Fetal Echo">Fetal Echo</option>
                            <option value="Pediatric Echo">Pediatric Echo</option>
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                            value={visit.report_template || 'Standard Echo Report'}
                            onChange={(e) => handleUpdateVisit(visit.id, 'report_template', e.target.value)}
                          >
                            <option value="Standard Echo Report">Standard Echo Report</option>
                            <option value="Comprehensive Echo">Comprehensive Echo</option>
                            <option value="Pediatric Cardiology">Pediatric Cardiology</option>
                            <option value="Fetal Assessment">Fetal Assessment</option>
                            <option value="Default Template">Default Template</option>
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            list="referral-doctors-list"
                            type="text"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                            value={visit.referral_doctor}
                            onChange={(e) => handleUpdateVisit(visit.id, 'referral_doctor', e.target.value)}
                            placeholder="Doctor / Hospital"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                            value={visit.notes}
                            onChange={(e) => handleUpdateVisit(visit.id, 'notes', e.target.value)}
                            placeholder="Clinical notes / indication"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteVisit(visit.id)}
                            disabled={visits.length <= 1}
                            title={visits.length <= 1 ? 'At least one visit is required' : 'Remove visit'}
                            className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Bottom Action Bar (Cancel, Save, Save & Next) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 p-4 sm:px-6 sm:py-4">
            {submitError && (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {submitError}
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => navigate('/patients')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium shadow-xs hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900 active:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>

              {/* Action Buttons: Save & Save and Next */}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  value="save"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-teal-600 bg-white text-teal-700 hover:bg-teal-50 active:bg-teal-100 text-sm font-semibold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                >
                  <Save className="w-4 h-4 text-teal-600" />
                  <span>Save</span>
                </button>

                <button
                  type="submit"
                  value="next"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Save &amp; Next</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </div>
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
            record.doctor_type === 'hospital'
              ? record.institution_name || record.name
              : `${record.first_name || ''} ${record.last_name || ''}`.trim() || record.name
          setFormData((prev) => ({ ...prev, family_doctor: docName }))
          loadReferralDoctors()
        }}
      />
    </>
  )
}

export default NewPatient
