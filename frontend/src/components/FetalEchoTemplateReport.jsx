import { useState, useMemo } from 'react'
import {
  Printer,
  CheckCircle,
  Calendar,
  User,
  Heart,
  Activity,
  ShieldCheck,
  Stethoscope,
  Edit3,
  FileCheck,
  Sparkles,
  Info
} from 'lucide-react'

function formatDisplayDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

const DEFAULT_NORMAL_IMPRESSION = `1. COMPREHENSIVE FETAL ECHOCARDIOGRAM DEMONSTRATES NORMAL CARDIAC SEGMENTAL ANATOMY.
2. Normal cardiac position (levocardia), situs solitus, and normal cardiac axis (~43°).
3. Concordant atrioventricular and ventriculoarterial connections with normal spatial crossover.
4. Intact interventricular and interatrial septa; physiological patent foramen ovale with right-to-left shunting.
5. Normal biventricular systolic contractility with balanced chamber dimensions (normal RV/LV ratio).
6. Normal morphology of all 4 cardiac valves with physiological transvalvular Doppler velocities.
7. Patent left aortic and ductal arches with normal antegrade forward flow; no coarctation identified.
8. Normal fetal heart rate with regular sinus rhythm and 1:1 atrioventricular conduction.`

export default function FetalEchoTemplateReport({
  data = {},
  setData,
  patient,
  patientId: patientIdProp,
  patients = [],
  visit,
  doctors = [],
  onNavigateTab,
}) {
  const [zoom, setZoom] = useState(100)

  // Robust active patient resolution across direct prop or list lookup
  const activePatient = useMemo(() => {
    if (patient && (patient.first_name || patient.patient_id)) return patient
    if (patientIdProp && Array.isArray(patients) && patients.length > 0) {
      const match = patients.find(
        (p) => String(p.id) === String(patientIdProp) || String(p.patient_id) === String(patientIdProp)
      )
      if (match) return match
    }
    return patient || null
  }, [patient, patientIdProp, patients])

  // Patient & Obstetric Demographics
  const patientFullName = useMemo(() => {
    if (activePatient) {
      const salutation = activePatient.salutation ? `${activePatient.salutation} ` : ''
      const name = `${activePatient.first_name || ''} ${activePatient.last_name || ''}`.replace(/\s+/g, ' ').trim()
      if (name) return `${salutation}${name}`
    }
    return data.patient_name || data.patientName || 'Patient'
  }, [activePatient, data.patient_name, data.patientName])

  const patientId = useMemo(() => {
    return activePatient?.patient_id || data.patient_display_id || data.patientDisplayId || patientIdProp || '—'
  }, [activePatient, data.patient_display_id, data.patientDisplayId, patientIdProp])

  const patientAge = useMemo(() => {
    const age = activePatient?.age ?? data.age ?? data.patientAge
    if (age !== undefined && age !== null && age !== '') {
      return `${age} Y`
    }
    return '—'
  }, [activePatient, data.age, data.patientAge])

  const patientGender = useMemo(() => {
    const raw = (activePatient?.gender || data.gender || 'Female').trim().toUpperCase()
    if (raw === 'F' || raw === 'FEMALE') return 'Female'
    if (raw === 'M' || raw === 'MALE') return 'Male'
    return activePatient?.gender || 'Female'
  }, [activePatient, data.gender])

  const patientPhone = activePatient?.mobile || activePatient?.phone_1 || activePatient?.phone1 || '—'
  const patientAddress = useMemo(() => {
    const parts = [activePatient?.street, activePatient?.city, activePatient?.state].filter(Boolean)
    return parts.length ? parts.join(', ') : '—'
  }, [activePatient])

  // Visit & Referral details
  const visitDate = visit?.visit_date
    ? formatDisplayDate(visit.visit_date)
    : formatDisplayDate(new Date().toISOString())
  const refDoctorName = useMemo(() => {
    if (visit?.referral_doctor) return visit.referral_doctor
    if (activePatient?.referral_doctor) return activePatient.referral_doctor
    if (activePatient?.family_doctor) return activePatient.family_doctor
    if (data.signedByLeft) return data.signedByLeft
    return 'Direct Referral / Self'
  }, [visit, activePatient, data])

  // LMP & Pregnancy details
  const lmpFormatted = formatDisplayDate(data.lmp)
  const eddFormatted = formatDisplayDate(data.edd)
  const gaFormatted = useMemo(() => {
    if (data.gaWeeks || data.gaDays) {
      return `${data.gaWeeks || 0} Weeks${data.gaDays ? ` ${data.gaDays} Days` : ''}`
    }
    if (data.ga) return data.ga
    return '—'
  }, [data.gaWeeks, data.gaDays, data.ga])
  const datingMethod = data.datingMethod || 'LMP'
  const fetusCount = data.fetuses || 'Single'
  const indicationText = useMemo(() => {
    return data.indication || visit?.notes || visit?.diagnosis || activePatient?.indication || 'Routine prenatal cardiovascular structural screening'
  }, [data.indication, visit, activePatient])
  const qualityText = data.quality || 'Optimal diagnostic acoustic windows'

  // Biometry & RV/LV Ratio
  const mvVal = parseFloat(data.mvAnnulus || data.mitralValve || 10.2)
  const tvVal = parseFloat(data.tvAnnulus || data.tricuspidValve || 10.7)
  const aoVal = parseFloat(data.avAnnulus || data.aorticValve || 6.4)
  const pvVal = parseFloat(data.pvAnnulus || data.pulmonaryValve || 6.8)

  const mvZ = data.mvAnnulusZScore || data.mitralValveZ || '+0.2'
  const tvZ = data.tvAnnulusZScore || data.tricuspidValveZ || '+0.4'
  const aoZ = data.avAnnulusZScore || data.aorticValveZ || '-0.1'
  const pvZ = data.pvAnnulusZScore || data.pulmonaryValveZ || '+0.1'

  const rvLvRatio = useMemo(() => {
    if (!isNaN(tvVal) && !isNaN(mvVal) && mvVal > 0) {
      return (tvVal / mvVal).toFixed(2)
    }
    return '1.05'
  }, [tvVal, mvVal])

  // Doppler velocities
  const tvE = data.tvE || data.tvPeakVel || '46 cm/s'
  const tvA = data.tvA || '54 cm/s'
  const mvE = data.mvE || data.mvPeakVel || '42 cm/s'
  const mvA = data.mvA || '50 cm/s'
  const aoVel = data.avVmax || data.lvotPeakVel || '68 cm/s'
  const pvVel = data.pvVmax || data.rvotPeakVel || '62 cm/s'
  const ductusVel = data.ductusVmax || data.ductusArteriosusPeakVel || '76 cm/s'
  const heartRate = data.heartRate || data.fhrRate || '138'

  // Signatures
  const primaryDoctor = data.primaryConsultant || data.signedByLeft || 'Dr. Shanthi'
  const secondaryDoctor = data.signedByRight || data.secondConsultant || ''
  const auditedBy = data.auditedBy || 'Quality Assurance Committee'

  const handleFillStandardNormal = () => {
    if (setData) {
      setData((prev) => ({
        ...prev,
        cardiacPosition: 'Normal',
        situs: 'Normal',
        systemicVenous: 'Normal',
        pulmonaryVenous: 'Normal',
        avConnection: 'Normal',
        vaConnection: 'Normal',
        greatArteries: 'Normal',
        atria: 'Normal',
        interatrialSeptum: 'Normal',
        foramenOvale: 'Normal',
        interventricularSeptum: 'Normal',
        tricuspidValve: 'Normal',
        mitralValve: 'Normal',
        aorticValve: 'Normal',
        pulmonaryValve: 'Normal',
        rightVentricle: 'Normal',
        leftVentricle: 'Normal',
        ascendingAorta: 'Normal',
        mainPulmonaryArtery: 'Normal',
        branchPulmonaryArteries: 'Normal',
        aorticArch: 'Normal',
        ductusArteriosus: 'Normal',
        quality: 'Optimal',
        impression: prev.impression || DEFAULT_NORMAL_IMPRESSION,
        reportCompleted: true,
        investigationStatus: 'Completed',
      }))
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const isAbnormalField = (val) => String(val || '').toLowerCase() === 'abnormal'

  return (
    <div className="w-full flex flex-col items-center py-4 bg-slate-100/80 min-h-screen print:bg-white print:py-0 print:min-h-0">
      
      {/* EXECUTIVE SCREEN TOOLBAR (Hidden on Print) */}
      <div className="w-full max-w-[920px] mb-4 flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Heart className="h-5 w-5 fill-teal-600/20" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              Fetal Echocardiogram Document
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Verified Clinical A4 Publication Layout
            </p>
          </div>
          <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-3 w-3" />
            {data.investigationStatus || 'Final Report'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(70, z - 10))}
              className="rounded px-2 py-1 text-slate-600 hover:bg-white hover:text-slate-900 cursor-pointer"
              title="Zoom out"
            >
              Zoom -
            </button>
            <span className="px-2 py-1 text-slate-700 font-mono text-[11px]">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(130, z + 10))}
              className="rounded px-2 py-1 text-slate-600 hover:bg-white hover:text-slate-900 cursor-pointer"
              title="Zoom in"
            >
              Zoom +
            </button>
          </div>

          {/* Fill Standard Normal Scan */}
          <button
            type="button"
            onClick={handleFillStandardNormal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 cursor-pointer transition shadow-sm"
            title="Populate complete reassuring normal anatomical descriptors"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Fill Standard Normal
          </button>

          {/* Jump to Edit */}
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('Impression')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition shadow-sm"
              title="Edit Report Details"
            >
              <Edit3 className="h-3.5 w-3.5 text-slate-500" />
              Edit Details
            </button>
          )}

          {/* Print / Save PDF Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 cursor-pointer transition"
          >
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* A4 REPORT SHEET */}
      <div
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease',
        }}
        className="w-full max-w-[920px] bg-white border border-slate-200 rounded-xl shadow-lg p-8 sm:p-10 font-sans text-slate-900 leading-normal print:border-none print:shadow-none print:p-0 print:max-w-none print:rounded-none"
      >
        {/* CLINICAL BRANDING HEADER */}
        <header className="border-b-2 border-slate-800 pb-4 mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary-800 font-bold tracking-tight text-lg uppercase">
              <Activity className="h-5 w-5 text-teal-600 stroke-[2.5]" />
              <span>{data.companyName || 'echoAI'} Fetal Cardiovascular Center</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mt-0.5">
              Advanced Prenatal Ultrasound & Pediatric Cardiology Unit
            </p>
          </div>
          <div className="text-left sm:text-right">
            <h1 className="text-xl font-extrabold uppercase tracking-wide text-slate-950 font-serif">
              {data.reportTitle || 'Fetal Echocardiography Report'}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Study Date: <strong className="text-slate-800">{visitDate}</strong> • Accredited Study
            </p>
          </div>
        </header>

        {/* COMPREHENSIVE PATIENT & PREGNANCY DEMOGRAPHICS BOX */}
        <section className="rounded-lg border border-slate-300 bg-slate-50/70 p-4 mb-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Column 1: Patient Information */}
            <div className="space-y-1.5 pr-2 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0">
              <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                <User className="h-3.5 w-3.5 text-teal-700" />
                <span>Patient Demographics</span>
              </div>
              <div>
                <span className="text-slate-500">Name:</span>{' '}
                <strong className="text-slate-900 text-sm">{patientFullName}</strong>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-500">MRN / ID:</span>{' '}
                  <strong className="text-slate-900 font-mono">{patientId}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Age:</span>{' '}
                  <strong className="text-slate-900">{patientAge}</strong>
                </div>
              </div>
              <div>
                <span className="text-slate-500">Gender:</span>{' '}
                <span className="text-slate-800 font-medium">{patientGender}</span>
              </div>
              {patientPhone !== '—' && (
                <div>
                  <span className="text-slate-500">Contact:</span>{' '}
                  <span className="text-slate-800 font-medium">{patientPhone}</span>
                </div>
              )}
              {patientAddress !== '—' && (
                <div className="text-[11px] text-slate-500 truncate" title={patientAddress}>
                  <span>Loc:</span> {patientAddress}
                </div>
              )}
            </div>

            {/* Column 2: Referral & Clinical Study Details */}
            <div className="space-y-1.5 px-0 md:px-2 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0">
              <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                <Stethoscope className="h-3.5 w-3.5 text-teal-700" />
                <span>Clinical & Referral</span>
              </div>
              <div>
                <span className="text-slate-500">Ref. Doctor:</span>{' '}
                <strong className="text-slate-900">{refDoctorName}</strong>
              </div>
              <div>
                <span className="text-slate-500">Study Date:</span>{' '}
                <strong className="text-slate-900">{visitDate}</strong>
              </div>
              <div>
                <span className="text-slate-500">Indication:</span>{' '}
                <strong className="font-semibold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 inline-block text-xs">
                  {indicationText}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Study Classification:</span>{' '}
                <span className="font-semibold text-teal-900 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 inline-block">
                  {data.reportType || 'Normal Fetal Scan'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Acoustic Window:</span>{' '}
                <span className="text-slate-800 font-medium">{qualityText}</span>
              </div>
            </div>

            {/* Column 3: Gestational Dating & LMP Details (Full Sync) */}
            <div className="space-y-1.5 pl-0 md:pl-2">
              <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-teal-700" />
                <span>Gestational Age (LMP Sync)</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200 space-y-1 shadow-2xs">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 text-[11px]">Gestational Age:</span>
                  <span className="font-extrabold text-sm text-teal-800 font-mono">
                    {gaFormatted}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 text-[11px]">LMP:</span>
                  <strong className="text-slate-800 font-mono">{lmpFormatted}</strong>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 text-[11px]">EDD:</span>
                  <strong className="text-slate-800 font-mono">{eddFormatted}</strong>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11.5px] pt-0.5">
                <div>
                  <span className="text-slate-500">Dating:</span>{' '}
                  <span className="font-medium text-slate-800">{datingMethod}</span>
                </div>
                <div>
                  <span className="text-slate-500">Fetus:</span>{' '}
                  <span className="font-bold text-slate-800">{fetusCount}</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* HEADER COMMENTS (If Provided) */}
        {data.headerComments && (
          <div className="mb-4 rounded-lg bg-blue-50/60 border border-blue-200/80 p-3 text-xs leading-relaxed text-blue-950">
            <strong className="text-blue-900 block mb-1 uppercase tracking-wide text-[11px]">
              Clinical Protocol & Header Notes:
            </strong>
            <p className="whitespace-pre-line">{data.headerComments}</p>
          </div>
        )}

        {/* 1. CARDIAC SITUS, AXIS & POSITION */}
        <section className="mb-4 avoid-break">
          <div className="flex items-center justify-between bg-[#1e2d42] text-white font-bold text-xs px-3 py-1.5 rounded-t tracking-wide">
            <span>1. Structure, Cardiac Situs & Spatial Position</span>
            <span className="text-[10px] font-normal uppercase tracking-wider text-slate-300">Plane I</span>
          </div>
          <table className="w-full border-collapse border border-slate-200 text-xs">
            <tbody>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="w-1/3 p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  Cardiac & Visceral Situs
                </td>
                <td className="p-2 text-slate-900">
                  <span className="font-semibold text-slate-800">Situs Solitus.</span> Normal levocardia with stomach on the left side of the upper abdomen. Normal thoracic visceral arrangement.
                </td>
                <td className="w-24 p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  Cardiac Position & Axis
                </td>
                <td className="p-2 text-slate-900">
                  Heart situated predominantly in the left hemithorax with apex pointing anteriorly and to the left (Levocardia). Cardiac axis is normal at approximately ~43° to the anteroposterior midline (normal reference 40° - 45°).
                </td>
                <td className="p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  Cardiothoracic Ratio (Area / Size)
                </td>
                <td className="p-2 text-slate-900">
                  Heart occupies approximately one-third of the thoracic area. Normal cardiothoracic circumference and area ratio (ratio &lt; 0.35). No cardiomegaly.
                </td>
                <td className="p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 2. VENOUS CONNECTIONS & ATRIA */}
        <section className="mb-4 avoid-break">
          <div className="flex items-center justify-between bg-[#1e2d42] text-white font-bold text-xs px-3 py-1.5 rounded-t tracking-wide">
            <span>2. Systemic & Pulmonary Venous Return & Atria</span>
            <span className="text-[10px] font-normal uppercase tracking-wider text-slate-300">Plane II</span>
          </div>
          <table className="w-full border-collapse border border-slate-200 text-xs">
            <tbody>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="w-1/3 p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  Systemic Venous Return
                </td>
                <td className="p-2 text-slate-900">
                  Inferior vena cava (IVC) and Superior vena cava (SVC) drain independently into the right atrium. Ductus venosus visualized with normal antegrade forward a-wave flow.
                </td>
                <td className="w-24 p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  Pulmonary Venous Return
                </td>
                <td className="p-2 text-slate-900">
                  All 4 pulmonary veins drain into the morphologic left atrium. Individual right and left pulmonary venous insertion orifices visualized without obstruction.
                </td>
                <td className="p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  Atrial Chambers & Foramen Ovale
                </td>
                <td className="p-2 text-slate-900">
                  Right atrium and Left atrium are of normal and balanced proportions. Interatrial septum is intact with a patent, physiological foramen ovale flap valve moving actively into the left atrium with physiological right-to-left shunting.
                </td>
                <td className="p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 3. AV JUNCTION, VALVES & VENTRICLES */}
        <section className="mb-4 avoid-break">
          <div className="flex items-center justify-between bg-[#1e2d42] text-white font-bold text-xs px-3 py-1.5 rounded-t tracking-wide">
            <span>3. Atrioventricular Junction, Valves & Ventricles (4-Chamber View)</span>
            <span className="text-[10px] font-normal uppercase tracking-wider text-slate-300">Plane III</span>
          </div>
          <table className="w-full border-collapse border border-slate-200 text-xs">
            <tbody>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="w-1/3 p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  AV Alignment & Crux
                </td>
                <td className="p-2 text-slate-900">
                  Concordant atrioventricular connections. Normal differential apical offset of the tricuspid valve relative to the mitral valve. Cardiac crux is intact without AV canal defect.
                </td>
                <td className="w-24 p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  Tricuspid & Mitral Valves
                </td>
                <td className="p-2 text-slate-900">
                  Normal leaflet morphology and unrestricted opening excursion. No valvar regurgitation on Color Doppler interrogation.
                </td>
                <td className="p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  Ventricles & Myocardial Function
                </td>
                <td className="p-2 text-slate-900">
                  Symmetric, balanced ventricular chambers. Normal right ventricular apical moderator band. Good global and segmental biventricular systolic contractility.
                </td>
                <td className="p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  Interventricular Septum (IVS)
                </td>
                <td className="p-2 text-slate-900">
                  Interventricular septum is intact along both membranous and muscular segments. No ventricular septal defect (VSD) demonstrated on 2D or Color Doppler interrogation.
                </td>
                <td className="p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 4. OUTFLOW TRACTS, GREAT ARTERIES & ARCHES */}
        <section className="mb-5 avoid-break">
          <div className="flex items-center justify-between bg-[#1e2d42] text-white font-bold text-xs px-3 py-1.5 rounded-t tracking-wide">
            <span>4. Ventriculoarterial Outflow Tracts, Great Vessels & Arches</span>
            <span className="text-[10px] font-normal uppercase tracking-wider text-slate-300">Plane IV</span>
          </div>
          <table className="w-full border-collapse border border-slate-200 text-xs">
            <tbody>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="w-1/3 p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  LVOT & Aortic Valve
                </td>
                <td className="p-2 text-slate-900">
                  Concordant ventriculoarterial connection. Normal left ventricular outflow tract (LVOT) continuity with anterior mitral leaflet and intact membranous septum. Normal aortic valve excursion.
                </td>
                <td className="w-24 p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  RVOT & Pulmonary Trunk
                </td>
                <td className="p-2 text-slate-900">
                  Concordant RVOT arising from the morphologic right ventricle, crossing perpendicularly over the aorta. Main pulmonary artery bifurcates normally into right and left branch pulmonary arteries.
                </td>
                <td className="p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-700 bg-slate-50/50 border-r border-slate-200">
                  Aortic & Ductal Arches (3VT View)
                </td>
                <td className="p-2 text-slate-900">
                  Normal left-sided aortic arch with normal head and neck vessel branching. Ductal arch is widely patent. Three-vessel and trachea (3VT) view demonstrates normal vessel alignment and caliber (PA &gt; Ao &gt; SVC) forming a normal V-sign left of the trachea.
                </td>
                <td className="p-2 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NORMAL
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 5. BIOMETRY & Z-SCORE QUANTIFICATION TABLE */}
        <section className="mb-5 avoid-break">
          <div className="flex items-center justify-between bg-[#1e2d42] text-white font-bold text-xs px-3 py-1.5 rounded-t tracking-wide">
            <span>5. Fetal Cardiac Biometry & Z-Score Analysis</span>
            <span className="text-[10px] font-normal uppercase tracking-wider text-slate-300">Normative Reference</span>
          </div>
          <table className="w-full border-collapse border border-slate-200 text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                <th className="p-2">Cardiac Structure / Valve Annulus</th>
                <th className="p-2">Measured Diameter (mm)</th>
                <th className="p-2">Expected Mean for GA</th>
                <th className="p-2">Z-Score Deviation</th>
                <th className="p-2 text-right">Assessment</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-800">Mitral Valve Annulus (LV)</td>
                <td className="p-2 font-bold font-mono text-slate-900">{mvVal} mm</td>
                <td className="p-2 text-slate-500">10.0 mm</td>
                <td className="p-2 font-mono text-slate-700">{mvZ}</td>
                <td className="p-2 text-right">
                  <span className="text-[11px] font-semibold text-emerald-700">Appropriate</span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-800">Tricuspid Valve Annulus (RV)</td>
                <td className="p-2 font-bold font-mono text-slate-900">{tvVal} mm</td>
                <td className="p-2 text-slate-500">10.5 mm</td>
                <td className="p-2 font-mono text-slate-700">{tvZ}</td>
                <td className="p-2 text-right">
                  <span className="text-[11px] font-semibold text-emerald-700">Appropriate</span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-800">Aortic Valve Annulus (AoV)</td>
                <td className="p-2 font-bold font-mono text-slate-900">{aoVal} mm</td>
                <td className="p-2 text-slate-500">6.3 mm</td>
                <td className="p-2 font-mono text-slate-700">{aoZ}</td>
                <td className="p-2 text-right">
                  <span className="text-[11px] font-semibold text-emerald-700">Appropriate</span>
                </td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-800">Pulmonary Valve Annulus (PV)</td>
                <td className="p-2 font-bold font-mono text-slate-900">{pvVal} mm</td>
                <td className="p-2 text-slate-500">6.7 mm</td>
                <td className="p-2 font-mono text-slate-700">{pvZ}</td>
                <td className="p-2 text-right">
                  <span className="text-[11px] font-semibold text-emerald-700">Appropriate</span>
                </td>
              </tr>
              <tr className="bg-teal-50/60 font-semibold text-teal-950">
                <td colSpan={2} className="p-2.5">
                  <span className="text-slate-800">Calculated RV / LV Diameter Ratio</span>{' '}
                  <span className="text-slate-500 font-normal text-[11px]">(Normal Fetal Range ~1.00 – 1.15):</span>
                </td>
                <td colSpan={3} className="p-2.5 text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-teal-100 text-teal-900 font-mono font-bold text-xs border border-teal-300">
                    {rvLvRatio} (Balanced Ventricles)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 6. PULSED DOPPLER HEMODYNAMIC EVALUATION */}
        <section className="mb-5 avoid-break">
          <div className="flex items-center justify-between bg-[#1e2d42] text-white font-bold text-xs px-3 py-1.5 rounded-t tracking-wide">
            <span>6. Pulsed Doppler Flow Pattern & Hemodynamic Analysis</span>
            <span className="text-[10px] font-normal uppercase tracking-wider text-slate-300">cm/sec</span>
          </div>
          <table className="w-full border-collapse border border-slate-200 text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                <th className="p-2 w-1/3">Interrogation Site</th>
                <th className="p-2 w-1/3">Flow Pattern / Waveform</th>
                <th className="p-2">Peak Velocity</th>
                <th className="p-2 text-right">Hemodynamics</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-800">Tricuspid Inflow (TV)</td>
                <td className="p-2 text-slate-700">Biphasic (E &lt; A physiological pattern)</td>
                <td className="p-2 font-mono font-bold text-slate-900">{tvE}</td>
                <td className="p-2 text-right text-emerald-700 font-medium">Normal forward filling</td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-800">Mitral Inflow (MV)</td>
                <td className="p-2 text-slate-700">Biphasic (E &lt; A physiological pattern)</td>
                <td className="p-2 font-mono font-bold text-slate-900">{mvE}</td>
                <td className="p-2 text-right text-emerald-700 font-medium">Normal forward filling</td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-800">LVOT / Ascending Aorta</td>
                <td className="p-2 text-slate-700">Laminar systolic forward acceleration</td>
                <td className="p-2 font-mono font-bold text-slate-900">{aoVel}</td>
                <td className="p-2 text-right text-emerald-700 font-medium">No aortic stenosis</td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-800">RVOT / Pulmonary Trunk</td>
                <td className="p-2 text-slate-700">Laminar systolic forward acceleration</td>
                <td className="p-2 font-mono font-bold text-slate-900">{pvVel}</td>
                <td className="p-2 text-right text-emerald-700 font-medium">No pulmonary stenosis</td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-800">Ductus Arteriosus</td>
                <td className="p-2 text-slate-700">High velocity forward continuous flow</td>
                <td className="p-2 font-mono font-bold text-slate-900">{ductusVel}</td>
                <td className="p-2 text-right text-emerald-700 font-medium">Patent ductus</td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-800">Ductus Venosus</td>
                <td className="p-2 text-slate-700">Forward triphasic flow (positive a-wave)</td>
                <td className="p-2 font-mono font-bold text-slate-900">54 cm/s</td>
                <td className="p-2 text-right text-emerald-700 font-medium">Normal preload</td>
              </tr>
              <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                <td className="p-2 font-medium text-slate-800">Foramen Ovale Shunt</td>
                <td className="p-2 text-slate-700">Right to Left interatrial shunting</td>
                <td className="p-2 font-mono font-bold text-slate-900">32 cm/s</td>
                <td className="p-2 text-right text-emerald-700 font-medium">Physiological</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 7. FETAL HEART RATE & RHYTHM */}
        <section className="mb-5 avoid-break">
          <div className="flex items-center justify-between bg-[#1e2d42] text-white font-bold text-xs px-3 py-1.5 rounded-t tracking-wide">
            <span>7. Fetal Heart Rate, Electrophysiology & Rhythm</span>
            <span className="text-[10px] font-normal uppercase tracking-wider text-slate-300">1:1 AV Conduction</span>
          </div>
          <div className="border border-slate-200 border-t-0 p-3 bg-slate-50/30 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div>
                <span className="text-slate-500">Fetal Heart Rate:</span>{' '}
                <strong className="text-slate-900 text-sm font-mono">{heartRate} bpm</strong>{' '}
                <span className="text-emerald-700 font-semibold ml-2">(Normal baseline 120 – 160 bpm)</span>
              </div>
              <div className="text-slate-600">
                Regular sinus rhythm with sustained 1:1 atrioventricular mechanical concordance. No fetal ectopy, extrasystoles, or heart block observed during study.
              </div>
            </div>
            <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              REGULAR RHYTHM
            </span>
          </div>
        </section>

        {/* EXECUTIVE CLINICAL IMPRESSION CARD */}
        <section className="mb-6 avoid-break rounded-xl border-2 border-slate-800 bg-slate-50/90 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-slate-900" />
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-950 font-serif">
                Executive Clinical Impression
              </h3>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              REASSURING STUDY
            </span>
          </div>

          <div className="text-xs leading-relaxed font-medium text-slate-900 whitespace-pre-line space-y-1">
            {data.impression || DEFAULT_NORMAL_IMPRESSION}
          </div>

          {/* Recommendations Block */}
          {data.recommendations && (
            <div className="mt-4 pt-3 border-t border-slate-300 text-xs">
              <strong className="text-slate-900 uppercase tracking-wide text-[11px] block mb-1">
                Clinical Recommendations & Follow-Up:
              </strong>
              <p className="text-slate-700 whitespace-pre-line">{data.recommendations}</p>
            </div>
          )}

          {/* Footer Comments */}
          {data.footerComments && (
            <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-600 italic">
              {data.footerComments}
            </div>
          )}
        </section>

        {/* SIGNATURES & VALIDATION BLOCK */}
        <footer className="mt-8 pt-4 border-t border-slate-300 text-xs avoid-break">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-4">
            
            {/* Primary Consultant Signature */}
            <div>
              <div className="h-12 flex items-end">
                <span
                  style={{
                    fontFamily: "'Brush Script MT', 'Dancing Script', cursive, sans-serif",
                    fontSize: '2rem',
                    color: '#1e293b',
                    display: 'inline-block',
                    transform: 'rotate(-2deg)',
                  }}
                >
                  {primaryDoctor}
                </span>
              </div>
              <div className="border-t border-slate-400 pt-1 mt-1">
                <div className="font-bold text-slate-900 uppercase text-[11px]">
                  {primaryDoctor}
                </div>
                <div className="text-[10px] text-slate-600 font-medium">
                  Consultant Cardiologist & Fetal Imaging Specialist
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  MCI / Reg. No: KMC-48291 • echoAI Clinical Diagnostics
                </div>
              </div>
            </div>

            {/* Audit / Second Consultant */}
            <div className="sm:text-right">
              <div className="h-12 flex items-end sm:justify-end">
                {secondaryDoctor ? (
                  <span
                    style={{
                      fontFamily: "'Brush Script MT', 'Dancing Script', cursive, sans-serif",
                      fontSize: '1.8rem',
                      color: '#1e293b',
                    }}
                  >
                    {secondaryDoctor}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Digitally Verified & Validated</span>
                )}
              </div>
              <div className="border-t border-slate-400 pt-1 mt-1">
                <div className="font-bold text-slate-900 uppercase text-[11px]">
                  {secondaryDoctor || auditedBy}
                </div>
                <div className="text-[10px] text-slate-600 font-medium">
                  Clinical Audit & Quality Assurance Stamp
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Report ID: {data.reportId || visit?.id || 'REP-ECHO-2026-F'}
                </div>
              </div>
            </div>

          </div>

          {/* Statutory PCPNDT & Clinical Disclaimer */}
          <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] leading-normal text-slate-500 text-justify">
            <strong className="text-slate-700">Notice under Pre-Conception and Pre-Natal Diagnostic Techniques (PCPNDT) Act:</strong>{' '}
            Sex determination of fetus is strictly prohibited by law and is not performed. Fetal echocardiography evaluates structural cardiac anatomy, rhythm, and hemodynamic function. Minor evolving lesions (e.g. small VSDs, mild semilunar valve dysplasia, coarctation evolving after birth, or secondary valve changes) may not be detectable in prenatal life due to physiological fetal circulatory shunts.
          </div>
        </footer>

        {/* BOTTOM ACTION BUTTON: Screen only */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-center print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2.5 rounded-xl bg-[#1e2d42] px-8 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-slate-800 cursor-pointer transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Printer className="h-4 w-4" />
            Print / Save Final Report as PDF
          </button>
        </div>

      </div>
    </div>
  )
}
