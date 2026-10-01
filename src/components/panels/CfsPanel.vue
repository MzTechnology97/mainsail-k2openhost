<template>
    <panel v-if="showPanel" :icon="mdiPackageVariantClosed" :title="title" :collapsible="true" card-class="cfs-panel">
        <template #buttons>
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
                    <v-list-item @click="toggleSetting('_BOX_SET_RUNOUT_SWAP', 'runout_swap_enabled')">
                        <v-list-item-icon>
                            <v-icon>{{ mdiSwapHorizontal }}</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title><code>runout_swap</code></v-list-item-title>
                        </v-list-item-content>
                        <v-list-item-action>
                            <v-switch :input-value="box.runout_swap_enabled" readonly inset hide-details />
                        </v-list-item-action>
                    </v-list-item>
                    <v-list-item
                        @click="toggleSetting('_BOX_SET_UNLOAD_AFTER_PRINT', 'unload_after_print_enabled')">
                        <v-list-item-icon>
                            <v-icon>{{ mdiTrayArrowUp }}</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title><code>unload_after_print</code></v-list-item-title>
                        </v-list-item-content>
                        <v-list-item-action>
                            <v-switch :input-value="box.unload_after_print_enabled" readonly inset hide-details />
                        </v-list-item-action>
                    </v-list-item>
                    <v-divider />
                    <v-list-item
                        @click="toggleSetting('_BOX_SET_RFID_INSERT_READING', 'rfid_insert_reading_enabled')">
                        <v-list-item-icon>
                            <v-icon>{{ mdiNfc }}</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title><code>RFID insert</code></v-list-item-title>
                        </v-list-item-content>
                        <v-list-item-action>
                            <v-switch :input-value="box.rfid_insert_reading_enabled" readonly inset hide-details />
                        </v-list-item-action>
                    </v-list-item>
                    <v-list-item
                        @click="toggleSetting('_BOX_SET_RFID_STARTUP_READING', 'rfid_startup_reading_enabled')">
                        <v-list-item-icon>
                            <v-icon>{{ mdiNfcVariant }}</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title><code>RFID startup</code></v-list-item-title>
                        </v-list-item-content>
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
                    {{ box.status }} / {{ box.state }}
                </v-chip>
                <v-chip v-if="box.temp_c !== null" small class="mr-2 mb-1" outlined>
                    <v-icon left small>{{ mdiThermometer }}</v-icon>
                    {{ box.temp_c.toFixed(1) }} °C
                </v-chip>
                <v-chip v-if="box.humidity_pct !== null" small class="mr-2 mb-1" outlined>
                    <v-icon left small>{{ mdiWaterPercent }}</v-icon>
                    {{ box.humidity_pct.toFixed(0) }}%
                </v-chip>
                <v-chip small class="mr-2 mb-1" outlined>API v{{ box.api_version }}</v-chip>
            </div>

            <v-alert v-if="box.recovery.blocked" dense text type="warning" class="mb-3">
                <div>{{ recoveryText }}</div>
                <v-btn
                    v-if="box.recovery.retry_command"
                    x-small
                    color="warning"
                    class="mt-2"
                    @click="sendCommand(box.recovery.retry_command, 'cfs_recovery')">
                    {{ $t('Panels.MmuPanel.ButtonRecover') }}
                </v-btn>
            </v-alert>

            <v-row dense>
                <v-col v-for="slot in cfsSlots" :key="slot.index" cols="12" sm="6" xl="3">
                    <v-card outlined :class="slotCardClass(slot)" height="100%">
                        <v-card-text class="pa-3">
                            <div class="d-flex align-center">
                                <div class="cfs-spool mr-3" :style="{ borderColor: slotColor(slot) }">
                                    <div class="cfs-spool-core" />
                                </div>
                                <div class="flex-grow-1 overflow-hidden">
                                    <div class="d-flex align-center">
                                        <strong>{{ slotLabel(slot) }}</strong>
                                        <v-chip v-if="slot.loaded" x-small color="primary" class="ml-2">
                                            {{ $t('Panels.MmuPanel.Active') }}
                                        </v-chip>
                                    </div>
                                    <div class="text-truncate body-2">{{ slotDisplayName(slot) }}</div>
                                    <div class="text--secondary caption text-truncate">
                                        {{ slot.material || $t('Files.FilamentType') }}
                                        <template v-if="slot.brand"> · {{ slot.brand }}</template>
                                    </div>
                                </div>
                            </div>

                            <v-progress-linear
                                v-if="slot.rfid_percent !== null"
                                class="mt-3"
                                height="5"
                                rounded
                                :value="slot.rfid_percent" />
                            <div v-if="slot.spoolman_id !== null" class="caption text--secondary mt-2">
                                Spoolman #{{ slot.spoolman_id }}
                            </div>
                        </v-card-text>
                        <v-divider />
                        <v-card-actions class="pa-2">
                            <v-btn
                                v-if="!slot.external"
                                small
                                text
                                color="primary"
                                :disabled="!canSelectSlot(slot)"
                                :loading="loadings.includes(`cfs_slot_${slot.index}`)"
                                @click="selectSlot(slot)">
                                <v-icon left small>{{ mdiPlay }}</v-icon>
                                {{ $t('Panels.MmuPanel.ButtonLoad') }}
                            </v-btn>
                            <v-btn
                                v-else
                                small
                                text
                                :disabled="printerIsPrinting"
                                :loading="loadings.includes('cfs_rfid_read')"
                                @click="sendCommand('RFID_READER_READ', 'cfs_rfid_read')">
                                <v-icon left small>{{ mdiNfc }}</v-icon>
                                RFID
                            </v-btn>
                            <v-spacer />
                            <v-icon v-if="slot.present" small color="success">{{ mdiCheckCircle }}</v-icon>
                            <v-icon v-else small color="grey">{{ mdiCircleOutline }}</v-icon>
                        </v-card-actions>
                    </v-card>
                </v-col>
            </v-row>

            <v-divider class="my-3" />
            <div class="d-flex flex-wrap align-center caption text--secondary">
                <span class="mr-4">
                    <v-icon x-small class="mr-1">{{ mdiPrinter3dNozzle }}</v-icon>
                    {{ box.filament_detected ? $t('Panels.MmuPanel.RunoutSensor.Detected') : $t('Panels.MmuPanel.RunoutSensor.Empty') }}
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
    </panel>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import {
    mdiAlertCircleOutline,
    mdiCheckCircle,
    mdiCircleOutline,
    mdiCog,
    mdiEject,
    mdiNfc,
    mdiNfcVariant,
    mdiPackageVariantClosed,
    mdiPlay,
    mdiPrinter3dNozzle,
    mdiSwapHorizontal,
    mdiThermometer,
    mdiTransitConnectionVariant,
    mdiTrayArrowUp,
    mdiWaterPercent,
} from '@mdi/js'
import BaseMixin from '@/components/mixins/base'
import Panel from '@/components/ui/Panel.vue'
import { CfsBoxState, CfsSlot } from '@/types/cfs'

