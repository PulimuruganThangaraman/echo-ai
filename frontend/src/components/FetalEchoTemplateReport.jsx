import { useMemo } from 'react'
import { Check, Printer, RotateCcw } from 'lucide-react'

const NORMAL_VALUES = {
  quality: 'Optimal',
  abdominalSitus: 'Solitus',
  cardiacSitus: 'Solitus',
  cardiacPosition: 'Levocardia',
  cardiacAxis: 'Normal',
  systemicVein: 'Normal',
  systemicVeinSpec: '',
  pulmonaryVeins: 'Normal (2 to LA)',
  leftAtrium: 'Normal',
  rightAtrium: 'Normal',
  interatrialSeptum: 'Normal',
  foramenOvaleFlap: 'Normal (in LA)',
  avJunction: 'Normal',
  avConnection: 'Concordant',
  tricuspidValveSize: 'Norm',
  tricuspidValveLeaflets: 'Norm',
  tricuspidValveSpec: '',
  mitralValveSize: 'Norm',
  mitralValveLeaflets: 'Norm',
  mitralValveSpec: '',
  rvSize: 'Norm',
  rvContractility: 'Norm',
  lvSize: 'Norm',
  lvContractility: 'Norm',
  ivs: 'Intact',
  vaConnection: 'Concordant',
  aorticValve: 'Normal',
  aortaSize: 'Normal',
  aortaPos: 'Norm',
  pulmonaryValve: 'Normal',
  mpaSize: 'Normal',
  mpaPos: 'Norm',
  branchPulmArt: 'Confluent',
  branchPulmArtRpa: 'Normal',
  aorticArchPos: 'Left',
  aorticArchSize: 'Normal',
  ductalArchPos: 'Left',
  ductalArchSize: 'Normal',
  tvFlowPattern: 'Biphasic',
  mvFlowPattern: 'Biphasic',
  lvotFlowPattern: 'Normal',
  rvotFlowPattern: 'Normal',
  ductusArteriosusFlowPattern: 'Normal',
  ductusVenosusFlowPattern: 'Normal',
  pulmonaryVenousFlowPattern: 'Normal',
  foramenOvaleShuntFlowPattern: 'Rt to Lt',
  fhrRate: '137',
  fhrRateStatus: 'Normal',
  fhrRhythm: 'Regular (1:1)',
  impression: 'NORMAL SITUS AND LEVOCARDIA. NORMAL SEGMENTAL ANATOMY. NO MAJOR ANOMALY DETECTED. NORMAL RATE AND RHYTHM. NORMAL FLOW PATTERN.',
}

const CLEARED_VALUES = {
  quality: '',
  abdominalSitus: '',
  cardiacSitus: '',
  cardiacPosition: '',
  cardiacAxis: '',
  systemicVein: '',
  systemicVeinSpec: '',
  pulmonaryVeins: '',
  leftAtrium: '',
  rightAtrium: '',
  interatrialSeptum: '',
  foramenOvaleFlap: '',
  avJunction: '',
  avConnection: '',
  tricuspidValveSize: '',
  tricuspidValveLeaflets: '',
  tricuspidValveSpec: '',
  mitralValveSize: '',
  mitralValveLeaflets: '',
  mitralValveSpec: '',
  rvSize: '',
  rvContractility: '',
  lvSize: '',
  lvContractility: '',
  ivs: '',
  vaConnection: '',
  aorticValve: '',
  aortaSize: '',
  aortaPos: '',
  pulmonaryValve: '',
  mpaSize: '',
  mpaPos: '',
  branchPulmArt: '',
  branchPulmArtRpa: '',
  aorticArchPos: '',
  aorticArchSize: '',
  ductalArchPos: '',
  ductalArchSize: '',
  tvFlowPattern: '',
  mvFlowPattern: '',
  lvotFlowPattern: '',
  rvotFlowPattern: '',
  ductusArteriosusFlowPattern: '',
  ductusVenosusFlowPattern: '',
  pulmonaryVenousFlowPattern: '',
  foramenOvaleShuntFlowPattern: '',
  fhrRate: '',
  fhrRateStatus: '',
  fhrRhythm: '',
  impression: '',
}

