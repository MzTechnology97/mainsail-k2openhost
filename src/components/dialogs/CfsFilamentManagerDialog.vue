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
                    <v-alert v-if="library && library.error" dense text type="error" class="mb-3">
                        The library file {{ libraryFile }} is damaged, so changes are not saved: {{ library.error }}.
                        Fix or replace the file, then reload it.
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
                                            v-if="calibration.available"
                                            :disabled="!!calibrationBlock(filament)"
                                            @click="calibrate(filament)">
                                            <v-list-item-icon>
                                                <v-icon small>{{ mdiChartBellCurveCumulative }}</v-icon>
                                            </v-list-item-icon>
                                            <v-list-item-content>
                                                <v-list-item-title>Calibrate PA</v-list-item-title>
                                                <v-list-item-subtitle v-if="calibrationBlock(filament)">
                                                    {{ calibrationBlock(filament) }}
                                                </v-list-item-subtitle>
                                            </v-list-item-content>
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
                        <template v-if="library && library.separate_file">
                            Custom profiles live in
                            <code :title="library.path">{{ libraryFile }}</code>
                            (file manager, backups, companion app).
                        </template>
                        <template v-else>
                            System profiles come from the Creality/Generic K2-RFID catalog and are read only.
                        </template>
                    </span>
                    <v-spacer />
                    <v-btn
                        v-if="library && library.separate_file"
                        icon
                        title="Reload the library file"
                        aria-label="Reload the library file"
                        @click="reloadLibrary">
                        <v-icon>{{ mdiRefresh }}</v-icon>
                    </v-btn>
                    <v-btn text class="mr-1" @click="openBrands">
                        <v-icon left>{{ mdiTagMultipleOutline }}</v-icon>
                        Brands
                    </v-btn>
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
                                            :items="brandOptions"
                                            dense
                                            outlined
                                            label="Brand"
                                            hint="Pick a brand or type a new one"
                                            :rules="[rules.maxLength(64)]"
                                            @update:search-input="onBrandTyped">
                                            <template #append-outer>
                                                <v-btn
                                                    icon
                                                    small
                                                    class="cfs-editor-brands-btn"
                                                    title="Manage brands"
                                                    aria-label="Manage brands"
                                                    @click="openBrands">
                                                    <v-icon small>{{ mdiTagMultipleOutline }}</v-icon>
                                                </v-btn>
                                            </template>
                                        </v-combobox>
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
                                            :hint="idHint"
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
                                    <h3>Pressure advance and max flow</h3>
                                    <div class="cfs-editor-grid">
                                        <v-text-field
                                            v-model.number="form.pressure_advance"
                                            dense
                                            outlined
                                            type="number"
                                            step="0.001"
                                            label="Pressure advance"
                                            hint="Applied when a slot with this filament is loaded"
                                            persistent-hint
                                            :rules="[rules.pressureAdvance]" />
                                        <v-text-field
                                            v-model.number="form.max_flow"
                                            dense
                                            outlined
                                            type="number"
                                            step="0.5"
                                            label="Max flow (mm³/s)"
                                            hint="OrcaSlicer: max volumetric speed"
                                            persistent-hint
                                            :rules="[rules.maxFlow]" />
                                    </div>
                                </section>

                                <section class="cfs-editor-section">
                                    <cfs-color-picker v-model="form.color" label="Default colour for manual slots" />
                                </section>

                                <v-expansion-panels flat class="cfs-editor-advanced">
                                    <v-expansion-panel>
                                        <v-expansion-panel-header>
                                            Advanced: RFID code, Spoolman
                                        </v-expansion-panel-header>
                                        <v-expansion-panel-content>
                                            <div class="cfs-editor-grid">
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

        <v-dialog v-model="brandsDialog" max-width="560" scrollable :fullscreen="isMobile">
            <v-card class="cfs-brands">
                <v-card-title class="cfs-lib-title">
                    <v-icon class="mr-2">{{ mdiTagMultipleOutline }}</v-icon>
                    <div class="cfs-lib-heading">
                        <div>Brands</div>
                        <div class="cfs-lib-subtitle">
                            {{ brandRows.length }} brands · {{ customBrands.length }} added by you
                        </div>
                    </div>
                    <v-spacer />
                    <v-btn icon aria-label="Close brands" @click="brandsDialog = false">
                        <v-icon>{{ mdiClose }}</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider />
                <v-card-text class="cfs-brands-body">
                    <form class="cfs-brands-add" @submit.prevent="addBrand">
                        <v-text-field
                            v-model="newBrand"
                            dense
                            outlined
                            hide-details="auto"
                            label="New brand"
                            :error-messages="newBrandError" />
                        <v-btn color="primary" type="submit" :disabled="!newBrandValid">
                            <v-icon left>{{ mdiPlus }}</v-icon>
                            Add
                        </v-btn>
                    </form>

                    <div class="cfs-brands-list">
                        <div
                            v-for="item in brandRows"
                            :key="item.key"
                            class="cfs-brands-row"
                            :class="{ 'cfs-brands-row--custom': item.saved }">
                            <v-icon small class="cfs-brands-icon">
                                {{ item.systemCount ? mdiLockOutline : mdiTagOutline }}
                            </v-icon>
                            <div class="cfs-brands-text">
                                <div class="cfs-brands-name">{{ item.name }}</div>
                                <div class="cfs-brands-meta">{{ item.meta }}</div>
                            </div>
                            <v-btn v-if="item.customCount" x-small text @click="showBrandProfiles(item.name)">
                                Show profiles
                            </v-btn>
                            <v-btn
                                icon
                                small
                                :disabled="!item.deletable"
                                :aria-label="`Delete brand ${item.name}`"
                                @click="deleteBrand(item.name)">
                                <v-icon small :color="item.deletable ? 'error' : undefined">{{ mdiDelete }}</v-icon>
                            </v-btn>
                        </div>
                    </div>
                </v-card-text>
                <v-divider />
                <v-card-actions>
                    <span class="cfs-brands-note">
                        <v-icon x-small class="mr-1">{{ mdiInformationOutline }}</v-icon>
                        Added brands are stored in Mainsail's settings on the printer. Deleting a brand used by custom
                        profiles moves them to another brand (or none); system catalog brands are locked.
                    </span>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="confirmBrandDelete" max-width="480">
            <v-card v-if="brandDeleting" class="cfs-brands-confirm">
                <v-card-title>Delete brand {{ brandDeleting.name }}?</v-card-title>
                <v-card-text>
                    <p>
                        {{ brandDeletingProfiles.length }} custom
                        {{ brandDeletingProfiles.length === 1 ? 'profile uses' : 'profiles use' }} this brand. Choose
                        the brand they move to: temperatures, colour and every other value stay as they are.
                    </p>
                    <div class="cfs-brands-profiles">
                        <span v-for="filament in brandDeletingProfiles" :key="filament.id" class="cfs-brands-profile">
                            <span class="cfs-lib-dot" :style="{ backgroundColor: color(filament.color) }" />
                            {{ filament.name || filament.id }}
                        </span>
                    </div>
                    <v-combobox
                        v-model="brandMoveTo"
                        :items="brandMoveOptions"
                        dense
                        outlined
                        clearable
                        persistent-hint
                        label="Move the profiles to"
                        hint="Leave empty for no brand, or type a new name to rename the brand"
                        class="mt-4"
                        @update:search-input="onBrandMoveTyped" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn text @click="confirmBrandDelete = false">{{ $t('Buttons.Cancel') }}</v-btn>
                    <v-btn color="error" :disabled="readOnly" @click="removeBrand">Delete brand</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <cfs-pa-calibrate-dialog
            v-model="showCalibrate"
            :slot-item="calibrateSlot"
            :box="box"
            @show-result="showCalibrationResult = true" />
        <cfs-pa-result-dialog v-model="showCalibrationResult" :box="box" />
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import CfsColorPicker from '@/components/cfs/CfsColorPicker.vue'
import CfsPaCalibrateDialog from '@/components/cfs/CfsPaCalibrateDialog.vue'
import CfsPaResultDialog from '@/components/cfs/CfsPaResultDialog.vue'
import {
    CfsPaCalibrationState,
    cfsOptionalParam,
    cfsPaCalibrationState,
    cfsSlotForFilament,
} from '@/plugins/cfsFilamentSettings'
import CfsFilamentCard, { CfsFilamentCardBadge } from '@/components/cfs/CfsFilamentCard.vue'
import { CfsBoxState, CfsFilament, CfsFilamentLibrary, CfsSlot } from '@/types/cfs'
import { cfsBoxNumber, cfsFilamentSource, cfsSlotLabel, cfsSlotShortLabel } from '@/plugins/cfsLabels'
import {
    mdiArrowLeft,
    mdiAutorenew,
    mdiClose,
    mdiContentCopy,
    mdiContentSave,
    mdiDatabase,
    mdiDatabaseSearch,
    mdiDelete,
    mdiChartBellCurveCumulative,
    mdiDotsVertical,
    mdiInformationOutline,
    mdiLockOutline,
    mdiMagnify,
    mdiPencil,
    mdiPlus,
    mdiRefresh,
    mdiTagMultipleOutline,
    mdiTagOutline,
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
    max_flow: number | null
    rfid_code: string
    spoolman_id: number | null
}

