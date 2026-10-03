<template>
    <panel v-if="showPanel" :icon="mdiPackageVariantClosed" :title="title" :collapsible="true" card-class="cfs-panel">
        <template #buttons>
            <v-btn
                v-if="!compactHeader"
                icon
                tile
                title="Filament library"
                aria-label="Filament library"
                @click="openFilamentManager">
                <v-icon>{{ mdiDatabase }}</v-icon>
            </v-btn>
            <v-btn
                v-if="!compactHeader"
                icon
                tile
                :disabled="!box.driver_ready || printerIsPrinting"
                :loading="loadings.includes('cfs_rfid_scan')"
                title="Scan RFID in all populated CFS slots"
                aria-label="Scan RFID in all populated CFS slots"
                @click="scanAllRfid">
                <v-icon>{{ mdiNfcSearchVariant }}</v-icon>
            </v-btn>
            <v-btn
                icon
                tile
                :disabled="!canUnload"
                :loading="loadings.includes('cfs_unload')"
                :title="$t('Panels.MmuPanel.ButtonUnload')"
                :aria-label="$t('Panels.MmuPanel.ButtonUnload')"
                @click="sendCommand('BOX_UNLOAD', 'cfs_unload')">
                <v-icon>{{ mdiEject }}</v-icon>
            </v-btn>
            <v-menu left offset-y :close-on-content-click="false">
                <template #activator="{ on, attrs }">
                    <v-btn icon tile title="CFS settings" aria-label="CFS settings" v-bind="attrs" v-on="on">
                        <v-icon>{{ mdiCog }}</v-icon>
                    </v-btn>
                </template>
                <v-list dense min-width="300">
                    <template v-if="compactHeader">
                        <v-list-item @click="openFilamentManager">
                            <v-list-item-icon>
                                <v-icon>{{ mdiDatabase }}</v-icon>
                            </v-list-item-icon>
                            <v-list-item-content>
                                <v-list-item-title>Filament library</v-list-item-title>
                            </v-list-item-content>
                        </v-list-item>
                        <v-list-item :disabled="!box.driver_ready || printerIsPrinting" @click="scanAllRfid">
                            <v-list-item-icon>
                                <v-icon>{{ mdiNfcSearchVariant }}</v-icon>
                            </v-list-item-icon>
                            <v-list-item-content>
                                <v-list-item-title>Scan RFID in all slots</v-list-item-title>
                            </v-list-item-content>
                        </v-list-item>
                        <v-divider />
                    </template>
                    <v-list-item
                        v-for="setting in settingItems"
                        :key="setting.key"
                        :disabled="readOnlyMode"
                        @click="toggleSetting(setting.command, setting.key)">
                        <v-list-item-icon>
                            <v-icon>{{ setting.icon }}</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>{{ setting.label }}</v-list-item-title>
                        </v-list-item-content>
                        <v-list-item-action>
                            <v-switch :input-value="box[setting.key]" readonly inset hide-details />
                        </v-list-item-action>
                    </v-list-item>
                    <v-divider />
                    <v-list-item dense disabled>
                        <v-list-item-content>
                            <v-list-item-subtitle>{{ versionText }}</v-list-item-subtitle>
                        </v-list-item-content>
                    </v-list-item>
                </v-list>
            </v-menu>
        </template>

        <v-card-text class="cfs-content">
            <div class="cfs-status-row">
                <v-chip small outlined :color="statusColor" :title="versionText">
                    <v-icon left small>{{ statusIcon }}</v-icon>
                    {{ statusText }}
                </v-chip>
                <v-chip v-if="readOnlyMode" small outlined color="warning">Read only</v-chip>
                <v-chip v-if="loadedSlot" small outlined color="primary" :title="slotLabel(loadedSlot)">
                    <v-icon left small>{{ mdiPrinter3dNozzle }}</v-icon>
                    {{ slotShortLabel(loadedSlot) }}
                </v-chip>
            </div>

            <v-alert v-if="box.recovery.blocked" dense text type="warning" class="mt-3 mb-0">
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

            <div class="cfs-units" :class="{ 'cfs-units--multi': sections.length > 2 }">
                <section
                    v-for="section in sections"
                    :key="section.key"
                    class="cfs-unit"
                    :class="{ 'cfs-unit--offline': !section.online, 'cfs-unit--external': section.external }">
                    <header class="cfs-unit-header">
                        <span class="cfs-unit-title">{{ section.title }}</span>
                        <v-chip v-if="!section.online" x-small outlined color="error" class="ml-2">Offline</v-chip>
                        <span v-if="!section.external" class="cfs-unit-env" :title="section.envHint">
                            <span>
                                <v-icon x-small>{{ mdiThermometer }}</v-icon>
                                {{ formatTemperature(section.temp_c) }}
                            </span>
                            <span>
                                <v-icon x-small>{{ mdiWaterPercent }}</v-icon>
                                {{ formatHumidity(section.humidity_pct) }}
                            </span>
                        </span>
                    </header>

                    <div class="cfs-slot-grid">
                        <article
                            v-for="slot in section.slots"
                            :key="slot.index"
                            class="cfs-tile"
                            :class="tileClass(slot)"
                            :style="{ '--cfs-slot-color': slotColor(slot), '--cfs-slot-outline': slotOutline(slot) }"
                            :aria-label="`${slotLabel(slot)}: ${slotPrimary(slot)}`">
                            <div class="cfs-tile-head">
                                <span class="cfs-tile-badge" :title="slotLabel(slot)">{{ tileBadge(slot) }}</span>
                                <span v-if="slot.loaded" class="cfs-tile-active">
                                    {{ $t('Panels.MmuPanel.Active') }}
                                </span>
                                <span v-if="hasProfile(slot)" class="cfs-tile-source" :title="sourceHint(slot)">
                                    {{ sourceLabel(slot) }}
                                </span>
                            </div>

                            <v-tooltip bottom :disabled="!slotTooltip(slot)">
                                <template #activator="{ on, attrs }">
                                    <div class="cfs-spool" v-bind="attrs" v-on="on">
                                        <div class="cfs-spool-ring" :style="spoolRingStyle(slot)" />
                                        <div class="cfs-spool-hole">
                                            <span v-if="spoolPercentLabel(slot)" class="cfs-spool-percent">
                                                {{ spoolPercentLabel(slot) }}
                                            </span>
                                            <span v-else-if="slot.present" class="cfs-spool-core" />
                                        </div>
                                    </div>
                                </template>
                                <span>{{ slotTooltip(slot) }}</span>
                            </v-tooltip>

                            <div class="cfs-tile-text">
                                <div class="cfs-tile-material" :title="slotPrimary(slot)">{{ slotPrimary(slot) }}</div>
                                <div class="cfs-tile-meta" :title="slotSecondary(slot)">{{ slotSecondary(slot) }}</div>
                                <div v-if="slotRemainingText(slot)" class="cfs-tile-remaining">
                                    {{ slotRemainingText(slot) }}
                                </div>
                            </div>

                            <div class="cfs-tile-actions">
                                <v-btn
                                    v-if="!slot.external"
                                    icon
                                    small
                                    color="primary"
                                    :disabled="!canSelectSlot(slot)"
                                    :loading="loadings.includes(`cfs_slot_${slot.index}`)"
                                    :title="`${$t('Panels.MmuPanel.ButtonLoad')} ${slotLabel(slot)}`"
                                    :aria-label="`${$t('Panels.MmuPanel.ButtonLoad')} ${slotLabel(slot)}`"
                                    @click="selectSlot(slot)">
                                    <v-icon small>{{ mdiPlay }}</v-icon>
                                </v-btn>
                                <v-btn
                                    v-if="slot.rfid_unknown_code"
                                    icon
                                    small
                                    color="warning"
                                    :disabled="printerIsPrinting"
                                    title="Create a filament profile for this RFID tag"
                                    aria-label="Create a filament profile for this RFID tag"
                                    @click.stop="resolveUnknownRfid(slot)">
                                    <v-icon small>{{ mdiNfcVariant }}</v-icon>
                                </v-btn>
                                <v-btn
                                    v-else-if="slotRfidManaged(slot) || slot.external"
                                    icon
                                    small
                                    :disabled="printerIsPrinting"
                                    :title="
                                        slot.external ? 'External spool / RFID settings' : 'RFID filament information'
                                    "
                                    :aria-label="
                                        slot.external ? 'External spool / RFID settings' : 'RFID filament information'
                                    "
                                    @click.stop="openSlotDialog(slot)">
                                    <v-icon small>{{ mdiNfc }}</v-icon>
                                </v-btn>
                                <v-btn
                                    v-else
                                    icon
                                    small
                                    :disabled="printerIsPrinting"
                                    title="View or edit manual slot filament"
                                    aria-label="Edit slot filament"
                                    @click.stop="openSlotDialog(slot)">
                                    <v-icon small>{{ mdiPencil }}</v-icon>
                                </v-btn>
                                <v-btn
                                    v-if="!slot.external && slot.present"
                                    icon
                                    small
                                    :disabled="printerIsPrinting || !box.driver_ready"
                                    :loading="loadings.includes(`cfs_rfid_slot_${slot.index}`)"
                                    title="Reread RFID for this slot"
                                    aria-label="Reread RFID for this slot"
                                    @click.stop="forceRfidRead(slot)">
                                    <v-icon small>{{ mdiRefresh }}</v-icon>
                                </v-btn>
                            </div>
                        </article>
                    </div>
                </section>
            </div>

            <div v-if="box.runout_swap_enabled && runoutSequenceSlots.length" class="cfs-runout">
                <div class="cfs-runout-title">Active runout swap sequence</div>
                <div class="cfs-chain">
                    <template v-for="(slot, index) in runoutSequenceSlots">
                        <v-chip :key="`runout-${slot.index}`" x-small outlined :title="slotLabel(slot)">
                            {{ slotShortLabel(slot) }}
                            <template v-if="slot.rfid_percent !== null">
                                · {{ formatPercent(slot.rfid_percent) }}
                            </template>
                        </v-chip>
                        <span v-if="index < runoutSequenceSlots.length - 1" :key="`arrow-${slot.index}`">→</span>
                    </template>
                    <span v-if="runoutUsesRemaining" class="text--secondary">lowest RFID remaining first</span>
                </div>
            </div>

            <div v-if="box.runout_swap_enabled && box.runout_groups.length" class="cfs-runout">
                <div class="cfs-runout-title">Recognized runout swap groups</div>
                <div v-for="group in box.runout_groups" :key="`${group.material}-${group.color}`" class="cfs-chain">
                    <span class="cfs-group-swatch" :style="{ backgroundColor: groupColor(group.color) }" />
                    <span>
                        {{ group.material }}
                        <template v-if="group.strategy === 'lowest_remaining_first'">· lowest remaining first</template>
                    </span>
                    <template v-for="(item, index) in group.detail">
                        <v-chip
                            :key="`group-${group.material}-${item.slot}`"
                            x-small
                            outlined
                            :title="slotLabelByIndex(item.slot)">
                            {{ slotShortLabelByIndex(item.slot) }}
                            <template v-if="item.percent !== null">· {{ formatPercent(item.percent) }}</template>
                        </v-chip>
                        <span
                            v-if="index < group.detail.length - 1"
                            :key="`group-arrow-${group.material}-${item.slot}`">
                            →
                        </span>
                    </template>
                </div>
            </div>

            <div class="cfs-footer text--secondary">
                <span>
                    <v-icon x-small>{{ mdiPrinter3dNozzle }}</v-icon>
                    {{
                        box.filament_detected
                            ? $t('Panels.MiscellaneousPanel.RunoutSensor.Detected')
                            : $t('Panels.MiscellaneousPanel.RunoutSensor.Empty')
                    }}
                </span>
                <span>
                    <v-icon x-small>{{ mdiTransitConnectionVariant }}</v-icon>
                    {{ loadPathText }}
                </span>
                <span :class="{ 'error--text': box.load_path.clog_detection.triggered }">
                    <v-icon x-small :color="box.load_path.clog_detection.triggered ? 'error' : undefined">
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
import { cfsBoxNumber, cfsLocalSlot, cfsSlotLabel, cfsSlotShortLabel } from '@/plugins/cfsLabels'

