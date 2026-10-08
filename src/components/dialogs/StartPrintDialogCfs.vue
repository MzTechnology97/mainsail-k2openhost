<template>
    <v-card-text class="cfs-map py-3 px-0 bt-1">
        <div v-if="waiting" class="cfs-map-waiting">
            <v-progress-circular indeterminate size="18" width="2" color="info" class="mr-3" />
            Reading the filament metadata of this G-code…
        </div>

        <v-alert v-else-if="!tools.length" dense text type="info" class="mx-6 mb-0">
            No OrcaSlicer filament metadata in this file: it starts with the normal Mainsail print.
        </v-alert>

        <template v-else>
            <div class="cfs-map-header">
                <div class="cfs-map-heading">
                    <h3>{{ mappingEnabled ? 'CFS filament mapping' : 'CFS filament metadata' }}</h3>
                    <div class="cfs-map-subtitle">
                        <template v-if="mappingEnabled">
                            Choose the CFS slot or the external spool for each slicer tool.
                        </template>
                        <template v-else>The CFS is read only: tools can be inspected but not mapped.</template>
                    </div>
                </div>
                <v-btn
                    v-if="mappingEnabled"
                    small
                    outlined
                    color="primary"
                    :disabled="!box.driver_ready"
                    @click="autoMap">
                    <v-icon left small>{{ mdiAutoFix }}</v-icon>
                    Auto map
                </v-btn>
            </div>

            <v-alert v-if="mappingEnabled && !box.driver_ready" dense text type="warning" class="mx-6 mb-2">
                CFS slots are not ready yet. Wait for the Box to finish discovery before starting.
            </v-alert>

            <div class="cfs-map-rows">
                <div
                    v-for="tool in tools"
                    :key="tool.tool"
                    class="cfs-map-row"
                    :class="`cfs-map-row--${quality(tool).kind}`">
                    <div class="cfs-map-tool">
                        <span class="cfs-map-badge">T{{ tool.tool }}</span>
                        <span class="cfs-map-spool" :style="{ background: toolColor(tool.color) }" />
                        <div class="cfs-map-text">
                            <div class="cfs-map-name">{{ tool.name || tool.material || 'Filament' }}</div>
                            <div class="cfs-map-meta">
                                <span class="cfs-map-material">{{ tool.material || '?' }}</span>
                                <span v-if="tool.color">{{ tool.color }}</span>
                            </div>
                        </div>
                    </div>

                    <template v-if="mappingEnabled">
                        <v-icon class="cfs-map-arrow">{{ mdiArrowRightThin }}</v-icon>
                        <div class="cfs-map-source">
                            <v-select
                                :value="mappedSlot(tool.tool)"
                                :items="slotItems"
                                item-text="text"
                                item-value="value"
                                item-disabled="disabled"
                                dense
                                outlined
                                hide-details
                                label="Filament source"
                                @change="setMapping(tool.tool, $event)">
                                <template #selection="{ item }">
                                    <div class="cfs-map-selection">
                                        <span class="cfs-source-dot mr-2" :style="{ backgroundColor: item.color }" />
                                        <span class="text-truncate">{{ item.text }}</span>
                                    </div>
                                </template>
                                <template #item="{ item }">
                                    <div class="d-flex align-center min-width-0 py-1">
                                        <span class="cfs-source-dot mr-3" :style="{ backgroundColor: item.color }" />
                                        <div class="min-width-0">
                                            <div class="body-2 text-truncate">{{ item.text }}</div>
                                            <div v-if="item.meta" class="caption text--secondary text-truncate">
                                                {{ item.meta }}
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </v-select>
                            <span class="cfs-map-quality" :class="`cfs-map-quality--${quality(tool).kind}`">
                                {{ quality(tool).text }}
                            </span>
                            <span v-if="filamentWarning(tool)" class="cfs-map-warning">
                                <v-icon x-small color="warning" class="mr-1">{{ mdiAlertOutline }}</v-icon>
                                {{ filamentWarning(tool) }}
                            </span>
                        </div>
                    </template>
                </div>
            </div>

            <template v-if="!mappingEnabled">
                <v-alert v-if="readOnlyBlocksNormalPrint" dense text type="warning" class="mx-6 mt-3 mb-0">
                    {{ tools.length }} tools were found. Read-only mode cannot translate the file's T commands, so Print
                    stays disabled. In operational mode each tool can be mapped to a CFS slot or the external spool.
                </v-alert>
                <v-alert v-else dense text type="info" class="mx-6 mt-3 mb-0">
                    One filament tool was found. It can come from a CFS slot or from filament already loaded from the
                    external spool, so Print stays available in read-only mode.
                </v-alert>
            </template>
            <v-alert v-else-if="!mappingValid" dense text type="warning" class="mx-6 mt-3 mb-0">
                Map every tool to a CFS slot with filament or to the external spool.
            </v-alert>
            <v-alert v-else-if="hasWarnings" dense text type="warning" class="mx-6 mt-3 mb-0">
                Warnings do not block the print. A spool that runs out pauses the print for runout, unless the runout
                swap finds an identical spool.
            </v-alert>
        </template>
    </v-card-text>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { FileStateGcodefile } from '@/store/files/types'
