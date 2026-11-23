import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, FileDown, FileText, Mail, Plus, Printer, Save, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Field, FieldGrid, Section, Tabs, Workspace } from '../components/WorkspaceUI'
import SearchableSelect from '../components/SearchableSelect'
import FetalEchoTemplateReport from '../components/FetalEchoTemplateReport'
import { patientService } from '../api/patientService'
import { referralDoctorService } from '../api/referralDoctorService'
import { workspaceService } from '../api/workspaceService'
import {
  adult2D, adultDoppler, aortic, echoSections, fetalBiometry, fetalDoppler, impressionFields,
  mMode, pediatricBiometry, pediatricDoppler, pisa,
} from '../data/clinicalFields'

const tabsByType = {
  'Adult Echo': ['Echo details', '2D measurements', 'M-Mode', 'Doppler', 'PISA', 'Aortic Stenosis', 'Impression', 'Preview'],
  'Pediatric Echo': ['Echo details', 'Biometry', 'Doppler', 'Custom measurements', 'Impression', 'Preview'],
  'Fetal Echo': ['LMP details', 'Echo details', 'Biometry', 'Doppler', 'Impression', 'Preview'],
}

const emptyData = (type = 'Adult Echo') => ({
  reportTitle: `${type} Report`,
  indication: '',
  reportType: 'Normal',
  headerComments: '',
  impression: '',
  imageColumns: '1',
  imageWidth: '600',
  imageHeight: '450',
  imageRows: '2',
  investigationStatus: 'Draft',
  customMeasurements: [{ name: '', value: '', unit: 'mm' }],
  clips: [],
})

function parseDateOnly(str) {
  if (!str) return null
  if (str instanceof Date) return isNaN(str.getTime()) ? null : str
  const datePart = String(str).split('T')[0].split(' ')[0]
  const parts = datePart.split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    const dt = new Date(y, m, d)
    return isNaN(dt.getTime()) ? null : dt
  }
  const dt = new Date(str)
  return isNaN(dt.getTime()) ? null : dt
}