type CfsSettingKey =
    | 'runout_swap_enabled'
    | 'unload_after_print_enabled'
    | 'rfid_insert_reading_enabled'
    | 'rfid_startup_reading_enabled'

interface CfsSection {
    key: string
    title: string
    external: boolean
    online: boolean
    temp_c: number | null
    humidity_pct: number | null
    envHint: string
    slots: CfsSlot[]
}

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
    },
    driver_ready: false,
}

@Component({ components: { Panel, CfsFilamentManagerDialog, CfsSlotFilamentDialog } })
export default class CfsPanel extends Mixins(BaseMixin) {
    mdiAlertCircleOutline = mdiAlertCircleOutline
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
    mdiThermometer = mdiThermometer
    mdiTransitConnectionVariant = mdiTransitConnectionVariant
    mdiWaterPercent = mdiWaterPercent

    settingItems: { key: CfsSettingKey; command: string; label: string; icon: string }[] = [
        { key: 'runout_swap_enabled', command: '_BOX_SET_RUNOUT_SWAP', label: 'Runout swap', icon: mdiSwapHorizontal },
        {
            key: 'unload_after_print_enabled',
            command: '_BOX_SET_UNLOAD_AFTER_PRINT',
            label: 'Unload after print',
            icon: mdiTrayArrowUp,
        },
        {
            key: 'rfid_insert_reading_enabled',
            command: '_BOX_SET_RFID_INSERT_READING',
            label: 'Read RFID on insert',
            icon: mdiNfc,
        },
        {
            key: 'rfid_startup_reading_enabled',
            command: '_BOX_SET_RFID_STARTUP_READING',
            label: 'Read RFID at startup',
            icon: mdiNfcVariant,
        },
    ]

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
        return this.$t('Panels.CfsPanel.Headline') as string
    }

    get cfsSlots(): CfsSlot[] {
        return [...this.box.slots].sort((a, b) => a.index - b.index)
    }

    get physicalSlots(): CfsSlot[] {
        return this.cfsSlots.filter((slot) => !slot.external)
    }

    get externalSlot(): CfsSlot | null {
        return this.cfsSlots.find((slot) => slot.external) ?? null
    }

    get loadedSlot(): CfsSlot | null {
        return this.cfsSlots.find((slot) => slot.loaded) ?? null
    }

    /**
     * One section per CFS unit plus the external spool. Newer backends publish
     * `boxes` with each unit's own environment; older ones are grouped from the
     * slot index and only know the environment of the box on the load path.
     */
    get sections(): CfsSection[] {
        const sections: CfsSection[] = []
        const units = this.box.boxes
        if (units?.length) {
            for (const unit of units) {
                sections.push({
                    key: `box-${unit.address}`,
                    title: `Box ${unit.address}`,
                    external: false,
                    online: unit.online,
                    temp_c: unit.temp_c,
                    humidity_pct: unit.humidity_pct,
                    envHint: `Box ${unit.address} temperature and relative humidity`,
                    slots: this.physicalSlots.filter((slot) => unit.slots.includes(slot.index)),
                })
            }
        } else {
            const numbers = [...new Set(this.physicalSlots.map((slot) => cfsBoxNumber(slot.index)))]
            const envBox = numbers.length === 1 ? numbers[0] : this.box.load_path.box_addr
            for (const address of numbers) {
                const ownEnv = address === envBox
                sections.push({
                    key: `box-${address}`,
                    title: `Box ${address}`,
                    external: false,
                    online: true,
                    temp_c: ownEnv ? this.box.temp_c : null,
                    humidity_pct: ownEnv ? this.box.humidity_pct : null,
                    envHint: ownEnv
                        ? `Box ${address} temperature and relative humidity`
                        : 'Not reported for this box by the current backend',
                    slots: this.physicalSlots.filter((slot) => cfsBoxNumber(slot.index) === address),
                })
            }
        }
        if (this.externalSlot) {
            sections.push({
                key: 'external',
                title: 'External spool',
                external: true,
                online: true,
                temp_c: null,
                humidity_pct: null,
                envHint: '',
                slots: [this.externalSlot],
            })
        }
        return sections
    }

    /** Phones narrower than 360px: keep only unload and the menu in the header. */
    get compactHeader(): boolean {
        return this.$vuetify.breakpoint.width < 360
    }

    get readOnlyMode(): boolean {
        return this.box.print_mapping_enabled === false
    }

    get versionText(): string {
        const parts = [`API v${this.box.api_version}`]
        if (this.box.filament_inventory_version) parts.push(`inventory v${this.box.filament_inventory_version}`)
        if (this.box.print_mapping_version) parts.push(`mapping v${this.box.print_mapping_version}`)
        return parts.join(' · ')
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

    get liveK2ProStateWithoutLegacyCode(): boolean {
        return (
            this.box.driver_ready && this.box.data_ready && this.box.status_code === 0 && this.box.state_code === null
        )
    }

    get displayState(): string {
        if (this.liveK2ProStateWithoutLegacyCode) {
            if (this.box.tracking_active) return 'Active'
            if (this.box.loaded_slot >= 0 || this.box.filament_detected) return 'Loaded'
            return 'Idle'
        }
        return this.box.state
    }

    get statusText(): string {
        return `${this.box.status} · ${this.displayState}`
    }

    get statusColor(): string {
        if (!this.box.driver_ready || !this.box.data_ready || this.box.status_code !== 0) return 'error'
        if (this.box.state === 'NO_RESPONSE' && !this.liveK2ProStateWithoutLegacyCode) return 'warning'
        return 'success'
    }

    get statusIcon(): string {
        return this.statusColor === 'success' ? mdiCheckCircle : mdiAlertCircleOutline
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
        if (slot === null || slot < 0) return this.box.tracking_active ? 'tracking' : 'idle'
        return this.slotLabelByIndex(slot)
    }

    get recoveryText(): string {
        return this.box.recovery.reason ?? this.box.recovery.step ?? 'recovery'
    }

    get hasSelectSlotCommand(): boolean {
        return 'BOX_SELECT_SLOT' in (this.$store.state.printer.gcode?.commands ?? {})
    }

    slotLabel(slot: CfsSlot): string {
        return cfsSlotLabel(slot)
    }

    slotShortLabel(slot: CfsSlot): string {
        return cfsSlotShortLabel(slot)
    }

    slotLabelByIndex(index: number): string {
        const slot = this.box.slots.find((item) => item.index === index)
        return cfsSlotLabel(slot ?? { index, external: false })
    }

    slotShortLabelByIndex(index: number): string {
        const slot = this.box.slots.find((item) => item.index === index)
        return cfsSlotShortLabel(slot ?? { index, external: false })
    }

    tileBadge(slot: CfsSlot): string {
        return slot.external ? 'EXT' : String(cfsLocalSlot(slot.index))
    }

    hasProfile(slot: CfsSlot): boolean {
        return !!(slot.material || slot.filament_id || slot.rfid_unknown_code || this.slotRfidManaged(slot))
    }

    slotPrimary(slot: CfsSlot): string {
        if (slot.rfid_unknown_code) return 'Unknown RFID'
        if (slot.material) return slot.material
        if (slot.external) return 'External'
        return slot.present ? 'Not set' : 'Empty'
    }

    slotSecondary(slot: CfsSlot): string {
        if (slot.rfid_unknown_code) return slot.rfid_unknown_code
        const parts: string[] = []
        const name = (slot.name ?? '').trim()
        if (name && name.toLocaleLowerCase() !== (slot.material ?? '').toLocaleLowerCase()) parts.push(name)
        else if (slot.brand) parts.push(slot.brand)
        if (typeof slot.target_temp === 'number' && Number.isFinite(slot.target_temp)) {
            parts.push(`${slot.target_temp} °C`)
        }
        if (parts.length) return parts.join(' · ')
        if (slot.external) return 'Manual / RFID'
        return slot.present ? 'Assign a filament' : 'No filament'
    }

    sourceLabel(slot: CfsSlot): string {
        if (slot.rfid_unknown_code) return 'RFID ?'
        if (this.slotRfidManaged(slot)) return 'RFID'
        if (slot.source === 'spoolman') return 'Spoolman'
        if (slot.source === 'library' || slot.filament_id) return 'Library'
        return 'Manual'
    }

    sourceHint(slot: CfsSlot): string {
        const labels: Record<string, string> = {
            'RFID ?': 'Unknown RFID tag: create a profile for it',
            RFID: 'Read from the spool RFID tag',
            Spoolman: 'Assigned from Spoolman',
            Library: 'Assigned from the filament library',
            Manual: 'Entered manually',
        }
        return labels[this.sourceLabel(slot)] ?? ''
    }

    slotTooltip(slot: CfsSlot): string {
        const name = (slot.name ?? '').trim()
        const brand = (slot.brand ?? '').trim()
        let text = name || slot.material || ''
        if (name && brand && !name.toLocaleLowerCase().includes(brand.toLocaleLowerCase())) text = `${name} · ${brand}`
        return text ? `${this.slotLabel(slot)} · ${text}` : this.slotLabel(slot)
    }

    slotColor(slot: CfsSlot): string {
        return /^#[0-9a-f]{6}$/i.test(slot.color) ? slot.color : '#757575'
    }

    /** Contrast outline so black or white filament stays visible on any theme. */
    slotOutline(slot: CfsSlot): string {
        const hex = this.slotColor(slot).slice(1)
        const [r, g, b] = [0, 2, 4].map((offset) => {
            const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255
            return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        })
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
        if (luminance < 0.03) return 'rgba(255, 255, 255, 0.45)'
        if (luminance > 0.8) return 'rgba(0, 0, 0, 0.35)'
        return 'transparent'
    }

    groupColor(color: string): string {
        return /^#[0-9a-f]{6}$/i.test(color) ? color : '#757575'
    }

    formatPercent(value: number): string {
        const bounded = Math.max(0, Math.min(100, value))
        return `${bounded.toFixed(bounded < 10 ? 1 : 0)}%`
    }

    formatTemperature(value: number | null): string {
        return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(0)} °C` : '-- °C'
    }

    formatHumidity(value: number | null): string {
        return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(0)}%` : '--%'
    }

    spoolPercentLabel(slot: CfsSlot): string {
        if (typeof slot.rfid_percent !== 'number' || !Number.isFinite(slot.rfid_percent)) return ''
        return `${Math.max(0, Math.min(100, slot.rfid_percent)).toFixed(0)}%`
    }

    slotRemainingText(slot: CfsSlot): string {
        if (typeof slot.rfid_remaining_m === 'number' && Number.isFinite(slot.rfid_remaining_m)) {
            return `${slot.rfid_remaining_m.toFixed(slot.rfid_remaining_m < 10 ? 1 : 0)} m left`
        }
        return ''
    }

    spoolRingStyle(slot: CfsSlot): Record<string, string> {
        if (!slot.present) return {}
        const color = this.slotColor(slot)
        const percent =
            typeof slot.rfid_percent === 'number' && Number.isFinite(slot.rfid_percent)
                ? Math.max(0, Math.min(100, slot.rfid_percent))
                : null
        if (percent === null) return { background: color }

        // The coloured sector is the filament still available on the spool.
        const degrees = percent * 3.6
        return {
            background: `conic-gradient(${color} 0deg ${degrees}deg, rgba(128, 128, 128, 0.28) ${degrees}deg 360deg)`,
        }
    }

    tileClass(slot: CfsSlot): Record<string, boolean> {
        return {
            'cfs-tile--loaded': slot.loaded,
            'cfs-tile--empty': !slot.present,
            'cfs-tile--warning': !!slot.rfid_unknown_code,
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
        this.sendCommand(`_BOX_RFID_READ_SLOT SLOT=${slot.index}`, `cfs_rfid_slot_${slot.index}`)
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
        // BOX_SELECT_SLOT always targets the physical slot; T commands can be
        // remapped by a print or HelixScreen tool map.
        const command = this.hasSelectSlotCommand ? `BOX_SELECT_SLOT SLOT=${slot.index}` : `T${slot.index}`
        this.sendCommand(command, `cfs_slot_${slot.index}`)
    }

    toggleSetting(command: string, setting: CfsSettingKey): void {
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
/*
 * Layout follows the width of the panel, not of the screen: the dashboard can
 * put this panel in a narrow column on a wide monitor. Each CFS unit is its own
 * size container; without container-query support the 2-column default is used.
 */
.cfs-content {
    container-type: inline-size;
    padding-top: 12px;
}

.cfs-status-row,
.cfs-chain,
.cfs-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
}

.cfs-units {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    margin-top: 12px;
}

.cfs-unit {
    container-type: inline-size;
    min-width: 0;
    padding: 10px;
    border: 1px solid rgba(128, 128, 128, 0.26);
    border-radius: 12px;
}

.cfs-unit--offline {
    border-style: dashed;
}

.cfs-unit--offline .cfs-slot-grid {
    opacity: 0.55;
}

.cfs-unit-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    min-height: 24px;
    margin-bottom: 8px;
}