export default function FetalEchoTemplateReport({ data = {}, setData, patient }) {
  const patientName = patient
    ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
    : data.patientName || ''
  const ageId = patient
    ? `${patient.age ? `${patient.age} Y` : ''} / ${patient.patient_id || ''}`.trim().replace(/^\/\s*/, '')
    : data.ageId || ''
  const refBy = patient?.family_doctor || patient?.referral_doctor || data.refBy || ''
  const lmpVal = data.lmp || ''
  const eddVal = data.edd || ''
  const gaVal = data.gaWeeks
    ? `${data.gaWeeks} wks${data.gaDays ? ` ${data.gaDays} d` : ''}`
    : data.ga || ''
  const indicationVal = data.indication || ''

  // Biometry values
  const mvVal = data.mitralValve || data.mvAnnulus || data.bioMv || ''
  const mvZ = data.mitralValveZ || data.bioMvZ || ''
  const tvVal = data.tricuspidValve || data.tvAnnulus || data.bioTv || ''
  const tvZ = data.tricuspidValveZ || data.bioTvZ || ''
  const aoVal = data.aorticValve || data.aoAnnulus || data.bioAo || ''
  const aoZ = data.aorticValveZ || data.bioAoZ || ''
  const pvVal = data.pulmonaryValve || data.pvAnnulus || data.bioPv || ''
  const pvZ = data.pulmonaryValveZ || data.bioPvZ || ''

  // RV/LV Ratio
  const rvLvRatio = useMemo(() => {
    const tvNum = parseFloat(tvVal)
    const mvNum = parseFloat(mvVal)
    if (!isNaN(tvNum) && !isNaN(mvNum) && mvNum > 0) {
      return (tvNum / mvNum).toFixed(2)
    }
    return '0.00'
  }, [tvVal, mvVal])

  const update = (key, val) => {
    if (setData) {
      setData((prev) => ({ ...prev, [key]: val }))
    }
  }

  const handleFillNormal = () => {
    if (setData) {
      setData((prev) => ({ ...prev, ...NORMAL_VALUES }))
    }
  }

  const handleClear = () => {
    if (setData) {
      setData((prev) => ({ ...prev, ...CLEARED_VALUES }))
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const Radio = ({ name, value, label, current, onChange }) => {
    const isChecked = String(current || '').toLowerCase() === String(value).toLowerCase()
    return (
      <label className="inline-flex items-center gap-1 cursor-pointer text-slate-800 text-[11px] font-normal select-none">
        <input
          type="radio"
          name={name}
          checked={isChecked}
          onChange={() => onChange(value)}
          className="h-3 w-3 text-slate-800 accent-[#1e2d42] cursor-pointer"
        />
        <span>{label || value}</span>
      </label>
    )
  }

  return (
    <div className="w-full flex justify-center py-4 bg-slate-100/70 print:bg-white print:py-0">
      <div className="w-full max-w-[880px] bg-white border border-slate-300 rounded shadow-md p-6 text-[11.5px] leading-snug text-slate-900 print:border-none print:shadow-none print:p-0 print:max-w-none">
        
        {/* Title Header */}
        <div className="text-center border-b-2 border-[#1e2d42] pb-2 mb-3">
          <h1 className="text-lg font-bold uppercase tracking-wider text-[#1e2d42] m-0">
            Fetal Echocardiography Report
          </h1>
        </div>

        {/* Action Buttons (Screen Only) */}
        <div className="flex items-center justify-between gap-2 mb-3 print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillNormal}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer transition"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              Fill Normal Scan
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 cursor-pointer transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Form
            </button>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded bg-[#1e2d42] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 cursor-pointer transition"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Save as PDF
          </button>
        </div>

        {/* Patient Demographics Box */}
        <div className="border border-slate-300 rounded p-2.5 mb-2.5 bg-slate-50/50 space-y-1.5">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 whitespace-nowrap">Patient Name:</span>
              <input
                type="text"
                value={patientName}
                onChange={(e) => update('patientName', e.target.value)}
                className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 whitespace-nowrap">Age / ID:</span>
              <input
                type="text"
                value={ageId}
                onChange={(e) => update('ageId', e.target.value)}
                className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 whitespace-nowrap">Ref By:</span>
              <input
                type="text"
                value={refBy}
                onChange={(e) => update('refBy', e.target.value)}
                className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 whitespace-nowrap">LMP:</span>
              <input
                type="text"
                value={lmpVal}
                onChange={(e) => update('lmp', e.target.value)}
                className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 whitespace-nowrap">EDD:</span>
              <input
                type="text"
                value={eddVal}
                onChange={(e) => update('edd', e.target.value)}
                className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 whitespace-nowrap">GA:</span>
              <input
                type="text"
                value={gaVal}
                onChange={(e) => update('ga', e.target.value)}
                className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                placeholder="wks/d"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-0.5">
            <div className="flex-1 flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 whitespace-nowrap">Indication:</span>
              <input
                type="text"
                value={indicationVal}
                onChange={(e) => update('indication', e.target.value)}
                className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
              />
            </div>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-300">
              <span className="font-semibold text-slate-700 whitespace-nowrap">Quality:</span>
              <Radio
                name="quality"
                value="Optimal"
                current={data.quality || 'Optimal'}
                onChange={(v) => update('quality', v)}
              />
              <Radio
                name="quality"
                value="Suboptimal"
                current={data.quality}
                onChange={(v) => update('quality', v)}
              />
            </div>
          </div>
        </div>

        {/* 1. Structure, Situs & Position */}
        <div className="bg-[#1e2d42] text-white font-bold text-[11px] px-2.5 py-1 tracking-wide mt-2">
          1. Structure, Situs & Position
        </div>
        <table className="w-full border-collapse border border-slate-300 text-[11px] mb-2">
          <tbody>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300 w-[26%]">
                Abdominal Situs
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="abdominalSitus" value="Solitus" current={data.abdominalSitus || 'Solitus'} onChange={(v) => update('abdominalSitus', v)} />
                <Radio name="abdominalSitus" value="Inversus" current={data.abdominalSitus} onChange={(v) => update('abdominalSitus', v)} />
                <Radio name="abdominalSitus" value="Ambiguous" current={data.abdominalSitus} onChange={(v) => update('abdominalSitus', v)} />
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Cardiac Situs
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="cardiacSitus" value="Solitus" current={data.cardiacSitus || data.situs || 'Solitus'} onChange={(v) => update('cardiacSitus', v)} />
                <Radio name="cardiacSitus" value="Inversus" current={data.cardiacSitus || data.situs} onChange={(v) => update('cardiacSitus', v)} />
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Cardiac Position
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="cardiacPosition" value="Levocardia" current={data.cardiacPosition || 'Levocardia'} onChange={(v) => update('cardiacPosition', v)} />
                <Radio name="cardiacPosition" value="Dextrocardia" current={data.cardiacPosition} onChange={(v) => update('cardiacPosition', v)} />
                <Radio name="cardiacPosition" value="Mesocardia" current={data.cardiacPosition} onChange={(v) => update('cardiacPosition', v)} />
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Cardiac Axis
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="cardiacAxis" value="Normal" current={data.cardiacAxis || 'Normal'} onChange={(v) => update('cardiacAxis', v)} />
                <Radio name="cardiacAxis" value="Increased" current={data.cardiacAxis} onChange={(v) => update('cardiacAxis', v)} />
                <Radio name="cardiacAxis" value="Decreased" current={data.cardiacAxis} onChange={(v) => update('cardiacAxis', v)} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* 2. Venous Connections & Atria */}
        <div className="bg-[#1e2d42] text-white font-bold text-[11px] px-2.5 py-1 tracking-wide mt-2">
          2. Venous Connections & Atria
        </div>
        <table className="w-full border-collapse border border-slate-300 text-[11px] mb-2">
          <tbody>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300 w-[26%]">
                Systemic Vein
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-4">
                  <Radio name="systemicVein" value="Normal" current={data.systemicVein || data.systemicVenous || 'Normal'} onChange={(v) => update('systemicVein', v)} />
                  <Radio name="systemicVein" value="Abnormal" current={data.systemicVein || data.systemicVenous} onChange={(v) => update('systemicVein', v)} />
                  <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-300">
                    <span className="text-slate-600 font-medium">Spec:</span>
                    <input
                      type="text"
                      value={data.systemicVeinSpec || ''}
                      onChange={(e) => update('systemicVeinSpec', e.target.value)}
                      className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white w-40"
                    />
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Pulmonary Veins
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="pulmonaryVeins" value="Normal (2 to LA)" current={data.pulmonaryVeins || data.pulmonaryVenous || 'Normal (2 to LA)'} onChange={(v) => update('pulmonaryVeins', v)} />
                <Radio name="pulmonaryVeins" value="Abnormal" current={data.pulmonaryVeins || data.pulmonaryVenous} onChange={(v) => update('pulmonaryVeins', v)} />
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Left Atrium
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="leftAtrium" value="Normal" current={data.leftAtrium || 'Normal'} onChange={(v) => update('leftAtrium', v)} />
                <Radio name="leftAtrium" value="Abnormal" current={data.leftAtrium} onChange={(v) => update('leftAtrium', v)} />
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Right Atrium
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="rightAtrium" value="Normal" current={data.rightAtrium || 'Normal'} onChange={(v) => update('rightAtrium', v)} />
                <Radio name="rightAtrium" value="Abnormal" current={data.rightAtrium} onChange={(v) => update('rightAtrium', v)} />
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Inter-atrial Septum
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-4">
                  <span className="text-slate-600 font-medium">Primum:</span>
                  <Radio name="interatrialSeptum" value="Normal" current={data.interatrialSeptum || 'Normal'} onChange={(v) => update('interatrialSeptum', v)} />
                  <Radio name="interatrialSeptum" value="Absent" current={data.interatrialSeptum} onChange={(v) => update('interatrialSeptum', v)} />
                  <Radio name="interatrialSeptum" value="Short" current={data.interatrialSeptum} onChange={(v) => update('interatrialSeptum', v)} />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Foramen-ovale flap
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="foramenOvaleFlap" value="Normal (in LA)" current={data.foramenOvaleFlap || data.foramenOvale || 'Normal (in LA)'} onChange={(v) => update('foramenOvaleFlap', v)} />
                <Radio name="foramenOvaleFlap" value="Abnormal (in RA)" current={data.foramenOvaleFlap || data.foramenOvale} onChange={(v) => update('foramenOvaleFlap', v)} />
                <Radio name="foramenOvaleFlap" value="Restricted" current={data.foramenOvaleFlap || data.foramenOvale} onChange={(v) => update('foramenOvaleFlap', v)} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* 3. AV Junction, Valves & Ventricles */}
        <div className="bg-[#1e2d42] text-white font-bold text-[11px] px-2.5 py-1 tracking-wide mt-2">
          3. AV Junction, Valves & Ventricles
        </div>
        <table className="w-full border-collapse border border-slate-300 text-[11px] mb-2">
          <tbody>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300 w-[26%]">
                AV Junction/Crux
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="avJunction" value="Normal" current={data.avJunction || 'Normal'} onChange={(v) => update('avJunction', v)} />
                <Radio name="avJunction" value="Abnormal" current={data.avJunction} onChange={(v) => update('avJunction', v)} />
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                AV Connection
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="avConnection" value="Concordant" current={data.avConnection || 'Concordant'} onChange={(v) => update('avConnection', v)} />
                <Radio name="avConnection" value="Discordant" current={data.avConnection} onChange={(v) => update('avConnection', v)} />
                <Radio name="avConnection" value="Single" current={data.avConnection} onChange={(v) => update('avConnection', v)} />
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Tricuspid Valve
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">Size:</span>
                  <Radio name="tricuspidValveSize" value="Norm" current={data.tricuspidValveSize || 'Norm'} onChange={(v) => update('tricuspidValveSize', v)} />
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">Leaflets:</span>
                  <Radio name="tricuspidValveLeaflets" value="Norm" current={data.tricuspidValveLeaflets || 'Norm'} onChange={(v) => update('tricuspidValveLeaflets', v)} />
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">Spec:</span>
                  <input
                    type="text"
                    value={data.tricuspidValveSpec || ''}
                    onChange={(e) => update('tricuspidValveSpec', e.target.value)}
                    className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white w-40"
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Mitral Valve
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">Size:</span>
                  <Radio name="mitralValveSize" value="Norm" current={data.mitralValveSize || 'Norm'} onChange={(v) => update('mitralValveSize', v)} />
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">Leaflets:</span>
                  <Radio name="mitralValveLeaflets" value="Norm" current={data.mitralValveLeaflets || 'Norm'} onChange={(v) => update('mitralValveLeaflets', v)} />
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">Spec:</span>
                  <input
                    type="text"
                    value={data.mitralValveSpec || ''}
                    onChange={(e) => update('mitralValveSpec', e.target.value)}
                    className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white w-40"
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Right Ventricle
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">Size:</span>
                  <Radio name="rvSize" value="Norm" current={data.rvSize || 'Norm'} onChange={(v) => update('rvSize', v)} />
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">Contractility:</span>
                  <Radio name="rvContractility" value="Norm" current={data.rvContractility || 'Norm'} onChange={(v) => update('rvContractility', v)} />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Left Ventricle
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">Size:</span>
                  <Radio name="lvSize" value="Norm" current={data.lvSize || 'Norm'} onChange={(v) => update('lvSize', v)} />
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">Contractility:</span>
                  <Radio name="lvContractility" value="Norm" current={data.lvContractility || 'Norm'} onChange={(v) => update('lvContractility', v)} />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Interventricular Septum
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="ivs" value="Intact" current={data.ivs || 'Intact'} onChange={(v) => update('ivs', v)} />
                <Radio name="ivs" value="Defect present" current={data.ivs} onChange={(v) => update('ivs', v)} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* 4. Outflow Tracts & Arches */}
        <div className="bg-[#1e2d42] text-white font-bold text-[11px] px-2.5 py-1 tracking-wide mt-2">
          4. Outflow Tracts & Arches
        </div>
        <table className="w-full border-collapse border border-slate-300 text-[11px] mb-2">
          <tbody>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300 w-[26%]">
                VA Connection
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="vaConnection" value="Concordant" current={data.vaConnection || 'Concordant'} onChange={(v) => update('vaConnection', v)} />
                <Radio name="vaConnection" value="Discordant" current={data.vaConnection} onChange={(v) => update('vaConnection', v)} />
                <Radio name="vaConnection" value="DORV" current={data.vaConnection} onChange={(v) => update('vaConnection', v)} />
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Aortic Valve
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="aorticValve" value="Normal" current={data.aorticValve || 'Normal'} onChange={(v) => update('aorticValve', v)} />
                <Radio name="aorticValve" value="Abnormal" current={data.aorticValve} onChange={(v) => update('aorticValve', v)} />
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Aorta (Size/Pos)
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-4">
                  <Radio name="aortaSize" value="Normal" current={data.aortaSize || 'Normal'} onChange={(v) => update('aortaSize', v)} />
                  <Radio name="aortaSize" value="Small" current={data.aortaSize} onChange={(v) => update('aortaSize', v)} />
                  <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-300">
                    <span className="text-slate-600">Pos:</span>
                    <Radio name="aortaPos" value="Norm" current={data.aortaPos || 'Norm'} onChange={(v) => update('aortaPos', v)} />
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Pulmonary Valve
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="pulmonaryValve" value="Normal" current={data.pulmonaryValve || 'Normal'} onChange={(v) => update('pulmonaryValve', v)} />
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Main Pulm. Artery
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">Size:</span>
                  <Radio name="mpaSize" value="Normal" current={data.mpaSize || 'Normal'} onChange={(v) => update('mpaSize', v)} />
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">Pos:</span>
                  <Radio name="mpaPos" value="Norm" current={data.mpaPos || 'Norm'} onChange={(v) => update('mpaPos', v)} />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Branch Pulm. Art.
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-3">
                  <Radio name="branchPulmArt" value="Confluent" current={data.branchPulmArt || 'Confluent'} onChange={(v) => update('branchPulmArt', v)} />
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">RPA:</span>
                  <Radio name="branchPulmArtRpa" value="Normal" current={data.branchPulmArtRpa || 'Normal'} onChange={(v) => update('branchPulmArtRpa', v)} />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Aortic Arch
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">Pos:</span>
                  <Radio name="aorticArchPos" value="Left" current={data.aorticArchPos || 'Left'} onChange={(v) => update('aorticArchPos', v)} />
                  <Radio name="aorticArchPos" value="Right" current={data.aorticArchPos} onChange={(v) => update('aorticArchPos', v)} />
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">Size:</span>
                  <Radio name="aorticArchSize" value="Normal" current={data.aorticArchSize || 'Normal'} onChange={(v) => update('aorticArchSize', v)} />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Ductal Arch
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">Pos:</span>
                  <Radio name="ductalArchPos" value="Left" current={data.ductalArchPos || 'Left'} onChange={(v) => update('ductalArchPos', v)} />
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">Size:</span>
                  <Radio name="ductalArchSize" value="Normal" current={data.ductalArchSize || 'Normal'} onChange={(v) => update('ductalArchSize', v)} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 5. Biometry & Z-Scores */}
        <div className="bg-[#1e2d42] text-white font-bold text-[11px] px-2.5 py-1 tracking-wide mt-2">
          5. Biometry & Z-Scores
        </div>
        <table className="w-full border-collapse border border-slate-300 text-[11px] mb-2">
          <thead>
            <tr className="bg-slate-100 font-semibold text-slate-800">
              <th className="px-2.5 py-1.5 border border-slate-300 text-left w-[45%]">Structure Annulus</th>
              <th className="px-2.5 py-1.5 border border-slate-300 text-left w-[25%]">Diameter (mm)</th>
              <th className="px-2.5 py-1.5 border border-slate-300 text-left w-[30%]">Z-Score</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">Mitral Valve (LV)</td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={mvVal}
                  onChange={(e) => update('mitralValve', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={mvZ}
                  onChange={(e) => update('mitralValveZ', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">Tricuspid Valve (RV)</td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={tvVal}
                  onChange={(e) => update('tricuspidValve', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={tvZ}
                  onChange={(e) => update('tricuspidValveZ', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">Aortic Valve</td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={aoVal}
                  onChange={(e) => update('aorticValve', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={aoZ}
                  onChange={(e) => update('aorticValveZ', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">Pulmonary Valve</td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={pvVal}
                  onChange={(e) => update('pulmonaryValve', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={pvZ}
                  onChange={(e) => update('pulmonaryValveZ', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
            <tr className="bg-slate-50">
              <td colSpan={2} className="px-2.5 py-1.5 border border-slate-300 font-semibold text-slate-800">
                Calculated RV / LV Ratio <span className="font-normal text-slate-500">(Normal ~1.0-1.1)</span>:
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 font-mono font-bold text-slate-900">
                {rvLvRatio}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 6. Pulsed Doppler Analysis (cm/sec) */}
        <div className="bg-[#1e2d42] text-white font-bold text-[11px] px-2.5 py-1 tracking-wide mt-2">
          6. Pulsed Doppler Analysis (cm/sec)
        </div>
        <table className="w-full border-collapse border border-slate-300 text-[11px] mb-2">
          <thead>
            <tr className="bg-slate-100 font-semibold text-slate-800">
              <th className="px-2.5 py-1.5 border border-slate-300 text-left w-[32%]">Site</th>
              <th className="px-2.5 py-1.5 border border-slate-300 text-left w-[44%]">Flow Pattern</th>
              <th className="px-2.5 py-1.5 border border-slate-300 text-left w-[24%]">Peak Vel</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">Tricuspid (TV) Inflow</td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-4">
                <Radio name="tvFlowPattern" value="Biphasic" current={data.tvFlowPattern || 'Biphasic'} onChange={(v) => update('tvFlowPattern', v)} />
                <Radio name="tvFlowPattern" value="Monophasic" current={data.tvFlowPattern} onChange={(v) => update('tvFlowPattern', v)} />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={data.tvPeakVel || data.tvE || ''}
                  onChange={(e) => update('tvPeakVel', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">Mitral (MV) Inflow</td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-4">
                <Radio name="mvFlowPattern" value="Biphasic" current={data.mvFlowPattern || 'Biphasic'} onChange={(v) => update('mvFlowPattern', v)} />
                <Radio name="mvFlowPattern" value="Monophasic" current={data.mvFlowPattern} onChange={(v) => update('mvFlowPattern', v)} />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={data.mvPeakVel || data.mvE || ''}
                  onChange={(e) => update('mvPeakVel', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">LVOT / Aorta</td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-4">
                <Radio name="lvotFlowPattern" value="Normal" current={data.lvotFlowPattern || 'Normal'} onChange={(v) => update('lvotFlowPattern', v)} />
                <Radio name="lvotFlowPattern" value="To-and-fro" current={data.lvotFlowPattern} onChange={(v) => update('lvotFlowPattern', v)} />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={data.lvotPeakVel || data.avVmax || ''}
                  onChange={(e) => update('lvotPeakVel', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">RVOT / Pulm Artery</td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-4">
                <Radio name="rvotFlowPattern" value="Normal" current={data.rvotFlowPattern || 'Normal'} onChange={(v) => update('rvotFlowPattern', v)} />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={data.rvotPeakVel || data.pvVmax || ''}
                  onChange={(e) => update('rvotPeakVel', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">Ductus Arteriosus</td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-4">
                <Radio name="ductusArteriosusFlowPattern" value="Normal" current={data.ductusArteriosusFlowPattern || 'Normal'} onChange={(v) => update('ductusArteriosusFlowPattern', v)} />
                <Radio name="ductusArteriosusFlowPattern" value="High Vel" current={data.ductusArteriosusFlowPattern} onChange={(v) => update('ductusArteriosusFlowPattern', v)} />
                <Radio name="ductusArteriosusFlowPattern" value="Flow Rev" current={data.ductusArteriosusFlowPattern} onChange={(v) => update('ductusArteriosusFlowPattern', v)} />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={data.ductusArteriosusPeakVel || data.ductusVmax || ''}
                  onChange={(e) => update('ductusArteriosusPeakVel', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">Ductus Venosus</td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-4">
                <Radio name="ductusVenosusFlowPattern" value="Normal" current={data.ductusVenosusFlowPattern || 'Normal'} onChange={(v) => update('ductusVenosusFlowPattern', v)} />
                <Radio name="ductusVenosusFlowPattern" value="A-Rev" current={data.ductusVenosusFlowPattern} onChange={(v) => update('ductusVenosusFlowPattern', v)} />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={data.ductusVenosusPeakVel || ''}
                  onChange={(e) => update('ductusVenosusPeakVel', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">Pulmonary Venous</td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-4">
                <Radio name="pulmonaryVenousFlowPattern" value="Normal" current={data.pulmonaryVenousFlowPattern || 'Normal'} onChange={(v) => update('pulmonaryVenousFlowPattern', v)} />
                <Radio name="pulmonaryVenousFlowPattern" value="Abnormal" current={data.pulmonaryVenousFlowPattern} onChange={(v) => update('pulmonaryVenousFlowPattern', v)} />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={data.pulmonaryVenousPeakVel || ''}
                  onChange={(e) => update('pulmonaryVenousPeakVel', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
            <tr>
              <td className="px-2.5 py-1.5 border border-slate-300 font-medium">Foramen Ovale Shunt</td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-4">
                <Radio name="foramenOvaleShuntFlowPattern" value="Rt to Lt" current={data.foramenOvaleShuntFlowPattern || 'Rt to Lt'} onChange={(v) => update('foramenOvaleShuntFlowPattern', v)} />
                <Radio name="foramenOvaleShuntFlowPattern" value="Lt to Rt" current={data.foramenOvaleShuntFlowPattern} onChange={(v) => update('foramenOvaleShuntFlowPattern', v)} />
              </td>
              <td className="px-2.5 py-1 border border-slate-300">
                <input
                  type="text"
                  value={data.foramenOvaleShuntPeakVel || ''}
                  onChange={(e) => update('foramenOvaleShuntPeakVel', e.target.value)}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-900"
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* 7. Fetal Heart Rate & Rhythm */}
        <div className="bg-[#1e2d42] text-white font-bold text-[11px] px-2.5 py-1 tracking-wide mt-2">
          7. Fetal Heart Rate & Rhythm
        </div>
        <table className="w-full border-collapse border border-slate-300 text-[11px] mb-2">
          <tbody>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300 w-[26%]">
                Rate
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={data.fhrRate || '137'}
                      onChange={(e) => update('fhrRate', e.target.value)}
                      className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white w-20"
                    />
                    <span className="text-slate-600">bpm</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <Radio name="fhrRateStatus" value="Normal" current={data.fhrRateStatus || 'Normal'} onChange={(v) => update('fhrRateStatus', v)} />
                  <Radio name="fhrRateStatus" value="Low/High" current={data.fhrRateStatus} onChange={(v) => update('fhrRateStatus', v)} />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 font-semibold text-slate-800 px-2.5 py-1.5 border border-slate-300">
                Rhythm
              </td>
              <td className="px-2.5 py-1.5 border border-slate-300 space-x-5">
                <Radio name="fhrRhythm" value="Regular (1:1)" current={data.fhrRhythm || 'Regular (1:1)'} onChange={(v) => update('fhrRhythm', v)} />
                <Radio name="fhrRhythm" value="PACs/Block" current={data.fhrRhythm} onChange={(v) => update('fhrRhythm', v)} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Final Impression */}
        <div className="bg-[#1e2d42] text-white font-bold text-[11px] px-2.5 py-1 tracking-wide mt-2">
          Final Impression
        </div>
        <div className="border border-slate-300 border-t-0 p-2 bg-slate-50/50 mb-6">
          <textarea
            rows={3}
            value={
              data.impression !== undefined && data.impression !== ''
                ? data.impression
                : 'NORMAL SITUS AND LEVOCARDIA. NORMAL SEGMENTAL ANATOMY. NO MAJOR ANOMALY DETECTED. NORMAL RATE AND RHYTHM. NORMAL FLOW PATTERN.'
            }
            onChange={(e) => update('impression', e.target.value)}
            className="w-full border border-slate-300 rounded p-2 text-xs font-medium text-slate-900 bg-white uppercase leading-relaxed resize-y focus:outline-none focus:border-slate-500"
          />
        </div>

        {/* Bottom Button: GENERATE FINAL REPORT */}
        <div className="flex justify-center print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="bg-[#1e2d42] hover:bg-slate-800 text-white font-bold text-xs uppercase px-10 py-2.5 rounded shadow tracking-widest cursor-pointer transition flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Generate Final Report
          </button>
        </div>

      </div>
    </div>
  )
}
