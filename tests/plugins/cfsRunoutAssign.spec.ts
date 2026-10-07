import { describe, expect, it } from 'vitest'
import { cfsRunoutMatch, cfsSlotInvolvedInPrint } from '@/plugins/cfsRunoutAssign'

type BoxArg = Parameters<typeof cfsRunoutMatch>[0]

// Fixtures follow the kalico-k2pro box status (slots[] and runout).
const slot = (index: number, material: string, color: string, loaded = false) => ({
    index,
    present: true,
    loaded,
    material,
    color,
    external: false,
})

const box = {
    slots: [slot(0, 'PLA', '#808080', true), slot(1, 'PLA', '#808080'), slot(2, '', ''), slot(3, 'PETG', '#000000')],
    runout: { loaded_slot: 0, chain: [1] },
} as unknown as BoxArg

describe('cfsSlotInvolvedInPrint', () => {
    it('protects the loaded slot and the runout chain', () => {
        expect(cfsSlotInvolvedInPrint(box, { index: 0, loaded: true })).toBe(true)
        expect(cfsSlotInvolvedInPrint(box, { index: 1, loaded: false })).toBe(true)
    })
    it('leaves the other slots editable', () => {
        expect(cfsSlotInvolvedInPrint(box, { index: 2, loaded: false })).toBe(false)
        expect(cfsSlotInvolvedInPrint(box, { index: 3, loaded: false })).toBe(false)
        expect(
            cfsSlotInvolvedInPrint({ slots: [], runout: null } as unknown as BoxArg, { index: 2, loaded: false })
        ).toBe(false)
    })
})

describe('cfsRunoutMatch', () => {
    it('joins with the same material and colour, the colour in any case', () => {
        expect(cfsRunoutMatch(box, 2, 'PLA', '#808080').state).toBe('joins')
        expect(cfsRunoutMatch(box, 2, 'PLA', '#80808f').state).toBe('color')
        expect(cfsRunoutMatch(box, 2, ' PLA ', '#808080').state).toBe('joins')
        expect(cfsRunoutMatch(box, 2, 'PLA', '#808080').source?.index).toBe(0)
    })
    it('names what differs', () => {
        expect(cfsRunoutMatch(box, 2, 'PLA', '#7F7F7F').state).toBe('color')
        expect(cfsRunoutMatch(box, 2, 'PETG', '#808080').state).toBe('material')
        // the Box compares the material as stored
        expect(cfsRunoutMatch(box, 2, 'pla', '#808080').state).toBe('material')
    })
    it('says nothing without a loaded slot, for the loaded slot itself or without a material', () => {
        expect(cfsRunoutMatch({ ...box, runout: null }, 2, 'PLA', '#808080').state).toBe('none')
        expect(cfsRunoutMatch(box, 0, 'PLA', '#808080').state).toBe('none')
        expect(cfsRunoutMatch(box, 2, '', '#808080').state).toBe('none')
    })
})
