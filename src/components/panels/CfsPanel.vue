[Reading 942 lines from start (total: 942 lines, 0 remaining)]

[Reading 938 lines from start (total: 938 lines, 0 remaining)]

<template>
    <panel v-if="showPanel" :icon="mdiPackageVariantClosed" :title="title" :collapsible="true" card-class="cfs-panel">
        <template #buttons>
            <v-btn icon tile title="Filament library" @click="openFilamentManager">
                <v-icon>{{ mdiDatabase }}</v-icon>
            </v-btn>
            <v-btn
                icon
                tile
                :disabled="!box.driver_ready || printerIsPrinting"
                :loading="loadings.includes('cfs_rfid_scan')"
                title="Scan RFID in all populated CFS slots"
                @click="scanAllRfid">
                <v-icon>{{ mdiNfcSearchVariant }}</v-icon>
            </v-btn>
            <v-btn
                icon
                tile
                :disabled="!canUnload"
                :loading="loadings.includes('cfs_unload')"
                :title="$t('Panels.MmuPanel.ButtonUnload')"
                @click="sendCommand('BOX_UNLOAD', 'cfs_unload')">
                <v-icon>{{ mdiEject }}</v-icon>
            </v-btn>
            <v-menu left offset-y :close-on-content-click="false">
                <template #activator="{ on, attrs }">
                    <v-btn icon tile v-bind="attrs" v-on="on">
                        <v-icon>{{ mdiCog }}</v-icon>
                    </v-btn>
                </template>
                <v-list dense min-width="330">
                    <v-list-item :disabled="readOnlyMode" @click="toggleSetting('_BOX_SET_RUNOUT_SWAP', 'runout_swap_enabled')">
                        <v-list-item-icon><v-icon>{{ mdiSwapHorizontal }}</v-icon></v-list-item-icon>
                        <v-list-item-content><v-list-item-title><code>runout_swap</code></v-list-item-title></v-list-item-content>
                        <v-list-item-action>
                            <v-switch :input-value="box.runout_swap_enabled" readonly inset hide-details />
                        </v-list-item-action>
                    </v-list-item>
                    <v-list-item :disabled="readOnlyMode" @click="toggleSetting('_BOX_SET_UNLOAD_AFTER_PRINT', 'unload_after_print_enabled')">
                        <v-list-item-icon><v-icon>{{ mdiTrayArrowUp }}</v-icon></v-list-item-icon>
                        <v-list-item-content><v-list-item-title><code>unload_after_print</code></v-list-item-title></v-list-item-content>
                        <v-list-item-action>
                            <v-switch :input-value="box.unload_after_print_enabled" readonly inset hide-details />
                        </v-list-item-action>
                    </v-list-item>
                    <v-divider />
                    <v-list-item :disabled="readOnlyMode" @click="toggleSetting('_BOX_SET_RFID_INSERT_READING', 'rfid_insert_reading_enabled')">
                        <v-list-item-icon><v-icon>{{ mdiNfc }}</v-icon></v-list-item-icon>
                        <v-list-item-content><v-list-item-title><code>RFID insert</code></v-list-item-title></v-list-item-content>
                        <v-list-item-action>
                            <v-switch :input-value="box.rfid_insert_reading_enabled" readonly inset hide-details />
                        </v-list-item-action>
                    </v-list-item>
                    <v-list-item :disabled="readOnlyMode" @click="toggleSetting('_BOX_SET_RFID_STARTUP_READING', 'rfid_startup_reading_enabled')">
                        <v-list-item-icon><v-icon>{{ mdiNfcVariant }}</v-icon></v-list-item-icon>
                        <v-list-item-content><v-list-item-title><code>RFID startup</code></v-list-item-title></v-list-item-content>
                        <v-list-item-action>
                            <v-switch :input-value="box.rfid_startup_reading_enabled" readonly inset hide-details />
                        </v-list-item-action>
                    </v-list-item>
                </v-list>
            </v-menu>
        </template>

        <v-card-text class="pt-3">
            <div class="d-flex align-center flex-wrap mb-3">
                <v-chip small :color="statusColor" class="mr-2 mb-1" outlined>
                    <v-icon left small>{{ statusIcon }}</v-icon>
                    {{ box.status }} / {{ displayState }}
                </v-chip>
                <v-chip v-if="readOnlyMode" small color="warning" class="mr-2 mb-1" outlined>
                    Read only
                </v-chip>
                <v-chip small class="mr-2 mb-1" outlined :title="temperatureHint">
                    <v-icon left small>{{ mdiThermometer }}</v-icon>
                    {{ temperatureText }}
                </v-chip>
                <v-chip small class="mr-2 mb-1" outlined :title="humidityHint">
                    <v-icon left small>{{ mdiWaterPercent }}</v-icon>
                    {{ humidityText }}
                </v-chip>
                <v-chip small class="mr-2 mb-1" outlined>API v{{ box.api_version }}</v-chip>
                <v-chip v-if="box.filament_inventory_version" small class="mr-2 mb-1" outlined>
                    Inventory v{{ box.filament_inventory_version }}
                </v-chip>
            </div>

            <v-alert v-if="box.recovery.blocked" dense text type="warning" class="mb-3">
                <div>{{ recoveryText }}</div>
                <v-btn
                    v-if="box.recovery.retry_command"
                    x-small
                    color="warning"
                    class="mt-2"
                    :disabled="readOnlyMode"
                    @click="sendCommand(box.recovery.retry_command, 'cfs_recovery')">
                    {{ $t('Panels.MmuPanel.ButtonRecover') }}
                </v-btn>
            </v-alert>

            <div class="cfs-slot-grid">
                <v-card
                    v-for="slot in cfsSlots"
                    :key="slot.index"
                    outlined
                    :class="['cfs-slot-card', slotCardClass(slot)]">
                    <v-card-text class="cfs-slot-body pa-2">
                        <div class="cfs-slot-main">
                            <v-tooltip bottom :disabled="!slotTooltip(slot)">
                                <template #activator="{ on, attrs }">
                                    <div class="cfs-spool mr-3" v-bind="attrs" v-on="on">
                                        <div class="cfs-spool-ring" :style="spoolRingStyle(slot)" />
                                        <div
                                            class="cfs-spool-hole"
                                            :class="{ 'cfs-spool-hole--percent': !!spoolPercentLabel(slot) }">
                                            <span v-if="spoolPercentLabel(slot)" class="cfs-spool-percent">
                                                {{ spoolPercentLabel(slot) }}
                                            </span>
                                            <span
                                                v-else
                                                class="cfs-spool-core"
                                                :style="{ backgroundColor: slotColor(slot) }" />
                                        </div>
                                    </div>
                                </template>
                                <span>{{ slotTooltip(slot) }}</span>
                            </v-tooltip>
                            <div class="cfs-slot-details">
                                <div class="d-flex align-center flex-wrap">
                                    <strong class="cfs-slot-label">{{ slotLabel(slot) }}</strong>
                                    <v-chip v-if="slot.loaded" x-small color="primary" class="ml-2 mb-1">
                                        {{ $t('Panels.MmuPanel.Active') }}
                                    </v-chip>
                                    <v-chip
                                        v-if="slot.material || slot.filament_id || slotRfidManaged(slot)"
                                        x-small
                                        outlined
                                        class="ml-2 mb-1">
                                        {{ sourceLabel(slot) }}
                                    </v-chip>
                                </div>
                                <div class="cfs-slot-name" :title="slotDisplayName(slot)">
                                    {{ slotDisplayName(slot) }}
                                </div>
                                <div class="cfs-slot-meta text--secondary" :title="slotMeta(slot)">
                                    {{ slotMeta(slot) }}
                                </div>
                                <div v-if="slotRemainingText(slot)" class="cfs-slot-remaining">
                                    {{ slotRemainingText(slot) }}
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                    <v-divider />
                    <v-card-actions class="cfs-slot-actions pa-2">
                        <v-btn
                            v-if="!slot.external"
                            icon
                            small
                            color="primary"
                            :disabled="!canSelectSlot(slot)"
                            :loading="loadings.includes(`cfs_slot_${slot.index}`)"
                            :title="$t('Panels.MmuPanel.ButtonLoad')"
                            :aria-label="$t('Panels.MmuPanel.ButtonLoad')"
                            @click="selectSlot(slot)">
                            <v-icon small>{{ mdiPlay }}</v-icon>
                        </v-btn>
                        <v-btn
                            v-else
                            small
                            text
                            :disabled="printerIsPrinting"
                            title="External spool / RFID settings"
                            @click.stop="openSlotDialog(slot)">
                            <v-icon left small>{{ mdiNfc }}</v-icon>
                            RFID
                        </v-btn>
                        <v-btn
                            v-if="!slot.external && slot.present"
                            icon
                            small
                            :disabled="printerIsPrinting || !box.driver_ready"
                            :loading="loadings.includes(`cfs_rfid_slot_${slot.index}`)"
                            title="Reread RFID for this slot"
                            @click.stop="forceRfidRead(slot)">
                            <v-icon small>{{ mdiRefresh }}</v-icon>
                        </v-btn>
                        <v-btn
                            v-if="slot.rfid_unknown_code"
                            small
                            text
                            color="warning"
                            :disabled="printerIsPrinting"
                            title="Create a filament profile for this RFID tag"
                            @click.stop="resolveUnknownRfid(slot)">
                            <v-icon left small>{{ mdiNfcVariant }}</v-icon>
                            RFID ?
                        </v-btn>
                        <v-btn
                            v-else-if="slotRfidManaged(slot)"
                            small
                            text
                            class="cfs-slot-info"
                            title="RFID filament information"
                            @click.stop="openRfidInfo(slot)">
                            <v-icon left small>{{ mdiNfcVariant }}</v-icon>
                            RFID
                        </v-btn>
                        <v-btn
                            v-else
                            icon
                            small
                            color="primary"
                            class="cfs-edit-slot"
                            :disabled="printerIsPrinting"
                            title="View or edit manual slot filament"
                            aria-label="Edit slot filament"
                            @click.stop="openSlotDialog(slot)">
                            <v-icon small>{{ mdiPencil }}</v-icon>
                        </v-btn>
                        <v-spacer />
                        <v-icon v-if="slot.present" small color="success">{{ mdiCheckCircle }}</v-icon>
                        <v-icon v-else small color="grey">{{ mdiCircleOutline }}</v-icon>
                    </v-card-actions>
                </v-card>
            </div>

            <div v-if="box.runout_swap_enabled && runoutSequenceSlots.length" class="cfs-runout mt-3 pa-2">
                <div class="caption font-weight-bold mb-1">Active runout swap sequence</div>
                <div class="d-flex flex-wrap align-center">
                    <template v-for="(slot, index) in runoutSequenceSlots">
                        <v-chip :key="`runout-${slot.index}`" x-small outlined>
                            T{{ slot.index }}
                            <template v-if="slot.rfid_percent !== null"> · {{ formatPercent(slot.rfid_percent) }}</template>
                        </v-chip>
                        <span v-if="index < runoutSequenceSlots.length - 1" :key="`arrow-${slot.index}`" class="mx-1">→</span>
                    </template>
                    <span v-if="runoutUsesRemaining" class="ml-2 caption text--secondary">
                        lowest RFID remaining first
                    </span>
                </div>
            </div>

            <div v-if="box.runout_swap_enabled && box.runout_groups.length" class="cfs-runout mt-2 pa-2">
                <div class="caption font-weight-bold mb-1">Recognized runout swap groups</div>
                <div v-for="group in box.runout_groups" :key="`${group.material}-${group.color}`" class="d-flex flex-wrap align-center mb-1">
                    <span class="caption mr-2">
                        {{ group.material }} · {{ group.color }}
                        <template v-if="group.strategy === 'lowest_remaining_first'"> · lowest remaining first</template>
                    </span>
                    <template v-for="(item, index) in group.detail">
                        <v-chip :key="`group-${group.material}-${item.slot}`" x-small outlined>
                            T{{ item.slot }}
                            <template v-if="item.percent !== null"> · {{ formatPercent(item.percent) }}</template>
                        </v-chip>
                        <span v-if="index < group.detail.length - 1" :key="`group-arrow-${group.material}-${item.slot}`" class="mx-1">→</span>
                    </template>
                </div>
            </div>

            <v-divider class="my-3" />
            <div class="d-flex flex-wrap align-center caption text--secondary">
                <span class="mr-4">
                    <v-icon x-small class="mr-1">{{ mdiPrinter3dNozzle }}</v-icon>
                    {{
                        box.filament_detected
                            ? $t('Panels.MiscellaneousPanel.RunoutSensor.Detected')
                            : $t('Panels.MiscellaneousPanel.RunoutSensor.Empty')
                    }}
                </span>
                <span class="mr-4">
                    <v-icon x-small class="mr-1">{{ mdiTransitConnectionVariant }}</v-icon>
                    {{ loadPathText }}
                </span>
                <span :class="{ 'error--text': box.load_path.clog_detection.triggered }">
                    <v-icon x-small class="mr-1" :color="box.load_path.clog_detection.triggered ? 'error' : undefined">
                        {{ mdiAlertCircleOutline }}
                    </v-icon>
                    {{ $t('Panels.MmuPanel.ClogTangleDetection') }}: {{ box.load_path.clog_detection.state }}
                </span>
            </div>
        </v-card-text>

        <cfs-filament-manager-dialog
            v-model="showFilamentManager"
            :box="box"
            :read-only="printerIsPrinting"
            :prefill-rfid-code="pendingRfidCode"
            :prefill-color="pendingRfidColor" />
        <cfs-slot-filament-dialog
            :key="`cfs-slot-dialog-${editingSlot ? editingSlot.index : 'none'}-${slotDialogNonce}`"
            :value="showSlotDialog"
            :cfs-slot="editingSlot"
            :box="box"
            @input="showSlotDialog = $event" />
    </panel>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import {
    mdiAlertCircleOutline,
    mdiCheckCircle,
    mdiCircleOutline,
    mdiCog,
    mdiDatabase,
    mdiEject,
    mdiNfc,
    mdiNfcSearchVariant,
    mdiNfcVariant,
    mdiPackageVariantClosed,
    mdiPencil,
    mdiPlay,
    mdiRefresh,
    mdiPrinter3dNozzle,
    mdiSwapHorizontal,
    mdiThermometer,
    mdiTransitConnectionVariant,
    mdiTrayArrowUp,
    mdiWaterPercent,
} from '@mdi/js'
import BaseMixin from '@/components/mixins/base'
import Panel from '@/components/ui/Panel.vue'
import CfsFilamentManagerDialog from '@/components/dialogs/CfsFilamentManagerDialog.vue'
import CfsSlotFilamentDialog from '@/components/dialogs/CfsSlotFilamentDialog.vue'
import { CfsBoxState, CfsSlot } from '@/types/cfs'

