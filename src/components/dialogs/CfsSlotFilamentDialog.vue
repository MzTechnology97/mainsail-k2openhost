<template>
    <v-dialog v-model="showDialog" max-width="720" scrollable eager>
        <v-card>
            <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">{{ rfidManaged ? mdiNfcVariant : mdiSpool }}</v-icon>
                {{ cfsSlot ? slotLabel(cfsSlot) : 'CFS slot' }} · {{ rfidManaged ? 'RFID filament' : 'manual filament' }}
                <v-spacer />
                <v-btn icon @click="close"><v-icon>{{ mdiClose }}</v-icon></v-btn>
            </v-card-title>
            <v-divider />

            <v-card-text v-if="cfsSlot" class="pt-5">
                <template v-if="rfidManaged">
                    <v-alert dense text type="info" class="mb-4">
                        RFID filament data is read-only and inherited from the filament database.
                    </v-alert>

                    <div class="d-flex align-center mb-4">
                        <div class="cfs-rfid-swatch mr-3" :style="{ backgroundColor: rfidColor }" />
                        <div>
                            <div class="text-h6">{{ cfsSlot.material || 'Unknown material' }}</div>
                            <div class="text--secondary">{{ rfidName }}</div>
                        </div>
                    </div>

                    <v-simple-table dense>
                        <tbody>
                            <tr><th>Material</th><td>{{ cfsSlot.material || '—' }}</td></tr>
                            <tr><th>Full name</th><td>{{ rfidName }}</td></tr>
                            <tr><th>Brand</th><td>{{ rfidBrand }}</td></tr>
                            <tr>
                                <th>Color</th>
                                <td>
                                    <span class="cfs-rfid-mini-swatch mr-2" :style="{ backgroundColor: rfidColor }" />
                                    <code>{{ rfidColor }}</code>
                                </td>
                            </tr>
                            <tr><th>RFID code</th><td><code>{{ cfsSlot.rfid_code || '—' }}</code></td></tr>
                            <tr><th>Filament ID</th><td><code>{{ cfsSlot.filament_id || '—' }}</code></td></tr>
                            <tr><th>Nozzle temperature</th><td>{{ rfidTemperatureRange }}</td></tr>
                            <tr><th>Pressure advance</th><td>{{ rfidPressureAdvanceText }}</td></tr>
                            <tr><th>Remaining</th><td>{{ rfidRemainingText }}</td></tr>
                        </tbody>
                    </v-simple-table>
                </template>

                <template v-else>
                    <v-row dense>
                        <v-col cols="12" sm="4" class="d-flex align-center">
                            <strong>Brand</strong>
                        </v-col>
                        <v-col cols="12" sm="8">
                            <v-select
                                v-model="brand"
                                :items="brandOptions"
                                dense
                                outlined
                                hide-details
                                @change="onBrandChanged" />
                        </v-col>

                        <v-col cols="12" sm="4" class="d-flex align-center">
                            <strong>Type</strong>
                        </v-col>
                        <v-col cols="12" sm="8">
                            <v-select
                                v-model="material"
                                :items="materialOptions"
                                dense
                                outlined
                                hide-details
                                @change="onMaterialChanged" />
                        </v-col>

                        <v-col cols="12" sm="4" class="d-flex align-center">
                            <strong>Name</strong>
                        </v-col>
                        <v-col cols="12" sm="8">
                            <v-select
                                v-model="selectedId"
                                :items="profileItems"
                                item-text="text"
                                item-value="value"
                                dense
                                outlined
                                hide-details
                                no-data-text="No matching saved profile"
                                @change="loadSelected" />
                        </v-col>

                        <v-col cols="12" sm="4" class="d-flex align-center">
                            <strong>Color</strong>
                        </v-col>
                        <v-col cols="12" sm="8">
                            <cfs-color-picker v-model="color" label="" />
                        </v-col>

                        <v-col cols="12" sm="4" class="d-flex align-center">
                            <strong>Nozzle temperature</strong>
                        </v-col>
                        <v-col cols="12" sm="8" class="d-flex align-center">
                            <span>{{ temperatureRange }}</span>
                        </v-col>

                        <v-col cols="12" sm="4" class="d-flex align-center">
                            <strong>Pressure advance</strong>
                        </v-col>
                        <v-col cols="12" sm="8" class="d-flex align-center">
                            <span>{{ pressureAdvanceText }}</span>
                        </v-col>
                    </v-row>

                    <v-alert v-if="selectedProfile && selectedProfile.system" dense text type="info" class="mt-4 mb-0">
                        System preset from the filament database. The selected color is stored on this slot only.
                    </v-alert>
                </template>
            </v-card-text>

            <v-divider />
            <v-card-actions>
                <v-btn v-if="cfsSlot && !rfidManaged" text color="error" @click="clearSlot">
                    Reset slot
                </v-btn>
                <v-btn
                    v-if="cfsSlot && rfidManaged && !cfsSlot.external"
                    text
                    color="primary"
                    :disabled="printerIsPrinting"
                    @click="rereadRfid">
                    <v-icon left small>{{ mdiRefresh }}</v-icon>
                    Reread RFID
                </v-btn>
                <v-btn
                    v-if="cfsSlot && cfsSlot.external && !rfidManaged"
                    text
                    color="primary"
                    :disabled="printerIsPrinting"
                    @click="readExternalRfid">
                    <v-icon left small>{{ mdiNfc }}</v-icon>
                    Read external RFID
                </v-btn>
                <v-spacer />
                <v-btn text @click="close">{{ rfidManaged ? $t('Buttons.Close') : 'Cancel' }}</v-btn>
                <v-btn v-if="cfsSlot && !rfidManaged" color="primary" :disabled="!canSave" @click="save">
                    Save
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import CfsColorPicker from '@/components/cfs/CfsColorPicker.vue'
import { CfsBoxState, CfsFilament, CfsSlot } from '@/types/cfs'
import { mdiClose, mdiNfc, mdiNfcVariant, mdiPackageVariantClosed, mdiRefresh } from '@mdi/js'