const EMPTY_BOX: CfsBoxState = {
    api_version: 0,
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
    runout: null,
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

@Component({ components: { Panel } })
export default class CfsPanel extends Mixins(BaseMixin) {
    mdiAlertCircleOutline = mdiAlertCircleOutline
    mdiCheckCircle = mdiCheckCircle
    mdiCircleOutline = mdiCircleOutline
    mdiCog = mdiCog
    mdiEject = mdiEject
    mdiNfc = mdiNfc
    mdiNfcVariant = mdiNfcVariant
    mdiPackageVariantClosed = mdiPackageVariantClosed
    mdiPlay = mdiPlay
    mdiPrinter3dNozzle = mdiPrinter3dNozzle
    mdiSwapHorizontal = mdiSwapHorizontal
    mdiThermometer = mdiThermometer
    mdiTransitConnectionVariant = mdiTransitConnectionVariant
    mdiTrayArrowUp = mdiTrayArrowUp
    mdiWaterPercent = mdiWaterPercent

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

    get statusColor(): string {
        if (!this.box.driver_ready || this.box.status_code !== 0) return 'error'
        if (this.box.state === 'NO_RESPONSE') return 'warning'
        return 'success'
    }

    get statusIcon(): string {
        if (this.statusColor === 'success') return mdiCheckCircle
        return mdiAlertCircleOutline
    }

    get canUnload(): boolean {
        return this.box.driver_ready && !this.printerIsPrinting && (this.box.loaded_slot >= 0 || this.box.filament_detected)
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
        return slot.name || slot.material || `T${slot.index}`
    }

    slotColor(slot: CfsSlot): string {
        return /^#[0-9a-f]{6}$/i.test(slot.color) ? slot.color : '#757575'
    }

    slotCardClass(slot: CfsSlot): Record<string, boolean> {
        return {
            'cfs-slot-loaded': slot.loaded,
            'cfs-slot-empty': !slot.present,
        }
    }

    canSelectSlot(slot: CfsSlot): boolean {
        return this.box.driver_ready && slot.present && !slot.loaded && !slot.external && !this.printerIsPrinting
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
.cfs-spool {
    width: 42px;
    height: 42px;
    border: 7px solid;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
}

.cfs-spool-core {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.35;
}

.cfs-slot-loaded {
    border-color: var(--v-primary-base) !important;
}

.cfs-slot-empty {
    opacity: 0.55;
}
</style>
