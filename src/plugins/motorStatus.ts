/**
 * Read-only views of the K2-OpenHost motor diagnostics for the Motors panel.
 *
 * Every function takes the objects Moonraker already pushes to the store
 * (`motor_control`, `temperature_sensor motor_<A>_MCU`, `serial_485 serial485`)
 * and never asks the printer for anything. All fields are optional: an older
 * backend without them shows "not available" instead of failing, and a value
 * without validity information is never shown as a current reading.
 */

export type MotorAxis = 'x' | 'y' | 'e'
export const MOTOR_AXES: MotorAxis[] = ['x', 'y', 'e']

export type MotorTone = 'success' | 'warning' | 'error' | 'info' | 'grey'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Obj = Record<string, any> | null | undefined

export interface MotorTemperatureView {
    available: boolean
    value: number | null
    state: string
    tone: MotorTone
    age: number | null
    error: string | null
}

export interface MotorProtectionView {
    available: boolean
    state: string
    tone: MotorTone
    errors: string[]
    warnings: string[]
    unknownBits: number[]
    clear: string | null
    lastError: string | null
    age: number | null
}

export interface MotorReadinessView {
    available: boolean
    state: string
    tone: MotorTone
    parameters: string | null
    calibration: string | null
    reasons: string[]
}

const TEMPERATURE_TONES: Record<string, MotorTone> = {
    current: 'success',
    failed: 'warning',
    stale: 'grey',
    previous_session: 'grey',
    never: 'grey',
    stopped: 'grey',
    no_validity: 'grey',
}

const VALIDITY_TONES: Record<string, MotorTone> = {
    current: 'success',
    clear_pending: 'info',
    query_failed: 'warning',
    stale: 'grey',
    unknown: 'grey',
}

function finiteOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function list<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : []
}

export function motorSensorName(axis: MotorAxis): string {
    return `temperature_sensor motor_${axis.toUpperCase()}_MCU`
}

/**
 * Temperature of one motor MCU. The cached sample in motor_control wins; the
 * standard sensor is used when it is the only source. A sensor that carries
 * no validity at all (backend before the acquisition sessions) is shown as
 * "no_validity", never as current.
 */
export function motorTemperatureView(motorControl: Obj, sensor: Obj, axis: MotorAxis): MotorTemperatureView {
    const sample = motorControl?.temperatures?.[axis]
    if (sample && typeof sample === 'object') {
        let state: string = typeof sample.state === 'string' ? sample.state : ''
        if (!state) {
            // First telemetry release: only `valid` and `temperature`.
            if (sample.valid === true) state = 'current'
            else if (sample.temperature === null || sample.temperature === undefined) state = 'never'
            else if ((sample.consecutive_errors ?? 0) > 0) state = 'failed'
            else state = 'stale'
        }
        return {
            available: true,
            value: finiteOrNull(sample.temperature),
            state,
            tone: TEMPERATURE_TONES[state] ?? 'grey',
            age: finiteOrNull(sample.sample_age),
            error: typeof sample.last_error === 'string' ? sample.last_error : null,
        }
    }
    if (sensor && typeof sensor === 'object') {
        const state: string =
            typeof sensor.state === 'string'
                ? sensor.state
                : sensor.valid === true
                  ? 'current'
                  : sensor.valid === false
                    ? 'stale'
                    : 'no_validity'
        return {
            available: true,
            value: finiteOrNull(sensor.temperature),
            state,
            tone: TEMPERATURE_TONES[state] ?? 'grey',
            age: finiteOrNull(sensor.sample_age),
            error: null,
        }
    }
    return { available: false, value: null, state: 'unavailable', tone: 'grey', age: null, error: null }
}

/** Protection state of one axis: the decoded fault plus how far it can be trusted. */
export function motorProtectionView(motorControl: Obj, axis: MotorAxis): MotorProtectionView {
    const fault = motorControl?.faults?.[axis]
    if (!fault || typeof fault !== 'object') {
        return {
            available: false,
            state: 'unavailable',
            tone: 'grey',
            errors: [],
            warnings: [],
            unknownBits: [],
            clear: null,
            lastError: null,
            age: null,
        }
    }
    const validity = fault.validity && typeof fault.validity === 'object' ? fault.validity : null
    const state: string =
        typeof validity?.state === 'string' ? validity.state : fault.queried === true ? 'queried' : 'unknown'
    const errors = list<string>(fault.error_labels)
    const warnings = list<string>(fault.warning_labels)
    const unknownBits = [...list<number>(fault.unknown_error_bits), ...list<number>(fault.unknown_warning_bits)]
    let tone: MotorTone = VALIDITY_TONES[state] ?? 'grey'
    if (fault.unverified === true) tone = 'warning'
    if (fault.active === true || errors.length || warnings.length || unknownBits.length) {
        tone = fault.has_error === true || errors.length ? 'error' : 'warning'
    }
    return {
        available: true,
        state,
        tone,
        errors,
        warnings,
        unknownBits,
        clear: typeof validity?.clear?.result === 'string' ? validity.clear.result : null,
        lastError: typeof validity?.last_error === 'string' ? validity.last_error : null,
        age: finiteOrNull(fault.query_age),
    }
}

