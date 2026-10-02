<template>
    <v-dialog v-model="showDialog" max-width="900" scrollable>
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
                        Filament profiles can be viewed while printing, but they cannot be changed.
                    </v-alert>
                    <v-alert dense text type="info">
                        Creality and Generic profiles are shipped with K2-OpenHost. Imported K2-RFID tags and custom
                        profiles are kept separately. Spool color belongs to the slot/tag and does not create a new
                        material profile.
                    </v-alert>

                    <v-text-field
                        v-model.trim="search"
                        dense
                        outlined
                        clearable
                        :prepend-inner-icon="mdiMagnify"
                        label="Search filaments"
                        class="mb-2" />

                    <v-list v-if="filteredFilaments.length" two-line class="cfs-filament-list">
                        <template v-for="(filament, index) in filteredFilaments">
                            <v-list-item :key="filament.id">
                                <v-list-item-avatar>
                                    <div class="filament-swatch" :style="{ backgroundColor: color(filament.color) }" />
                                </v-list-item-avatar>
                                <v-list-item-content>
                                    <v-list-item-title class="d-flex align-center">
                                        <span>{{ filament.name || filament.id }}</span>
                                        <v-chip v-if="filament.system" x-small outlined class="ml-2">System</v-chip>
                                    </v-list-item-title>
                                    <v-list-item-subtitle>
                                        {{ filament.id }} · {{ filament.material }}
                                        <template v-if="filament.brand"> · {{ filament.brand }}</template>
                                        <template v-if="temperatureRange(filament)"> · {{ temperatureRange(filament) }}</template>
                                        <template v-if="filament.rfid_code"> · RFID {{ filament.rfid_code }}</template>
                                    </v-list-item-subtitle>
                                </v-list-item-content>
                                <v-list-item-action v-if="!filament.system" class="d-flex flex-row">
                                    <v-btn icon small :disabled="readOnly" @click="edit(filament)">
                                        <v-icon small>{{ mdiPencil }}</v-icon>
                                    </v-btn>
                                    <v-btn icon small color="error" :disabled="readOnly" @click="remove(filament)">
                                        <v-icon small>{{ mdiDelete }}</v-icon>
                                    </v-btn>
                                </v-list-item-action>
                            </v-list-item>
                            <v-divider v-if="index < filteredFilaments.length - 1" :key="`${filament.id}-divider`" />
                        </template>
                    </v-list>
                    <div v-else class="text-center text--secondary py-8">No matching filament profiles.</div>
                </v-card-text>
                <v-divider />
                <v-card-actions>
                    <v-spacer />
                    <v-btn text @click="close">{{ $t('Buttons.Close') }}</v-btn>
                    <v-btn color="primary" :disabled="readOnly" @click="createNew">
                        <v-icon left>{{ mdiPlus }}</v-icon>
                        Add custom filament
                    </v-btn>
                </v-card-actions>
            </template>

            <template v-else>
                <v-card-text class="pt-5">
                    <v-alert dense text type="info">
                        Choose a system preset as a starting point, or create a completely custom profile.
                        Material is selected from the known CFS/Orca material types.
                    </v-alert>

                    <v-select
                        v-if="!editingExisting"
                        v-model="presetId"
                        :items="presetItems"
                        item-text="text"
                        item-value="value"
                        clearable
                        dense
                        outlined
                        label="Start from system preset"
                        @change="applyPreset" />

                    <v-row>
                        <v-col cols="12" sm="4">
                            <v-text-field
                                v-model.trim="form.id"
                                label="ID"
                                dense
                                outlined
                                :disabled="editingExisting"
                                hint="Use 5 digits for direct K2-RFID compatibility"
                                persistent-hint />
                        </v-col>
                        <v-col cols="12" sm="4">
                            <v-select
                                v-model="form.material"
                                :items="materialOptions"
                                dense
                                outlined
                                label="Material" />
                        </v-col>
                        <v-col cols="12" sm="4">
                            <v-text-field
                                v-model.number="form.target_temp"
                                label="Target / flush °C"
                                dense
                                outlined
                                type="number"
                                min="170"
                                max="350" />
                        </v-col>

                        <v-col cols="12" sm="6">
                            <v-text-field v-model.trim="form.brand" label="Brand" dense outlined />
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-text-field v-model.trim="form.name" label="Name / Orca preset" dense outlined />
                        </v-col>

                        <v-col cols="12" sm="6">
                            <v-text-field
                                v-model.number="form.min_temp"
                                label="Nozzle minimum °C"
                                dense
                                outlined
                                type="number"
                                min="0"
                                max="500" />
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-text-field
                                v-model.number="form.max_temp"
                                label="Nozzle maximum °C"
                                dense
                                outlined
                                type="number"
                                min="0"
                                max="500" />
                        </v-col>

                        <v-col cols="12" sm="6">
                            <v-text-field
                                v-model.number="form.pressure_advance"
                                label="Pressure advance"
                                dense
                                outlined
                                type="number"
                                min="0"
                                max="2"
                                step="0.001"
                                hint="Optional profile metadata"
                                persistent-hint />
                        </v-col>

                        <v-col cols="12" sm="6">
                            <v-text-field
                                v-model.trim="form.rfid_code"
                                label="RFID material code"
                                dense
                                outlined
                                hint="Optional. 1xxxxx tags are normalized automatically."
                                persistent-hint />
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-text-field
                                v-model.number="form.spoolman_id"
                                label="Spoolman ID"
                                dense
                                outlined
                                type="number"
                                hint="Optional"
                                persistent-hint />
                        </v-col>

                        <v-col cols="12">
                            <cfs-color-picker v-model="form.color" label="Default / manual slot color" />
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-divider />
                <v-card-actions>
                    <v-btn text @click="editing = false">{{ $t('Buttons.Back') }}</v-btn>
                    <v-spacer />
                    <v-btn color="primary" :disabled="readOnly || !valid" @click="save">
                        {{ $t('Buttons.Save') }}
                    </v-btn>
                </v-card-actions>
            </template>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import CfsColorPicker from '@/components/cfs/CfsColorPicker.vue'
