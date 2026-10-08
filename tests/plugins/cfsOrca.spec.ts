import { describe, expect, it } from 'vitest'
import {
    cfsOrcaBadge,
    cfsOrcaCommand,
    cfsOrcaIdValid,
    cfsOrcaPresetMatches,
    cfsOrcaPresetName,
    cfsOrcaPresetShortName,
    cfsOrcaPresetsFor,
} from '@/plugins/cfsOrca'
import { CfsFilament, CfsOrcaPreset } from '@/types/cfs'

const presets: CfsOrcaPreset[] = [
    { id: 'OFCZsqXg', name: 'Hyper PLA @K2 Pro-all', type: 'PLA', vendor: 'Creality' },
    { id: 'OFovEIbw', name: 'Bambu PETG HF @System', type: 'PETG', vendor: 'Bambu' },
    { id: 'OFDSrzZ8', name: 'Generic PLA @K2 Pro-all', type: 'PLA', vendor: 'Creality' },
]
const q = (text: string) => `"${text}"`

function filament(extra: Partial<CfsFilament> = {}): CfsFilament {
    return {
        id: '01001',
        material: 'PLA',
        color: '#FFFFFF',
        brand: 'Creality',
        name: 'Hyper PLA',
        target_temp: 220,
        min_temp: null,
        max_temp: null,
        pressure_advance: null,
        rfid_code: '',
        spoolman_id: null,
        system: true,
        orca_filament_id: 'OFCZsqXg',
        orca_filament_id_default: 'OFCZsqXg',
        orca_filament_id_custom: false,
        orca_preset: 'Hyper PLA @K2 Pro-all',
        ...extra,
    }
}

describe('cfsOrca', () => {
    it('validates IDs like the backend', () => {
        expect(cfsOrcaIdValid('OFCZsqXg')).toBe(true)
        expect(cfsOrcaIdValid('P637bdcb')).toBe(true)
        expect(cfsOrcaIdValid('')).toBe(true)
        expect(cfsOrcaIdValid('has space')).toBe(false)
        expect(cfsOrcaIdValid('x'.repeat(41))).toBe(false)
    })

    it('names presets', () => {
        expect(cfsOrcaPresetShortName('Hyper PLA @K2 Pro-all')).toBe('Hyper PLA')
        expect(cfsOrcaPresetShortName('Plain')).toBe('Plain')
        expect(cfsOrcaPresetName(presets, 'OFovEIbw')).toBe('Bambu PETG HF @System')
        expect(cfsOrcaPresetName(presets, 'nope')).toBe('')
    })

    it('searches by name, ID, vendor and type', () => {
        expect(cfsOrcaPresetMatches(presets[1], 'petg hf')).toBe(true)
        expect(cfsOrcaPresetMatches(presets[1], 'bambu ofovei')).toBe(true)
        expect(cfsOrcaPresetMatches(presets[1], 'pla')).toBe(false)
        expect(cfsOrcaPresetMatches(presets[1], '')).toBe(true)
    })

    it('lists the presets of the material first', () => {
        expect(cfsOrcaPresetsFor(presets, 'petg').map((p) => p.id)).toEqual(['OFovEIbw', 'OFDSrzZ8', 'OFCZsqXg'])
        expect(cfsOrcaPresetsFor(undefined, 'PLA')).toEqual([])
    })

    it('sends nothing when the value does not change', () => {
        expect(cfsOrcaCommand(filament(), 'OFCZsqXg', q)).toBeNull()
        expect(cfsOrcaCommand(filament(), '', q)).toBeNull()
        expect(cfsOrcaCommand(filament(), 'bad id', q)).toBeNull()
    })

    it('sets an override, also on a system profile', () => {
        expect(cfsOrcaCommand(filament(), 'P637bdcb', q)).toBe('_BOX_FILAMENT_ORCA_ID ID="01001" ORCA_ID="P637bdcb"')
    })

    it('goes back to the default when emptied or set to it', () => {
        const custom = filament({ orca_filament_id: 'P637bdcb', orca_filament_id_custom: true })
        expect(cfsOrcaCommand(custom, '', q)).toBe('_BOX_FILAMENT_ORCA_ID ID="01001" RESET=1')
        expect(cfsOrcaCommand(custom, 'OFCZsqXg', q)).toBe('_BOX_FILAMENT_ORCA_ID ID="01001" RESET=1')
        expect(cfsOrcaCommand(custom, 'P637bdcb', q)).toBeNull()
    })

    it('badges the preset, marking a user choice', () => {
        expect(cfsOrcaBadge(filament())).toMatchObject({ text: 'Orca: Hyper PLA' })
        expect(cfsOrcaBadge(filament())?.kind).toBeUndefined()
        const custom = cfsOrcaBadge(
            filament({ orca_filament_id: 'P637bdcb', orca_filament_id_custom: true, orca_preset: '' })
        )
        expect(custom).toMatchObject({ text: 'Orca: P637bdcb', kind: 'info' })
        expect(cfsOrcaBadge(filament({ orca_filament_id: '' }))).toBeNull()
    })
})