const EMPTY_BOX: CfsBoxState = {
    api_version: 0,
    filament_inventory_version: 0,
    fluidd_widget_version: 0,
    data_ready: false,
    status: 'UNKNOWN',
    status_code: -1,
    state: 'UNKNOWN',
    state_code: null,
    temp_c: null,
    humidity_pct: null,
    loaded_slot: -1,
    loaded_mask: 0,
    slot_filament_mask: 0,
    slots: [],
    materials: {},
    filaments: {},
    runout: null,
    runout_groups: [],
    runout_swap_enabled: false,
    unload_after_print_enabled: false,
    rfid_insert_reading_enabled: false,
    rfid_startup_reading_enabled: false,
    tracking_active: false,
    filament_detected: false,
    filament_sensor_error: null,
    load_path: {
        source_slot: null,
        loaded_slot: -1,
        loaded_mask: 0,
        slot_filament_mask: 0,
        box_addr: null,
        tracking_active: false,
        encoder: { position_mm: null, active: false },
        buffer: { status_code: 0, state_code: null, active: false },
        printhead_sensor: { detected: false, error: null },
        clog_detection: {
            state: 'inactive',
            baseline_ready: false,
            extruder_delta_mm: null,
            encoder_delta_mm: null,
            extruder_threshold_mm: 0,
            encoder_reset_mm: 0,
            triggered: false,
            event_count: 0,
            last_event: { extruder_mm: null, encoder_mm: null },
        },
    },
    recovery: {
        blocked: false,
        automatic: false,
        target: null,
        step: null,
        reason: null,
        retry_command: null,
        resume_prepared: false,
        resume_temperature: null,
    },
    driver_ready: false,
}

