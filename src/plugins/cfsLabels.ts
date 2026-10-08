import { CfsMappingWarning, CfsSlot } from '@/types/cfs'

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

// Reinforcing fillers make a material variant: PETG and PETG-CF are not interchangeable.
// Mirrors box_auto_mapping.py in the K2-OpenHost backend.
const CFS_FILLERS = ['CF', 'GF', 'KF', 'AF']

function cfsMaterialFamily(material: string): string {
    return /^[A-Z]+/.exec((material ?? '').trim().toUpperCase())?.[0] ?? ''
}

function cfsMaterialFillers(material: string): string {
    const tokens = (material ?? '')
        .trim()
        .toUpperCase()
        .split(/[^A-Z0-9]+/)
        .slice(1)
    return tokens
        .filter((token) => CFS_FILLERS.includes(token))
        .sort()
        .join(',')
}

/** Same material family with different fillers, e.g. PETG on a PETG-CF slot. */
export function cfsIsMaterialVariant(first: string, second: string): boolean {
    const family = cfsMaterialFamily(first)
    return !!family && family === cfsMaterialFamily(second) && cfsMaterialFillers(first) !== cfsMaterialFillers(second)
}

/** Filament a slicer tool needs in metres, with the backend's purge margin. */
export function cfsNeededMetres(lengthMm: number | null | undefined): number | null {
    const length = Number(lengthMm)
    if (!Number.isFinite(length) || length <= 0) return null
    return (length / 1000) * 1.1 + 1
}

export function cfsMappingWarningText(warning: CfsMappingWarning, slotLabel: string): string {
    const tool = `T${warning.tool}`
    if (warning.kind === 'low_filament_live') {
        const swap = warning.includes_swap ? ' including identical spools' : ''
        const estimated = warning.estimated ? ' (estimated)' : ''
        return `${tool} still needs about ${(warning.needed_m ?? 0).toFixed(1)} m${estimated}, ${slotLabel} has about ${(
            warning.remaining_m ?? 0
        ).toFixed(1)} m left${swap}: load more filament or the print pauses at runout.`
    }
    if (warning.kind === 'low_filament') {
        const swap = warning.includes_swap ? ' including identical spools' : ''
        return `${tool} needs about ${(warning.needed_m ?? 0).toFixed(1)} m, ${slotLabel} has about ${(
            warning.remaining_m ?? 0
        ).toFixed(1)} m left${swap}: the print pauses at runout unless more filament is loaded.`
    }
    if (warning.kind === 'humidity') {
        const material = warning.slot_material || '?'
        return `${tool} uses ${slotLabel} (${material}) in a CFS at ${warning.humidity_pct ?? '?'}% humidity, above ${
            warning.limit_pct ?? '?'
        }% for ${material}: dry the spool or expect stringing and weaker parts.`
    }
    if (warning.kind === 'material_variant') {
        return `${tool} is ${warning.tool_material || '?'} but ${slotLabel} holds ${
            warning.slot_material || '?'
        }: check that nozzle and temperatures suit it.`
    }
    return `${tool} (${warning.tool_material || '?'}) uses ${slotLabel} (${warning.slot_material || 'not set'}).`
}

export interface CfsFilamentNotice {
    id: string
    priority: 'normal' | 'high'
    description: string
}

/**
 * Filament warnings of the current print for the notification bell: the
 * check at print start (low_filament and humidity, normal) and the live check
 * during the print (low_filament_live, high). The id carries the file name,
 * so a later print shows its own warnings again after one was dismissed.
 */
export function cfsFilamentNotices(
    warnings: CfsMappingWarning[] | undefined,
    slots: Pick<CfsSlot, 'index' | 'external'>[] | undefined,
    filename: string | null | undefined
): CfsFilamentNotice[] {
    const file = String(filename ?? '').replace(/[^A-Za-z0-9._-]+/g, '_') || 'print'
    return (warnings ?? [])
        .filter((warning) => ['low_filament', 'low_filament_live', 'humidity'].includes(warning.kind))
        .map((warning) => {
            const slot = (slots ?? []).find((item) => item.index === warning.slot)
            const label = slot ? cfsSlotLabel(slot) : `slot ${warning.slot + 1}`
            return {
                id: `${warning.kind}-T${warning.tool}-S${warning.slot}-${file}`,
                priority: warning.kind === 'low_filament_live' ? 'high' : 'normal',
                description: cfsMappingWarningText(warning, label),
            }
        })
}