interface SelectItem {
    text: string
    value: string
}

@Component({ components: { CfsColorPicker } })
export default class CfsSlotFilamentDialog extends Mixins(BaseMixin) {
    @VModel({ type: Boolean }) showDialog!: boolean
    @Prop({ type: Object, required: true }) readonly box!: CfsBoxState
    @Prop({ type: Object, default: null }) readonly cfsSlot!: CfsSlot | null

    mdiClose = mdiClose
    mdiNfc = mdiNfc
    mdiNfcVariant = mdiNfcVariant
    mdiSpool = mdiPackageVariantClosed
    mdiRefresh = mdiRefresh

    selectedId: string | null = null
    material = ''
    brand = ''
    color = '#808080'

    get filaments(): CfsFilament[] {
        return Object.values(this.box.filaments ?? {}).sort((a, b) => {
            if (!!a.system !== !!b.system) return a.system ? -1 : 1
            return (a.name || a.id).localeCompare(b.name || b.id)
        })
    }

    get rfidManaged(): boolean {
        return !!this.cfsSlot && (this.cfsSlot.rfid_active || (this.cfsSlot.present && this.cfsSlot.source === 'rfid'))
    }

    get rfidProfile(): CfsFilament | null {
        return this.findMatchingProfile()
    }

    get rfidName(): string {
        return this.rfidProfile?.name || this.cfsSlot?.name || '—'
    }

    get rfidBrand(): string {
        return this.rfidProfile?.brand || this.cfsSlot?.brand || '—'
    }

    get rfidColor(): string {
        return this.validColor(this.cfsSlot?.color || this.rfidProfile?.color || '#808080')
    }

    get rfidTemperatureRange(): string {
        const item = this.rfidProfile
        if (item?.min_temp !== null && item?.min_temp !== undefined &&
            item?.max_temp !== null && item?.max_temp !== undefined) {
            return `${item.min_temp} ~ ${item.max_temp} °C`
        }
        const target = item?.target_temp ?? this.cfsSlot?.target_temp
        return target !== null && target !== undefined ? `${target} °C` : '—'
    }

    get rfidPressureAdvanceText(): string {
        const value = this.rfidProfile?.pressure_advance ?? this.cfsSlot?.pressure_advance
        return typeof value === 'number' && Number.isFinite(value)
            ? value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
            : '—'
    }

    get rfidRemainingText(): string {
        if (!this.cfsSlot || this.cfsSlot.rfid_percent === null) return '—'
        const percent = Math.max(0, Math.min(100, this.cfsSlot.rfid_percent))
        const parts = [`${percent.toFixed(percent < 10 ? 1 : 0)}%`]
        if (this.cfsSlot.rfid_remaining_m !== null) parts.push(`${this.cfsSlot.rfid_remaining_m.toFixed(1)} m`)
        return parts.join(' · ')
    }

    get brandOptions(): string[] {
        const values = new Set<string>()
        for (const item of this.filaments) if (item.brand) values.add(item.brand)
        if (this.brand) values.add(this.brand)
        return Array.from(values).sort((a, b) => a.localeCompare(b))
    }

    get materialOptions(): string[] {
        const values = new Set<string>()
        for (const item of this.filaments) {
            if (this.brand && item.brand !== this.brand) continue
            if (item.material) values.add(item.material)
        }
        if (this.material) values.add(this.material)
        return Array.from(values).sort((a, b) => a.localeCompare(b))
    }

    get matchingProfiles(): CfsFilament[] {
        return this.filaments.filter((item) => {
            if (this.brand && item.brand !== this.brand) return false
            if (this.material && item.material !== this.material) return false
            return true
        })
    }