@Component({ components: { Panel, CfsFilamentManagerDialog, CfsSlotFilamentDialog } })
export default class CfsPanel extends Mixins(BaseMixin) {
    mdiAlertCircleOutline = mdiAlertCircleOutline
    mdiCheckCircle = mdiCheckCircle
    mdiCircleOutline = mdiCircleOutline
    mdiCog = mdiCog
    mdiDatabase = mdiDatabase
    mdiEject = mdiEject
    mdiNfc = mdiNfc
    mdiNfcSearchVariant = mdiNfcSearchVariant
    mdiNfcVariant = mdiNfcVariant
    mdiPackageVariantClosed = mdiPackageVariantClosed
    mdiPencil = mdiPencil
    mdiPlay = mdiPlay
    mdiRefresh = mdiRefresh
    mdiPrinter3dNozzle = mdiPrinter3dNozzle
    mdiSwapHorizontal = mdiSwapHorizontal
    mdiThermometer = mdiThermometer
    mdiTransitConnectionVariant = mdiTransitConnectionVariant
    mdiTrayArrowUp = mdiTrayArrowUp
    mdiWaterPercent = mdiWaterPercent

    showFilamentManager = false
    showSlotDialog = false
    editingSlot: CfsSlot | null = null
    slotDialogNonce = 0
    pendingRfidCode = ''
    pendingRfidColor = ''

