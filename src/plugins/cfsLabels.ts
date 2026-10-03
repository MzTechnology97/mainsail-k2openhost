import { CfsSlot } from '@/types/cfs'

// Matches box_protocol.SLOTS_PER_BOX in the K2-OpenHost backend.
export const CFS_SLOTS_PER_BOX = 4

export function cfsBoxNumber(index: number): number {
    return Math.floor(index / CFS_SLOTS_PER_BOX) + 1
}

export function cfsLocalSlot(index: number): number {
    return (index % CFS_SLOTS_PER_BOX) + 1
}

/** Same wording as the backend messages: "Box 1, slot 3" or "External spool". */
export function cfsSlotLabel(slot: Pick<CfsSlot, 'index' | 'external'>): string {
    if (slot.external) return 'External spool'
    return `Box ${cfsBoxNumber(slot.index)}, slot ${cfsLocalSlot(slot.index)}`
}

/** Compact form for chips and selects: "B1·S3" or "EXT". */
export function cfsSlotShortLabel(slot: Pick<CfsSlot, 'index' | 'external'>): string {
    if (slot.external) return 'EXT'
    return `B${cfsBoxNumber(slot.index)}·S${cfsLocalSlot(slot.index)}`
}