    get profileItems(): SelectItem[] {
        return this.matchingProfiles.map((item) => ({
            value: item.id,
            text: `${item.name || item.id}${item.system ? ' · System' : ''}`,
        }))
    }

    get selectedProfile(): CfsFilament | null {
        if (!this.selectedId) return null
        return this.box.filaments?.[this.selectedId] ?? null
    }

    get temperatureRange(): string {
        const item = this.selectedProfile
        if (!item) return '—'
        if (item.min_temp !== null && item.max_temp !== null) return `${item.min_temp} ~ ${item.max_temp} °C`
        if (item.target_temp !== null) return `${item.target_temp} °C`
        return '—'
    }

    get pressureAdvanceText(): string {
        const value = this.selectedProfile?.pressure_advance
        return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') : '—'
    }

    get canSave(): boolean {
        return !!this.cfsSlot && !this.rfidManaged && !!this.selectedProfile
    }

    slotLabel(slot: CfsSlot): string {
        return slot.external ? 'External spool (EXT)' : `T${slot.index}`
    }

    close(): void {
        this.showDialog = false
    }

    onBrandChanged(): void {
        if (this.selectedProfile?.brand !== this.brand) this.selectedId = null
        const materials = this.materialOptions
        if (this.material && !materials.includes(this.material)) this.material = ''
    }

    onMaterialChanged(): void {
        if (this.selectedProfile?.material !== this.material) this.selectedId = null
    }

    loadSelected(id: string | null): void {
        if (!id) return
        const filament = this.box.filaments?.[id]
        if (!filament) return
        this.brand = filament.brand ?? ''
        this.material = filament.material ?? ''
        if (!this.cfsSlot?.color && filament.color) this.color = this.validColor(filament.color)
    }

    validColor(value: string): string {
        return /^#[0-9a-f]{6}$/i.test(value ?? '') ? value.toUpperCase() : '#808080'
    }

    findMatchingProfile(): CfsFilament | null {
        if (!this.cfsSlot) return null
        if (this.cfsSlot.filament_id && this.box.filaments?.[this.cfsSlot.filament_id]) {
            return this.box.filaments[this.cfsSlot.filament_id]
        }
        const candidates = this.filaments.filter((item) =>
            (!this.cfsSlot?.brand || item.brand === this.cfsSlot.brand) &&
            (!this.cfsSlot?.material || item.material === this.cfsSlot.material) &&
            (!this.cfsSlot?.name || item.name === this.cfsSlot.name)
        )
        return candidates.length === 1 ? candidates[0] : null
    }

    resetFromSlot(): void {
        if (!this.cfsSlot) return
        const match = this.findMatchingProfile()
        this.selectedId = match?.id ?? null
        this.brand = match?.brand || this.cfsSlot.brand || ''
        this.material = match?.material || this.cfsSlot.material || ''
        this.color = this.validColor(this.cfsSlot.color || match?.color || '#808080')
    }

    save(): void {
        if (!this.cfsSlot || !this.canSave || !this.selectedId) return
        const script = `_BOX_SLOT_ASSIGN SLOT=${this.cfsSlot.index} FILAMENT_ID="${this.escape(this.selectedId)}" COLOR="${this.escape(this.color)}"`
        this.send(script)
        this.close()
    }

    clearSlot(): void {
        if (!this.cfsSlot || this.rfidManaged) return
        this.send(`_BOX_SLOT_CLEAR SLOT=${this.cfsSlot.index}`)
        this.close()
    }

    rereadRfid(): void {
        if (!this.cfsSlot || !this.rfidManaged || this.cfsSlot.external || this.printerIsPrinting) return
        this.send(`_BOX_RFID_READ_SLOT SLOT=${this.cfsSlot.index}`)
        this.close()
    }

    readExternalRfid(): void {
        if (!this.cfsSlot?.external || this.printerIsPrinting) return
        this.send('RFID_READER_READ')
        this.close()
    }

    escape(value: string): string {
        return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    }

    send(script: string): void {
        this.$store.dispatch('server/addEvent', { message: script, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script })
    }

    mounted(): void {
        if (this.showDialog) this.resetFromSlot()
    }

    @Watch('showDialog')
    onOpen(open: boolean): void {
        if (open) this.resetFromSlot()
    }

    @Watch('cfsSlot')
    onSlotChanged(): void {
        if (this.showDialog) this.resetFromSlot()
    }
}
</script>

<style scoped>
.cfs-rfid-swatch {
    width: 50px;
    height: 50px;
    flex: 0 0 50px;
    border-radius: 50%;
    border: 2px solid rgba(127, 127, 127, 0.4);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

.cfs-rfid-mini-swatch {
    display: inline-block;
    width: 18px;
    height: 18px;
    vertical-align: middle;
    border-radius: 50%;
    border: 1px solid rgba(127, 127, 127, 0.45);
}

::v-deep .v-data-table th {
    width: 38%;
    white-space: nowrap;
}
</style>