    get showPanel(): boolean {
        return this.klipperReadyForGui && 'box' in this.$store.state.printer
    }

    get box(): CfsBoxState {
        return (this.$store.state.printer.box as CfsBoxState | undefined) ?? EMPTY_BOX
    }

    get title(): string {
        return `${this.$t('Files.Filaments')} · CFS`
    }

    get cfsSlots(): CfsSlot[] {
        return [...this.box.slots].sort((a, b) => a.index - b.index)
    }

    get readOnlyMode(): boolean {
        return this.box.print_mapping_enabled === false
    }
    get temperatureText(): string {
        return typeof this.box.temp_c === 'number' && Number.isFinite(this.box.temp_c)
            ? `${this.box.temp_c.toFixed(1)} °C`
            : '-- °C'
    }

    get humidityText(): string {
        return typeof this.box.humidity_pct === 'number' && Number.isFinite(this.box.humidity_pct)
            ? `${this.box.humidity_pct.toFixed(0)}% RH`
            : '-- % RH'
    }

    get runoutSequenceSlots(): CfsSlot[] {
        const sequence = this.box.runout?.sequence ?? []
        return sequence
            .map((index) => this.box.slots.find((slot) => slot.index === index))
            .filter((slot): slot is CfsSlot => !!slot)
    }

