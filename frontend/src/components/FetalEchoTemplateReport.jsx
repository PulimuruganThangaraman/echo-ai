import React, { useState } from 'react'
import { Printer, Edit, Eye, CheckCircle2 } from 'lucide-react'

export default function FetalEchoTemplateReport({
  data = {},
  setData,
  patient = null,
  patientId = '',
  patients = [],
  visit = null,
  visitId = '',
  doctors = [],
  onNavigateTab = null,
  report = null,
}) {
  const [zoom, setZoom] = useState(100)

  // Merge sources: support both ClinicalWorkspace 'data' and FetalEchoReport 'report'
  const p = patient || (patients && patients.find((item) => String(item.id) === String(patientId))) || data.patient || {}
  const v = visit || data.visit || {}
  const d = report || data || {}

  // Helper resolvers
  const resolve = (...keys) => {
    for (const key of keys) {
      if (!key) continue
      if (typeof key === 'string' && key.includes('.')) {
        const parts = key.split('.')
        let cur = d
        for (const p of parts) {
          cur = cur?.[p]
        }
        if (cur !== undefined && cur !== null && String(cur).trim() !== '') return cur
      } else if (d[key] !== undefined && d[key] !== null && String(d[key]).trim() !== '') {
        return d[key]
      }
    }
    return ''
  }

  // Value empty check helper: distinguishes actual values (0, '0', false, 'No') from missing values
  const isEmptyValue = (val) => {
    if (val === undefined || val === null) return true
    if (typeof val === 'number') return false
    if (typeof val === 'boolean') return false
    const s = String(val).trim()
    return s === '' || s === '-' || s === '—'
  }

  // Value formatting helper: empty displays 'Not recorded', never false defaults
  const fmtValue = (val) => {
    if (isEmptyValue(val)) {
      return <span className="text-slate-400 font-normal italic text-[11px]">Not recorded</span>
    }
    return <span className="text-slate-900 font-medium">{String(val)}</span>
  }

  // Z-score formatting helper
  const fmtZ = (val) => {
    if (isEmptyValue(val)) {
      return <span className="text-slate-400 italic text-[11px]">Not recorded</span>
    }
    return <span className="font-semibold text-slate-800">{String(val)}</span>
  }

  // Comment formatting helper
  const fmtComment = (val) => {
    if (isEmptyValue(val)) return <span className="text-slate-400 italic text-[11px]">No comments</span>
    return <span className="text-slate-700 whitespace-pre-line text-xs">{String(val)}</span>
  }

  // Info / Admin metadata formatting helper
  const fmtInfo = (val, fallback = 'Not available') => {
    if (isEmptyValue(val)) {
      return <span className="text-slate-400 italic text-[11px]">{fallback}</span>
    }
    return <span className="text-slate-900">{String(val)}</span>
  }

  // Patient & Visit demographics
  const rawSalutation = p.salutation || ''
  const rawName = `${p.first_name || ''} ${p.last_name || ''}`.trim()
  const patientNameVal = (rawSalutation ? `${rawSalutation} ${rawName}` : rawName) || d.patientName || d.patient_name
  const patientName = isEmptyValue(patientNameVal) ? 'Not available' : patientNameVal

  const patientIdVal = p.patient_id || d.patientDisplayId || d.patient_id || patientId
  const resolvedPatientId = isEmptyValue(patientIdVal) ? 'Not available' : patientIdVal

  const rawAge = p.age || d.age
  const age = isEmptyValue(rawAge) ? 'Not available' : `${rawAge} ${p.age_unit || 'Years'}`
  const gender = isEmptyValue(p.gender || d.gender) ? 'Not available' : (p.gender || d.gender)
  const ageSex = (age !== 'Not available' && gender !== 'Not available')
    ? `${age} / ${gender}`
    : (age !== 'Not available' ? age : (gender !== 'Not available' ? gender : 'Not available'))

  const visitNoVal = v.visit_no || v.id || visitId || d.visitNo || d.visit_no
  const visitNo = isEmptyValue(visitNoVal) ? 'Not available' : visitNoVal

  let visitDate = 'Not available'
  const rawDate = v.visit_date || d.visitDate || d.visit_date || d.created_at
  if (!isEmptyValue(rawDate)) {
    try {
      const parsed = new Date(rawDate)
      if (!isNaN(parsed.getTime())) {
        visitDate = parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      } else {
        visitDate = String(rawDate).split('T')[0]
      }
    } catch (e) {
      visitDate = String(rawDate)
    }
  }

  const refByVal = v.referral_doctor || p.referred_by || p.family_doctor || d.referredBy || d.referral_doctor
  const referredBy = isEmptyValue(refByVal) ? 'Not available' : refByVal

  // Pregnancy / LMP details
  const lmpDateVal = resolve('lmp', 'lmp.lmp_date')
  const lmpDate = isEmptyValue(lmpDateVal) ? 'Not available' : lmpDateVal

  const eddVal = resolve('edd', 'lmp.edd')
  const edd = isEmptyValue(eddVal) ? 'Not available' : eddVal

  const gaWeeks = resolve('gaWeeks', 'ga_weeks')
  const gaDays = resolve('gaDays', 'ga_days')
  let ga = 'Not available'
  if (!isEmptyValue(gaWeeks)) {
    ga = `${gaWeeks} Weeks${!isEmptyValue(gaDays) ? ` ${gaDays} Days` : ''}`
  } else if (!isEmptyValue(resolve('ga'))) {
    ga = resolve('ga')
  }

  const fetusVal = resolve('fetuses', 'no_of_fetuses', 'lmp.no_of_fetuses')
  const fetusInfo = isEmptyValue(fetusVal) ? 'Not available' : fetusVal

  const indicationVal = resolve('indication', 'report.indication') || v.notes
  const indication = isEmptyValue(indicationVal) ? 'Not recorded' : indicationVal

  // Section 1: Echo Details Subsections
  const echoPosition = [
    { label: 'Cardiac Position', val: resolve('cardiacPosition', 'echo_details.general.cardiac_views', 'cardiac_views'), comment: resolve('cardiacPositionComment', 'echo_details.general.cardiac_position_comment') },
    { label: 'Situs', val: resolve('situs', 'abdominalSitus', 'echo_details.general.situs'), comment: resolve('situsComment', 'echo_details.general.situs_comment') },
    { label: 'Systemic Venous Connection', val: resolve('systemicVenous', 'echo_details.others.systemic_veins', 'echo_details.others.systemic_venous_return'), comment: resolve('systemicVenousComment') },
    { label: 'Pulmonary Venous Connection', val: resolve('pulmonaryVenous', 'echo_details.others.pulmonary_veins', 'echo_details.others.pulmonary_venous_return'), comment: resolve('pulmonaryVenousComment') },
    { label: 'Atrio-ventricular Connection', val: resolve('avConnection', 'echo_details.four_chamber.atrioventricular_junction', 'echo_details.four_chamber.av_junction'), comment: resolve('avConnectionComment') },
    { label: 'Ventriculo-arterial Connection', val: resolve('vaConnection', 'echo_details.outflow_tract.va_valve_regurgitation', 'echo_details.outflow_tract.outflow_tracts'), comment: resolve('vaConnectionComment') },
    { label: 'Great Artery Relationship', val: resolve('greatArteries', 'greatArteryRelationship', 'echo_details.outflow_tract.great_artery_relationship'), comment: resolve('greatArteriesComment', 'greatArteryRelationshipComment') },
  ]

  const echoAtriaSepta = [
    { label: 'Atria', val: resolve('atria', 'echo_details.four_chamber.atria'), comment: resolve('atriaComment') },
    { label: 'Interatrial Septum', val: resolve('interatrialSeptum', 'echo_details.four_chamber.interatrial_septum'), comment: resolve('interatrialSeptumComment') },
    { label: 'Foramen Ovale', val: resolve('foramenOvale', 'echo_details.four_chamber.foramen_ovale'), comment: resolve('foramenOvaleComment') },
    { label: 'Interventricular Septum', val: resolve('interventricularSeptum', 'echo_details.four_chamber.interventricular_septum'), comment: resolve('interventricularSeptumComment') },
  ]

  const echoValves = [
    { label: 'Tricuspid Valve', val: resolve('tricuspidValve', 'echo_details.four_chamber.tricuspid_valve'), comment: resolve('tricuspidValveComment') },
    { label: 'TR', val: resolve('tricuspidRegurgitation', 'tr'), comment: resolve('tricuspidRegurgitationComment', 'trComment') },
    { label: 'Mitral Valve', val: resolve('mitralValve', 'echo_details.four_chamber.mitral_valve'), comment: resolve('mitralValveComment') },
    { label: 'MR', val: resolve('mitralRegurgitation', 'mr'), comment: resolve('mitralRegurgitationComment', 'mrComment') },
    { label: 'Aortic Valve', val: resolve('aorticValve', 'echo_details.outflow_tract.aortic_valve'), comment: resolve('aorticValveComment') },
    { label: 'AR', val: resolve('aorticRegurgitation', 'ar'), comment: resolve('aorticRegurgitationComment', 'arComment') },
    { label: 'AS', val: resolve('aorticStenosis', 'as'), comment: resolve('aorticStenosisComment', 'asComment') },
    { label: 'Pulmonary Valve', val: resolve('pulmonaryValve', 'echo_details.outflow_tract.pulmonary_valve'), comment: resolve('pulmonaryValveComment') },
    { label: 'PR', val: resolve('pulmonaryRegurgitation', 'pr'), comment: resolve('pulmonaryRegurgitationComment', 'prComment') },
    { label: 'PS', val: resolve('pulmonaryStenosis', 'ps'), comment: resolve('pulmonaryStenosisComment', 'psComment') },
  ]

  const echoVentricles = [
    { label: 'Right Ventricle', val: resolve('rightVentricle', 'echo_details.four_chamber.right_ventricle'), comment: resolve('rightVentricleComment') },
    { label: 'RV Contractility', val: resolve('rvContractility'), comment: resolve('rvContractilityComment') },
    { label: 'Left Ventricle', val: resolve('leftVentricle', 'echo_details.four_chamber.left_ventricle'), comment: resolve('leftVentricleComment') },
    { label: 'LV Contractility', val: resolve('lvContractility'), comment: resolve('lvContractilityComment') },
    { label: 'Regional Wall Motion', val: resolve('wallMotion', 'regionalWallMotion'), comment: resolve('wallMotionComment', 'regionalWallMotionComment') },
    { label: 'Diastolic Function', val: resolve('diastolicFunction'), comment: resolve('diastolicFunctionComment') },
  ]

  const echoGreatArteries = [
    { label: 'Great Artery Relationship', val: resolve('greatArteryRelationship', 'greatArteries'), comment: resolve('greatArteryRelationshipComment', 'greatArteriesComment') },
    { label: 'Ascending Aorta', val: resolve('ascendingAorta'), comment: resolve('ascendingAortaComment') },
    { label: 'Main Pulmonary Artery', val: resolve('mainPulmonaryArtery', 'echo_details.outflow_tract.main_pulmonary_artery'), comment: resolve('mainPulmonaryArteryComment') },
    { label: 'Branch Pulmonary Arteries', val: resolve('branchPulmonaryArteries', 'echo_details.outflow_tract.branch_pulmonary_artery', 'echo_details.outflow_tract.branch_pas'), comment: resolve('branchPulmonaryArteriesComment') },
    { label: 'Coronaries', val: resolve('coronaries'), comment: resolve('coronariesComment') },
  ]

  const echoArches = [
    { label: 'Aortic Arch', val: resolve('aorticArch', 'echo_details.outflow_tract.aortic_arch'), comment: resolve('aorticArchComment') },
    { label: 'Descending Aorta', val: resolve('descendingAorta'), comment: resolve('descendingAortaComment') },
    { label: 'Ductus Arteriosus', val: resolve('ductusArteriosus', 'echo_details.outflow_tract.ductus_arteriosus'), comment: resolve('ductusArteriosusComment') },
  ]

  const echoPericardium = [
    { label: 'Pericardium / Effusion', val: resolve('pericardium', 'echo_details.general.pericardial_effusion'), comment: resolve('pericardiumComment') },
    { label: 'Pleural Effusion', val: resolve('pleuralEffusion'), comment: resolve('pleuralEffusionComment') },
  ]

  // Optional/Extended fields if recorded
  const echoExtended = [
    { label: 'Abdominal Situs', val: resolve('abdominalSitus', 'echo_details.general.abdominal_situs'), comment: resolve('abdominalSitusComment') },
    { label: 'Stomach Position', val: resolve('stomach', 'stomachPosition', 'echo_details.general.stomach'), comment: resolve('stomachComment') },
    { label: 'Heart Size', val: resolve('heartSize', 'echo_details.general.heart_size'), comment: resolve('heartSizeComment') },
    { label: 'Apex', val: resolve('apex', 'echo_details.general.apex'), comment: resolve('apexComment') },
    { label: 'Cardiac Axis', val: resolve('cardiacAxis', 'echo_details.general.cardiac_axis'), comment: resolve('cardiacAxisComment') },
    { label: 'Cardiac Rhythm', val: resolve('rhythm', 'cardiacRhythm', 'echo_details.general.rhythm'), comment: resolve('rhythmComment') },
    { label: 'FHR', val: resolve('fhr', 'echo_details.general.fhr', 'heartRate'), comment: resolve('fhrComment') },
    { label: 'AV Conduction', val: resolve('avConduction', 'echo_details.general.av_conduction'), comment: resolve('avConductionComment') },
    { label: 'Side of Aortic Arch', val: resolve('sideOfArch', 'sideOfAorticArch', 'echo_details.outflow_tract.side_of_arch'), comment: resolve('sideOfArchComment') },
    { label: '3VV', val: resolve('threeVesselView', 'threeVessel', '3vv', 'echo_details.outflow_tract.three_vessel_view'), comment: resolve('threeVesselComment') },
    { label: '3VT View', val: resolve('threeVTView', 'threeVT', '3vtView', 'echo_details.outflow_tract.three_vt_view'), comment: resolve('threeVTComment') },
    { label: 'Other Lesions', val: resolve('otherLesions', 'echo_details.others.other_lesions'), comment: resolve('otherLesionsComment') },
  ].filter(item => item.val || item.comment)

  const additionalComments = resolve('comments', 'additionalComments', 'echo_details.general.additional_comments')
  const normalComments = resolve('normalComments', 'defaultNormalComments')

  // Section 2: Biometry Measurements (All 23 fields)
  const biometryList = [
    { label: 'BPD (mm)', val: resolve('bpd'), z: resolve('bpdZScore') },
    { label: 'Head Circumference (mm)', val: resolve('hc'), z: resolve('hcZScore') },
    { label: 'Abdominal Circumference (mm)', val: resolve('ac'), z: resolve('acZScore') },
    { label: 'Femur Length (mm)', val: resolve('fl'), z: resolve('flZScore') },
    { label: 'Estimated Fetal Weight (g)', val: resolve('efw'), z: resolve('efwZScore') },
    { label: 'Fetal Heart Rate (bpm)', val: resolve('heartRate', 'fhr'), z: resolve('heartRateZScore', 'fhrZScore') },
    { label: 'Heart Area (cm²)', val: resolve('heartArea'), z: resolve('heartAreaZScore') },
    { label: 'Thorax Area (cm²)', val: resolve('thoraxArea'), z: resolve('thoraxAreaZScore') },
    { label: 'Cardiothoracic Ratio', val: resolve('ctRatio', 'biometry.b_mode.cc_tc'), z: resolve('ctRatioZScore') },
    { label: 'Cardiac Circumference (cm)', val: resolve('cardiacCircumference', 'biometry.b_mode.cardiac_circumference'), z: resolve('cardiacCircumferenceZScore') },
    { label: 'Thoracic Circumference (cm)', val: resolve('thoracicCircumference', 'biometry.b_mode.thoracic_circumference'), z: resolve('thoracicCircumferenceZScore') },
    { label: 'Mitral Valve Annulus (mm)', val: resolve('mvAnnulus', 'biometry.b_mode.mitral_valve'), z: resolve('mvAnnulusZScore') },
    { label: 'Tricuspid Valve Annulus (mm)', val: resolve('tvAnnulus', 'biometry.b_mode.tricuspid_valve'), z: resolve('tvAnnulusZScore') },
    { label: 'Aortic Valve Annulus (mm)', val: resolve('avAnnulus', 'biometry.b_mode.aortic_valve'), z: resolve('avAnnulusZScore') },
    { label: 'Pulmonary Valve Annulus (mm)', val: resolve('pvAnnulus', 'biometry.b_mode.pulmonary_valve'), z: resolve('pvAnnulusZScore') },
    { label: 'Right Atrial Width (mm)', val: resolve('raWidth', 'biometry.b_mode.right_atrial_width'), z: resolve('raWidthZScore') },
    { label: 'Right Atrial Length (mm)', val: resolve('raLength', 'biometry.b_mode.right_atrial_length'), z: resolve('raLengthZScore') },
    { label: 'Left Atrial Width (mm)', val: resolve('laWidth', 'biometry.b_mode.left_atrial_width'), z: resolve('laWidthZScore') },
    { label: 'Left Atrial Length (mm)', val: resolve('laLength', 'biometry.b_mode.left_atrial_length'), z: resolve('laLengthZScore') },
    { label: 'Right Ventricular Width (mm)', val: resolve('rvWidth', 'biometry.b_mode.right_ventricular_width'), z: resolve('rvWidthZScore') },
    { label: 'Left Ventricular Width (mm)', val: resolve('lvWidth', 'biometry.b_mode.left_ventricular_width'), z: resolve('lvWidthZScore') },
    { label: 'Aortic Isthmus (mm)', val: resolve('aorticIsthmus', 'biometry.b_mode.aortic_isthmus'), z: resolve('aorticIsthmusZScore') },
    { label: 'Ductal Arch (mm)', val: resolve('ductalArch', 'biometry.b_mode.ductus_arteriosus'), z: resolve('ductalArchZScore') },
  ]

  // Section 3: Doppler Measurements (All 13 fields)
  const dopplerList = [
    { label: 'Mitral E (cm/s)', val: resolve('mvE', 'doppler.valves.mitral_e_wave') },
    { label: 'Mitral A (cm/s)', val: resolve('mvA', 'doppler.valves.mitral_a_wave') },
    { label: 'Tricuspid E (cm/s)', val: resolve('tvE', 'doppler.valves.tricuspid_e_wave') },
    { label: 'Tricuspid A (cm/s)', val: resolve('tvA', 'doppler.valves.tricuspid_a_wave') },
    { label: 'Aortic Valve Vmax (cm/s)', val: resolve('avVmax', 'doppler.valves.aortic_valve_psv') },
    { label: 'Pulmonary Valve Vmax (cm/s)', val: resolve('pvVmax', 'doppler.valves.pulmonary_valve_psv') },
    { label: 'Ductus Arteriosus Vmax (cm/s)', val: resolve('ductusVmax', 'doppler.valves.ductus_arteriosus_pi', 'doppler.valves.ductus_arteriosus_peak_velocity') },
    { label: 'Umbilical Artery PI', val: resolve('umbilicalPi') },
    { label: 'Umbilical Artery RI', val: resolve('umbilicalRi') },
    { label: 'Middle Cerebral Artery PI', val: resolve('mcaPi') },
    { label: 'Middle Cerebral Artery RI', val: resolve('mcaRi') },
    { label: 'Ductus Venosus PI', val: resolve('dvPi', 'doppler.venous.dv_pi') },
    { label: 'Inferior Vena Cava PI', val: resolve('ivcPi', 'doppler.venous.inferior_vena_cava_pi') },
  ]

  // Section 4: Impression Details
  const reportType = resolve('reportType', 'report_type') || 'Normal'
  const firstLine = resolve('firstLine', 'first_line')
  const primaryConsultant = resolve('primaryConsultant', 'primary_consultant') || 'DR C.SHANTHI'
  const secondConsultant = resolve('secondConsultant', 'second_consultant')
  const signedByLeft = resolve('signedByLeft', 'signed_by_left')
  const signedByRight = resolve('signedByRight', 'signed_by_right')
  const auditDone = resolve('auditDone', 'audit_done') || 'No'
  const reportDone = resolve('reportDone', 'report_done') || (d.reportCompleted ? 'Completed' : 'In progress')
  const auditedBy = resolve('auditedBy', 'audited_by')
  const typedBy = resolve('typedBy', 'report_typed_by')

  const headerComments = resolve('headerComments', 'header_comments')
  const footerComments = resolve('footerComments', 'footer_comments')
  const finalImpression = resolve('impression', 'final_impression', 'conclusion')
  const recommendations = resolve('recommendations')
  const disclaimer = resolve('disclaimer', 'disclaimerComments') ||
    'Limitation of Fetal Echocardiography is to be understood as intention of Fetal Echo is to rule out major cardiac defects and minor or evolving anomalies may not be detected. Sometimes it may not be possible to see certian types of holes or valve problems in fetal life. In addition heart rate/ rhythm problems or heart muscle diseases usually evolve during late gestation when second trimester scan may not show such abnormality.'

  const doctorRegistration = 'PCPNDT registration number PNA / 10047 / 2024.'

  return (
    <div className="w-full bg-slate-100/60 py-4 print:py-0 print:bg-white text-slate-800 font-sans">
      {/* Dynamic Report Toolbar - Hidden during print */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">Complete Fetal Echocardiography Report</h2>
            <p className="text-[11px] text-slate-500">Full Dynamic Multi-Tab Preview &bull; 100% Width Layout</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateTab && (
            <div className="flex items-center gap-1.5 mr-2">
              <button
                type="button"
                onClick={() => onNavigateTab('Echo details')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-teal-700 transition"
              >
                <Edit className="h-3 w-3" />
                Echo Details
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('Biometry')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-teal-700 transition"
              >
                <Edit className="h-3 w-3" />
                Biometry
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('Doppler')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-teal-700 transition"
              >
                <Edit className="h-3 w-3" />
                Doppler
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('Impression')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-teal-700 transition"
              >
                <Edit className="h-3 w-3" />
                Impression
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 cursor-pointer"
            title="Print or Save as PDF (Ctrl + P)"
          >
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Main Full-Width Report Sheet */}
      <div
        className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-10 print:p-0 print:border-none print:shadow-none print:rounded-none mx-auto"
        style={{
          boxSizing: 'border-box',
        }}
      >
        {/* REPORT TITLE */}
        <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 uppercase">
            Fetal Echocardiography Report
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">
            CLINICAL CARDIOVASCULAR ASSESSMENT &bull; COMPREHENSIVE MULTI-PARAMETRIC EVALUATION
          </p>
        </div>

        {/* PATIENT & PREGNANCY INFORMATION BOX */}
        <div className="mb-8 rounded-lg border border-slate-300 bg-slate-50/60 p-4 sm:p-5 avoid-break">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 text-xs sm:text-sm">
            {/* Left Column: Patient & Visit */}
            <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-6">
              <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wider mb-1">
                Patient & Visit Identification
              </div>
              <div className="grid grid-cols-[120px_1fr] items-baseline">
                <span className="font-semibold text-slate-600">Patient Name:</span>
                <span className="font-bold text-slate-900 uppercase">{patientName}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-baseline">
                <span className="font-semibold text-slate-600">Patient ID:</span>
                <span className="font-mono font-medium text-slate-900">{resolvedPatientId}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-baseline">
                <span className="font-semibold text-slate-600">Age / Gender:</span>
                <span className="text-slate-900">{ageSex}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-baseline">
                <span className="font-semibold text-slate-600">Visit Number:</span>
                <span className="text-slate-900">{visitNo}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-baseline">
                <span className="font-semibold text-slate-600">Visit Date:</span>
                <span className="font-medium text-slate-900">{visitDate}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-baseline">
                <span className="font-semibold text-slate-600">Referring Doctor:</span>
                <span className="font-medium text-slate-900">{referredBy}</span>
              </div>
            </div>

            {/* Right Column: Pregnancy / LMP */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wider mb-1">
                Pregnancy & Gestational Information
              </div>
              <div className="grid grid-cols-[130px_1fr] items-baseline">
                <span className="font-semibold text-slate-600">LMP Date:</span>
                <span className="font-medium text-slate-900">{lmpDate}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr] items-baseline">
                <span className="font-semibold text-slate-600">EDD:</span>
                <span className="font-medium text-slate-900">{edd}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr] items-baseline">
                <span className="font-semibold text-slate-600">Gestational Age:</span>
                <span className="font-bold text-slate-900">{ga}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr] items-baseline">
                <span className="font-semibold text-slate-600">Fetus Information:</span>
                <span className="text-slate-900">{fetusInfo}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr] items-baseline">
                <span className="font-semibold text-slate-600">Indication:</span>
                <span className="font-medium text-slate-900">{indication}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. ECHO DETAILS                                                           */}
        {/* ========================================================================= */}
        <section className="mb-10">
          <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-950 uppercase tracking-wide">
              1. Echo Details
            </h2>
          </div>

          <div className="space-y-6">
            {/* 1.1 Position, Situs and Connections */}
            <EchoSubsection title="1.1 Position, Situs and Connections" items={echoPosition} />

            {/* 1.2 Atria and Septa */}
            <EchoSubsection title="1.2 Atria and Septa" items={echoAtriaSepta} />

            {/* 1.3 Valves */}
            <EchoSubsection title="1.3 Valves" items={echoValves} />

            {/* 1.4 Ventricles and Function */}
            <EchoSubsection title="1.4 Ventricles and Function" items={echoVentricles} />

            {/* 1.5 Great Arteries & Outflow Tracts */}
            <EchoSubsection title="1.5 Great Arteries & Outflow Tracts" items={echoGreatArteries} />

            {/* 1.6 Aortic & Ductal Arches */}
            <EchoSubsection title="1.6 Aortic & Ductal Arches" items={echoArches} />

            {/* 1.7 Pericardium & Effusions */}
            <EchoSubsection title="1.7 Pericardium & Effusions" items={echoPericardium} />

            {/* Extended fields if recorded */}
            {echoExtended.length > 0 && (
              <EchoSubsection title="Additional Targeted Fetal Echo Views" items={echoExtended} />
            )}

            {/* 1.8 Additional Details / Narrative Comments */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 avoid-break">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 border-b border-slate-100 pb-1.5">
                1.8 Additional Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded border border-slate-100 bg-slate-50/50 p-3">
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">Additional Comments:</div>
                  {!isEmptyValue(additionalComments) ? (
                    <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">{additionalComments}</div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">No comments</div>
                  )}
                </div>
                <div className="rounded border border-slate-100 bg-slate-50/50 p-3">
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">Default Normal Comments:</div>
                  {!isEmptyValue(normalComments) ? (
                    <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">{normalComments}</div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">No comments</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. BIOMETRY                                                               */}
        {/* ========================================================================= */}
        <section className="mb-10 avoid-break">
          <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-950 uppercase tracking-wide">
              2. Biometry
            </h2>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Fetal cardiac and thoracic biometric measurements with corresponding standard deviation (Z-scores) relative to gestational age.
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-800 font-bold uppercase text-[11px]">
                  <th className="py-2 px-3 w-12 text-center">#</th>
                  <th className="py-2 px-4">Measurement</th>
                  <th className="py-2 px-4 w-44">Measured Value</th>
                  <th className="py-2 px-4 w-36">Z-Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {biometryList.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2 px-4 font-medium text-slate-900">{item.label}</td>
                    <td className="py-2 px-4 font-mono">{fmtValue(item.val)}</td>
                    <td className="py-2 px-4 font-mono">{fmtZ(item.z)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. DOPPLER                                                                */}
        {/* ========================================================================= */}
        <section className="mb-10 avoid-break">
          <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-950 uppercase tracking-wide">
              3. Doppler
            </h2>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Pulsed-wave and color Doppler hemodynamic flow velocity measurements and pulsatility / resistive indices.
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-800 font-bold uppercase text-[11px]">
                  <th className="py-2 px-3 w-12 text-center">#</th>
                  <th className="py-2 px-4">Doppler Parameter</th>
                  <th className="py-2 px-4 w-52">Measured Velocity / Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dopplerList.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2 px-4 font-medium text-slate-900">{item.label}</td>
                    <td className="py-2 px-4 font-mono">{fmtValue(item.val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. IMPRESSION                                                             */}
        {/* ========================================================================= */}
        <section className="mb-8 avoid-break">
          <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-950 uppercase tracking-wide">
              4. Impression
            </h2>
          </div>

          {/* 4.1 Report & Administrative Details */}
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wide mb-3 border-b border-slate-200 pb-1">
              Report Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Type of Report:</span>
                <span className="font-semibold text-slate-900">{reportType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">First Line of Report:</span>
                {fmtInfo(firstLine, 'Not recorded')}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Primary Consultant:</span>
                <span className="font-bold text-slate-900">{fmtInfo(primaryConsultant, 'Not available')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Second Consultant:</span>
                {fmtInfo(secondConsultant, 'Not available')}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Report Signed By (L):</span>
                {fmtInfo(signedByLeft, 'Not available')}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Report Signed By (R):</span>
                {fmtInfo(signedByRight, 'Not available')}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Audit Done:</span>
                <span className="text-slate-800">{auditDone}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Report Done:</span>
                <span className="font-semibold text-slate-900">{reportDone}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Audited By:</span>
                {fmtInfo(auditedBy, 'Not available')}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Report Typed By:</span>
                {fmtInfo(typedBy, 'Not available')}
              </div>
            </div>
          </div>

          {/* Header Comments */}
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">Header Comments:</div>
            {!isEmptyValue(headerComments) ? (
              <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">{headerComments}</div>
            ) : (
              <div className="text-xs text-slate-400 italic">No comments</div>
            )}
          </div>

          {/* Final Impression & Recommendations */}
          <div className="space-y-4 mb-6">
            <div className="rounded-lg border-2 border-slate-800 bg-white p-4 sm:p-5">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-teal-700" />
                Final Impression:
              </div>
              <div className="text-xs sm:text-sm text-slate-900 font-semibold whitespace-pre-line leading-relaxed">
                {!isEmptyValue(finalImpression) ? (
                  finalImpression
                ) : (
                  <span className="text-slate-400 font-normal italic text-xs">Not recorded</span>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-bold text-slate-700 uppercase mb-1">Recommendations:</div>
              {!isEmptyValue(recommendations) ? (
                <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">{recommendations}</div>
              ) : (
                <div className="text-xs text-slate-400 italic">No recommendations</div>
              )}
            </div>

            {footerComments ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">Footer Comments:</div>
                {!isEmptyValue(footerComments) ? (
                  <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">{footerComments}</div>
                ) : (
                  <div className="text-xs text-slate-400 italic">No comments</div>
                )}
              </div>
            ) : null}
          </div>

          {/* Doctor Signature, Qualifications & Statutory Registration */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-6 items-end avoid-break">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">
                Disclaimer
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed text-justify">
                {disclaimer}
              </p>
              <div className="mt-2 text-xs font-bold text-slate-900">
                {doctorRegistration}
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <div
                className="font-serif italic text-2xl text-slate-800 tracking-wider mb-1 select-none"
                style={{ fontFamily: 'Georgia, "Brush Script MT", cursive' }}
              >
                Dr. Shanthi
              </div>
              <div className="text-xs font-bold text-slate-950 uppercase">
                {primaryConsultant || 'DR C.SHANTHI'}
              </div>
              <div className="text-[11px] font-medium text-slate-600">
                MBBS, DCH, DNB(PED) FNB(PED CARDIO)
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Senior Consultant Fetal Cardiologist
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Print CSS rules */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  )
}

function EchoSubsection({ title, items }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden avoid-break">
      <div className="bg-slate-100/70 border-b border-slate-200 px-3.5 py-2">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/50">
              <th className="py-1.5 px-3.5 w-1/3">Parameter</th>
              <th className="py-1.5 px-3.5 w-1/4">Finding</th>
              <th className="py-1.5 px-3.5 w-5/12">Comments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                <td className="py-2 px-3.5 font-medium text-slate-900">{item.label}</td>
                <td className="py-2 px-3.5">{fmtEchoVal(item.val)}</td>
                <td className="py-2 px-3.5">{fmtEchoComment(item.comment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function fmtEchoVal(val) {
  if (val === undefined || val === null) {
    return <span className="text-slate-400 italic text-[11px]">Not recorded</span>
  }
  const str = String(val).trim()
  if (str === '' || str === '-' || str === '—') {
    return <span className="text-slate-400 italic text-[11px]">Not recorded</span>
  }
  const isAbnormal = str.toLowerCase() === 'abnormal'
  return (
    <span className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] ${
      isAbnormal ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'text-slate-800'
    }`}>
      {str}
    </span>
  )
}

function fmtEchoComment(val) {
  if (val === undefined || val === null) {
    return <span className="text-slate-400 italic text-[11px]">No comments</span>
  }
  const str = String(val).trim()
  if (str === '' || str === '-' || str === '—') {
    return <span className="text-slate-400 italic text-[11px]">No comments</span>
  }
  return <span className="text-slate-700 whitespace-pre-line text-xs">{String(val)}</span>
}
