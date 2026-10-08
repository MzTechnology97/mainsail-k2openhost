/**
 * OrcaSlicer preset ID of a CFS filament (kalico-k2pro box_orca).
 *
 * Every filament, system profiles included, carries the OrcaSlicer
 * `filament_id` of its preset: a default Kalico derives from OrcaSlicer's K2
 * Pro presets, or an override set here. The filament's own ID, name and RFID
 * codes are never changed by it.
 */
import { CfsFilament, CfsOrcaPreset } from '@/types/cfs'

/** Same rule as the backend (box_orca.ORCA_ID_RE). */
const ORCA_ID_RE = /^[A-Za-z0-9_.+-]{1,40}$/

export function cfsOrcaIdValid(value: unknown): boolean {
    const text = String(value ?? '').trim()
    return text === '' || ORCA_ID_RE.test(text)
}

/** "Hyper PLA" from "Hyper PLA @K2 Pro-all". */
export function cfsOrcaPresetShortName(name: string): string {
    const text = String(name ?? '').trim()
    const at = text.indexOf('@')
    return (at > 0 ? text.substring(0, at) : text).trim()
}

export function cfsOrcaPresetName(presets: CfsOrcaPreset[] | undefined, id: string): string {
    const preset = (presets ?? []).find((item) => item.id === id)
    return preset ? preset.name : ''
}

/** Search text of a preset: name, ID, vendor and type. */
export function cfsOrcaPresetMatches(preset: CfsOrcaPreset, query: string): boolean {
    const words = String(query ?? '')
        .toLocaleLowerCase()
        .split(/\s+/)
        .filter(Boolean)
    if (!words.length) return true
    const text = `${preset.name} ${preset.id} ${preset.vendor} ${preset.type}`.toLocaleLowerCase()
    return words.every((word) => text.includes(word))
}

/** Presets of the filament's material first, then the others, each by name. */
export function cfsOrcaPresetsFor(presets: CfsOrcaPreset[] | undefined, material: string): CfsOrcaPreset[] {
    const type = String(material ?? '')
        .trim()
        .toUpperCase()
    const rank = (preset: CfsOrcaPreset) => (type && preset.type.toUpperCase() === type ? 0 : 1)
    return [...(presets ?? [])].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
}

/**
 * The command that saves `value` as the filament's OrcaSlicer ID, or null when
 * nothing changes. An empty value, or the default, goes back to the default.
 */
export function cfsOrcaCommand(
    filament: Pick<CfsFilament, 'id' | 'orca_filament_id' | 'orca_filament_id_default' | 'orca_filament_id_custom'>,
    value: string,
    quote: (text: string) => string
): string | null {
    const wanted = String(value ?? '').trim()
    if (!cfsOrcaIdValid(wanted)) return null
    const current = filament.orca_filament_id ?? ''
    const fallback = filament.orca_filament_id_default ?? ''
    const id = quote(filament.id)
    if (!wanted || wanted === fallback) {
        return filament.orca_filament_id_custom ? `_BOX_FILAMENT_ORCA_ID ID=${id} RESET=1` : null
    }
    if (wanted === current) return null
    return `_BOX_FILAMENT_ORCA_ID ID=${id} ORCA_ID=${quote(wanted)}`
}

/** Library card badge: the preset name (or the bare ID of a user preset). */
export function cfsOrcaBadge(filament: CfsFilament): { text: string; title: string; kind?: 'info' } | null {
    const id = filament.orca_filament_id ?? ''
    if (!id) return null
    const name = cfsOrcaPresetShortName(filament.orca_preset ?? '')
    return {
        text: `Orca: ${name || id}`,
        title: `OrcaSlicer preset ${filament.orca_preset || '(your preset)'} · filament_id ${id}${
            filament.orca_filament_id_custom ? ' · set by you' : ' · default'
        }`,
        ...(filament.orca_filament_id_custom ? { kind: 'info' as const } : {}),
    }
}