    get runoutUsesRemaining(): boolean {
        return this.box.runout?.strategy === 'lowest_remaining_first'
    }

    get temperatureHint(): string {
        return this.box.temp_c === null
            ? 'CFS temperature is not reported by the current K2 Pro BOX_STATE response.'
            : 'CFS temperature'
    }

    get humidityHint(): string {
        return this.box.humidity_pct === null
            ? 'CFS humidity is not reported by the current K2 Pro BOX_STATE response.'
            : 'CFS relative humidity'
    }

    get liveK2ProStateWithoutLegacyCode(): boolean {
        return this.box.driver_ready && this.box.data_ready && this.box.status_code === 0 && this.box.state_code === null
    }

    get displayState(): string {
        if (this.liveK2ProStateWithoutLegacyCode) {
            if (this.box.tracking_active) return 'Active'
            if (this.box.loaded_slot >= 0 || this.box.filament_detected) return 'Loaded'
            return 'Idle'
        }
        return this.box.state
    }

    get statusColor(): string {
        if (!this.box.driver_ready || !this.box.data_ready || this.box.status_code !== 0) return 'error'
        if (this.box.state === 'NO_RESPONSE' && !this.liveK2ProStateWithoutLegacyCode) return 'warning'
        return 'success'
    }

    get statusIcon(): string {
        if (this.statusColor === 'success') return mdiCheckCircle
        return mdiAlertCircleOutline
    }

