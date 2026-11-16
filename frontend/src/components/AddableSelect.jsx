import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { customOptionService } from '../api/customOptionService'

export default function AddableSelect({ field, value, onChange, options = [], className = 'field-control' }) {
  const instanceId = useRef(`addable-${field}-${Math.random().toString(36).substring(2, 9)}`).current
  const containerRef = useRef(null)
  const [customOptions, setCustomOptions] = useState([])
  const [isAdding, setIsAdding] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    customOptionService.getOptions(field)
      .then((result) => { if (active) setCustomOptions((result.data || []).map((item) => item.value)) })
      .catch(() => { if (active) setError('Unable to load saved options') })
    return () => { active = false }
  }, [field])

  // Listen for when another AddableSelect opens, and close this one
  useEffect(() => {
    const handleOtherOpened = (e) => {
      if (e.detail?.id && e.detail.id !== instanceId) {
        setIsAdding(false)
        setError('')
        setNewValue('')
      }
    }
    window.addEventListener('addable-select-opened', handleOtherOpened)
    return () => {
      window.removeEventListener('addable-select-opened', handleOtherOpened)
    }
  }, [instanceId])

  // Close when clicking outside of this component
  useEffect(() => {
    if (!isAdding) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsAdding(false)
        setError('')
        setNewValue('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isAdding])

  const allOptions = useMemo(
    () => [...new Set([...options.filter((item) => item && item !== 'Other'), ...customOptions])],
    [options, customOptions],
  )

  const toggleAdding = () => {
    if (!isAdding) {
      // Notify all other AddableSelect components to close
      window.dispatchEvent(new CustomEvent('addable-select-opened', { detail: { id: instanceId } }))
      setIsAdding(true)
      setError('')
    } else {
      setIsAdding(false)
      setError('')
      setNewValue('')
    }
  }

  const saveOption = async () => {
    const nextValue = newValue.trim()
    if (!nextValue) return
    setSaving(true)
    setError('')
    try {
      const result = await customOptionService.createOption(field, nextValue)
      const savedValue = result.data?.value || nextValue
      setCustomOptions((current) => [...new Set([...current, savedValue])])
      onChange(savedValue)
      setNewValue('')
      setIsAdding(false)
    } catch {
      setError('Unable to save this option')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={containerRef}>
      <div className="flex gap-1">
        <select className={className} value={value || ''} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select</option>
          {allOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <button
          type="button"
          title={`Add ${field.replaceAll('_', ' ')}`}
          onClick={toggleAdding}
          className="legacy-plus-button"
        >
          {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      {isAdding && (
        <div className="mt-2 flex gap-1 rounded-lg border border-teal-200 bg-teal-50 p-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-teal-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                saveOption()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                setIsAdding(false)
                setNewValue('')
                setError('')
              }
            }}
            placeholder="Enter a new value"
            autoFocus
          />
          <button type="button" disabled={saving || !newValue.trim()} onClick={saveOption} className="rounded-md bg-teal-600 px-3 text-white disabled:opacity-50">
            <Check className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
