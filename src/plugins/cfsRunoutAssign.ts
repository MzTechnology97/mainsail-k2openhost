import { CfsBoxState, CfsSlot } from '@/types/cfs'

/**
 * Assigning a spool to a CFS slot while a print runs.
 *
 * The Box rebuilds the runout chain at every status update and at the runout
 * itself: every present slot with the same material and colour as the slot
 * feeding the print is a backup (kalico-k2pro box._runout_status). So a spool
 * inserted during a print joins the chain as soon as its slot has a matching
 * profile. Only the slots the print uses must stay untouched.
 */

type BoxLike = Pick<CfsBoxState, 'slots' | 'runout'>

// As the Box compares them: the material as stored, the colour as #RRGGBB in
// upper case (the Box normalizes colours when it saves them).
function material(value: string | null | undefined): string {
    return (value ?? '').trim()
}

function colour(value: string | null | undefined): string {
    return (value ?? '').trim().toUpperCase()
}

/** The slot feeding the print, or one already in its runout chain. */
export function cfsSlotInvolvedInPrint(box: BoxLike, slot: Pick<CfsSlot, 'index' | 'loaded'>): boolean {
    if (slot.loaded) return true
    const runout = box.runout
    if (!runout) return false
    return runout.loaded_slot === slot.index || (runout.chain ?? []).includes(slot.index)
}

export interface CfsRunoutMatch {
    /** joins: same material and colour; color/material: what differs; none: nothing loaded */
    state: 'none' | 'joins' | 'color' | 'material'
    source: CfsSlot | null
}

/** Whether a spool of this material and colour in slotIndex backs up the loaded slot. */
export function cfsRunoutMatch(
    box: BoxLike,
    slotIndex: number,
    spoolMaterial: string | null | undefined,
    spoolColor: string | null | undefined
): CfsRunoutMatch {
    const sourceIndex = box.runout?.loaded_slot
    const source = (box.slots ?? []).find((item) => item.index === sourceIndex && !item.external) ?? null
    if (!source || source.index === slotIndex || !material(source.material) || !material(spoolMaterial)) {
        return { state: 'none', source: null }
    }
    if (material(source.material) !== material(spoolMaterial)) return { state: 'material', source }
    if (colour(source.color) !== colour(spoolColor)) return { state: 'color', source }
    return { state: 'joins', source }
}