    get canUnload(): boolean {
        return (
            !this.readOnlyMode &&
            this.box.driver_ready &&
            !this.printerIsPrinting &&
            (this.box.loaded_slot >= 0 || this.box.filament_detected)
        )
    }

    get loadPathText(): string {
        const slot = this.box.load_path.source_slot ?? this.box.load_path.loaded_slot
        if (slot < 0) return this.box.tracking_active ? 'tracking' : 'idle'
        return `T${slot}`
    }

    get recoveryText(): string {
        return this.box.recovery.reason ?? this.box.recovery.step ?? 'recovery'
    }

    slotLabel(slot: CfsSlot): string {
        return slot.external ? 'EXT' : `T${slot.index}`
    }

    slotDisplayName(slot: CfsSlot): string {
        if (slot.name) return slot.name
        if (slot.material) return slot.material
        if (slot.external) return 'External spool'
        return slot.present ? 'Filament present' : 'Empty'
    }

    slotMeta(slot: CfsSlot): string {
        if (slot.rfid_unknown_code) {
            return `Unknown RFID · ${slot.rfid_unknown_code}`
        }
        if (slot.material) {
            const parts = [slot.material]
            if (slot.brand) parts.push(slot.brand)
            if (typeof slot.target_temp === 'number' && Number.isFinite(slot.target_temp)) {
                parts.push(`${slot.target_temp} °C`)
            }
            return parts.join(' · ')
        }
        if (slot.external) return 'Manual / RFID'
        return slot.present ? 'Material not set' : 'No filament'
    }

    sourceLabel(slot: CfsSlot): string {
        if (slot.rfid_unknown_code) return 'RFID ?'
        if (this.slotRfidManaged(slot)) return 'RFID'
        if (slot.source === 'spoolman') return 'Spoolman'
        if (slot.source === 'library' || slot.filament_id) return 'Library'
        return 'Manual'
    }

    slotTooltip(slot: CfsSlot): string {
        const name = (slot.name ?? '').trim()
        const brand = (slot.brand ?? '').trim()
        if (name && brand && !name.toLocaleLowerCase().includes(brand.toLocaleLowerCase())) {
            return `${name} · ${brand}`
        }
        if (name) return name
        if (slot.material) return slot.material
        return ''
    }

    slotColor(slot: CfsSlot): string {
        return /^#[0-9a-f]{6}$/i.test(slot.color) ? slot.color : '#757575'
    }

    formatPercent(value: number): string {
        const bounded = Math.max(0, Math.min(100, value))
        return `${bounded.toFixed(bounded < 10 ? 1 : 0)}%`
    }

    spoolPercentLabel(slot: CfsSlot): string {
        if (typeof slot.rfid_percent !== 'number' || !Number.isFinite(slot.rfid_percent)) return ''
        const bounded = Math.max(0, Math.min(100, slot.rfid_percent))
        return bounded < 10 ? `${bounded.toFixed(0)}%` : `${bounded.toFixed(0)}%`
    }

    slotRemainingText(slot: CfsSlot): string {
        const parts: string[] = []
        if (typeof slot.rfid_percent === 'number' && Number.isFinite(slot.rfid_percent)) {
            parts.push(this.formatPercent(slot.rfid_percent))
        }
        if (typeof slot.rfid_remaining_m === 'number' && Number.isFinite(slot.rfid_remaining_m)) {
            parts.push(`${slot.rfid_remaining_m.toFixed(1)} m`)
        }
        return parts.join(' · ')
    }