interface BrandRow {
    key: string
    name: string
    systemCount: number
    customCount: number
    saved: boolean
    deletable: boolean
    meta: string
}

type Scope = 'all' | 'custom' | 'system' | 'used'

@Component({ components: { CfsColorPicker, CfsFilamentCard, CfsPaCalibrateDialog, CfsPaResultDialog } })
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
    mdiChartBellCurveCumulative = mdiChartBellCurveCumulative
    mdiDotsVertical = mdiDotsVertical
    mdiInformationOutline = mdiInformationOutline
    mdiLockOutline = mdiLockOutline
    mdiMagnify = mdiMagnify
    mdiPencil = mdiPencil
    mdiPlus = mdiPlus
    mdiRefresh = mdiRefresh
    mdiTagMultipleOutline = mdiTagMultipleOutline
    mdiTagOutline = mdiTagOutline
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
    showCalibrate = false
    calibrateSlot: CfsSlot | null = null
    showCalibrationResult = false
    /** PA and max flow of the profile when the editor opened, to clear removed values. */
    editedValues: { pressure_advance: boolean; max_flow: boolean } = { pressure_advance: false, max_flow: false }
    brandsDialog = false
    newBrand = ''
    confirmBrandDelete = false
    brandDeleting: BrandRow | null = null
    brandMoveTo = ''

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

    /** Brands added by the user, kept in Mainsail's settings (Moonraker DB, namespace mainsail). */
    get customBrands(): string[] {
        const value = this.$store.state.gui.cfs?.customBrands
        return Array.isArray(value) ? value.filter((item: unknown) => typeof item === 'string' && item.trim()) : []
    }

    /** Every brand known to the editor: profile brands plus the brands added by the user. */
    get brandOptions(): string[] {
        return this.brandRows.map((row) => row.name)
    }

    get brandRows(): BrandRow[] {
        const rows = new Map<string, BrandRow>()
        const row = (name: string): BrandRow => {
            const key = name.toLocaleLowerCase()
            let item = rows.get(key)
            if (!item) {
                item = { key, name, systemCount: 0, customCount: 0, saved: false, deletable: false, meta: '' }
                rows.set(key, item)
            }
            return item
        }
        for (const filament of this.filaments) {
            const name = (filament.brand ?? '').trim()
            if (!name) continue
            const item = row(name)
            if (filament.system) item.systemCount++
            else item.customCount++
        }
        for (const name of this.customBrands) row(name.trim()).saved = true
        for (const item of rows.values()) {
            // System catalog brands are read only; brands of custom profiles move those profiles first.
            item.deletable = !item.systemCount && (!item.customCount || !this.readOnly)
            const parts: string[] = []
            if (item.systemCount) parts.push(`System catalog · ${item.systemCount} profiles · locked`)
            if (item.customCount) {
                parts.push(`Used by ${item.customCount} custom profile${item.customCount === 1 ? '' : 's'}`)
            }
            if (item.saved)
                parts.push(item.systemCount || item.customCount ? 'Added by you' : 'Added by you · not used yet')
            item.meta = parts.join(' · ')
        }
        return Array.from(rows.values()).sort((a, b) => a.name.localeCompare(b.name))
    }

    get newBrandError(): string {
        const name = this.newBrand.trim()
        if (!name) return ''
        if (name.length > 64) return 'At most 64 characters'
        if (this.brandRows.some((row) => row.key === name.toLocaleLowerCase()))
            return 'This brand is already in the list'
        return ''
    }

    get newBrandValid(): boolean {
        return this.newBrand.trim() !== '' && this.newBrandError === ''
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
            detail: `${item.brand || 'Generic'} · ${item.material} · ${cfsFilamentSource(item).text} · ${item.id}`,
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

    get idHint(): string {
        const id = (this.form.id ?? '').trim().toUpperCase()
        if (/^\d{5}$/.test(id))
            return `K2-RFID material ID: tags written with ${id} (tag code 1${id}) load this profile`
        return 'Use 5 digits to write K2-RFID tags for this profile'
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
            max_flow: this.validNumber(this.form.max_flow) ? Number(this.form.max_flow) : null,
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
            maxFlow: (value: unknown) =>
                value === null ||
                value === '' ||
                (Number(value) >= 0.1 && Number(value) <= 200) ||
                'Between 0.1 and 200 mm³/s',
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
            rules.maxFlow(this.form.max_flow),
        ]
        return checks.every((check) => check === true)
    }

    cardBadges(filament: CfsFilament): CfsFilamentCardBadge[] {
        const badges: CfsFilamentCardBadge[] = [this.sourceBadge(filament)]
        const used = this.usage(filament.id)
        if (used.length) badges.push({ text: `In use · ${used.join(', ')}`, kind: 'success' })
        if (filament.rfid_code) badges.push({ text: `RFID ${filament.rfid_code}`, title: 'RFID material code' })
        return badges
    }

    sourceBadge(filament: CfsFilament): CfsFilamentCardBadge {
        const source = cfsFilamentSource(filament)
        return filament.system ? source : { ...source, kind: 'info' }
    }

    get library(): CfsFilamentLibrary | null {
        return this.box.filament_library ?? null
    }

    /** Library file shown relative to printer_data, as in Mainsail's file manager. */
    get libraryFile(): string {
        const path = this.library?.path ?? ''
        const index = path.indexOf('/printer_data/')
        return index >= 0 ? path.substring(index + '/printer_data/'.length) : path
    }

    reloadLibrary(): void {
        this.send('_BOX_FILAMENT_RELOAD')
    }

    get previewBadges(): CfsFilamentCardBadge[] {
        const badges: CfsFilamentCardBadge[] = [{ text: 'Custom', kind: 'info' }]
        if (this.form.rfid_code) badges.push({ text: `RFID ${this.form.rfid_code}` })
        return badges
    }

    openBrands(): void {
        this.newBrand = ''
        this.brandsDialog = true
    }

    saveCustomBrands(brands: string[]): void {
        const unique = new Map<string, string>()
        for (const brand of brands) {
            const name = brand.trim()
            if (name && !unique.has(name.toLocaleLowerCase())) unique.set(name.toLocaleLowerCase(), name)
        }
        const value = Array.from(unique.values()).sort((a, b) => a.localeCompare(b))
        this.$store.dispatch('gui/saveSetting', { name: 'cfs.customBrands', value })
    }

    addBrand(): void {
        if (!this.newBrandValid) return
        const name = this.newBrand.trim()
        this.saveCustomBrands([...this.customBrands, name])
        if (this.editing && !(this.form.brand ?? '').trim()) this.form.brand = name
        this.newBrand = ''
    }

    deleteBrand(name: string): void {
        const row = this.brandRows.find((item) => item.key === name.toLocaleLowerCase())
        if (!row?.deletable) return
        if (row.customCount) {
            this.brandDeleting = row
            this.brandMoveTo = ''
            this.confirmBrandDelete = true
            return
        }
        this.saveCustomBrands(this.customBrands.filter((item) => item.trim().toLocaleLowerCase() !== row.key))
    }

    get brandDeletingProfiles(): CfsFilament[] {
        const key = this.brandDeleting?.key
        if (!key) return []
        return this.filaments.filter((item) => !item.system && (item.brand ?? '').trim().toLocaleLowerCase() === key)
    }

    get brandMoveOptions(): string[] {
        return this.brandOptions.filter((name) => name.toLocaleLowerCase() !== this.brandDeleting?.key)
    }

    /** Moves the custom profiles of the deleted brand to another brand (or none), then drops the brand. */
    removeBrand(): void {
        const row = this.brandDeleting
        this.confirmBrandDelete = false
        if (!row || row.systemCount || this.readOnly) return
        const typed = (this.brandMoveTo ?? '').trim()
        if (typed.toLocaleLowerCase() === row.key) return
        // Reuse the spelling of an existing brand ("sunlu" → "SUNLU").
        const target = this.brandRows.find((item) => item.key === typed.toLocaleLowerCase())?.name ?? typed
        // _BOX_FILAMENT_SET keeps every omitted field except the target temperature, so send it back unchanged.
        const scripts = this.brandDeletingProfiles.map((filament) => {
            const parts = [
                `_BOX_FILAMENT_SET ID=${this.q(filament.id)}`,
                `MATERIAL=${this.q(filament.material)}`,
                `BRAND=${this.q(target)}`,
            ]
            if (this.validNumber(filament.target_temp))
                parts.push(`TARGET_TEMP=${Math.round(Number(filament.target_temp))}`)
            return parts.join(' ')
        })
        if (scripts.length) this.send(scripts.join('\n'))
        const kept = this.customBrands.filter((item) => item.trim().toLocaleLowerCase() !== row.key)
        if (target && !this.brandRows.some((item) => item.key === target.toLocaleLowerCase() && item.systemCount)) {
            kept.push(target)
        }
        this.saveCustomBrands(kept)
        if ((this.form.brand ?? '').trim().toLocaleLowerCase() === row.key) this.form.brand = target
        if ((this.brandFilter ?? '').toLocaleLowerCase() === row.key) this.brandFilter = null
        this.brandDeleting = null
    }

    onBrandMoveTyped(value: string | null): void {
        if (typeof value === 'string') this.brandMoveTo = value
    }

    /** Library filtered on the custom profiles of a brand, to change or delete them. */
    showBrandProfiles(name: string): void {
        this.brandsDialog = false
        this.editing = false
        this.search = ''
        this.materialFilter = null
        this.brandFilter =
            this.brandFilterOptions.find((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase()) ?? name
        this.scope = 'custom'
    }

    /** Typed text counts as the brand right away, without Enter or leaving the field. */
    onBrandTyped(value: string | null): void {
        if (typeof value === 'string') this.form.brand = value
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
            max_flow: null,
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
            max_flow: filament.max_flow ?? null,
            rfid_code: filament.rfid_code ?? '',
            spoolman_id: filament.spoolman_id ?? null,
        }
    }

    openEditor(form: FilamentForm, existing: boolean): void {
        this.editedValues = {
            pressure_advance: existing && this.validNumber(form.pressure_advance),
            max_flow: existing && this.validNumber(form.max_flow),
        }
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
        const brand = (this.form.brand ?? '').trim()
        // A new brand typed here joins the brand list, so it stays available after its profiles are gone.
        if (
            brand &&
            !this.brandRows.some((row) => row.key === brand.toLocaleLowerCase() && (row.saved || row.systemCount))
        ) {
            this.saveCustomBrands([...this.customBrands, brand])
        }
        const parts = [
            `_BOX_FILAMENT_SET ID=${this.q(this.form.id.trim().toUpperCase())}`,
            `MATERIAL=${this.q(this.form.material)}`,
            `COLOR=${this.q(this.form.color)}`,
            `BRAND=${this.q(brand)}`,
            `NAME=${this.q(this.form.name)}`,
            `TARGET_TEMP=${Math.round(this.form.target_temp)}`,
            `RFID_CODE=${this.q(this.form.rfid_code)}`,
        ]
        if (this.validNumber(this.form.min_temp)) parts.push(`MIN_TEMP=${Math.round(Number(this.form.min_temp))}`)
        if (this.validNumber(this.form.max_temp)) parts.push(`MAX_TEMP=${Math.round(Number(this.form.max_temp))}`)
        // An emptied field clears the saved value; an unset one is left out.
        const pressureAdvance = cfsOptionalParam(this.form.pressure_advance, this.editedValues.pressure_advance, 4)
        if (pressureAdvance !== null) parts.push(`PRESSURE_ADVANCE=${pressureAdvance}`)
        const maxFlow = cfsOptionalParam(this.form.max_flow, this.editedValues.max_flow, 2)
        if (maxFlow !== null) parts.push(`MAX_FLOW=${maxFlow}`)
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

    get calibration(): CfsPaCalibrationState {
        return cfsPaCalibrationState(this.$store.state.printer)
    }

    /** Why a profile cannot be calibrated now, '' when it can. */
    calibrationBlock(filament: CfsFilament): string {
        if (this.calibration.reason) return this.calibration.reason
        return cfsSlotForFilament(this.box.slots, filament.id) ? '' : 'Put this filament in a CFS slot first'
    }

    calibrate(filament: CfsFilament): void {
        const slot = cfsSlotForFilament(this.box.slots, filament.id) as CfsSlot | null
        if (!slot || this.calibrationBlock(filament)) return
        this.calibrateSlot = slot
        this.showCalibrate = true
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

.cfs-editor-brands-btn {
    margin-top: -4px;
}

/* Brands ------------------------------------------------------------------- */
.cfs-brands-body {
    padding-top: 16px !important;
}

.cfs-brands-add {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-bottom: 14px;
}

.cfs-brands-add .v-btn {
    height: 40px !important;
}

.cfs-brands-list {
    display: grid;
    gap: 6px;
}

.cfs-brands-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 6px 6px 6px 12px;
    border: 1px solid rgba(128, 128, 128, 0.22);
    border-radius: 10px;
    background: rgba(128, 128, 128, 0.04);
}

.cfs-brands-row--custom {
    border-color: var(--v-info-base);
    background: rgba(128, 128, 128, 0.08);
}

.cfs-brands-icon {
    opacity: 0.7;
}

.cfs-brands-text {
    flex: 1 1 auto;
    min-width: 0;
}

.cfs-brands-name {
    overflow: hidden;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cfs-brands-meta {
    font-size: 0.74rem;
    opacity: 0.75;
}

.cfs-brands-profiles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.cfs-brands-profile {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px 2px 6px;
    border: 1px solid rgba(128, 128, 128, 0.35);
    border-radius: 12px;
    font-size: 0.78rem;
}

.cfs-brands-note {
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