function formatDateOnly(date) {
  if (!date || isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDaysToDate(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() + days)
  return result
}

function calculateGAFromLmp(lmpStr, examDateStr) {
  const lmp = parseDateOnly(lmpStr)
  if (!lmp) return { weeks: '', days: '' }
  const exam = parseDateOnly(examDateStr) || new Date()
  const lmpMid = new Date(lmp.getFullYear(), lmp.getMonth(), lmp.getDate())
  const examMid = new Date(exam.getFullYear(), exam.getMonth(), exam.getDate())
  const diffDays = Math.round((examMid.getTime() - lmpMid.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { weeks: 0, days: 0 }
  return {
    weeks: Math.floor(diffDays / 7),
    days: diffDays % 7,
  }
}

export default function ClinicalWorkspace({ initialType = 'Adult Echo' }) {
  const [params, setParams] = useSearchParams()
  const initialScanType = params.get('type') || initialType
  const [scanType, setScanType] = useState(initialScanType)
  const [activeTab, setActiveTab] = useState(tabsByType[initialScanType]?.[0] || 'Echo details')
  const [data, setData] = useState(() => emptyData(initialScanType))
  const [errors, setErrors] = useState({})
  const [reportId, setReportId] = useState('')
  const [patients, setPatients] = useState([])
  const [visits, setVisits] = useState([])
  const [doctors, setDoctors] = useState([])
  const [patientId, setPatientId] = useState(params.get('patient') || '')
  const [visitId, setVisitId] = useState(params.get('visit') || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const patientOptions = useMemo(() => {
    return patients.map((item) => ({
      value: item.id,
      label: `${item.patient_id || ''} — ${item.first_name || ''} ${item.last_name || ''}`.trim(),
    }))
  }, [patients])

  useEffect(() => {
    Promise.all([patientService.getPatients(), referralDoctorService.getReferralDoctors()])
      .then(([p, d]) => { setPatients(p.data || []); setDoctors(d.data || []) })
      .catch(() => { setPatients([]); setDoctors([]) })
  }, [])

  useEffect(() => {
    if (!patientId) { setVisits([]); setVisitId(''); return }
    patientService.getVisits(patientId).then((result) => setVisits(result.data || [])).catch(() => setVisits([]))
  }, [patientId])

  useEffect(() => {
    setSaved(false)
    setErrors({})
    workspaceService.getReports({ patient_id: patientId || undefined, visit_id: visitId || undefined })
      .then((result) => {
        const match = (result.data || []).find((report) => report.scan_type === scanType)
        const defaultTitle = `${scanType} Report`
        const selectedVisit = visits.find((v) => String(v.id) === String(visitId))
        if (match) {
          setReportId(match.id)
          let parsedData = match.data || {}
          if (match.findings && typeof match.findings === 'string' && match.findings.startsWith('{')) {
            try {
              parsedData = { ...parsedData, ...JSON.parse(match.findings) }
            } catch (e) {}
          }
          const mergedData = {
            ...emptyData(scanType),
            indication: parsedData.indication || selectedVisit?.notes || '',
            ...parsedData,
            reportTitle: parsedData.reportTitle || match.report_title || defaultTitle,
            investigationStatus: match.status || parsedData.investigationStatus || 'Draft',
          }
          setData(mergedData)
        } else {
          setReportId('')
          setData({
            ...emptyData(scanType),
            indication: selectedVisit?.notes || '',
          })
        }
      }).catch(() => {
        setReportId('')
        const selectedVisit = visits.find((v) => String(v.id) === String(visitId))
        setData({
          ...emptyData(scanType),
          indication: selectedVisit?.notes || '',
        })
      })
  }, [patientId, visitId, scanType, visits])

  // Sync visit notes into indication if indication is currently blank
  useEffect(() => {
    if (visitId && visits.length > 0) {
      const selectedVisit = visits.find((v) => String(v.id) === String(visitId))
      if (selectedVisit?.notes) {
        setData((prev) => {
          if (!prev.indication) {
            return { ...prev, indication: selectedVisit.notes }
          }
          return prev
        })
      }
    }
  }, [visitId, visits])

  const patient = useMemo(() => {
    if (!patientId) return null
    return (
      patients.find(
        (item) =>
          String(item.id) === String(patientId) ||
          String(item.patient_id) === String(patientId)
      ) || null
    )
  }, [patients, patientId])

  const changeType = (type) => {
    const prevDefault = `${scanType} Report`
    setScanType(type)
    setActiveTab(tabsByType[type][0])
    setParams((current) => { current.set('type', type); return current })
    setData((prev) => {
      const shouldUpdateTitle = !prev.reportTitle || prev.reportTitle === prevDefault
      return {
        ...prev,
        reportTitle: shouldUpdateTitle ? `${type} Report` : prev.reportTitle,
      }
    })
  }

  // Recalculate gestational age if visit date changes and LMP is present
  useEffect(() => {
    if (data.lmp && scanType === 'Fetal Echo') {
      const selectedVisit = visits.find((v) => String(v.id) === String(visitId))
      const ga = calculateGAFromLmp(data.lmp, selectedVisit?.visit_date)
      if (ga.weeks !== '' && (data.gaWeeks === undefined || data.gaWeeks === '')) {
        setData((prev) => ({
          ...prev,
          gaWeeks: ga.weeks,
          gaDays: ga.days,
        }))
      }
    }
  }, [visitId, visits, data.lmp, scanType])

  const calculated = useMemo(() => {
    const next = {}
    const weight = Number(data.weight), height = Number(data.height)
    if (weight && height) next.bsa = Math.sqrt((weight * height) / 3600).toFixed(2)
    const lvedd = Number(data.lvedd), lvesd = Number(data.lvesd)
    if (lvedd && lvesd) next.fractionalShortening = (((lvedd - lvesd) / lvedd) * 100).toFixed(1)
    const av = Number(data.avVmax || data.aorticValveVmax)
    if (av) next.avPeakGrad = (4 * av * av).toFixed(1)
    const tr = Number(data.trVmax)
    if (tr) next.rvsp = (4 * tr * tr + Number(data.rap || 3)).toFixed(1)
    return next
  }, [data.weight, data.height, data.lvedd, data.lvesd, data.avVmax, data.aorticValveVmax, data.trVmax, data.rap])

  const handleLmpChange = (val) => {
    const errorsToClear = {}
    if (val) errorsToClear.lmp = ''

    const lmpDate = parseDateOnly(val)
    let eddVal = data.edd || ''
    let gaWeeksVal = data.gaWeeks ?? ''
    let gaDaysVal = data.gaDays ?? ''

    if (lmpDate) {
      const calculatedEdd = addDaysToDate(lmpDate, 280)
      eddVal = formatDateOnly(calculatedEdd)
      errorsToClear.edd = ''
      const currentVisit = visits.find((v) => String(v.id) === String(visitId))
      const ga = calculateGAFromLmp(val, currentVisit?.visit_date)
      gaWeeksVal = ga.weeks
      gaDaysVal = ga.days
    }

    setErrors((prev) => ({ ...prev, ...errorsToClear }))
    setData((prev) => ({
      ...prev,
      lmp: val,
      edd: eddVal,
      gaWeeks: gaWeeksVal,
      gaDays: gaDaysVal,
    }))
  }

  const handleEddChange = (val) => {
    const errorsToClear = {}
    if (val) errorsToClear.edd = ''

    const eddDate = parseDateOnly(val)
    let lmpVal = data.lmp || ''
    let gaWeeksVal = data.gaWeeks ?? ''
    let gaDaysVal = data.gaDays ?? ''

    if (eddDate) {
      const calculatedLmp = addDaysToDate(eddDate, -280)
      lmpVal = formatDateOnly(calculatedLmp)
      errorsToClear.lmp = ''
      const currentVisit = visits.find((v) => String(v.id) === String(visitId))
      const ga = calculateGAFromLmp(lmpVal, currentVisit?.visit_date)
      gaWeeksVal = ga.weeks
      gaDaysVal = ga.days
    }

    setErrors((prev) => ({ ...prev, ...errorsToClear }))
    setData((prev) => ({
      ...prev,
      edd: val,
      lmp: lmpVal,
      gaWeeks: gaWeeksVal,
      gaDays: gaDaysVal,
    }))
  }

  const handleEtDateChange = (val) => {
    const etDate = parseDateOnly(val)
    if (!etDate) {
      setData((prev) => ({ ...prev, etDate: val }))
      return
    }
    // Day 3 ET: LMP = ET - 17 days, EDD = ET + 263 days
    const lmpDate = addDaysToDate(etDate, -17)
    const eddDate = addDaysToDate(etDate, 263)
    const lmpVal = formatDateOnly(lmpDate)
    const eddVal = formatDateOnly(eddDate)
    const currentVisit = visits.find((v) => String(v.id) === String(visitId))
    const ga = calculateGAFromLmp(lmpVal, currentVisit?.visit_date)

    setErrors((prev) => ({ ...prev, lmp: '', edd: '' }))
    setData((prev) => ({
      ...prev,
      etDate: val,
      lmp: lmpVal,
      edd: eddVal,
      gaWeeks: ga.weeks,
      gaDays: ga.days,
    }))
  }

  const handleBtDateChange = (val) => {
    const btDate = parseDateOnly(val)
    if (!btDate) {
      setData((prev) => ({ ...prev, btDate: val }))
      return
    }
    // Day 5 BT: LMP = BT - 19 days, EDD = BT + 261 days
    const lmpDate = addDaysToDate(btDate, -19)
    const eddDate = addDaysToDate(btDate, 261)
    const lmpVal = formatDateOnly(lmpDate)
    const eddVal = formatDateOnly(eddDate)
    const currentVisit = visits.find((v) => String(v.id) === String(visitId))
    const ga = calculateGAFromLmp(lmpVal, currentVisit?.visit_date)

    setErrors((prev) => ({ ...prev, lmp: '', edd: '' }))
    setData((prev) => ({
      ...prev,
      btDate: val,
      lmp: lmpVal,
      edd: eddVal,
      gaWeeks: ga.weeks,
      gaDays: ga.days,
    }))
  }

  const validateReport = (checkImpression = false) => {
    const newErrors = {}
    if (!data.reportTitle || !String(data.reportTitle).trim()) {
      newErrors.reportTitle = 'Report title is required'
    }
    if (!data.indication || !String(data.indication).trim()) {
      newErrors.indication = 'Indication is required'
    }
    if (scanType === 'Fetal Echo') {
      if (!data.lmp || !String(data.lmp).trim()) {
        newErrors.lmp = 'LMP is required'
      }
      if (!data.edd || !String(data.edd).trim()) {
        newErrors.edd = 'EDD is required'
      }
    }

    // Check all echo finding fields: if marked 'Abnormal', the comment is mandatory!
    echoSections.forEach((section) => {
      section.fields.forEach((field) => {
        const val = data[field.key]
        if (val && String(val).toLowerCase() === 'abnormal') {
          const commentKey = `${field.key}Comment`
          const commentVal = data[commentKey]
          if (!commentVal || !String(commentVal).trim()) {
            newErrors[commentKey] = `${field.label} comment is required when marked abnormal`
          }
        }
      })
    })

    if (checkImpression || activeTab === 'Impression' || activeTab === 'Preview' || data.reportCompleted) {
      if (!data.headerComments || !String(data.headerComments).trim()) {
        newErrors.headerComments = 'Header comments are required'
      }
      if (!data.impression || !String(data.impression).trim()) {
        newErrors.impression = 'Final impression is required'
      }
    }

    setErrors(newErrors)
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    }
  }

  const save = async (options = {}) => {
    const { checkImpression = false } = options
    const { isValid, errors: validationErrors } = validateReport(checkImpression)
    if (!isValid) {
      if ((validationErrors.lmp || validationErrors.edd) && scanType === 'Fetal Echo' && activeTab !== 'LMP details') {
        setActiveTab('LMP details')
      } else {
        const hasEchoCommentError = Object.keys(validationErrors).some((k) => k.endsWith('Comment'))
        if (hasEchoCommentError && activeTab !== 'Echo details') {
          setActiveTab('Echo details')
        } else if ((validationErrors.headerComments || validationErrors.impression) && activeTab !== 'Impression') {
          setActiveTab('Impression')
        }
      }
      return false
    }
    setSaving(true); setSaved(false)
    try {
      const resolvedPatientName = patient
        ? `${patient.salutation ? `${patient.salutation} ` : ''}${patient.first_name || ''} ${patient.last_name || ''}`.replace(/\s+/g, ' ').trim()
        : (data.patientName || '')
      const resolvedPatientId = patient?.patient_id || data.patientDisplayId || ''
      const fullData = {
        ...data,
        ...calculated,
        patientName: resolvedPatientName,
        patientDisplayId: resolvedPatientId,
        indication: data.indication || visits.find((v) => String(v.id) === String(visitId))?.notes || '',
      }
      const payload = {
        patient_id: patientId,
        patient_display_id: resolvedPatientId,
        patient_name: resolvedPatientName,
        visit_id: visitId,
        scan_type: scanType,
        report_title: fullData.reportTitle || `${scanType} Report`,
        findings: JSON.stringify(fullData),
        conclusion: fullData.recommendations || fullData.impression || '',
        status: fullData.investigationStatus || 'Draft',
        data: fullData,
      }
      const result = reportId ? await workspaceService.updateReport(reportId, payload) : await workspaceService.createReport(payload)
      setReportId(result.data.id); setData(fullData); setSaved(true)
      return true
    } catch (err) {
      console.error('Failed to save report', err)
      return false
    } finally {
      setSaving(false)
    }
  }

  const currentTabs = tabsByType[scanType] || []
  const currentIndex = currentTabs.indexOf(activeTab)

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setActiveTab(currentTabs[currentIndex - 1])
    }
  }

  const handleSaveAndNext = async () => {
    const ok = await save()
    if (!ok) return
    if (currentIndex >= 0 && currentIndex < currentTabs.length - 1) {
      setActiveTab(currentTabs[currentIndex + 1])
    }
  }

  const fields = activeTab === '2D measurements' ? adult2D : activeTab === 'M-Mode' ? mMode : activeTab === 'PISA' ? pisa : activeTab === 'Aortic' || activeTab === 'Aortic Stenosis' ? aortic : activeTab === 'Biometry' ? (scanType === 'Fetal Echo' ? fetalBiometry : pediatricBiometry) : activeTab === 'Doppler' ? (scanType === 'Adult Echo' ? adultDoppler : scanType === 'Fetal Echo' ? fetalDoppler : pediatricDoppler) : []

  return (
    <Workspace
      title={`${scanType} reporting`}
      description="Patient-linked measurements, images, impression, referral letter and report output."
      actions={
        <>
          <select className="field-control w-44" value={scanType} onChange={(e) => changeType(e.target.value)}>
            {Object.keys(tabsByType).map((type) => <option key={type}>{type}</option>)}
          </select>
          <button className="primary-button" onClick={save} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save report'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />Saved to database
            </span>
          )}
        </>
      }
    >
      <Section title="Patient and visit" className={`mb-4 ${activeTab === 'Preview' ? 'print:hidden' : ''}`}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="field-label">
            <span>Patient</span>
            <SearchableSelect
              options={patientOptions}
              value={patientId}
              onChange={(val) => { setPatientId(val); setVisitId('') }}
              placeholder="Select"
              searchPlaceholder="Search patient ID or name..."
            />
          </div>
          <label className="field-label">
            <span>Visit</span>
            <select
              className="field-control"
              value={visitId}
              onChange={(e) => {
                const newVisitId = e.target.value
                setVisitId(newVisitId)
                const newVisit = visits.find((v) => String(v.id) === String(newVisitId))
                if (newVisit?.notes) {
                  setData((prev) => ({ ...prev, indication: newVisit.notes }))
                }
              }}
            >
              <option value="">Select</option>
              {visits.map((visit) => (
                <option key={visit.id} value={visit.id}>
                  {visit.visit_date ? new Date(visit.visit_date).toLocaleString() : visit.id}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Report title *"
            value={data.reportTitle}
            onChange={(value) => {
              setData((prev) => ({ ...prev, reportTitle: value }))
              if (value?.trim()) setErrors((prev) => ({ ...prev, reportTitle: '' }))
            }}
            hasError={Boolean(errors.reportTitle)}
            error={errors.reportTitle}
          />
          <Field
            label="Indication *"
            value={data.indication}
            onChange={(value) => {
              setData((prev) => ({ ...prev, indication: value }))
              if (value?.trim()) setErrors((prev) => ({ ...prev, indication: '' }))
            }}
            hasError={Boolean(errors.indication)}
            error={errors.indication}
          />
        </div>
      </Section>

      <div className="mt-4">
        <Tabs items={tabsByType[scanType]} value={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'LMP details' && (
        <Section title="Pregnancy dating">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="LMP *"
              type="date"
              value={data.lmp}
              onChange={handleLmpChange}
              hasError={Boolean(errors.lmp)}
              error={errors.lmp}
            />
            <Field
              label="EDD *"
              type="date"
              value={data.edd}
              onChange={handleEddChange}
              hasError={Boolean(errors.edd)}
              error={errors.edd}
            />
            <Field
              label="Gestational age – weeks"
              type="number"
              value={data.gaWeeks}
              onChange={(val) => setData((prev) => ({ ...prev, gaWeeks: val }))}
            />
            <Field
              label="Days"
              type="number"
              value={data.gaDays}
              onChange={(val) => setData((prev) => ({ ...prev, gaDays: val }))}
            />
            <Field
              label="Dating method"
              type="select"
              options={['LMP', 'Ultrasound', 'Embryo transfer']}
              addable
              optionField="datingMethod"
              value={data.datingMethod}
              onChange={(val) => setData((prev) => ({ ...prev, datingMethod: val }))}
            />
            <Field
              label="Embryo transfer date"
              type="date"
              value={data.etDate}
              onChange={handleEtDateChange}
            />
            <Field
              label="Blastocyst transfer date"
              type="date"
              value={data.btDate}
              onChange={handleBtDateChange}
            />
            <Field
              label="Number of fetuses"
              type="select"
              options={['Single', 'Twins', 'Triplets', 'Four']}
              addable
              optionField="fetuses"
              value={data.fetuses}
              onChange={(val) => setData((prev) => ({ ...prev, fetuses: val }))}
            />
          </div>
        </Section>
      )}

      {activeTab === 'Echo details' && (
        <div className="space-y-4">
          {echoSections.map((section) => (
            <Section key={section.title} title={section.title}>
              <FindingGrid fields={section.fields} data={data} setData={setData} errors={errors} setErrors={setErrors} />
            </Section>
          ))}
          <Section title="Additional details">
            <div className="grid gap-3 lg:grid-cols-2">
              <Field type="textarea" rows={8} label="Additional comments" value={data.comments} onChange={(value) => setData({ ...data, comments: value })} />
              <Field type="textarea" rows={8} label="Default normal comments" value={data.normalComments} onChange={(value) => setData({ ...data, normalComments: value })} />
            </div>
          </Section>
        </div>
      )}

      {fields.length > 0 && (
        <Section title={activeTab} description="All blank measurements are omitted from the final report. Calculated fields update when their source measurements are entered.">
          {scanType !== 'Adult Echo' && ['Biometry', 'Aortic'].includes(activeTab) ? (
            <ZScoreGrid fields={fields} data={{ ...data, ...calculated }} setData={setData} />
          ) : (
            <FieldGrid fields={fields} data={{ ...data, ...calculated }} setData={setData} />
          )}
          {Object.keys(calculated).length > 0 && (
            <div className="mt-4 rounded-lg bg-primary-50 p-3 text-sm text-primary-800">
              Calculated: {Object.entries(calculated).map(([key, value]) => (
                <span className="mr-4" key={key}>
                  <strong>{key.replace(/([A-Z])/g, ' $1')}:</strong> {value}
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {activeTab === 'Custom measurements' && <CustomMeasurements data={data} setData={setData} />}
      {activeTab === 'Impression' && <Impression data={data} setData={setData} doctors={doctors} errors={errors} setErrors={setErrors} />}
      {activeTab === 'Referral letter' && <ReferralLetter data={data} setData={setData} doctors={doctors} patient={patient} />}
      {activeTab === 'Preview' && (
        <ReportPreview
          scanType={scanType}
          data={{ ...data, ...calculated }}
          setData={setData}
          patient={patient}
          patientId={patientId}
          patients={patients}
          visit={visits.find((v) => String(v.id) === String(visitId))}
          doctors={doctors}
          onNavigateTab={setActiveTab}
        />
      )}

      <div className="mt-6 flex items-center justify-end gap-3 print:hidden">
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={handlePrevious}
            className="secondary-button inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
        )}
        {activeTab !== 'Preview' && (
          <button
            type="button"
            onClick={handleSaveAndNext}
            disabled={saving}
            className="primary-button inline-flex items-center gap-2"
          >
            {saving ? 'Saving…' : 'Save & Next'}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </Workspace>
  )
}

function FindingGrid({ fields, data, setData, errors = {}, setErrors }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {fields.map((field) => {
        const isAbnormal = String(data[field.key] || '').toLowerCase() === 'abnormal'
        const commentKey = `${field.key}Comment`
        const commentError = errors[commentKey]

        return (
          <div
            key={field.key}
            className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2"
          >
            <Field
              label={field.label}
              type={field.type}
              options={field.options}
              addable={field.addable}
              optionField={field.key}
              value={data[field.key]}
              onChange={(value) => {
                setData((prev) => ({ ...prev, [field.key]: value }))
                if (String(value || '').toLowerCase() === 'abnormal') {
                  if (!data[commentKey]?.trim()) {
                    setErrors?.((prev) => ({
                      ...prev,
                      [commentKey]: `${field.label} comment is required when marked abnormal`,
                    }))
                  }
                } else {
                  setErrors?.((prev) => {
                    if (!prev[commentKey]) return prev
                    const next = { ...prev }
                    delete next[commentKey]
                    return next
                  })
                }
              }}
            />
            <Field
              id={`comment-input-${field.key}`}
              label={`${field.label} comments${isAbnormal ? ' *' : ''}`}
              placeholder={isAbnormal ? 'Describe abnormal findings (required)...' : `${field.label} comments`}
              value={data[commentKey]}
              onChange={(value) => {
                setData((prev) => ({ ...prev, [commentKey]: value }))
                if (value?.trim()) {
                  setErrors?.((prev) => {
                    if (!prev[commentKey]) return prev
                    const next = { ...prev }
                    delete next[commentKey]
                    return next
                  })
                } else if (isAbnormal) {
                  setErrors?.((prev) => ({
                    ...prev,
                    [commentKey]: `${field.label} comment is required when marked abnormal`,
                  }))
                }
              }}
              onBlur={() => {
                if (isAbnormal && !data[commentKey]?.trim()) {
                  setErrors?.((prev) => ({
                    ...prev,
                    [commentKey]: `${field.label} comment is required when marked abnormal`,
                  }))
                }
              }}
              hasError={Boolean(commentError)}
              error={commentError}
            />
          </div>
        )
      })}
    </div>
  )
}

function ZScoreGrid({ fields, data, setData }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_140px]">
          <Field
            label={field.label}
            type={field.type}
            options={field.options}
            addable={field.addable}
            value={data[field.key]}
            onChange={(value) => setData({ ...data, [field.key]: value })}
          />
          <Field
            label="Z-score"
            type="number"
            value={data[`${field.key}ZScore`]}
            onChange={(value) => setData({ ...data, [`${field.key}ZScore`]: value })}
          />
        </div>
      ))}
    </div>
  )
}

function CustomMeasurements({ data, setData }) {
  const rows = data.customMeasurements || []
  const update = (index, key, value) => setData({ ...data, customMeasurements: rows.map((row, i) => i === index ? { ...row, [key]: value } : row) })
  return (
    <Section title="Custom measurements">
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_140px_1fr_auto]">
            <input className="field-control" placeholder="Measurement name" value={row.name} onChange={(e) => update(index, 'name', e.target.value)} />
            <input className="field-control" placeholder="Value" value={row.value} onChange={(e) => update(index, 'value', e.target.value)} />
            <select className="field-control" value={row.unit} onChange={(e) => update(index, 'unit', e.target.value)}>
              {['mm', 'cm', 'm/s', 'cm/s', 'mmHg', '%', 'ms'].map((unit) => <option key={unit}>{unit}</option>)}
            </select>
            <input className="field-control" placeholder="Z-score / comment" value={row.comment || ''} onChange={(e) => update(index, 'comment', e.target.value)} />
            <button className="secondary-button" onClick={() => setData({ ...data, customMeasurements: rows.filter((_, i) => i !== index) })}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button className="secondary-button mt-3" onClick={() => setData({ ...data, customMeasurements: [...rows, { name: '', value: '', unit: 'mm', comment: '' }] })}>
        <Plus className="h-4 w-4" />Add measurement
      </button>
    </Section>
  )
}

function Impression({ data, setData, doctors, errors = {}, setErrors }) {
  const names = doctors.map((doctor) => doctor.doctor_type === 'hospital' ? doctor.institution_name : `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()).filter(Boolean)

  const currentReportType = data.reportType || (
    data.abnormal ? 'Abnormal' :
    data.ambiguity ? 'Ambiguity' :
    data.growthAbnormality ? 'Growth abnormality' :
    'Normal'
  )

  const handleDetailsDataChange = (updated) => {
    if (updated.reportType !== (data.reportType || currentReportType)) {
      updated.abnormal = updated.reportType === 'Abnormal'
      updated.ambiguity = updated.reportType === 'Ambiguity'
      updated.growthAbnormality = updated.reportType === 'Growth abnormality'
    }
    setData(updated)
  }

  const fields = impressionFields.map((field) => {
    if (['signedByLeft', 'signedByRight', 'primaryConsultant', 'secondConsultant', 'auditedBy', 'typedBy'].includes(field.key)) {
      return { ...field, type: 'select', options: names, addable: true, optionField: field.key }
    }
    return field
  })

  return (
    <div className="space-y-4">
      <Section title="Report details">
        <FieldGrid
          fields={fields}
          data={{ ...data, reportType: currentReportType }}
          setData={handleDetailsDataChange}
        />
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Comments">
          <Field
            type="textarea"
            rows={5}
            label="Header comments *"
            value={data.headerComments}
            onChange={(value) => {
              setData((prev) => ({ ...prev, headerComments: value }))
              if (value?.trim()) setErrors?.((prev) => ({ ...prev, headerComments: '' }))
            }}
            hasError={Boolean(errors.headerComments)}
            error={errors.headerComments}
          />
          <div className="mt-3">
            <Field
              type="textarea"
              rows={5}
              label="Footer comments"
              value={data.footerComments}
              onChange={(value) => setData((prev) => ({ ...prev, footerComments: value }))}
            />
          </div>
        </Section>
        <Section title="Finalisation">
          <Field
            type="textarea"
            rows={8}
            label="Final impression *"
            value={data.impression}
            onChange={(value) => {
              setData((prev) => ({ ...prev, impression: value }))
              if (value?.trim()) setErrors?.((prev) => ({ ...prev, impression: '' }))
            }}
            hasError={Boolean(errors.impression)}
            error={errors.impression}
          />
          <div className="mt-3">
            <Field
              type="textarea"
              rows={4}
              label="Recommendations"
              value={data.recommendations}
              onChange={(value) => setData((prev) => ({ ...prev, recommendations: value }))}
            />
          </div>
          <div className="mt-3">
            <Field
              type="textarea"
              rows={4}
              label="Disclaimer comments"
              value={data.disclaimer}
              onChange={(value) => setData((prev) => ({ ...prev, disclaimer: value }))}
            />
          </div>
          <div className="mt-3">
            <Field
              type="textarea"
              rows={4}
              label="Internal comments (not printed)"
              value={data.internalComments}
              onChange={(value) => setData({ ...data, internalComments: value })}
            />
          </div>
          <div className="mt-3">
            <Field
              label="Report completed"
              type="checkbox"
              value={data.reportCompleted}
              onChange={(value) =>
                setData((prev) => ({
                  ...prev,
                  reportCompleted: value,
                  investigationStatus: value ? 'Completed' : prev.investigationStatus,
                }))
              }
            />
          </div>
        </Section>
      </div>
    </div>
  )
}

function ReferralLetter({ data, setData, doctors, patient }) {
  const names = doctors.map((doctor) => doctor.doctor_type === 'hospital' ? doctor.institution_name : `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()).filter(Boolean)
  const createLetter = () => setData({
    ...data,
    letter: `Dear Doctor,\n\nThank you for referring ${patient ? `${patient.salutation || ''} ${patient.first_name || ''} ${patient.last_name || ''}`.trim() : 'the patient'}.\n\n${data.impression || ''}\n\nThank you,\n${data.signedByRight || data.signedByLeft || ''}`
  })
  return (
    <Section title="Referral letter">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <Field label="Letter name" value={data.letterName} onChange={(value) => setData({ ...data, letterName: value })} />
          <Field label="To" type="select" options={names} addable value={data.recipient} onChange={(value) => setData({ ...data, recipient: value })} />
          <Field label="Letter copy to" type="select" options={names} addable value={data.copyTo} onChange={(value) => setData({ ...data, copyTo: value })} />
          <Field label="Subject" value={data.subject} onChange={(value) => setData({ ...data, subject: value })} />
          <button className="secondary-button" onClick={createLetter}>
            <FileText className="h-4 w-4" />Generate letter text
          </button>
        </div>
        <Field type="textarea" rows={18} label="Letter body" value={data.letter} onChange={(value) => setData({ ...data, letter: value })} />
      </div>
    </Section>
  )
}

function ReportPreview({ scanType, data, setData, patient, patientId, patients, visit, doctors, onNavigateTab }) {
  if (scanType === 'Fetal Echo') {
    return (
      <FetalEchoTemplateReport
        data={data}
        setData={setData}
        patient={patient}
        patientId={patientId}
        patients={patients}
        visit={visit}
        doctors={doctors}
        onNavigateTab={onNavigateTab}
      />
    )
  }

  const options = [
    { key: 'reportLayout', label: 'Report layout', type: 'select', options: ['Report only', 'Report with images', 'With biometry graphs'] },
    { key: 'preprinted', label: 'Preprinted stationery', type: 'checkbox' },
    { key: 'showLogo', label: 'Logo', type: 'checkbox' },
    { key: 'showAlias', label: 'Alias ID', type: 'checkbox' },
    { key: 'hideSectionTitles', label: 'Hide section titles', type: 'checkbox' },
    { key: 'reportBorder', label: 'Report border', type: 'checkbox' },
    { key: 'imageBorder', label: 'Image border', type: 'checkbox' },
    { key: 'leftMargin', label: 'Left margin', type: 'number' },
    { key: 'topMargin', label: 'Top margin', type: 'number' },
    { key: 'lineSpacing', label: 'Report line spacing', type: 'number' },
    { key: 'sectionSpacing', label: 'Section spacing', type: 'number' },
    { key: 'landscape', label: 'Landscape', type: 'checkbox' },
    { key: 'blackBackground', label: 'Black image background', type: 'checkbox' },
    { key: 'footerLine', label: 'Footer line', type: 'checkbox' },
    { key: 'pageNumberDate', label: 'Page number and date', type: 'checkbox' },
    { key: 'printFooterText', label: 'Print footer text', type: 'checkbox' }
  ]
  const entries = Object.entries(data).filter(([key, value]) => value !== '' && value !== false && !['customMeasurements'].includes(key) && typeof value !== 'object').slice(0, 90)
  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <Section title="Report layout and print options">
        <FieldGrid columns="lg:grid-cols-2" fields={options} data={data} setData={setData} />
        <p className="mt-3 text-xs text-slate-500">Layout choices are saved with the report when Save report is selected.</p>
      </Section>
      <div className="rounded border border-slate-300 bg-white p-8 shadow-lg">
        <div className="mb-6 flex justify-between border-b-2 border-primary-600 pb-4">
          <div>
            <p className="text-sm font-semibold text-primary-700">{data.companyName || 'echoAI'}</p>
            <h2 className="text-2xl font-bold">{data.reportTitle || `${scanType} Report`}</h2>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={() => window.print()} className="secondary-button"><Printer className="h-4 w-4" />Print</button>
            <button onClick={() => window.print()} className="secondary-button"><FileDown className="h-4 w-4" />PDF</button>
            <button onClick={() => window.location.href = `mailto:?subject=${encodeURIComponent(data.reportTitle || scanType)}`} className="secondary-button">
              <Mail className="h-4 w-4" />Mail
            </button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <p><strong>Patient:</strong> {patient ? `${patient.first_name || ''} ${patient.last_name || ''}` : '—'}</p>
          <p><strong>Patient ID:</strong> {patient?.patient_id || '—'}</p>
        </div>
        <div className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div className="flex justify-between gap-3 border-b border-slate-100 py-1 text-sm" key={key}>
              <span className="capitalize text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span className="text-right font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
        {data.impression && (
          <div className="mt-7">
            <h3 className="font-semibold">Final impression</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm">{data.impression}</p>
          </div>
        )}
        {data.disclaimer && <p className="mt-8 border-t pt-3 text-xs text-slate-500">{data.disclaimer}</p>}
      </div>
    </div>
  )
}