    spoolRingStyle(slot: CfsSlot): Record<string, string> {
        const color = this.slotColor(slot)
        const percent =
            typeof slot.rfid_percent === 'number' && Number.isFinite(slot.rfid_percent)
                ? Math.max(0, Math.min(100, slot.rfid_percent))
                : null

        if (percent === null) {
            return {
                background: color,
                borderColor: color,
            }
        }

        // The coloured sector is the filament that is still available.
        // For example a 10% spool remains visibly 10% coloured and 90% empty.
        const degrees = Math.max(0, Math.min(360, percent * 3.6))
        return {
            background: `conic-gradient(from -90deg, ${color} 0deg ${degrees}deg, rgba(92,92,92,.34) ${degrees}deg 360deg)`,
            borderColor: 'rgba(150,150,150,.48)',
        }
    }

    slotCardClass(slot: CfsSlot): Record<string, boolean> {
        return {
            'cfs-slot-loaded': slot.loaded,
            'cfs-slot-empty': !slot.present,
        }
    }

    slotRfidManaged(slot: CfsSlot): boolean {
        return slot.rfid_active || (slot.present && slot.source === 'rfid')
    }

    openFilamentManager(): void {
        this.pendingRfidCode = ''
        this.pendingRfidColor = ''
        this.showFilamentManager = true
    }

    resolveUnknownRfid(slot: CfsSlot): void {
        if (this.printerIsPrinting || !slot.rfid_unknown_code) return
        this.pendingRfidCode = slot.rfid_unknown_code
        this.pendingRfidColor = slot.rfid_unknown_color || slot.color || '#808080'
        this.showFilamentManager = true
    }

    openRfidInfo(slot: CfsSlot): void {
        if (!this.slotRfidManaged(slot)) return
        this.openSlotDialog(slot)
    }

    openSlotEditor(slot: CfsSlot): void {
        if (this.slotRfidManaged(slot) || this.printerIsPrinting) return
        this.openSlotDialog(slot)
    }

    openSlotDialog(slot: CfsSlot): void {
        if (this.printerIsPrinting) return
        this.showSlotDialog = false
        this.$nextTick(() => {
            this.editingSlot = { ...slot }
            this.slotDialogNonce += 1
            this.showSlotDialog = true
        })
    }

    scanAllRfid(): void {
        if (!this.box.driver_ready || this.printerIsPrinting) return
        this.sendCommand('BOX_RFID_SCAN', 'cfs_rfid_scan')
    }

    forceRfidRead(slot: CfsSlot): void {
        if (!this.box.driver_ready || this.printerIsPrinting || slot.external || !slot.present) return
        this.sendCommand(
            `_BOX_RFID_READ_SLOT SLOT=${slot.index}`,
            `cfs_rfid_slot_${slot.index}`
        )
    }

    canSelectSlot(slot: CfsSlot): boolean {
        return (
            !this.readOnlyMode &&
            this.box.driver_ready &&
            slot.present &&
            !slot.loaded &&
            !slot.external &&
            !this.printerIsPrinting
        )
    }

    selectSlot(slot: CfsSlot): void {
        if (!this.canSelectSlot(slot)) return
        this.sendCommand(`T${slot.index}`, `cfs_slot_${slot.index}`)
    }

    toggleSetting(
        command: string,
        setting:
            | 'runout_swap_enabled'
            | 'unload_after_print_enabled'
            | 'rfid_insert_reading_enabled'
            | 'rfid_startup_reading_enabled'
    ): void {
        if (this.readOnlyMode) return
        const enable = this.box[setting] ? 0 : 1
        this.sendCommand(`${command} ENABLE=${enable}`, `cfs_setting_${setting}`)
    }

    sendCommand(command: string, loading: string): void {
        this.$store.dispatch('server/addEvent', { message: command, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script: command }, { loading })
    }
}
</script>

<style scoped>
.cfs-slot-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    width: calc(100% - 20px);
    max-width: 1120px;
    margin: 0 auto;
    align-items: stretch;
}

.cfs-slot-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    min-height: 178px;
    border-radius: 10px !important;
    overflow: hidden;
}

