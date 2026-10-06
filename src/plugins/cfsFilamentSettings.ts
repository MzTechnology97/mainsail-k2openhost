/**
 * Pressure advance and maximum flow per CFS filament (kalico-k2pro
 * box/filament-pa-maxflow), and the load cell calibration of a slot's profile
 * (k2_load_cell_pa, LOAD_CELL_PA_CALIBRATE SLOT=n SAVE=1).
 */

// Status objects from Moonraker, read defensively.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Obj = Record<string, any>

/** Fractions of the max flow used as calibration feed rates (pa_flow_fractions default). */
export const CFS_PA_FLOW_FRACTIONS = [0.2, 0.3, 0.4]
const FILAMENT_AREA = Math.PI * 0.875 ** 2 // 1.75 mm filament
/** Capture plus the cleaning after it, per replicate (bench, 2026-10-06). */
const SECONDS_PER_CAPTURE = 20

export function cfsValidNumber(value: unknown): value is number {
    return value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value))
}

/** Readable place a slot value came from (the box's *_source fields). */
export function cfsSettingSource(source: unknown): string {
    const text = typeof source === 'string' ? source.trim() : ''
    if (!text) return ''
    return text === 'slot' ? 'slot profile' : text
}

/** "PA 0.0400 (filament 90002) · max 15 mm³/s (material PETG-CF)", or '' without values. */
export function cfsFilamentSettingsText(slot: Obj | null | undefined): string {
    if (!slot) return ''
    const parts: string[] = []
    if (cfsValidNumber(slot.pressure_advance)) {
        const source = cfsSettingSource(slot.pressure_advance_source)
        parts.push(`PA ${Number(slot.pressure_advance).toFixed(4)}${source ? ` (${source})` : ''}`)
    }
    if (cfsValidNumber(slot.max_flow)) {
        const source = cfsSettingSource(slot.max_flow_source)
        parts.push(`max ${Number(slot.max_flow)} mm³/s${source ? ` (${source})` : ''}`)
    }
    return parts.join(' · ')
}

export interface CfsPaCalibrationState {
    /** The printer has the calibration command and it is enabled. */
    available: boolean
    /** Why the button is disabled, '' when it can run now. */
    reason: string
}

/** Can a load cell PA calibration run now? */
export function cfsPaCalibrationState(printer: Obj | null | undefined): CfsPaCalibrationState {
    const loadCell = printer?.k2_load_cell_pa
    if (!loadCell) return { available: false, reason: 'No [k2_load_cell_pa] on this printer' }
    if (loadCell.available === false)
        return { available: false, reason: loadCell.unavailable_reason || 'Load cell capture unavailable' }
    if (loadCell.pa_calibration !== 'experimental')
        return { available: false, reason: 'Set pa_calibration: experimental in [k2_load_cell_pa]' }
    const state = printer?.print_stats?.state
    if (state === 'printing' || state === 'paused') return { available: true, reason: 'Not while printing' }
    if (loadCell.state && loadCell.state !== 'idle') return { available: true, reason: 'A capture is running' }
    if (printer?.webhooks?.state && printer.webhooks.state !== 'ready')
        return { available: true, reason: 'Klipper is not ready' }
    return { available: true, reason: '' }
}

export interface CfsPaCalibrationPlan {
    /** Feed rates in mm/s of filament, empty without a max flow. */
    flows: number[]
    maxFlow: number | null
    maxFlowSource: string
    temperature: number | null
    /** Filament used by the pulses, warm-up and reprimes (mm), approximate. */
    filamentMm: number
    /** Approximate duration in minutes, without loading and heating. */
    minutes: number
}

