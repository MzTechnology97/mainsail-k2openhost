import { describe, expect, it } from 'vitest'
import {
    motorBusSessionsView,
    motorBusView,
    motorEventsView,
    motorNozzleView,
    motorProtectionView,
    motorReadinessView,
    motorSensorName,
    motorTemperatureView,
} from '@/plugins/motorStatus'

// Fixtures follow the kalico-k2pro motor_control status; values are made up.
const healthyAxis = {
    error_code: 0,
    warning_code: 0,
    error_labels: [],
    warning_labels: [],
    unknown_error_bits: [],
    unknown_warning_bits: [],
    query_age: 12,
    queried: true,
    validity: { state: 'current', last_error: null, clear: null },
}

describe('motorTemperatureView', () => {
    it('shows a current sample', () => {
        const view = motorTemperatureView(
            { temperatures: { x: { temperature: 41.5, state: 'current', valid: true, sample_age: 3 } } },
            null,
            'x'
        )
        expect(view).toMatchObject({ available: true, value: 41.5, state: 'current', tone: 'success', age: 3 })
    })

    it('keeps an old value but marks it stale', () => {
        const view = motorTemperatureView(
            { temperatures: { y: { temperature: 40, state: 'stale', valid: false, sample_age: 90 } } },
            null,
            'y'
        )
        expect(view.state).toBe('stale')
        expect(view.tone).toBe('grey')
        expect(view.value).toBe(40)
    })

    it.each(['never', 'stopped', 'previous_session'])('treats %s as not current', (state) => {
        const view = motorTemperatureView(
            { temperatures: { e: { temperature: null, state, valid: false } } },
            null,
            'e'
        )
        expect(view.tone).toBe('grey')
    })

    it('flags a failed read', () => {
        const view = motorTemperatureView(
            { temperatures: { x: { temperature: 41, state: 'failed', last_error: 'timeout' } } },
            null,
            'x'
        )
        expect(view).toMatchObject({ tone: 'warning', error: 'timeout' })
    })

    it('derives a state from the first telemetry release', () => {
        expect(motorTemperatureView({ temperatures: { x: { temperature: 40, valid: true } } }, null, 'x').state).toBe(
            'current'
        )
        expect(
            motorTemperatureView({ temperatures: { x: { temperature: null, valid: false } } }, null, 'x').state
        ).toBe('never')
        expect(
            motorTemperatureView(
                { temperatures: { x: { temperature: 40, valid: false, consecutive_errors: 2 } } },
                null,
                'x'
            ).state
        ).toBe('failed')
    })

    it('never shows a sensor without validity as current', () => {
        const view = motorTemperatureView({}, { temperature: 39 }, 'x')
        expect(view).toMatchObject({ available: true, value: 39, state: 'no_validity', tone: 'grey' })
    })

    it('uses the standard sensor validity when it is the only source', () => {
        const view = motorTemperatureView(null, { temperature: 39, valid: true, state: 'current' }, 'x')
        expect(view.tone).toBe('success')
    })

    it('reports a missing backend without failing', () => {
        expect(motorTemperatureView(undefined, undefined, 'x')).toMatchObject({ available: false, value: null })
    })

    it('drops non-finite values', () => {
        const view = motorTemperatureView({ temperatures: { x: { temperature: 'NaN', state: 'current' } } }, null, 'x')
        expect(view.value).toBeNull()
    })

    it('builds the sensor object name', () => {
        expect(motorSensorName('e')).toBe('temperature_sensor motor_E_MCU')
    })
})

describe('motorProtectionView', () => {
    it('shows a verified healthy axis', () => {
        expect(motorProtectionView({ faults: { x: healthyAxis } }, 'x')).toMatchObject({
            state: 'current',
            tone: 'success',
            errors: [],
        })
    })

    it('shows a fault with its labels', () => {
        const view = motorProtectionView(
            {
                faults: {
                    e: {
                        ...healthyAxis,
                        active: true,
                        has_error: true,
                        error_labels: ['excessive position tracking error'],
                    },
                },
            },
            'e'
        )
        expect(view.tone).toBe('error')
        expect(view.errors).toEqual(['excessive position tracking error'])
    })

    it('shows a warning', () => {
        const view = motorProtectionView(
            { faults: { e: { ...healthyAxis, active: true, warning_labels: ['MCU overheating'] } } },
            'e'
        )
        expect(view.tone).toBe('warning')
    })

    it('shows unknown bits as a warning', () => {
        const view = motorProtectionView({ faults: { x: { ...healthyAxis, unknown_warning_bits: [7] } } }, 'x')
        expect(view.unknownBits).toEqual([7])
        expect(view.tone).toBe('warning')
    })

    it.each([
        ['query_failed', 'warning'],
        ['clear_pending', 'info'],
        ['stale', 'grey'],
        ['unknown', 'grey'],
    ])('maps %s to %s', (state, tone) => {
        const view = motorProtectionView(
            { faults: { y: { ...healthyAxis, validity: { state, clear: { result: 'pending' } } } } },
            'y'
        )
        expect(view.tone).toBe(tone)
        expect(view.clear).toBe('pending')
    })

    it('handles a backend without validity', () => {
        expect(motorProtectionView({ faults: { x: { queried: false } } }, 'x').state).toBe('unknown')
        expect(motorProtectionView({ faults: { x: { queried: true } } }, 'x').state).toBe('queried')
    })

    it('marks an unverified query', () => {
        const view = motorProtectionView({ faults: { x: { queried: true, unverified: true } } }, 'x')
        expect(view.tone).toBe('warning')
    })

    it('reports a missing faults object', () => {
        expect(motorProtectionView({ motor_ready: true }, 'x').available).toBe(false)
    })
})

