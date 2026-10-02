<template>
    <v-dialog :value="value" max-width="650" scrollable @input="setOpen">
        <v-card>
            <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">{{ mdiSpool }}</v-icon>
                {{ slot ? slotLabel(slot) : 'CFS slot' }} filament
                <v-spacer />
                <v-btn icon @click="close"><v-icon>{{ mdiClose }}</v-icon></v-btn>
            </v-card-title>
            <v-divider />

            <v-card-text v-if="slot" class="pt-5">
                <v-alert v-if="slot.rfid_active" dense text type="info">
                    This slot is controlled by a live RFID tag. Force a reread or remove the RFID spool before assigning a manual profile.
                </v-alert>

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
                        System preset from the Creality / Generic K2-RFID catalog. The selected color is stored on this slot only.
                    </v-alert>
                </template>
            </v-card-text>

            <v-divider />
            <v-card-actions>
                <v-btn v-if="slot && !slot.rfid_active" text color="error" @click="clearSlot">
                    Clear slot
                </v-btn>
                <v-spacer />
                <v-btn text @click="close">Back</v-btn>
                <v-btn v-if="slot && !slot.rfid_active" text @click="resetFromSlot">Reset</v-btn>
                <v-btn v-if="slot && !slot.rfid_active" color="primary" :disabled="!canSave" @click="save">
                    Okay
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import CfsColorPicker from '@/components/cfs/CfsColorPicker.vue'
import { CfsBoxState, CfsFilament, CfsSlot } from '@/types/cfs'
import { mdiClose, mdiPackageVariantClosed } from '@mdi/js'

interface SelectItem {
    text: string
    value: string
}

@Component({ components: { CfsColorPicker } })
export default class CfsSlotFilamentDialog extends Mixins(BaseMixin) {
    @Prop({ type: Boolean, default: false }) readonly value!: boolean
    @Prop({ type: Object, required: true }) readonly box!: CfsBoxState
    @Prop({ type: Object, default: null }) readonly slot!: CfsSlot | null

    mdiClose = mdiClose
    mdiSpool = mdiPackageVariantClosed

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
        return !!this.slot && !this.slot.rfid_active && !!this.selectedProfile
    }

    slotLabel(slot: CfsSlot): string {
        return slot.external ? 'External spool (EXT)' : `T${slot.index}`
    }

    setOpen(open: boolean): void {
        this.$emit('input', open)
    }

    close(): void {
        this.$emit('input', false)
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
        if (!this.slot?.color && filament.color) this.color = this.validColor(filament.color)
    }

    validColor(value: string): string {
        return /^#[0-9a-f]{6}$/i.test(value ?? '') ? value.toUpperCase() : '#808080'
    }

    findMatchingProfile(): CfsFilament | null {
        if (!this.slot) return null
        if (this.slot.filament_id && this.box.filaments?.[this.slot.filament_id]) {
            return this.box.filaments[this.slot.filament_id]
        }
        const candidates = this.filaments.filter((item) =>
            (!this.slot?.brand || item.brand === this.slot.brand) &&
            (!this.slot?.material || item.material === this.slot.material) &&
            (!this.slot?.name || item.name === this.slot.name)
        )
        return candidates.length === 1 ? candidates[0] : null
    }

    resetFromSlot(): void {
        if (!this.slot) return
        const match = this.findMatchingProfile()
        this.selectedId = match?.id ?? null
        this.brand = match?.brand || this.slot.brand || ''
        this.material = match?.material || this.slot.material || ''
        this.color = this.validColor(this.slot.color || match?.color || '#808080')
    }

    save(): void {
        if (!this.slot || !this.canSave || !this.selectedId) return
        const script = `_BOX_SLOT_ASSIGN SLOT=${this.slot.index} FILAMENT_ID="${this.escape(this.selectedId)}" COLOR="${this.escape(this.color)}"`
        this.send(script)
        this.close()
    }

    clearSlot(): void {
        if (!this.slot || this.slot.rfid_active) return
        this.send(`_BOX_SLOT_CLEAR SLOT=${this.slot.index}`)
        this.close()
    }

    escape(value: string): string {
        return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    }

    send(script: string): void {
        this.$store.dispatch('server/addEvent', { message: script, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script })
    }

    @Watch('value')
    onOpen(open: boolean): void {
        if (open) this.resetFromSlot()
    }

    @Watch('slot')
    onSlotChanged(): void {
        if (this.value) this.resetFromSlot()
    }
}
</script>