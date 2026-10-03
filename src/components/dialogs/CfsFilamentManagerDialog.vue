<template>
    <v-dialog v-model="showDialog" max-width="1180" scrollable :fullscreen="isMobile">
        <v-card class="cfs-lib">
            <v-card-title class="cfs-lib-title">
                <v-btn v-if="editing" icon class="mr-1" aria-label="Back to the library" @click="editing = false">
                    <v-icon>{{ mdiArrowLeft }}</v-icon>
                </v-btn>
                <v-icon v-else class="mr-2">{{ mdiDatabase }}</v-icon>
                <div class="cfs-lib-heading">
                    <div>{{ editing ? editorTitle : 'Filament library' }}</div>
                    <div class="cfs-lib-subtitle">
                        <template v-if="!editing">
                            {{ customCount }} custom · {{ systemCount }} system profiles
                        </template>
                        <template v-else>
                            {{ editingExisting ? `Editing ${form.id}` : 'New custom profile' }}
                        </template>
                    </div>
                </div>
                <v-spacer />
                <v-btn icon aria-label="Close" @click="close">
                    <v-icon>{{ mdiClose }}</v-icon>
                </v-btn>
            </v-card-title>
            <v-divider />

            <!-- Library ------------------------------------------------------------------------------- -->
            <template v-if="!editing">
                <v-card-text class="cfs-lib-body">
                    <v-alert v-if="readOnly" dense text type="warning" class="mb-3">
                        Profiles can be viewed while printing, but not changed.
                    </v-alert>

                    <div class="cfs-lib-toolbar">
                        <v-text-field
                            v-model.trim="search"
                            dense
                            outlined
                            clearable
                            hide-details
                            :prepend-inner-icon="mdiMagnify"
                            label="Search name, brand, material, ID or RFID code"
                            class="cfs-lib-search" />
                        <v-select
                            v-model="brandFilter"
                            :items="brandFilterOptions"
                            dense
                            outlined
                            clearable
                            hide-details
                            label="Brand"
                            class="cfs-lib-filter" />
                        <v-select
                            v-model="materialFilter"
                            :items="materialFilterOptions"
                            dense
                            outlined
                            clearable
                            hide-details
                            label="Material"
                            class="cfs-lib-filter" />
                    </div>

                    <div class="cfs-lib-scopes">
                        <v-chip-group v-model="scope" mandatory active-class="primary--text">
                            <v-chip v-for="item in scopeItems" :key="item.value" :value="item.value" small outlined>
                                {{ item.text }}
                                <span class="cfs-lib-count">{{ item.count }}</span>
                            </v-chip>
                        </v-chip-group>
                        <v-spacer />
                        <span class="cfs-lib-shown">{{ filteredFilaments.length }} shown</span>
                    </div>

                    <div v-if="filteredFilaments.length" class="cfs-lib-grid">
                        <cfs-filament-card
                            v-for="filament in filteredFilaments"
                            :key="filament.id"
                            :filament="filament"
                            :badges="cardBadges(filament)"
                            :accent="!filament.system">
                            <template #actions>
                                <v-menu left offset-y>
                                    <template #activator="{ on, attrs }">
                                        <v-btn
                                            icon
                                            small
                                            class="cfs-lib-more"
                                            :aria-label="`Actions for ${filament.name || filament.id}`"
                                            v-bind="attrs"
                                            v-on="on">
                                            <v-icon small>{{ mdiDotsVertical }}</v-icon>
                                        </v-btn>
                                    </template>
                                    <v-list dense>
                                        <v-list-item :disabled="readOnly" @click="duplicate(filament)">
                                            <v-list-item-icon>
                                                <v-icon small>{{ mdiContentCopy }}</v-icon>
                                            </v-list-item-icon>
                                            <v-list-item-title>
                                                {{ filament.system ? 'Create custom from this' : 'Duplicate' }}
                                            </v-list-item-title>
                                        </v-list-item>
                                        <v-list-item
                                            v-if="!filament.system"
                                            :disabled="readOnly"
                                            @click="edit(filament)">
                                            <v-list-item-icon>
                                                <v-icon small>{{ mdiPencil }}</v-icon>
                                            </v-list-item-icon>
                                            <v-list-item-title>Edit</v-list-item-title>
                                        </v-list-item>
                                        <v-list-item
                                            v-if="!filament.system"
                                            :disabled="readOnly"
                                            @click="askDelete(filament)">
                                            <v-list-item-icon>
                                                <v-icon small color="error">{{ mdiDelete }}</v-icon>
                                            </v-list-item-icon>
                                            <v-list-item-title class="error--text">Delete</v-list-item-title>
                                        </v-list-item>
                                    </v-list>
                                </v-menu>
                            </template>
                            <template #foot>
                                <v-menu v-if="assignTargets.length" top offset-y>
                                    <template #activator="{ on, attrs }">
                                        <v-btn
                                            x-small
                                            text
                                            color="primary"
                                            :disabled="readOnly"
                                            v-bind="attrs"
                                            v-on="on">
                                            <v-icon left x-small>{{ mdiTrayArrowDown }}</v-icon>
                                            Use in slot
                                        </v-btn>
                                    </template>
                                    <v-list dense>
                                        <v-subheader>Assign {{ filament.name || filament.id }} to</v-subheader>
                                        <v-list-item
                                            v-for="target in assignTargets"
                                            :key="target.index"
                                            @click="assign(filament, target.index)">
                                            <v-list-item-icon>
                                                <span class="cfs-lib-dot" :style="{ backgroundColor: target.color }" />
                                            </v-list-item-icon>
                                            <v-list-item-content>
                                                <v-list-item-title>{{ target.label }}</v-list-item-title>
                                                <v-list-item-subtitle>{{ target.current }}</v-list-item-subtitle>
                                            </v-list-item-content>
                                        </v-list-item>
                                    </v-list>
                                </v-menu>
                            </template>
                        </cfs-filament-card>
                    </div>

                    <div v-else class="cfs-lib-empty">
                        <v-icon x-large class="mb-2">{{ mdiDatabaseSearch }}</v-icon>
                        <div class="mb-3">No profile matches these filters.</div>
                        <v-btn small outlined @click="clearFilters">Clear filters</v-btn>
                    </div>
                </v-card-text>
                <v-divider />
                <v-card-actions class="cfs-lib-actions">
                    <span class="cfs-lib-hint">
                        <v-icon x-small class="mr-1">{{ mdiInformationOutline }}</v-icon>
                        System profiles come from the Creality/Generic K2-RFID catalog and are read only. Spool colour
                        belongs to the slot or tag.
                    </span>
                    <v-spacer />
                    <v-btn color="primary" :disabled="readOnly" @click="createNew">
                        <v-icon left>{{ mdiPlus }}</v-icon>
                        New filament
                    </v-btn>
                </v-card-actions>
            </template>

            <!-- Editor -------------------------------------------------------------------------------- -->
            <template v-else>
                <v-card-text class="cfs-lib-body">
                    <v-form ref="form" v-model="formValid" @submit.prevent="save">
                        <div class="cfs-editor">
                            <div class="cfs-editor-form">
                                <section v-if="!editingExisting" class="cfs-editor-section">
                                    <h3>Start from</h3>
                                    <v-autocomplete
                                        v-model="presetId"
                                        :items="presetItems"
                                        item-text="text"
                                        item-value="value"
                                        clearable
                                        dense
                                        outlined
                                        hide-details
                                        label="Copy values from an existing profile (optional)"
                                        @change="applyPreset">
                                        <template #item="{ item }">
                                            <span class="cfs-lib-dot mr-3" :style="{ backgroundColor: item.color }" />
                                            <v-list-item-content>
                                                <v-list-item-title>{{ item.name }}</v-list-item-title>
                                                <v-list-item-subtitle>{{ item.detail }}</v-list-item-subtitle>
                                            </v-list-item-content>
                                        </template>
                                    </v-autocomplete>
                                </section>

                                <section class="cfs-editor-section">
                                    <h3>Identity</h3>
                                    <div class="cfs-editor-grid">
                                        <v-combobox
                                            v-model="form.brand"
                                            :items="brandFilterOptions"
                                            dense
                                            outlined
                                            label="Brand"
                                            :rules="[rules.maxLength(64)]" />
                                        <v-autocomplete
                                            v-model="form.material"
                                            :items="materialOptions"
                                            dense
                                            outlined
                                            label="Material *"
                                            :rules="[rules.required]" />
                                        <v-text-field
                                            v-model.trim="form.name"
                                            dense
                                            outlined
                                            label="Name / OrcaSlicer preset"
                                            hint="Matches the slicer preset name for automatic slot mapping"
                                            class="cfs-editor-wide"
                                            :rules="[rules.maxLength(128)]" />
                                        <v-text-field
                                            v-model="form.id"
                                            dense
                                            outlined
                                            label="ID *"
                                            :disabled="editingExisting"
                                            hint="5 digits keep it compatible with K2-RFID tags"
                                            persistent-hint
                                            :rules="[rules.required, rules.maxLength(64), rules.uniqueId]"
                                            @input="form.id = String($event || '').toUpperCase()">
                                            <template v-if="!editingExisting" #append>
                                                <v-btn
                                                    icon
                                                    small
                                                    title="Generate a free ID"
                                                    aria-label="Generate a free ID"
                                                    @click="form.id = suggestId()">
                                                    <v-icon small>{{ mdiAutorenew }}</v-icon>
                                                </v-btn>
                                            </template>
                                        </v-text-field>
                                    </div>
                                </section>

                                <section class="cfs-editor-section">
                                    <h3>Temperatures</h3>
                                    <div class="cfs-editor-temps">
                                        <v-range-slider
                                            v-model="tempRange"
                                            :min="150"
                                            :max="350"
                                            :step="5"
                                            hide-details
                                            thumb-label
                                            label="Nozzle range"
                                            class="cfs-editor-wide" />
                                        <v-text-field
                                            v-model.number="form.min_temp"
                                            dense
                                            outlined
                                            type="number"
                                            label="Minimum °C"
                                            :rules="[rules.temp(0, 500), rules.rangeOrder]" />
                                        <v-text-field
                                            v-model.number="form.target_temp"
                                            dense
                                            outlined
                                            type="number"
                                            label="Target / flush °C *"
                                            :rules="[rules.required, rules.temp(170, 350), rules.targetInRange]" />
                                        <v-text-field
                                            v-model.number="form.max_temp"
                                            dense
                                            outlined
                                            type="number"
                                            label="Maximum °C"
                                            :rules="[rules.temp(0, 500), rules.rangeOrder]" />
                                    </div>
                                </section>

                                <section class="cfs-editor-section">
                                    <cfs-color-picker v-model="form.color" label="Default colour for manual slots" />
                                </section>

                                <v-expansion-panels flat class="cfs-editor-advanced">
                                    <v-expansion-panel>
                                        <v-expansion-panel-header>
                                            Advanced: pressure advance, RFID code, Spoolman
                                        </v-expansion-panel-header>
                                        <v-expansion-panel-content>
                                            <div class="cfs-editor-grid">
                                                <v-text-field
                                                    v-model.number="form.pressure_advance"
                                                    dense
                                                    outlined
                                                    type="number"
                                                    step="0.001"
                                                    label="Pressure advance"
                                                    :rules="[rules.pressureAdvance]" />
                                                <v-text-field
                                                    v-model.trim="form.rfid_code"
                                                    dense
                                                    outlined
                                                    label="RFID material code"
                                                    hint="1xxxxx tag codes are normalised automatically"
                                                    persistent-hint />
                                                <v-text-field
                                                    v-model.number="form.spoolman_id"
                                                    dense
                                                    outlined
                                                    type="number"
                                                    label="Spoolman ID" />
                                            </div>
                                        </v-expansion-panel-content>
                                    </v-expansion-panel>
                                </v-expansion-panels>
                            </div>

                            <aside class="cfs-editor-preview">
                                <div class="cfs-editor-preview-label">Preview</div>
                                <cfs-filament-card
                                    :filament="previewFilament"
                                    :badges="previewBadges"
                                    accent
                                    placeholder="Unnamed filament" />
                                <p class="cfs-editor-preview-note">
                                    Saved in the printer's filament inventory and available to every slot, the print
                                    dialog's automatic mapping and RFID tags with the same code.
                                </p>
                            </aside>
                        </div>
                    </v-form>
                </v-card-text>
                <v-divider />
                <v-card-actions>
                    <v-btn text @click="editing = false">{{ $t('Buttons.Back') }}</v-btn>
                    <v-spacer />
                    <v-btn color="primary" :disabled="readOnly || !valid" @click="save">
                        <v-icon left>{{ editingExisting ? mdiContentSave : mdiPlus }}</v-icon>
                        {{ editingExisting ? $t('Buttons.Save') : 'Create filament' }}
                    </v-btn>
                </v-card-actions>
            </template>
        </v-card>

        <v-dialog v-model="confirmDelete" max-width="420">
            <v-card v-if="deleting">
                <v-card-title>Delete {{ deleting.name || deleting.id }}?</v-card-title>
                <v-card-text>
                    The custom profile
                    <code>{{ deleting.id }}</code>
                    will be removed from the library.
                    <template v-if="usage(deleting.id).length">
                        It is assigned to {{ usage(deleting.id).join(', ') }}; those slots keep their current values as
                        manual metadata.
                    </template>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn text @click="confirmDelete = false">{{ $t('Buttons.Cancel') }}</v-btn>
                    <v-btn color="error" @click="remove">{{ $t('Buttons.Delete') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import CfsColorPicker from '@/components/cfs/CfsColorPicker.vue'
import CfsFilamentCard, { CfsFilamentCardBadge } from '@/components/cfs/CfsFilamentCard.vue'
import { CfsBoxState, CfsFilament } from '@/types/cfs'
import { cfsBoxNumber, cfsSlotLabel, cfsSlotShortLabel } from '@/plugins/cfsLabels'
import {
    mdiArrowLeft,
    mdiAutorenew,
    mdiClose,
    mdiContentCopy,
    mdiContentSave,
    mdiDatabase,
    mdiDatabaseSearch,
    mdiDelete,
    mdiDotsVertical,
    mdiInformationOutline,
    mdiMagnify,
    mdiPencil,
    mdiPlus,
    mdiTrayArrowDown,
} from '@mdi/js'

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

type Scope = 'all' | 'custom' | 'system' | 'used'

@Component({ components: { CfsColorPicker, CfsFilamentCard } })
export default class CfsFilamentManagerDialog extends Mixins(BaseMixin) {
    @VModel({ type: Boolean }) showDialog!: boolean
    @Prop({ type: Object, required: true }) readonly box!: CfsBoxState
    @Prop({ type: Boolean, default: false }) readonly readOnly!: boolean
    @Prop({ type: String, default: '' }) readonly prefillRfidCode!: string
    @Prop({ type: String, default: '' }) readonly prefillColor!: string

    mdiArrowLeft = mdiArrowLeft
    mdiAutorenew = mdiAutorenew
    mdiClose = mdiClose
    mdiContentCopy = mdiContentCopy
    mdiContentSave = mdiContentSave
    mdiDatabase = mdiDatabase
    mdiDatabaseSearch = mdiDatabaseSearch
    mdiDelete = mdiDelete
    mdiDotsVertical = mdiDotsVertical
    mdiInformationOutline = mdiInformationOutline
    mdiMagnify = mdiMagnify
    mdiPencil = mdiPencil
    mdiPlus = mdiPlus
    mdiTrayArrowDown = mdiTrayArrowDown

    editing = false
    editingExisting = false
    formValid = true
    search = ''
    scope: Scope = 'all'
    brandFilter: string | null = null
    materialFilter: string | null = null
    presetId: string | null = null
    form: FilamentForm = this.blank()
    confirmDelete = false
    deleting: CfsFilament | null = null

    get isMobile(): boolean {
        return this.$vuetify.breakpoint.xsOnly
    }

    get filaments(): CfsFilament[] {
        // Custom profiles first, then the system catalog by brand and name.
        return Object.values(this.box.filaments ?? {}).sort((a, b) => {
            if (!!a.system !== !!b.system) return a.system ? 1 : -1
            const brand = (a.brand ?? '').localeCompare(b.brand ?? '')
            return brand || (a.name || a.id).localeCompare(b.name || b.id)
        })
    }

    get customCount(): number {
        return this.filaments.filter((item) => !item.system).length
    }

    get systemCount(): number {
        return this.filaments.filter((item) => item.system).length
    }

    get usageMap(): Record<string, string[]> {
        const physical = this.box.slots.filter((slot) => !slot.external)
        const multiBox = new Set(physical.map((slot) => cfsBoxNumber(slot.index))).size > 1
        const map: Record<string, string[]> = {}
        for (const slot of this.box.slots) {
            const id = (slot.filament_id ?? '').toUpperCase()
            if (!id || !slot.present) continue
            ;(map[id] = map[id] ?? []).push(cfsSlotShortLabel(slot, multiBox))
        }
        return map
    }

    get scopeItems(): { value: Scope; text: string; count: number }[] {
        return [
            { value: 'all', text: 'All', count: this.filaments.length },
            { value: 'custom', text: 'Custom', count: this.customCount },
            { value: 'system', text: 'System', count: this.systemCount },
            {
                value: 'used',
                text: 'In use',
                count: this.filaments.filter((item) => this.usage(item.id).length).length,
            },
        ]
    }

    get brandFilterOptions(): string[] {
        return Array.from(new Set(this.filaments.map((item) => (item.brand ?? '').trim()).filter(Boolean))).sort(
            (a, b) => a.localeCompare(b)
        )
    }

    get materialFilterOptions(): string[] {
        const values = this.filaments
            .filter((item) => !this.brandFilter || item.brand === this.brandFilter)
            .map((item) => (item.material ?? '').trim())
            .filter(Boolean)
        return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
    }

    get filteredFilaments(): CfsFilament[] {
        const needle = (this.search ?? '').trim().toLocaleLowerCase()
        return this.filaments.filter((item) => {
            if (this.scope === 'custom' && item.system) return false
            if (this.scope === 'system' && !item.system) return false
            if (this.scope === 'used' && !this.usage(item.id).length) return false
            if (this.brandFilter && item.brand !== this.brandFilter) return false
            if (this.materialFilter && item.material !== this.materialFilter) return false
            if (!needle) return true
            return [item.id, item.brand, item.name, item.material, item.rfid_code]
                .join(' ')
                .toLocaleLowerCase()
                .includes(needle)
        })
    }

    /** Slots a library profile can be assigned to: present, not managed by a live RFID tag. */
    get assignTargets(): { index: number; label: string; current: string; color: string }[] {
        return this.box.slots
            .filter((slot) => slot.external || (slot.present && !slot.rfid_active))
            .map((slot) => ({
                index: slot.index,
                label: cfsSlotLabel(slot),
                current: slot.material ? `${slot.material}${slot.name ? ` · ${slot.name}` : ''}` : 'Not set',
                color: this.color(slot.color),
            }))
    }

    get presetItems(): { value: string; text: string; name: string; detail: string; color: string }[] {
        return this.filaments.map((item) => ({
            value: item.id,
            name: item.name || item.id,
            detail: `${item.brand || 'Generic'} · ${item.material} · ${item.system ? 'System' : 'Custom'} · ${item.id}`,
            text: `${item.name || item.id} · ${item.brand || 'Generic'} · ${item.material} · ${item.id}`,
            color: this.color(item.color),
        }))
    }

    get materialOptions(): string[] {
        // Common Orca/K2 families, extended by every known profile and material.
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

    get editorTitle(): string {
        return this.editingExisting ? 'Edit filament' : 'New filament'
    }

    get tempRange(): number[] {
        const min = this.validNumber(this.form.min_temp) ? Number(this.form.min_temp) : this.form.target_temp - 20
        const max = this.validNumber(this.form.max_temp) ? Number(this.form.max_temp) : this.form.target_temp + 20
        return [min, max]
    }

    set tempRange(value: number[]) {
        this.form.min_temp = value[0]
        this.form.max_temp = value[1]
    }

    get previewFilament(): CfsFilament {
        return {
            id: this.form.id,
            material: this.form.material,
            color: this.form.color,
            brand: this.form.brand,
            name: this.form.name,
            target_temp: this.validNumber(this.form.target_temp) ? Number(this.form.target_temp) : null,
            min_temp: this.validNumber(this.form.min_temp) ? Number(this.form.min_temp) : null,
            max_temp: this.validNumber(this.form.max_temp) ? Number(this.form.max_temp) : null,
            pressure_advance: this.validNumber(this.form.pressure_advance) ? Number(this.form.pressure_advance) : null,
            rfid_code: this.form.rfid_code,
            spoolman_id: this.validNumber(this.form.spoolman_id) ? Number(this.form.spoolman_id) : null,
            system: false,
        }
    }

    get rules() {
        return {
            required: (value: unknown) =>
                (value !== null && value !== undefined && String(value).trim() !== '') || 'Required',
            maxLength: (length: number) => (value: unknown) =>
                String(value ?? '').length <= length || `At most ${length} characters`,
            temp: (min: number, max: number) => (value: unknown) =>
                value === null ||
                value === '' ||
                (Number(value) >= min && Number(value) <= max) ||
                `Between ${min} and ${max} °C`,
            rangeOrder: () =>
                !this.validNumber(this.form.min_temp) ||
                !this.validNumber(this.form.max_temp) ||
                Number(this.form.min_temp) <= Number(this.form.max_temp) ||
                'Minimum must not exceed maximum',
            targetInRange: () => {
                const target = Number(this.form.target_temp)
                if (this.validNumber(this.form.min_temp) && target < Number(this.form.min_temp))
                    return 'Below the minimum'
                if (this.validNumber(this.form.max_temp) && target > Number(this.form.max_temp))
                    return 'Above the maximum'
                return true
            },
            uniqueId: (value: unknown) => {
                if (this.editingExisting) return true
                const id = String(value ?? '')
                    .trim()
                    .toUpperCase()
                const existing = this.box.filaments?.[id]
                if (!existing) return true
                return existing.system
                    ? 'This ID belongs to a system profile'
                    : 'A custom profile already uses this ID (it would be overwritten)'
            },
            pressureAdvance: (value: unknown) =>
                value === null || value === '' || (Number(value) >= 0 && Number(value) <= 2) || 'Between 0 and 2',
        }
    }

    get valid(): boolean {
        const rules = this.rules
        const checks = [
            rules.required(this.form.id),
            rules.required(this.form.material),
            rules.maxLength(64)(this.form.id),
            rules.uniqueId(this.form.id),
            rules.temp(170, 350)(this.form.target_temp),
            rules.required(this.form.target_temp),
            rules.temp(0, 500)(this.form.min_temp),
            rules.temp(0, 500)(this.form.max_temp),
            rules.rangeOrder(),
            rules.targetInRange(),
            rules.pressureAdvance(this.form.pressure_advance),
        ]
        return checks.every((check) => check === true)
    }

    cardBadges(filament: CfsFilament): CfsFilamentCardBadge[] {
        const badges: CfsFilamentCardBadge[] = [filament.system ? { text: 'System' } : { text: 'Custom', kind: 'info' }]
        const used = this.usage(filament.id)
        if (used.length) badges.push({ text: `In use · ${used.join(', ')}`, kind: 'success' })
        if (filament.rfid_code) badges.push({ text: `RFID ${filament.rfid_code}`, title: 'RFID material code' })
        return badges
    }

    get previewBadges(): CfsFilamentCardBadge[] {
        const badges: CfsFilamentCardBadge[] = [{ text: 'Custom', kind: 'info' }]
        if (this.form.rfid_code) badges.push({ text: `RFID ${this.form.rfid_code}` })
        return badges
    }

    usage(id: string): string[] {
        return this.usageMap[(id ?? '').toUpperCase()] ?? []
    }

    validNumber(value: unknown): boolean {
        return value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value))
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

    /** Next free numeric ID in the custom range, 5 digits like K2-RFID material IDs. */
    suggestId(): string {
        const used = new Set(Object.keys(this.box.filaments ?? {}).map((id) => id.toUpperCase()))
        for (let candidate = 90001; candidate <= 99999; candidate++) {
            if (!used.has(String(candidate))) return String(candidate)
        }
        return `CUSTOM-${Date.now()}`
    }

    clearFilters(): void {
        this.search = ''
        this.brandFilter = null
        this.materialFilter = null
        this.scope = 'all'
    }

    fromFilament(filament: CfsFilament): FilamentForm {
        return {
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
    }

    openEditor(form: FilamentForm, existing: boolean): void {
        this.form = form
        this.presetId = null
        this.editingExisting = existing
        this.editing = true
    }

    createNew(): void {
        this.openEditor({ ...this.blank(), id: this.suggestId() }, false)
    }

    createFromRfid(): void {
        const code = (this.prefillRfidCode ?? '').trim().toUpperCase()
        if (!code || this.readOnly) return
        const form = this.blank()
        form.id = code.length === 6 && code.startsWith('1') ? code.substring(1) : code
        form.rfid_code = code
        form.color = this.color(this.prefillColor)
        this.openEditor(form, false)
    }

    duplicate(filament: CfsFilament): void {
        if (this.readOnly) return
        const form = this.fromFilament(filament)
        form.id = this.suggestId()
        form.name = filament.system ? form.name : `${form.name || filament.id} copy`
        form.rfid_code = ''
        form.spoolman_id = null
        this.openEditor(form, false)
    }

    edit(filament: CfsFilament): void {
        if (filament.system) return
        this.openEditor(this.fromFilament(filament), true)
    }

    applyPreset(id: string | null): void {
        if (!id) return
        const preset = this.box.filaments?.[id]
        if (!preset) return
        const keep = { id: this.form.id, rfid_code: this.form.rfid_code, color: this.form.color }
        this.form = { ...this.fromFilament(preset), id: keep.id, rfid_code: keep.rfid_code, spoolman_id: null }
        if (keep.color !== '#808080') this.form.color = keep.color
    }

    q(value: string): string {
        return `"${String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')}"`
    }

    save(): void {
        if (this.readOnly || !this.valid) return
        const parts = [
            `_BOX_FILAMENT_SET ID=${this.q(this.form.id.trim().toUpperCase())}`,
            `MATERIAL=${this.q(this.form.material)}`,
            `COLOR=${this.q(this.form.color)}`,
            `BRAND=${this.q(this.form.brand ?? '')}`,
            `NAME=${this.q(this.form.name)}`,
            `TARGET_TEMP=${Math.round(this.form.target_temp)}`,
            `RFID_CODE=${this.q(this.form.rfid_code)}`,
        ]
        if (this.validNumber(this.form.min_temp)) parts.push(`MIN_TEMP=${Math.round(Number(this.form.min_temp))}`)
        if (this.validNumber(this.form.max_temp)) parts.push(`MAX_TEMP=${Math.round(Number(this.form.max_temp))}`)
        if (this.validNumber(this.form.pressure_advance)) {
            parts.push(`PRESSURE_ADVANCE=${Number(this.form.pressure_advance).toFixed(4)}`)
        }
        if (this.validNumber(this.form.spoolman_id)) {
            parts.push(`SPOOLMAN_ID=${Math.round(Number(this.form.spoolman_id))}`)
        }
        this.send(parts.join(' '))
        this.editing = false
    }

    assign(filament: CfsFilament, slot: number): void {
        if (this.readOnly) return
        this.send(`_BOX_SLOT_ASSIGN SLOT=${slot} FILAMENT_ID=${this.q(filament.id)}`)
    }

    askDelete(filament: CfsFilament): void {
        if (this.readOnly || filament.system) return
        this.deleting = filament
        this.confirmDelete = true
    }

    remove(): void {
        const filament = this.deleting
        this.confirmDelete = false
        if (!filament || this.readOnly || filament.system) return
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

    @Watch('brandFilter')
    onBrandFilterChanged(): void {
        if (this.materialFilter && !this.materialFilterOptions.includes(this.materialFilter)) {
            this.materialFilter = null
        }
    }

    @Watch('showDialog')
    onShowDialogChanged(open: boolean): void {
        if (open && this.prefillRfidCode) this.createFromRfid()
    }
}
</script>

<style scoped>
.cfs-lib-title {
    flex-wrap: nowrap;
}

.cfs-lib-heading {
    min-width: 0;
    line-height: 1.2;
}

.cfs-lib-subtitle {
    font-size: 0.78rem;
    font-weight: 400;
    opacity: 0.7;
}

.cfs-lib-body {
    padding-top: 16px !important;
}

.cfs-lib-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px;
}

.cfs-lib-scopes {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin: 6px 0 8px;
}

.cfs-lib-count {
    margin-left: 6px;
    padding: 0 6px;
    border-radius: 8px;
    background: rgba(128, 128, 128, 0.2);
    font-size: 0.7rem;
}

.cfs-lib-shown {
    font-size: 0.76rem;
    opacity: 0.7;
}

.cfs-lib-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
    gap: 10px;
}

.cfs-lib-more {
    align-self: flex-start;
}

.cfs-lib-dot {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(128, 128, 128, 0.6);
}

.cfs-lib-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 0;
    opacity: 0.8;
}

.cfs-lib-actions {
    flex-wrap: wrap;
    gap: 8px;
}

.cfs-lib-hint {
    font-size: 0.74rem;
    opacity: 0.7;
}

/* Editor ------------------------------------------------------------------- */
.cfs-editor {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 20px;
    align-items: start;
}

.cfs-editor-section {
    margin-bottom: 18px;
}

.cfs-editor-section h3 {
    margin-bottom: 10px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.75;
}

.cfs-editor-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 12px;
}

.cfs-editor-temps {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 12px;
}

.cfs-editor-wide {
    grid-column: 1 / -1;
}

.cfs-editor-temps .cfs-editor-wide {
    margin-bottom: 14px;
}

.cfs-editor-advanced {
    border: 1px solid rgba(128, 128, 128, 0.28);
    border-radius: 8px;
}

.cfs-editor-preview {
    position: sticky;
    top: 0;
}

.cfs-editor-preview-label {
    margin-bottom: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.75;
}

.cfs-editor-preview-note {
    margin-top: 10px;
    font-size: 0.74rem;
    opacity: 0.7;
}

@media (max-width: 860px) {
    .cfs-lib-toolbar {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }

    .cfs-lib-search {
        grid-column: 1 / -1;
    }

    .cfs-editor {
        grid-template-columns: minmax(0, 1fr);
    }

    .cfs-editor-preview {
        position: static;
        order: -1;
    }
}

@media (max-width: 600px) {
    .cfs-lib-hint {
        display: none;
    }
}

@media (max-width: 480px) {
    .cfs-editor-grid,
    .cfs-editor-temps {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