.cfs-unit-title {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.02em;
}

.cfs-unit-env {
    display: inline-flex;
    gap: 10px;
    margin-left: auto;
    font-size: 0.78rem;
    opacity: 0.85;
    white-space: nowrap;
}

.cfs-slot-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}

.cfs-tile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    padding: 12px 8px 6px;
    overflow: hidden;
    text-align: center;
    border: 1px solid rgba(128, 128, 128, 0.3);
    border-radius: 10px;
    background: rgba(128, 128, 128, 0.06);
}

/* Filament colour stripe along the top edge. */
.cfs-tile::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 4px;
    background: var(--cfs-slot-color);
    box-shadow: inset 0 -1px 0 var(--cfs-slot-outline, transparent);
}

.cfs-tile--empty {
    border-style: dashed;
    background: transparent;
}

.cfs-tile--empty::before {
    background: transparent;
}

.cfs-tile--empty .cfs-tile-text {
    opacity: 0.6;
}

.cfs-tile--loaded {
    border-color: var(--v-primary-base);
    box-shadow: inset 0 0 0 1px var(--v-primary-base);
}

.cfs-tile--warning {
    border-color: var(--v-warning-base);
}

.cfs-tile-head {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    min-height: 20px;
}

.cfs-tile-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 10px;
    background: rgba(128, 128, 128, 0.22);
    font-size: 0.72rem;
    font-weight: 700;
}