describe('motorReadinessView', () => {
    it.each([
        [{ operational: true, degraded: false, blocked: false }, 'ready', 'success'],
        [{ operational: true, degraded: true, blocked: false }, 'degraded', 'warning'],
        [{ operational: false, degraded: false, blocked: true }, 'blocked', 'error'],
        [{ operational: false, degraded: false, blocked: false }, 'not_ready', 'grey'],
    ])('maps %j', (readiness, state, tone) => {
        const view = motorReadinessView({ readiness: { x: { ...readiness, reasons: ['r'] } } }, 'x')
        expect(view).toMatchObject({ available: true, state, tone, reasons: ['r'] })
    })

    it('falls back to motor_ready on older backends', () => {
        expect(motorReadinessView({ motor_ready: true }, 'x')).toMatchObject({ available: false, state: 'ready' })
        expect(motorReadinessView({}, 'x').state).toBe('unavailable')
    })
})

describe('bus, nozzle and events', () => {
    it('reads the shared RS-485 counters', () => {
        const view = motorBusView({ connected: true, tx_frames: 10, rx_frames: 9, timeouts: 1, crc_errors: 0 })
        expect(view.connected).toBe(true)
        expect(view.rows.map((r) => r.key)).toEqual(['tx_frames', 'rx_frames', 'timeouts', 'crc_errors'])
        expect(motorBusView(undefined).available).toBe(false)
    })

    it('reads the per-print RS-485 counters and flags problems', () => {
        const view = motorBusSessionsView({
            connected: true,
            print_session: {
                started: 1,
                duration_s: 3725,
                deltas: { tx_frames: 900, rx_frames: 897, timeouts: 3, crc_errors: 0, link_lost: 0 },
            },
            last_print_session: {
                result: 'complete',
                duration_s: 67500,
                deltas: { tx_frames: 50000, rx_frames: 50000, timeouts: 0 },
            },
        })
        expect(view.current?.durationMin).toBe(62)
        expect(view.current?.rows.map((r) => r.key)).toEqual([
            'tx_frames',
            'rx_frames',
            'timeouts',
            'crc_errors',
            'link_lost',
        ])
        expect(view.current?.rows.find((r) => r.key === 'timeouts')?.problem).toBe(true)
        expect(view.current?.rows.find((r) => r.key === 'crc_errors')?.problem).toBe(false)
        expect(view.current?.rows.find((r) => r.key === 'tx_frames')?.problem).toBe(false)
        expect(view.last?.result).toBe('complete')
        expect(view.last?.durationMin).toBe(1125)
    })

    it('shows no per-print counters on older backends or when idle', () => {
        expect(motorBusSessionsView({ connected: true, tx_frames: 1 })).toEqual({ current: null, last: null })
        expect(motorBusSessionsView({ connected: true, print_session: null })).toEqual({ current: null, last: null })
        expect(motorBusSessionsView(undefined)).toEqual({ current: null, last: null })
    })

    it('reads the nozzle transport counters', () => {
        const view = motorNozzleView({
            nozzle_transport: {
                configured: true,
                sends: 4,
                responses: 3,
                timeouts: 1,
                latency_ms: { last: 12, avg: 13.5, max: 20 },
                last_result: 'response',
            },
        })
        expect(view).toMatchObject({ available: true, lastResult: 'response', latency: { last: 12, avg: 13.5 } })
        expect(motorNozzleView({ nozzle_transport: { configured: false } }).available).toBe(false)
        expect(motorNozzleView(null).available).toBe(false)
    })

    it('lists the newest events first', () => {
        const events = [1, 2, 3, 4, 5, 6].map((seq) => ({
            seq,
            type: 'fault_detected',
            axis: 'e',
            error_labels: ['encoder read error'],
            warning_labels: [],
            count: seq,
        }))
        const view = motorEventsView({ events }, 3)
        expect(view.map((e) => e.seq)).toEqual([6, 5, 4])
        expect(view[0]).toMatchObject({ axis: 'E', labels: ['encoder read error'], count: 6 })
        expect(motorEventsView({}, 3)).toEqual([])
    })
})

describe('MotorsPanel translations', () => {
    it('has the same keys in English and Italian', async () => {
        const en = (await import('@/locales/en.json')).default.Panels.MotorsPanel
        const it_ = (await import('@/locales/it.json')).default.Panels.MotorsPanel
        const keys = (obj: Record<string, unknown>, prefix = ''): string[] =>
            Object.entries(obj).flatMap(([key, value]) =>
                value && typeof value === 'object'
                    ? keys(value as Record<string, unknown>, `${prefix}${key}.`)
                    : [`${prefix}${key}`]
            )
        expect(keys(it_).sort()).toEqual(keys(en).sort())
    })
})
