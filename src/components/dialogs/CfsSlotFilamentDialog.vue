<template>
    <v-dialog v-model="showDialog" max-width="620" scrollable>
        <v-card>
            <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">{{ mdiSpool }}</v-icon>
                {{ slot ? slotLabel(slot) : 'CFS slot' }} filament
                <v-spacer />
                <v-btn icon @click="showDialog = false"><v-icon>{{ mdiClose }}</v-icon></v-btn>
            </v-card-title>
            <v-divider />
            <v-card-text v-if="slot" class="pt-4">
                <v-alert v-if="slot.rfid_active" dense text type="info">
                    This slot is currently populated from a live RFID tag. Remove or replace the tagged spool before assigning manual metadata.
                </v-alert>
                <template v-else>
                    <v-select
                        v-model="selectedId"
                        :items="filamentItems"
                        item-text="text"
                        item-value="value"
                        clearable
                        dense
                        outlined
                        label="Saved filament profile"
                        hint="Assign a reusable profile from the K2-OpenHost filament library"
                        persistent-hint
                        @change="loadSelected" />

                    <div class="d-flex align-center my-4">
                        <v-divider /><span class="mx-3 caption text--secondary">or edit this slot manually</span><v-divider />
                    </div>

                    <v-row>
                        <v-col cols="12" sm="6"><v-text-field v-model.trim="material" label="Material" dense outlined placeholder="PETG" /></v-col>
                        <v-col cols="12" sm="6"><v-text-field v-model.number="targetTemp" label="Target / flush °C" dense outlined type="number" min="170" max="350" /></v-col>
                        <v-col cols="12" sm="6"><v-text-field v-model.trim="brand" label="Brand" dense outlined /></v-col>
                        <v-col cols="12" sm="6"><v-text-field v-model.trim="name" label="Name / preset" dense outlined /></v-col>
                        <v-col cols="12">
                            <div class="text-subtitle-2 mb-2">Slot color</div>
                            <v-color-picker hide-mode-switch mode="hexa" :value="color" width="100%" @update:color="setColor" />
                        </v-col>
                    </v-row>
                </template>
            </v-card-text>
            <v-divider />
            <v-card-actions>
                <v-btn v-if="slot && !slot.rfid_active" text color="error" @click="clearSlot">Clear slot metadata</v-btn>
                <v-spacer />
                <v-btn text @click="showDialog = false">{{ $t('Buttons.Cancel') }}</v-btn>
                <v-btn v-if="slot && !slot.rfid_active" color="primary" :disabled="!canSave" @click="save">{{ $t('Buttons.Save') }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { CfsBoxState, CfsFilament, CfsSlot } from '@/types/cfs'
import { VColorPickerColor } from '@/types/vuetify'
import { mdiClose, mdiPackageVariantClosed } from '@mdi/js'

interface SelectItem {
    text: string
    value: string
}

@Component
export default class CfsSlotFilamentDialog extends Mixins(BaseMixin) {
    @VModel({ type: Boolean }) showDialog!: boolean
    @Prop({ type: Object, required: true }) readonly box!: CfsBoxState
    @Prop({ type: Object, default: null }) readonly slot!: CfsSlot | null

    mdiClose = mdiClose
    mdiSpool = mdiPackageVariantClosed

    selectedId: string | null = null
    material = ''
    brand = ''
    name = ''
    color = '#808080'
    targetTemp = 220

    get filaments(): CfsFilament[] {
        return Object.values(this.box.filaments ?? {}).sort((a, b) =>
            (a.name || a.id).localeCompare(b.name || b.id)
        )
    }

    get filamentItems(): SelectItem[] {
        return this.filaments.map((item) => ({
            value: item.id,
            text: `${item.name || item.id} · ${item.material}${item.brand ? ` · ${item.brand}` : ''}`,
        }))
    }

    get canSave(): boolean {
        const targetValid = this.targetTemp >= 170 && this.targetTemp <= 350
        return !!this.slot && !this.slot.rfid_active && targetValid && (!!this.selectedId || !!this.material.trim())
    }

    slotLabel(slot: CfsSlot): string {
        return slot.external ? 'External spool (EXT)' : `T${slot.index}`
    }

    q(value: string): string {
        return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    }

    setColor(value: VColorPickerColor): void {
        this.color = value.hex
    }

    loadSelected(id: string | null): void {
        if (!id) return
        const filament = this.box.filaments?.[id]
        if (!filament) return
        this.material = filament.material
        this.brand = filament.brand ?? ''
        this.name = filament.name ?? ''
        this.targetTemp = filament.target_temp ?? this.box.materials?.[filament.material]?.target_temp ?? 220
        this.color = /^#[0-9a-f]{6}$/i.test(filament.color ?? '') ? filament.color : '#808080'
    }

    save(): void {
        if (!this.slot || !this.canSave) return
        let script: string
        if (this.selectedId) {
            script = `_BOX_SLOT_ASSIGN SLOT=${this.slot.index} FILAMENT_ID=${this.q(this.selectedId)} COLOR=${this.q(this.color)}`
        } else {
            script = `_BOX_SLOT_SET SLOT=${this.slot.index} MATERIAL=${this.q(this.material)} COLOR=${this.q(this.color)} BRAND=${this.q(this.brand)} NAME=${this.q(this.name)} TARGET_TEMP=${Math.round(this.targetTemp)}`
        }
        this.send(script)
        this.showDialog = false
    }

    clearSlot(): void {
        if (!this.slot || this.slot.rfid_active) return
        this.send(`_BOX_SLOT_CLEAR SLOT=${this.slot.index}`)
        this.showDialog = false
    }

    send(script: string): void {
        this.$store.dispatch('server/addEvent', { message: script, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script })
    }

    @Watch('showDialog')
    onOpen(open: boolean): void {
        if (!open || !this.slot) return
        this.selectedId = this.slot.filament_id || null
        this.material = this.slot.material || ''
        this.brand = this.slot.brand || ''
        this.name = this.slot.name || ''
        this.targetTemp = this.slot.target_temp ?? this.box.materials?.[this.slot.material]?.target_temp ?? 220
        this.color = /^#[0-9a-f]{6}$/i.test(this.slot.color ?? '') ? this.slot.color : '#808080'
    }
}
</script>