.cfs-tile-active,
.cfs-tile-source {
    overflow: hidden;
    padding: 1px 6px;
    border-radius: 9px;
    font-size: 0.66rem;
    font-weight: 600;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cfs-tile-active {
    background: var(--v-primary-base);
    color: #fff;
}

.cfs-tile-source {
    margin-left: auto;
    border: 1px solid rgba(128, 128, 128, 0.45);
    opacity: 0.85;
}

.cfs-spool {
    position: relative;
    flex: 0 0 auto;
    width: 64px;
    height: 64px;
    margin: 8px 0 6px;
}

.cfs-spool-ring,
.cfs-spool-hole,
.cfs-spool-core {
    position: absolute;
    border-radius: 50%;
}

.cfs-spool-ring {
    inset: 0;
    border: 2px dashed rgba(128, 128, 128, 0.5);
}

.cfs-tile:not(.cfs-tile--empty) .cfs-spool-ring {
    border: 0;
    box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.35),
        inset 0 0 0 1px rgba(255, 255, 255, 0.18),
        0 0 0 2px var(--cfs-slot-outline, transparent);
}

.cfs-spool-hole {
    inset: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(20, 20, 20, 0.88);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
}

.cfs-tile--empty .cfs-spool-hole {
    background: transparent;
    box-shadow: none;
}