import { CfsBoxState, CfsPrintInfo, CfsPrintTool, CfsSlot } from '@/types/cfs'
import { cfsIsMaterialVariant, cfsNeededMetres, cfsSlotLabel } from '@/plugins/cfsLabels'
import { mdiAlertOutline, mdiArrowRightThin, mdiAutoFix } from '@mdi/js'

interface SlotItem {
    text: string
    value: number
    disabled: boolean
    color: string
    meta: string
}

@Component
export default class StartPrintDialogCfs extends Mixins(BaseMixin) {
    @Prop({ required: true }) declare readonly file: FileStateGcodefile
    @Prop({ required: true, default: '' }) declare readonly currentPath: string
    @Prop({ required: true, default: false }) declare readonly active: boolean

    mdiAlertOutline = mdiAlertOutline
    mdiArrowRightThin = mdiArrowRightThin
    mdiAutoFix = mdiAutoFix

    waiting = false
    requestedFilename: string | null = null
    mapping: Record<number, number | null> = {}

    get box(): CfsBoxState {
        return this.$store.state.printer.box as CfsBoxState
    }

    get mappingSupported(): boolean {
        return (this.box?.print_mapping_version ?? 0) >= 1
    }

    get mappingEnabled(): boolean {
        return this.mappingSupported && this.box?.print_mapping_enabled !== false
    }

    get fullFilename(): string {
        let filename = this.file?.filename ?? ''
        if (!filename.includes('/') && this.currentPath) filename = `${this.currentPath}/${filename}`
        return filename.replace(/^\/+/, '')
    }

    get printInfo(): CfsPrintInfo | null {
        const info = this.box?.print_info ?? null
        if (!info || info.filename !== this.fullFilename) return null
        return info
    }

    get tools(): CfsPrintTool[] {
        return this.printInfo?.tools ?? []
    }

    get slotItems(): SlotItem[] {
        return (this.box?.slots ?? [])
            .slice()
            .sort((a, b) => a.index - b.index)
            .map((slot) => ({
                text: this.slotText(slot),
                value: slot.index,
                disabled: !slot.external && !slot.present,
                color: this.slotColor(slot),
                meta: this.slotMeta(slot),
            }))
    }

    get readOnlyBlocksNormalPrint(): boolean {
        return !this.mappingEnabled && !this.waiting && this.tools.length > 1
    }

    get requiresMapping(): boolean {
        return this.mappingEnabled && !this.waiting && this.tools.length > 0
    }

    get mappingValid(): boolean {
        if (!this.requiresMapping) return true
        if (!this.box?.driver_ready) return false

        return this.tools.every((tool) => {
            const mapped = this.mapping[tool.tool]
            if (mapped === null || mapped === undefined) return false
            const slot = this.box.slots.find((item) => item.index === mapped)
            return !!slot && (slot.external || slot.present)
        })
    }

    get canStart(): boolean {
        if (this.waiting) return false
        if (!this.mappingEnabled) return !this.readOnlyBlocksNormalPrint
        return !this.requiresMapping || this.mappingValid
    }

    mappedSlot(tool: number): number | null {
        return this.mapping[tool] ?? null
    }