import { CfsBoxState, CfsFilament } from '@/types/cfs'
import { mdiClose, mdiDatabase, mdiDelete, mdiMagnify, mdiPencil, mdiPlus } from '@mdi/js'

interface FilamentForm {
    id: string
    material: string
    color: string
    brand: string
    name: string
    target_temp: number
    min_temp: number | null
    max_temp: number | null
    pressure_advance: number | null
    rfid_code: string
    spoolman_id: number | null
}

interface SelectItem {
    text: string
    value: string
}

@Component({ components: { CfsColorPicker } })
export default class CfsFilamentManagerDialog extends Mixins(BaseMixin) {
    @VModel({ type: Boolean }) showDialog!: boolean
    @Prop({ type: Object, required: true }) readonly box!: CfsBoxState
    @Prop({ type: Boolean, default: false }) readonly readOnly!: boolean
    @Prop({ type: String, default: '' }) readonly prefillRfidCode!: string
    @Prop({ type: String, default: '' }) readonly prefillColor!: string

    mdiClose = mdiClose
    mdiDatabase = mdiDatabase
    mdiDelete = mdiDelete
    mdiMagnify = mdiMagnify
    mdiPencil = mdiPencil
    mdiPlus = mdiPlus

    editing = false
    editingExisting = false
    search = ''
    presetId: string | null = null
    form: FilamentForm = this.blank()

    get filaments(): CfsFilament[] {
        return Object.values(this.box.filaments ?? {}).sort((a, b) => {
            if (!!a.system !== !!b.system) return a.system ? -1 : 1
            return (a.name || a.id).localeCompare(b.name || b.id)
        })
    }

    get filteredFilaments(): CfsFilament[] {
        const needle = (this.search ?? '').trim().toLocaleLowerCase()
        if (!needle) return this.filaments
        return this.filaments.filter((item) =>
            [item.id, item.brand, item.name, item.material, item.rfid_code]
                .join(' ')
                .toLocaleLowerCase()
                .includes(needle)
        )
    }

    get systemFilaments(): CfsFilament[] {
        return this.filaments.filter((item) => item.system)
    }

    get presetItems(): SelectItem[] {
        return this.systemFilaments.map((item) => ({
            value: item.id,
            text: `${item.brand || 'Generic'} · ${item.name || item.id} · ${item.material}`,
        }))
    }

