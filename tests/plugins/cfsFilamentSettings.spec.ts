import { describe, expect, it } from 'vitest'
import {
    cfsFilamentSettingsText,
    cfsPaLastCalibration,
    cfsOptionalParam,
    cfsPaCalibrationPlan,
    cfsPaCalibrationState,
    cfsSlotForFilament,
} from '@/plugins/cfsFilamentSettings'

// Fixtures follow the kalico-k2pro box slot status (box/filament-pa-maxflow).
const petgCf = {
    index: 0,
    present: true,
    loaded: false,
    material: 'PETG-CF',
    filament_id: '90002',
    target_temp: 250,
    pressure_advance: 0.04,
    pressure_advance_source: 'filament 90002',
    max_flow: 15,
    max_flow_source: 'slot',
}

describe('cfsFilamentSettingsText', () => {
    it('names each value and its source', () => {
        expect(cfsFilamentSettingsText(petgCf)).toBe('PA 0.0400 (filament 90002) · max 15 mm³/s (slot profile)')
    })
    it('is empty without values', () => {
        expect(cfsFilamentSettingsText({ pressure_advance: null, max_flow: null })).toBe('')
        expect(cfsFilamentSettingsText(null)).toBe('')
    })
})

describe('cfsPaCalibrationState', () => {
    const ready = {
        k2_load_cell_pa: { available: true, pa_calibration: 'experimental', state: 'idle' },
        print_stats: { state: 'standby' },
        webhooks: { state: 'ready' },
    }
    it('is ready on an idle printer', () => {
        expect(cfsPaCalibrationState(ready)).toEqual({ available: true, reason: '' })
    })
    it('is unavailable without the module or with the calibration disabled', () => {
        expect(cfsPaCalibrationState({}).available).toBe(false)
        const disabled = { ...ready, k2_load_cell_pa: { ...ready.k2_load_cell_pa, pa_calibration: 'disabled' } }
        expect(cfsPaCalibrationState(disabled)).toMatchObject({ available: false })
    })
    it('waits while printing or capturing', () => {
        expect(cfsPaCalibrationState({ ...ready, print_stats: { state: 'printing' } }).reason).toBe(
            'Not while printing'
        )
        const busy = { ...ready, k2_load_cell_pa: { ...ready.k2_load_cell_pa, state: 'capturing' } }
        expect(cfsPaCalibrationState(busy).reason).toBe('A capture is running')
    })
})

describe('cfsPaCalibrationPlan', () => {
    it('uses 20/30/40 % of the max flow, like the printer', () => {
        const plan = cfsPaCalibrationPlan(petgCf, {})
        expect(plan.flows).toEqual([1.25, 1.87, 2.49])
        expect(plan.maxFlow).toBe(15)
        expect(plan.temperature).toBe(250)
        // 3 x (1.25 + 1.87 + 2.49) x 0.25 + warm-up 0.31 + 9 reprimes of 1.2
        expect(plan.filamentMm).toBeCloseTo(15.3, 1)
        expect(plan.minutes).toBe(3)
    })
    it('falls back to the material temperature and has no flows without a max flow', () => {
        const plan = cfsPaCalibrationPlan(
            { material: 'pla', target_temp: null, max_flow: null },
            { PLA: { target_temp: 220 } }
        )
        expect(plan.flows).toEqual([])
        expect(plan.temperature).toBe(220)
    })
})

describe('cfsSlotForFilament', () => {
    it('prefers the loaded slot that holds the filament', () => {
        const slots = [
            { index: 0, present: true, loaded: false, filament_id: '90002' },
            { index: 2, present: true, loaded: true, filament_id: '90002' },
            { index: 3, present: false, loaded: false, filament_id: '90002' },
        ]
        expect(cfsSlotForFilament(slots, '90002')?.index).toBe(2)
        expect(cfsSlotForFilament(slots.slice(0, 1), '90002')?.index).toBe(0)
        expect(cfsSlotForFilament(slots, '11111')).toBeNull()
    })
})

describe('cfsOptionalParam', () => {
    it('sends a number, clears a removed value, leaves out an unset one', () => {
        expect(cfsOptionalParam(0.04, true, 4)).toBe('0.0400')
        expect(cfsOptionalParam(null, true, 4)).toBe('')
        expect(cfsOptionalParam('', false, 4)).toBeNull()
    })
})

describe('cfsPaLastCalibration', () => {
    it('reads the published result', () => {
        const printer = {
            k2_load_cell_pa: {
                last_calibration: {
                    time: 1759760000,
                    slot: 0,
                    filament_id: '90001',
                    temperature: 250,
                    flows: [1.25, 1.87, 2.49],
                    captures: 9,
                    accepted: 7,
                    suggested: 0.0412,
                    indicative: true,
                    range: [0.026, 0.056],
                    step: 0.002,
                    reasons: ['replicates disagree (spread 68%)'],
                    saved: null,
                },
            },
        }
        const result = cfsPaLastCalibration(printer)
        expect(result).toMatchObject({ slot: 0, suggested: 0.0412, indicative: true, range: [0.026, 0.056] })
    })
    it('is null before any calibration', () => {
        expect(cfsPaLastCalibration({ k2_load_cell_pa: { last_calibration: null } })).toBeNull()
        expect(cfsPaLastCalibration({})).toBeNull()
    })
})