/** What the startup verified for one axis. */
export function motorReadinessView(motorControl: Obj, axis: MotorAxis): MotorReadinessView {
    const readiness = motorControl?.readiness?.[axis]
    if (!readiness || typeof readiness !== 'object') {
        const ready = motorControl?.motor_ready
        return {
            available: false,
            state: ready === true ? 'ready' : ready === false ? 'not_ready' : 'unavailable',
            tone: ready === true ? 'success' : 'grey',
            parameters: null,
            calibration: null,
            reasons: [],
        }
    }
    let state = 'not_ready'
    let tone: MotorTone = 'grey'
    if (readiness.blocked === true) {
        state = 'blocked'
        tone = 'error'
    } else if (readiness.operational === true && readiness.degraded === true) {
        state = 'degraded'
        tone = 'warning'
    } else if (readiness.operational === true) {
        state = 'ready'
        tone = 'success'
    }
    return {
        available: true,
        state,
        tone,
        parameters: typeof readiness.parameters?.state === 'string' ? readiness.parameters.state : null,
        calibration: typeof readiness.calibration?.state === 'string' ? readiness.calibration.state : null,
        reasons: list<string>(readiness.reasons),
    }
}

export interface MotorBusView {
    available: boolean
    connected: boolean | null
    rows: { key: string; value: number | string | null }[]
}

const BUS_FIELDS = [
    'queued_requests',
    'tx_frames',
    'rx_frames',
    'timeouts',
    'crc_errors',
    'invalid_len',
    'unmatched',
    'send_errors',
    'reader_errors',
    'disconnects',
]

/** The shared RS-485 bus: counts for every device on it, not per axis. */
export function motorBusView(serial: Obj): MotorBusView {
    if (!serial || typeof serial !== 'object' || !('connected' in serial)) {
        return { available: false, connected: null, rows: [] }
    }
    return {
        available: true,
        connected: serial.connected === true,
        rows: BUS_FIELDS.filter((key) => key in serial).map((key) => ({ key, value: serial[key] ?? null })),
    }
}

export interface MotorNozzleView {
    available: boolean
    configured: boolean | null
    rows: { key: string; value: number | string | null }[]
    latency: { last: number | null; avg: number | null; max: number | null }
    lastResult: string | null
}

const NOZZLE_FIELDS = [
    'sends',
    'wire_attempts',
    'responses',
    'timeouts',
    'no_response',
    'busy_rejections',
    'send_errors',
    'protocol_errors',
]

/** The E motor's own transport through the Nozzle MCU. */
export function motorNozzleView(motorControl: Obj): MotorNozzleView {
    const nozzle = motorControl?.nozzle_transport
    if (!nozzle || typeof nozzle !== 'object' || !('sends' in nozzle)) {
        return {
            available: false,
            configured: nozzle?.configured ?? null,
            rows: [],
            latency: { last: null, avg: null, max: null },
            lastResult: null,
        }
    }
    return {
        available: true,
        configured: nozzle.configured === true,
        rows: NOZZLE_FIELDS.filter((key) => key in nozzle).map((key) => ({ key, value: nozzle[key] ?? null })),
        latency: {
            last: finiteOrNull(nozzle.latency_ms?.last),
            avg: finiteOrNull(nozzle.latency_ms?.avg),
            max: finiteOrNull(nozzle.latency_ms?.max),
        },
        lastResult: typeof nozzle.last_result === 'string' ? nozzle.last_result : null,
    }
}

export interface MotorEventView {
    seq: number
    type: string
    axis: string
    labels: string[]
    count: number
    context: string | null
    result: string | null
}

/** The newest motor events, newest first. */
export function motorEventsView(motorControl: Obj, limit = 5): MotorEventView[] {
    return list<Record<string, any>>(motorControl?.events)
        .slice(-limit)
        .reverse()
        .map((event) => ({
            seq: Number(event.seq) || 0,
            type: String(event.type ?? ''),
            axis: String(event.axis ?? '-').toUpperCase(),
            labels: [...list<string>(event.error_labels), ...list<string>(event.warning_labels)],
            count: Number(event.count) || 1,
            context: typeof event.context === 'string' ? event.context : null,
            result: typeof event.result === 'string' ? event.result : null,
        }))
}
