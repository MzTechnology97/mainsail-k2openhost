<template>
    <v-card-text class="py-3 px-0 bt-1">
        <div v-if="waiting" class="px-6 py-2 d-flex align-center text--secondary">
            <v-progress-circular indeterminate size="18" width="2" class="mr-3" />
            Reading CFS filament metadata from the G-code…
        </div>

        <v-alert v-else-if="!tools.length" dense text type="info" class="mx-6 mb-0">
            No Orca filament-usage metadata was found. Mainsail will use the normal print start path.
        </v-alert>

        <template v-else-if="!mappingEnabled">
            <div class="px-6 pb-2">
                <div class="text-subtitle-2 font-weight-bold">CFS filament metadata</div>
                <div class="caption text--secondary">
                    The CFS is currently read only. Filament metadata can still be inspected, but CFS slot mapping cannot be applied.
                </div>
            </div>

            <v-row
                v-for="(tool, index) in tools"
                :key="tool.tool"
                no-gutters
                :class="{ 'bt-1': index > 0 }"
                class="px-6 py-2">
                <v-col cols="12" class="d-flex align-center">
                    <div class="cfs-tool-color mr-3" :style="{ backgroundColor: toolColor(tool.color) }" />
                    <div class="overflow-hidden">
                        <div class="text-subtitle-1 font-weight-bold">T{{ tool.tool }}</div>
                        <div class="body-2 text-truncate">{{ tool.name || tool.material || 'Filament' }}</div>
                        <div class="caption text--secondary text-truncate">
                            {{ tool.material || 'Unknown material' }}
                            <template v-if="tool.color"> · {{ tool.color }}</template>
                        </div>
                    </div>
                </v-col>
            </v-row>

            <v-alert v-if="readOnlyBlocksNormalPrint" dense text type="warning" class="mx-6 mt-3 mb-0">
                {{ tools.length }} tools were detected in this G-code. CFS mapping is unavailable in read-only mode, so normal Print is disabled to avoid starting a multimaterial job without a tool-to-slot map.
            </v-alert>
            <v-alert v-else dense text type="info" class="mx-6 mt-3 mb-0">
                A single filament tool was detected. CFS mapping is unavailable in read-only mode, but this file can still be started normally.
            </v-alert>
        </template>

        <template v-else>
            <div class="px-6 pb-2 d-flex align-center">
                <div>
                    <div class="text-subtitle-2 font-weight-bold">CFS filament mapping</div>
                    <div class="caption text--secondary">Assign every slicer tool to a CFS slot before printing.</div>
                </div>
                <v-spacer />
                <v-btn small text color="primary" :disabled="!box.driver_ready" @click="autoMap">
                    Auto map
                </v-btn>
            </div>

            <v-alert v-if="!box.driver_ready" dense text type="warning" class="mx-6 mb-2">
                CFS slots are not ready yet. Wait for Box discovery before starting the mapped print.
            </v-alert>

            <v-row
                v-for="(tool, index) in tools"
                :key="tool.tool"
                no-gutters
                :class="{ 'bt-1': index > 0 }"
                class="px-6 py-2">
                <v-col cols="12" sm="6" class="d-flex align-center pr-sm-3 mb-2 mb-sm-0">
                    <div class="cfs-tool-color mr-3" :style="{ backgroundColor: toolColor(tool.color) }" />
                    <div class="overflow-hidden">
                        <div class="text-subtitle-1 font-weight-bold">T{{ tool.tool }}</div>
                        <div class="body-2 text-truncate">{{ tool.name || tool.material || 'Filament' }}</div>
                        <div class="caption text--secondary text-truncate">
                            {{ tool.material || 'Unknown material' }}
                            <template v-if="tool.color"> · {{ tool.color }}</template>
                        </div>
                    </div>
                </v-col>

                <v-col cols="12" sm="6" class="d-flex align-center">
                    <v-select
                        :value="mappedSlot(tool.tool)"
                        :items="slotItems"
                        item-text="text"
                        item-value="value"
                        item-disabled="disabled"
                        dense
                        outlined
                        hide-details
                        label="CFS slot"
                        @change="setMapping(tool.tool, $event)" />
                </v-col>
            </v-row>

            <v-alert v-if="!mappingValid" dense text type="warning" class="mx-6 mt-3 mb-0">
                Map every used tool to a present CFS slot or to the external spool.
            </v-alert>
        </template>
    </v-card-text>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { FileStateGcodefile } from '@/store/files/types'
import { CfsBoxState, CfsPrintInfo, CfsPrintTool, CfsSlot } from '@/types/cfs'

interface SlotItem {
    text: string
    value: number
    disabled: boolean
}

@Component
export default class StartPrintDialogCfs extends Mixins(BaseMixin) {
    @Prop({ required: true }) declare readonly file: FileStateGcodefile
    @Prop({ required: true, default: '' }) declare readonly currentPath: string
    @Prop({ required: true, default: false }) declare readonly active: boolean

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

    slotText(slot: CfsSlot): string {
        const label = slot.external ? 'External' : `T${slot.index}`
        const identity = slot.name || slot.material || (slot.present ? 'Filament present' : 'Empty')
        const suffix = slot.loaded ? ' · loaded' : ''
        return `${label} · ${identity}${suffix}`
    }

    normalize(value: string): string {
        return (value ?? '').trim().toUpperCase()
    }

    autoMap(): void {
        if (!this.mappingEnabled) {
            this.mapping = {}
            this.emitState()
            return
        }

        const slots = (this.box?.slots ?? []).slice().sort((a, b) => a.index - b.index)
        const used = new Set<number>()
        const next: Record<number, number | null> = {}

        for (const tool of this.tools) {
            const physical = slots.filter((slot) => !slot.external && slot.present)
            const external = slots.filter((slot) => slot.external)
            const candidates = [...physical.filter((slot) => !used.has(slot.index)), ...physical, ...external]

            const material = this.normalize(tool.material)
            const color = this.normalize(tool.color)

            let selected = candidates.find(
                (slot) =>
                    material &&
                    this.normalize(slot.material) === material &&
                    color &&
                    this.normalize(slot.color) === color
            )
            if (!selected) {
                selected = candidates.find((slot) => material && this.normalize(slot.material) === material)
            }
            if (!selected) selected = candidates.find((slot) => slot.loaded)
            if (!selected) selected = candidates[0]

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
.cfs-tool-color {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    flex: 0 0 auto;
    border: 1px solid rgba(127, 127, 127, 0.55);
    box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.08);
}
</style>
