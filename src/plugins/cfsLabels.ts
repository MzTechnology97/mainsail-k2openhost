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

/**
 * Compact form for chips: "B1·S3" with several CFS units, "Slot 3" when only
 * one unit is connected, "EXT" for the external spool.
 */
export function cfsSlotShortLabel(slot: Pick<CfsSlot, 'index' | 'external'>, multiBox = true): string {
    if (slot.external) return 'EXT'
    if (!multiBox) return `Slot ${cfsLocalSlot(slot.index)}`
    return `B${cfsBoxNumber(slot.index)}·S${cfsLocalSlot(slot.index)}`
}

/** Where a library profile comes from, as shown on badges and in profile lists. */
export function cfsFilamentSource(filament: { system?: boolean; source?: string }): {
    text: string
    title: string
} {
    if (filament.system) return { text: 'System', title: 'Creality/Generic K2-RFID catalog, read only' }
    if (filament.source === 'import') return { text: 'Imported', title: 'From the K2-RFID material database import' }
    if (filament.source === 'rfid') {
        return { text: 'From RFID tag', title: 'Registered automatically when its tag was read' }
    }
    return { text: 'Custom', title: 'Created in the library' }
}