    setMapping(tool: number, slot: number | null): void {
        this.$set(this.mapping, tool, slot)
        this.emitState()
    }

    toolColor(color: string): string {
        return /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : '#757575'
    }

    slotColor(slot: CfsSlot): string {
        return /^#[0-9a-f]{6}$/i.test(slot.color ?? '') ? slot.color : '#757575'
    }

    slotText(slot: CfsSlot): string {
        const label = cfsSlotLabel(slot)
        const identity = slot.name || slot.material || (slot.present ? 'Filament present' : 'Empty')
        const suffix = slot.loaded ? ' · loaded' : ''
        return `${label} · ${identity}${suffix}`
    }

    slotMeta(slot: CfsSlot): string {
        const parts = [slot.material, slot.brand].filter(Boolean)
        if (typeof slot.rfid_percent === 'number' && Number.isFinite(slot.rfid_percent)) {
            parts.push(`${Math.max(0, Math.min(100, slot.rfid_percent)).toFixed(0)}% remaining`)
        }
        return parts.join(' · ')
    }

    /** How well the chosen source matches the slicer tool. */
    quality(tool: CfsPrintTool): { kind: 'exact' | 'material' | 'other' | 'none' | 'info'; text: string } {
        if (!this.mappingEnabled) return { kind: 'info', text: '' }
        const mapped = this.mapping[tool.tool]
        const slot = this.box?.slots?.find((item) => item.index === mapped)
        if (mapped === null || mapped === undefined || !slot) return { kind: 'none', text: 'Not mapped' }
        if (slot.external && !slot.material) return { kind: 'material', text: 'External spool' }
        const material = this.normalize(tool.material)
        if (material && this.normalize(slot.material) !== material) {
            if (cfsIsMaterialVariant(tool.material, slot.material)) {
                return { kind: 'other', text: `Material variant: ${tool.material} on ${slot.material}` }
            }
            return { kind: 'other', text: `Different material (${slot.material || 'not set'})` }
        }
        if (this.normalize(tool.color) && this.normalize(slot.color) === this.normalize(tool.color)) {
            return { kind: 'exact', text: 'Same material and colour' }
        }
        return { kind: 'material', text: 'Same material' }
    }

    normalize(value: string): string {
        return (value ?? '').trim().toUpperCase()
    }

    /** Known filament for a slot, plus identical spools when runout swap is on; null = unknown. */
    availableMetres(slot: CfsSlot): number | null {
        const own = slot.rfid_remaining_m
        if (typeof own !== 'number' || !Number.isFinite(own)) return null
        if (!this.box?.runout_swap_enabled || slot.external) return own
        let total = own
        for (const other of this.box.slots) {
            if (other.index === slot.index || other.external || !other.present) continue
            if (this.normalize(other.material) !== this.normalize(slot.material)) continue
            if (this.normalize(other.color) !== this.normalize(slot.color)) continue
            if (typeof other.rfid_remaining_m !== 'number' || !Number.isFinite(other.rfid_remaining_m)) return null
            total += other.rfid_remaining_m
        }
        return total
    }

    /** Warning when the chosen spool may run out before this tool is done. */
    filamentWarning(tool: CfsPrintTool): string {
        if (!this.mappingEnabled) return ''
        const slot = this.box?.slots?.find((item) => item.index === this.mapping[tool.tool])
        if (!slot) return ''
        const warnings: string[] = []
        const needed = cfsNeededMetres(tool.length_mm)
        const available = needed === null ? null : this.availableMetres(slot)
        if (needed !== null && available !== null && available < needed) {
            warnings.push(`May run out: about ${available.toFixed(1)} m left, about ${needed.toFixed(1)} m needed`)
        }
        const humidity = slot.humidity_pct
        const limit = slot.humidity_limit_pct
        if (typeof humidity === 'number' && typeof limit === 'number' && humidity > limit) {
            warnings.push(`Humid CFS: ${humidity}% (above ${limit}% for ${slot.material || 'this material'})`)
        }
        return warnings.join(' · ')
    }

    get hasWarnings(): boolean {
        return this.tools.some(
            (tool) => !!this.filamentWarning(tool) || this.quality(tool).text.startsWith('Material variant')
        )
    }

