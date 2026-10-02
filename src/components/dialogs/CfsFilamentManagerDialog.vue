<template>
    <v-dialog v-model="showDialog" max-width="760" scrollable>
        <v-card>
            <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">{{ mdiDatabase }}</v-icon>
                CFS filament library
                <v-spacer />
                <v-btn icon @click="close"><v-icon>{{ mdiClose }}</v-icon></v-btn>
            </v-card-title>
            <v-divider />

            <template v-if="!editing">
                <v-card-text class="pt-4">
                    <v-alert v-if="readOnly" dense text type="warning">
                        CFS is currently read only. Saved filament profiles can be viewed, but not changed.
                    </v-alert>
                    <v-alert dense text type="info">
                        Saved profiles live on K2-OpenHost and can be assigned to CFS or external slots.
                        For K2-RFID compatibility, use the same 5-digit material ID in <strong>ID</strong> and
                        <strong>RFID code</strong>; tags written as <code>1xxxxx</code> are matched automatically.
                    </v-alert>
                    <v-list v-if="filaments.length" two-line>
                        <template v-for="(filament, index) in filaments">
                            <v-list-item :key="filament.id">
                                <v-list-item-avatar>
                                    <div class="filament-swatch" :style="{ backgroundColor: color(filament.color) }" />
                                </v-list-item-avatar>
                                <v-list-item-content>
                                    <v-list-item-title>{{ filament.name || filament.id }}</v-list-item-title>
                                    <v-list-item-subtitle>
                                        {{ filament.id }} · {{ filament.material }}
                                        <template v-if="filament.brand"> · {{ filament.brand }}</template>
                                        <template v-if="filament.target_temp"> · {{ filament.target_temp }} °C</template>
                                        <template v-if="filament.rfid_code"> · RFID {{ filament.rfid_code }}</template>
                                    </v-list-item-subtitle>
                                </v-list-item-content>
                                <v-list-item-action class="d-flex flex-row">
                                    <v-btn icon small :disabled="readOnly" @click="edit(filament)"><v-icon small>{{ mdiPencil }}</v-icon></v-btn>
                                    <v-btn icon small color="error" :disabled="readOnly" @click="remove(filament)"><v-icon small>{{ mdiDelete }}</v-icon></v-btn>
                                </v-list-item-action>
                            </v-list-item>
                            <v-divider v-if="index < filaments.length - 1" :key="`${filament.id}-divider`" />
                        </template>
                    </v-list>
                    <div v-else class="text-center text--secondary py-8">No custom filament profiles saved yet.</div>
                </v-card-text>
                <v-divider />
                <v-card-actions>
                    <v-spacer />
                    <v-btn text @click="close">{{ $t('Buttons.Close') }}</v-btn>
                    <v-btn color="primary" :disabled="readOnly" @click="createNew"><v-icon left>{{ mdiPlus }}</v-icon>Add filament</v-btn>
                </v-card-actions>
            </template>

            <template v-else>
                <v-card-text class="pt-5">
                    <v-row>
                        <v-col cols="12" sm="4">
                            <v-text-field v-model.trim="form.id" label="ID" dense outlined :disabled="editingExisting" hint="Use 5 digits for K2-RFID compatibility" persistent-hint />
                        </v-col>
                        <v-col cols="12" sm="4">
                            <v-text-field v-model.trim="form.material" label="Material" dense outlined placeholder="PETG-CF" />
                        </v-col>
                        <v-col cols="12" sm="4">
                            <v-text-field v-model.number="form.target_temp" label="Target / flush °C" dense outlined type="number" min="170" max="350" />
                        </v-col>
                        <v-col cols="12" sm="6"><v-text-field v-model.trim="form.brand" label="Brand" dense outlined /></v-col>
                        <v-col cols="12" sm="6"><v-text-field v-model.trim="form.name" label="Name / preset" dense outlined /></v-col>
                        <v-col cols="12" sm="6">
                            <v-text-field v-model.trim="form.rfid_code" label="RFID material code" dense outlined hint="Optional. Example: 12345" persistent-hint />
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-text-field v-model.number="form.spoolman_id" label="Spoolman ID" dense outlined type="number" hint="Optional" persistent-hint />
                        </v-col>
                        <v-col cols="12">
                            <div class="text-subtitle-2 mb-2">Default color</div>
                            <v-color-picker hide-mode-switch mode="hexa" :value="form.color" width="100%" @update:color="setColor" />
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-divider />
                <v-card-actions>
                    <v-btn text @click="editing = false">{{ $t('Buttons.Back') }}</v-btn>
                    <v-spacer />
                    <v-btn color="primary" :disabled="readOnly || !valid" @click="save">{{ $t('Buttons.Save') }}</v-btn>
                </v-card-actions>
            </template>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { CfsBoxState, CfsFilament } from '@/types/cfs'