/** What LOAD_CELL_PA_CALIBRATE SLOT=n will do for this slot (mirrors k2_load_cell_pa). */
export function cfsPaCalibrationPlan(
    slot: Obj,
    materials: Record<string, Obj> | null | undefined,
    replicates = 3,
    pulseTime = 0.25,
    reprime = 1.2
): CfsPaCalibrationPlan {
    const maxFlow = cfsValidNumber(slot.max_flow) ? Number(slot.max_flow) : null
    const flows = maxFlow
        ? CFS_PA_FLOW_FRACTIONS.map((fraction) => Math.round(((maxFlow * fraction) / FILAMENT_AREA) * 100) / 100)
        : []
    const material = materials?.[(slot.material ?? '').toUpperCase()]
    const temperature = cfsValidNumber(slot.target_temp)
        ? Number(slot.target_temp)
        : cfsValidNumber(material?.target_temp)
          ? Number(material?.target_temp)
          : null
    const captures = flows.length * replicates
    const pulses = flows.reduce((sum, flow) => sum + flow * pulseTime, 0) * replicates + (flows[0] ?? 0) * pulseTime
    const filamentMm = Math.round((pulses + reprime * captures) * 10) / 10
    return {
        flows,
        maxFlow,
        maxFlowSource: cfsSettingSource(slot.max_flow_source),
        temperature,
        filamentMm,
        minutes: Math.max(1, Math.round(((captures + 1) * SECONDS_PER_CAPTURE) / 60)),
    }
}

/** The slot to calibrate a library filament in: the loaded one first, then the first present. */
export function cfsSlotForFilament(slots: Obj[] | null | undefined, filamentId: string): Obj | null {
    const id = (filamentId ?? '').toUpperCase()
    if (!id) return null
    const candidates = (slots ?? []).filter((slot) => slot.present && (slot.filament_id ?? '').toUpperCase() === id)
    return candidates.find((slot) => slot.loaded) ?? candidates[0] ?? null
}

/** Value for PRESSURE_ADVANCE= / MAX_FLOW=: a number, '' to clear, null to leave out. */
export function cfsOptionalParam(value: unknown, wasSet: boolean, digits: number): string | null {
    if (cfsValidNumber(value)) return Number(value).toFixed(digits)
    return wasSet ? '' : null
}

export interface CfsPaCalibrationResult {
    time: number
    slot: number | null
    filamentId: string
    temperature: number | null
    flows: number[]
    captures: number
    accepted: number
    suggested: number | null
    indicative: boolean
    range: [number, number] | null
    step: number
    reasons: string[]
    saved: string | null
}

/** The last LOAD_CELL_PA_CALIBRATE result (k2_load_cell_pa last_calibration), or null. */
export function cfsPaLastCalibration(printer: Obj | null | undefined): CfsPaCalibrationResult | null {
    const last = printer?.k2_load_cell_pa?.last_calibration
    if (!last || typeof last !== 'object' || !cfsValidNumber(last.time)) return null
    const range =
        Array.isArray(last.range) && last.range.length === 2 && last.range.every(cfsValidNumber)
            ? ([Number(last.range[0]), Number(last.range[1])] as [number, number])
            : null
    return {
        time: Number(last.time),
        slot: cfsValidNumber(last.slot) ? Number(last.slot) : null,
        filamentId: typeof last.filament_id === 'string' ? last.filament_id : '',
        temperature: cfsValidNumber(last.temperature) ? Number(last.temperature) : null,
        flows: Array.isArray(last.flows) ? last.flows.filter(cfsValidNumber).map(Number) : [],
        captures: cfsValidNumber(last.captures) ? Number(last.captures) : 0,
        accepted: cfsValidNumber(last.accepted) ? Number(last.accepted) : 0,
        suggested: cfsValidNumber(last.suggested) ? Number(last.suggested) : null,
        indicative: !!last.indicative,
        range,
        step: cfsValidNumber(last.step) ? Number(last.step) : 0.002,
        reasons: Array.isArray(last.reasons) ? last.reasons.map(String) : [],
        saved: typeof last.saved === 'string' ? last.saved : null,
    }
}