    autoMap(): void {
        if (!this.mappingEnabled) {
            this.mapping = {}
            this.emitState()
            return
        }

        const slots = (this.box?.slots ?? []).slice().sort((a, b) => a.index - b.index)
        const next: Record<number, number | null> = {}
        const backend = this.box?.auto_mapping
        if (backend && (backend.state === 'ready' || backend.state === 'unresolved')) {
            for (const tool of this.tools) {
                const suggested = backend.map[String(tool.tool)]
                const slot = slots.find((item) => item.index === suggested)
                next[tool.tool] = slot && (slot.external || slot.present) ? suggested : null
            }
            this.mapping = next
            this.emitState()
            return
        }

        const physical = slots.filter((slot) => !slot.external && slot.present)
        const external = slots.find((slot) => slot.external)
        const used = new Set<number>()

        for (const tool of this.tools) {
            const material = this.normalize(tool.material)
            const color = this.normalize(tool.color)
            const unusedPhysical = physical.filter((slot) => !used.has(slot.index))

            const exactMatch = (slot: CfsSlot): boolean =>
                !!material &&
                this.normalize(slot.material) === material &&
                !!color &&
                this.normalize(slot.color) === color
            const materialMatch = (slot: CfsSlot): boolean => !!material && this.normalize(slot.material) === material

            // Prefer an actual matching CFS spool. Never silently map a tool
            // to an unrelated physical CFS slot just because that slot is populated.
            let selected = unusedPhysical.find(exactMatch) ?? physical.find(exactMatch)
            if (!selected && external && exactMatch(external)) selected = external
            if (!selected) selected = unusedPhysical.find(materialMatch) ?? physical.find(materialMatch)
            if (!selected && external && materialMatch(external)) selected = external

            // A filament that is already in the hotend is the best fallback,
            // including the external spool path reported by Box as EXT.
            if (!selected) selected = slots.find((slot) => slot.loaded)

            // If no source matches, keep the tool unresolved. The user may
            // still choose the external spool explicitly, but Auto map must not
            // silently route an unrelated filament there.
            next[tool.tool] = selected?.index ?? null
            if (selected && !selected.external) used.add(selected.index)
        }

        this.mapping = next
        this.emitState()
    }

    inspect(): void {
        if (!this.active || !this.mappingSupported || !this.fullFilename) {
            this.waiting = false
            this.emitState()
            return
        }

        this.requestedFilename = this.fullFilename
        this.waiting = true
        this.mapping = {}
        this.emitState()

        const command = `BOX_PRINT_INFO FILENAME="${this.escapeGcode(this.fullFilename)}"`
        this.$store.dispatch('server/addEvent', { message: command, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script: command })

        if (this.box?.print_info?.filename === this.fullFilename) {
            this.applyPrintInfo(this.box.print_info)
        }
    }

    applyPrintInfo(info: CfsPrintInfo | null | undefined): void {
        if (!info || info.filename !== this.requestedFilename) return
        this.waiting = false
        if (this.mappingEnabled) {
            this.autoMap()
            return
        }
        this.mapping = {}
        this.emitState()
    }

    startMappedPrint(filename: string): boolean {
        if (!this.mappingEnabled || !this.requiresMapping) return false
        if (!this.mappingValid) return true

        const map = this.tools.map((tool) => `${tool.tool}:${this.mapping[tool.tool]}`).join(',')
        const command = `BOX_PRINT_START FILENAME="${this.escapeGcode(filename)}" MAP="${map}"`
        this.$store.dispatch('server/addEvent', { message: command, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script: command }, { action: 'switchToDashboard' })
        return true
    }

    escapeGcode(value: string): string {
        return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    }

    emitState(): void {
        this.$emit('state', {
            canStart: this.canStart,
            requiresMapping: this.requiresMapping,
            mappingValid: this.mappingValid,
            waiting: this.waiting,
        })
    }

    @Watch('active')
    onActiveChanged(active: boolean): void {
        if (active) this.inspect()
    }

    @Watch('fullFilename')
    onFilenameChanged(): void {
        if (this.active) this.inspect()
    }

    @Watch('box.print_info', { deep: true })
    onPrintInfoChanged(info: CfsPrintInfo | null | undefined): void {
        this.applyPrintInfo(info)
    }