import { VColorPickerColor } from '@/types/vuetify'
import { mdiClose, mdiDatabase, mdiDelete, mdiPencil, mdiPlus } from '@mdi/js'

interface FilamentForm {
    id: string
    material: string
    color: string
    brand: string
    name: string
    target_temp: number
    rfid_code: string
    spoolman_id: number | null
}

@Component
export default class CfsFilamentManagerDialog extends Mixins(BaseMixin) {
    @VModel({ type: Boolean }) showDialog!: boolean
    @Prop({ type: Object, required: true }) readonly box!: CfsBoxState
    @Prop({ type: Boolean, default: false }) readonly readOnly!: boolean
    @Prop({ type: String, default: '' }) readonly prefillRfidCode!: string
    @Prop({ type: String, default: '' }) readonly prefillColor!: string

    mdiClose = mdiClose
    mdiDatabase = mdiDatabase
    mdiDelete = mdiDelete
    mdiPencil = mdiPencil
    mdiPlus = mdiPlus

    editing = false
    editingExisting = false
    form: FilamentForm = this.blank()

    get filaments(): CfsFilament[] {
        return Object.values(this.box.filaments ?? {}).sort((a, b) =>
            (a.name || a.id).localeCompare(b.name || b.id)
        )
    }

    get valid(): boolean {
        return !!this.form.id.trim() && !!this.form.material.trim() && this.form.target_temp >= 170 && this.form.target_temp <= 350
    }

    blank(): FilamentForm {
        return { id: '', material: 'PLA', color: '#808080', brand: '', name: '', target_temp: 220, rfid_code: '', spoolman_id: null }
    }

    color(value: string): string {
        return /^#[0-9a-f]{6}$/i.test(value ?? '') ? value : '#808080'
    }

    createNew(): void {
        this.form = this.blank()
        this.editingExisting = false
        this.editing = true
    }

    createFromRfid(): void {
        const code = (this.prefillRfidCode ?? '').trim().toUpperCase()
        if (!code || this.readOnly) return
        this.form = this.blank()
        this.form.id = code.length === 6 && code.startsWith('1') ? code.substring(1) : code
        this.form.rfid_code = code
        this.form.color = this.color(this.prefillColor)
        this.editingExisting = false
        this.editing = true
    }

    edit(filament: CfsFilament): void {
        this.form = {
            id: filament.id,
            material: filament.material,
            color: this.color(filament.color),
            brand: filament.brand ?? '',
            name: filament.name ?? '',
            target_temp: filament.target_temp ?? 220,
            rfid_code: filament.rfid_code ?? '',
            spoolman_id: filament.spoolman_id ?? null,
        }
        this.editingExisting = true
        this.editing = true
    }

    setColor(value: VColorPickerColor): void {
        this.form.color = value.hex
    }

    q(value: string): string {
        return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    }

    save(): void {
        if (this.readOnly || !this.valid) return
        const parts = [
            `_BOX_FILAMENT_SET ID=${this.q(this.form.id)}`,
            `MATERIAL=${this.q(this.form.material)}`,
            `COLOR=${this.q(this.form.color)}`,
            `BRAND=${this.q(this.form.brand)}`,
            `NAME=${this.q(this.form.name)}`,
            `TARGET_TEMP=${Math.round(this.form.target_temp)}`,
            `RFID_CODE=${this.q(this.form.rfid_code)}`,
        ]
        if (this.form.spoolman_id !== null && Number.isFinite(Number(this.form.spoolman_id))) {
            parts.push(`SPOOLMAN_ID=${Math.round(Number(this.form.spoolman_id))}`)
        }
        this.send(parts.join(' '))
        this.editing = false
    }

    remove(filament: CfsFilament): void {
        if (this.readOnly) return
        if (!window.confirm(`Delete saved filament ${filament.name || filament.id}? Slot metadata will be kept as manual metadata.`)) return
        this.send(`_BOX_FILAMENT_DELETE ID=${this.q(filament.id)}`)
    }

    send(script: string): void {
        this.$store.dispatch('server/addEvent', { message: script, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script })
    }

    close(): void {
        this.editing = false
        this.showDialog = false
    }

    @Watch('showDialog')
    onShowDialogChanged(open: boolean): void {
        if (open && this.prefillRfidCode) this.createFromRfid()
    }
}
</script>

<style scoped>
.filament-swatch {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid rgba(127, 127, 127, 0.55);
}
</style>