    get materialOptions(): string[] {
        // Keep the common Orca/K2 families selectable even before a matching
        // profile has ever been loaded, then extend the list from the live
        // CFS inventory and every imported system/custom profile.
        const values = new Set<string>([
            'PLA',
            'PLA+',
            'PLA-CF',
            'PLA-GF',
            'PETG',
            'PETG-CF',
            'PETG-GF',
            'PCTG',
            'ABS',
            'ABS-CF',
            'ABS-GF',
            'ASA',
            'ASA-CF',
            'ASA-GF',
            'TPU',
            'TPE',
            'PA',
            'PA6',
            'PA6-CF',
            'PA12',
            'PA12-CF',
            'PA612-CF',
            'PC',
            'PC-CF',
            'PP',
            'PP-CF',
            'PVA',
            'HIPS',
            'PET',
            'PPS',
            'PPS-CF',
        ])
        for (const filament of this.filaments) if (filament.material) values.add(filament.material)
        for (const material of Object.keys(this.box.materials ?? {})) if (material) values.add(material)
        if (this.form.material) values.add(this.form.material)
        return Array.from(values).sort((a, b) => a.localeCompare(b))
    }

    get valid(): boolean {
        if (!this.form.id.trim() || !this.form.material.trim()) return false
        if (!(this.form.target_temp >= 170 && this.form.target_temp <= 350)) return false
        if (
            this.form.min_temp !== null &&
            this.form.max_temp !== null &&
            Number(this.form.min_temp) > Number(this.form.max_temp)
        ) {
            return false
        }
        if (
            this.form.pressure_advance !== null &&
            (!Number.isFinite(Number(this.form.pressure_advance)) ||
                Number(this.form.pressure_advance) < 0 ||
                Number(this.form.pressure_advance) > 2)
        ) {
            return false
        }
        return true
    }

    blank(): FilamentForm {
        return {
            id: '',
            material: 'PLA',
            color: '#808080',
            brand: '',
            name: '',
            target_temp: 220,
            min_temp: null,
            max_temp: null,
            pressure_advance: null,
            rfid_code: '',
            spoolman_id: null,
        }
    }

    color(value: string): string {
        return /^#[0-9a-f]{6}$/i.test(value ?? '') ? value : '#808080'
    }

    temperatureRange(filament: CfsFilament): string {
        if (filament.min_temp !== null && filament.max_temp !== null) {
            return `${filament.min_temp}–${filament.max_temp} °C`
        }
        return filament.target_temp !== null ? `${filament.target_temp} °C` : ''
    }

    createNew(): void {
        this.form = this.blank()
        this.presetId = null
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
        this.presetId = null
        this.editingExisting = false
        this.editing = true
    }

    applyPreset(id: string | null): void {
        if (!id) return
        const preset = this.box.filaments?.[id]
        if (!preset) return
        this.form.material = preset.material
        this.form.brand = preset.brand ?? ''
        this.form.name = preset.name ?? ''
        this.form.target_temp = preset.target_temp ?? 220
        this.form.min_temp = preset.min_temp ?? null
        this.form.max_temp = preset.max_temp ?? null
        this.form.pressure_advance = preset.pressure_advance ?? null
        if (!this.form.color || this.form.color === '#808080') this.form.color = this.color(preset.color)
    }

    edit(filament: CfsFilament): void {
        if (filament.system) return
        this.form = {
            id: filament.id,
            material: filament.material,
            color: this.color(filament.color),
            brand: filament.brand ?? '',
            name: filament.name ?? '',
            target_temp: filament.target_temp ?? 220,
            min_temp: filament.min_temp ?? null,
            max_temp: filament.max_temp ?? null,
            pressure_advance: filament.pressure_advance ?? null,
            rfid_code: filament.rfid_code ?? '',
            spoolman_id: filament.spoolman_id ?? null,
        }
        this.presetId = null
        this.editingExisting = true
        this.editing = true
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
        if (this.form.min_temp !== null && Number.isFinite(Number(this.form.min_temp))) {
            parts.push(`MIN_TEMP=${Math.round(Number(this.form.min_temp))}`)
        }
        if (this.form.max_temp !== null && Number.isFinite(Number(this.form.max_temp))) {
            parts.push(`MAX_TEMP=${Math.round(Number(this.form.max_temp))}`)
        }
        if (this.form.pressure_advance !== null && Number.isFinite(Number(this.form.pressure_advance))) {
            parts.push(`PRESSURE_ADVANCE=${Number(this.form.pressure_advance).toFixed(4)}`)
        }
        if (this.form.spoolman_id !== null && Number.isFinite(Number(this.form.spoolman_id))) {
            parts.push(`SPOOLMAN_ID=${Math.round(Number(this.form.spoolman_id))}`)
        }
        this.send(parts.join(' '))
        this.editing = false
    }

    remove(filament: CfsFilament): void {
        if (this.readOnly || filament.system) return
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
.cfs-filament-list {
    max-height: 54vh;
    overflow-y: auto;
}

.filament-swatch {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid rgba(127, 127, 127, 0.55);
}
</style>