.cfs-spool-core {
    width: 10px;
    height: 10px;
    background: var(--cfs-slot-color);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.cfs-spool-percent {
    color: #fff;
    font-size: 0.7rem;
    font-weight: 800;
    line-height: 1;
}

.cfs-tile-text {
    width: 100%;
    min-width: 0;
}

.cfs-tile-material {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cfs-tile-meta {
    display: -webkit-box;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}

.cfs-tile-material {
    font-size: 0.98rem;
    font-weight: 700;
    line-height: 1.25;
}

.cfs-tile-meta {
    font-size: 0.76rem;
    line-height: 1.3;
    opacity: 0.75;
}

.cfs-tile-remaining {
    margin-top: 2px;
    font-size: 0.74rem;
    font-weight: 600;
}

.cfs-tile-actions {
    display: flex;
    justify-content: center;
    gap: 2px;
    width: 100%;
    margin-top: auto;
    padding-top: 6px;
}

/* Wide unit: one row of four slots. */
@container (min-width: 500px) {
    .cfs-slot-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

/*
 * Narrower units (two columns, or one on very small widths): compact
 * horizontal tiles with the spool on the left, half the height of the
 * vertical ones, so several CFS units stay readable in a dashboard column.
 */
@container (max-width: 499px) {
    .cfs-tile {
        display: grid;
        grid-template-columns: 46px minmax(0, 1fr);
        grid-template-areas:
            'head head'
            'spool text'
            'actions actions';
        column-gap: 10px;
        align-items: center;
        padding: 10px 8px 2px;
        text-align: left;
    }

    .cfs-tile-head {
        grid-area: head;
        margin-bottom: 6px;
    }

    .cfs-spool {
        grid-area: spool;
        width: 46px;
        height: 46px;
        margin: 0;
    }

    .cfs-spool-hole {
        inset: 12px;
    }

    .cfs-spool-percent {
        font-size: 0.58rem;
    }

    .cfs-tile-text {
        grid-area: text;
        align-self: start;
    }

    .cfs-tile-material {
        font-size: 0.92rem;
    }

    .cfs-tile-actions {
        grid-area: actions;
        justify-content: flex-start;
        margin-left: -6px;
        padding-top: 2px;
    }
}

@container (max-width: 359px) {
    .cfs-slot-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}

/* Several CFS units on a very wide panel: two units side by side. */
@container (min-width: 1040px) {
    .cfs-units--multi {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

/* Larger touch targets on touch screens. */
@media (pointer: coarse) {
    .cfs-tile-actions .v-btn.v-btn--icon.v-size--small {
        width: 36px;
        height: 36px;
    }
}

.cfs-runout {
    margin-top: 12px;
    padding: 8px 10px;
    border: 1px solid rgba(128, 128, 128, 0.26);
    border-radius: 10px;
    font-size: 0.78rem;
}

.cfs-runout-title {
    margin-bottom: 4px;
    font-weight: 700;
}

.cfs-chain + .cfs-chain {
    margin-top: 4px;
}

.cfs-group-swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(128, 128, 128, 0.6);
}

.cfs-footer {
    gap: 4px 16px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(128, 128, 128, 0.2);
    font-size: 0.76rem;
}
</style>
