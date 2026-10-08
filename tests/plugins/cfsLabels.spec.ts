import { describe, expect, it } from 'vitest'
import { cfsFilamentNotices, cfsMappingWarningText } from '@/plugins/cfsLabels'
import { CfsMappingWarning } from '@/types/cfs'

const slots = [
    { index: 1, external: false },
    { index: 16, external: true },
]

describe('cfsMappingWarningText', () => {
    it('describes the live check during the print', () => {
        const text = cfsMappingWarningText(
            {
                kind: 'low_filament_live',
                tool: 0,
                slot: 1,
                needed_m: 71,
                remaining_m: 50,
                includes_swap: true,
                estimated: true,
            },
            'Box 1, slot 2'
        )
        expect(text).toBe(
            'T0 still needs about 71.0 m (estimated), Box 1, slot 2 has about 50.0 m left including identical spools: load more filament or the print pauses at runout.'
        )
    })
})

describe('humidity warning', () => {
    const warning: CfsMappingWarning = {
        kind: 'humidity',
        tool: 0,
        slot: 1,
        humidity_pct: 48,
        limit_pct: 25,
        slot_material: 'PA-CF',
    }

    it('names the slot, the humidity and the limit', () => {
        const text = cfsMappingWarningText(warning, 'Box 1, slot 2')
        expect(text).toContain('T0 uses Box 1, slot 2 (PA-CF) in a CFS at 48% humidity, above 25% for PA-CF')
    })

    it('reaches the notification bell with normal priority', () => {
        const [notice] = cfsFilamentNotices([warning], slots, 'part.gcode')
        expect(notice.id).toBe('humidity-T0-S1-part.gcode')
        expect(notice.priority).toBe('normal')
    })
})

describe('cfsFilamentNotices', () => {
    const warnings: CfsMappingWarning[] = [
        { kind: 'low_filament', tool: 0, slot: 1, needed_m: 111, remaining_m: 50 },
        { kind: 'low_filament_live', tool: 0, slot: 1, needed_m: 71, remaining_m: 50 },
        { kind: 'material_variant', tool: 1, slot: 16, tool_material: 'PETG', slot_material: 'PETG-CF' },
    ]

    it('keeps only filament warnings, live ones with high priority', () => {
        const notices = cfsFilamentNotices(warnings, slots, 'my part v2.gcode')
        expect(notices.map((n) => n.priority)).toEqual(['normal', 'high'])
        expect(notices[1].id).toBe('low_filament_live-T0-S1-my_part_v2.gcode')
        expect(notices[1].description).toContain('Box 1, slot 2')
    })

    it('handles missing data', () => {
        expect(cfsFilamentNotices(undefined, undefined, undefined)).toEqual([])
        const [notice] = cfsFilamentNotices([warnings[0]], [], null)
        expect(notice.id).toBe('low_filament-T0-S1-print')
        expect(notice.description).toContain('slot 2')
    })
})