.cfs-slot-body {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    padding: 14px 12px 10px !important;
}

.cfs-slot-main {
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
}

.cfs-slot-details {
    flex: 1 1 auto;
    min-width: 0;
    overflow: visible;
}

.cfs-slot-name,
.cfs-slot-meta {
    overflow-wrap: anywhere;
    word-break: normal;
}

.cfs-slot-name {
    margin-top: 4px;
    font-size: 1rem !important;
    font-weight: 700;
    line-height: 1.16;
}

.cfs-slot-meta {
    margin-top: 4px;
    font-size: 0.82rem !important;
    line-height: 1.22;
}

.cfs-slot-remaining {
    margin-top: 5px;
    font-size: clamp(0.78rem, 1.15vw, 0.90rem);
    font-weight: 700;
    line-height: 1.15;
}

.cfs-slot-label {
    white-space: nowrap;
    font-size: clamp(0.88rem, 1.2vw, 1rem);
}

.cfs-slot-actions {
    flex: 0 0 50px;
    height: 50px;
    min-height: 50px;
    padding: 4px 7px !important;
    gap: 1px;
    overflow: visible;
    flex-wrap: nowrap;
}

.cfs-slot-actions .v-btn {
    min-width: 30px !important;
    margin: 0 !important;
    font-size: 0.74rem !important;
}

.cfs-slot-actions .cfs-edit-slot {
    min-width: 30px !important;
}

.cfs-spool {
    position: relative;
    width: 70px;
    height: 70px;
    flex: 0 0 70px;
}

.cfs-spool-ring,
.cfs-spool-hole,
.cfs-spool-core {
    position: absolute;
    border-radius: 50%;
}

.cfs-spool-ring {
    inset: 0;
    border: 2px solid rgba(255, 255, 255, 0.18);
    filter: saturate(1.35) brightness(1.08);
    box-shadow:
        0 3px 10px rgba(0, 0, 0, 0.38),
        inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.cfs-spool-hole {
    inset: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--v-card-base, var(--v-background-base));
    box-shadow:
        0 0 0 2px rgba(160, 160, 160, 0.32),
        inset 0 2px 5px rgba(0, 0, 0, 0.42);
}

.cfs-spool-hole--percent {
    background: rgba(22, 22, 22, 0.92);
}

.cfs-spool-core {
    width: 14px;
    height: 14px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    box-shadow:
        0 0 0 2px rgba(255, 255, 255, 0.34),
        0 1px 5px rgba(0, 0, 0, 0.5);
    filter: saturate(1.8) brightness(1.14);
}

.cfs-spool-percent {
    position: relative;
    z-index: 2;
    color: #fff;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
}

.cfs-runout {
    border: 1px solid rgba(127, 127, 127, 0.28);
    border-radius: 8px;
}

.cfs-slot-loaded {
    border-color: var(--v-primary-base) !important;
    box-shadow: inset 0 0 0 1px var(--v-primary-base);
}

.cfs-slot-empty {
    opacity: 0.72;
}

@media (max-width: 820px) {
    .cfs-slot-grid {
        grid-template-columns: 1fr;
        width: 100%;
        max-width: none;
    }

    .cfs-slot-card {
        min-height: 168px;
    }
}

@media (max-width: 560px) {
    .cfs-slot-body {
        padding: 11px 9px 8px !important;
    }

    .cfs-spool {
        width: 58px;
        height: 58px;
        flex-basis: 58px;
        margin-right: 10px !important;
    }

    .cfs-spool-hole {
        inset: 16px;
    }

    .cfs-slot-actions {
        padding: 3px 5px !important;
    }

    .cfs-slot-actions .v-btn {
        padding: 0 6px !important;
        min-width: 34px !important;
    }

    .cfs-slot-name {
        font-size: 0.94rem !important;
    }
}

</style>

[executed on device: K2-OpenHost (89cb063b-3b3d-4426-afdd-42400b8c7ae2)]

[executed on device: K2-OpenHost (89cb063b-3b3d-4426-afdd-42400b8c7ae2)]