    @Watch('box.print_mapping_enabled')
    onMappingEnabledChanged(): void {
        if (this.active && this.printInfo) this.applyPrintInfo(this.printInfo)
        else this.emitState()
    }

    @Watch('box.auto_mapping', { deep: true })
    onAutoMappingChanged(): void {
        if (!this.active || !this.mappingEnabled || !this.printInfo) return
        const state = this.box?.auto_mapping?.state
        if (state === 'ready' || state === 'unresolved') this.autoMap()
    }

    @Watch('box.driver_ready')
    onDriverReadyChanged(): void {
        this.emitState()
    }

    mounted(): void {
        if (this.active) this.inspect()
        else this.emitState()
    }
}
</script>

<style scoped>
.cfs-map-waiting {
    display: flex;
    align-items: center;
    padding: 8px 24px;
    opacity: 0.8;
}

.cfs-map-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 24px 10px;
}

.cfs-map-heading {
    flex: 1 1 auto;
    min-width: 0;
}

.cfs-map-heading h3 {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.75;
}

.cfs-map-subtitle {
    font-size: 0.78rem;
    opacity: 0.7;
}

.cfs-map-rows {
    display: grid;
    gap: 8px;
    padding: 0 24px;
}

.cfs-map-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1.1fr);
    align-items: center;
    gap: 8px 10px;
    padding: 10px 12px;
    border: 1px solid rgba(128, 128, 128, 0.28);
    border-left-width: 4px;
    border-radius: 10px;
    background: rgba(128, 128, 128, 0.06);
}

.cfs-map-row--exact {
    border-left-color: var(--v-success-base);
}

.cfs-map-row--material {
    border-left-color: var(--v-info-base);
}

.cfs-map-row--other {
    border-left-color: var(--v-warning-base);
}

.cfs-map-row--none {
    border-left-color: var(--v-error-base);
}

.cfs-map-row--info {
    grid-template-columns: minmax(0, 1fr);
}

.cfs-map-tool {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.cfs-map-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 22px;
    padding: 0 6px;
    border-radius: 11px;
    background: rgba(128, 128, 128, 0.25);
    font-size: 0.78rem;
    font-weight: 800;
}

/* Spool in the slicer colour, same style as the library cards. */
.cfs-map-spool {
    position: relative;
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.35),
        inset 0 0 0 1px rgba(255, 255, 255, 0.2),
        0 0 0 1px rgba(128, 128, 128, 0.5);
}

.cfs-map-spool::after {
    content: '';
    position: absolute;
    inset: 10px;
    border-radius: 50%;
    background: rgba(20, 20, 20, 0.88);
}

.cfs-map-text {
    min-width: 0;
}

.cfs-map-name {
    overflow: hidden;
    font-size: 0.9rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cfs-map-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    opacity: 0.85;
}

.cfs-map-material {
    padding: 0 6px;
    border-radius: 6px;
    background: rgba(128, 128, 128, 0.22);
    font-weight: 700;
}

.cfs-map-arrow {
    opacity: 0.7;
}

.cfs-map-source {
    display: grid;
    gap: 4px;
    min-width: 0;
}

.cfs-map-quality {
    font-size: 0.72rem;
    font-weight: 600;
}

.cfs-map-quality--exact {
    color: var(--v-success-base);
}

.cfs-map-quality--material {
    color: var(--v-info-base);
}

.cfs-map-quality--other {
    color: var(--v-warning-base);
}

.cfs-map-quality--none {
    color: var(--v-error-base);
}

.cfs-map-warning {
    display: flex;
    align-items: center;
    color: var(--v-warning-base);
    font-size: 0.72rem;
    font-weight: 600;
}

.cfs-map-selection {
    display: flex;
    align-items: center;
    min-width: 0;
    padding: 4px 0;
}

.cfs-source-dot {
    display: inline-block;
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(128, 128, 128, 0.6);
}

@media (max-width: 600px) {
    .cfs-map-header,
    .cfs-map-rows {
        padding-left: 16px;
        padding-right: 16px;
    }

    .cfs-map-row {
        grid-template-columns: minmax(0, 1fr);
    }

    .cfs-map-arrow {
        justify-self: center;
        transform: rotate(90deg);
    }
}
</style>
