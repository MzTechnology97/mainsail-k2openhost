<template>
    <v-dialog v-model="showDialog" :max-width="rfidManaged ? 620 : 900" scrollable eager :fullscreen="isMobile">
        <v-card class="cfs-sd">
            <v-card-title class="cfs-sd-title">
                <v-icon class="mr-2">{{ rfidManaged ? mdiNfcVariant : mdiSpool }}</v-icon>
                <div class="cfs-sd-heading">
                    <div>{{ rfidManaged ? 'RFID filament' : 'Slot filament' }}</div>
                    <div class="cfs-sd-subtitle">{{ subtitle }}</div>
                </div>
                <v-spacer />
                <v-btn icon aria-label="Close" @click="close">
                    <v-icon>{{ mdiClose }}</v-icon>
                </v-btn>
            </v-card-title>
            <v-divider />

            <v-card-text v-if="cfsSlot" class="cfs-sd-body">
                <!-- RFID sheet ----------------------------------------------------------------------- -->
                <template v-if="rfidManaged">
                    <section class="cfs-sd-section">
                        <h3>Filament on the tag</h3>
                        <cfs-filament-card
                            :filament="rfidCard"
                            :badges="rfidBadges"
                            :remaining="remainingPercent"
                            accent />
                    </section>

                    <section v-if="remainingPercent !== null" class="cfs-sd-section">
                        <h3>Remaining</h3>
                        <div class="cfs-sd-remaining">
                            <div class="cfs-sd-remaining-track">
                                <span
                                    class="cfs-sd-remaining-fill"
                                    :style="{ width: `${remainingPercent}%`, background: rfidColor }" />
                            </div>
                            <div class="cfs-sd-remaining-text">
                                <strong>{{ formatPercent(remainingPercent) }}</strong>
                                <span v-if="remainingMetres">{{ remainingMetres }}</span>
                            </div>
                        </div>
                    </section>

                    <section class="cfs-sd-section">
                        <h3>Tag details</h3>
                        <dl class="cfs-sd-details">
                            <template v-for="row in rfidRows">
                                <dt :key="`${row.label}-label`">{{ row.label }}</dt>
                                <dd :key="`${row.label}-value`">
                                    <span v-if="row.color" class="cfs-sd-dot" :style="{ backgroundColor: row.color }" />
                                    <code v-if="row.code">{{ row.value }}</code>
                                    <template v-else>{{ row.value }}</template>
                                </dd>
                            </template>
                        </dl>
                    </section>

                    <p class="cfs-sd-note">
                        <v-icon x-small class="mr-1">{{ mdiInformationOutline }}</v-icon>
                        RFID data is read only and comes from the tag and the filament library.
                        <template v-if="cfsSlot.external">
                            Use the pencil to assign or reset the external spool.
                        </template>
                        <template v-else>Remove the tagged spool to assign this slot manually.</template>
                    </p>
                </template>

                <!-- Manual slot editor ----------------------------------------------------------------- -->
                <div v-else class="cfs-sd-split">
                    <div class="cfs-sd-main">
                        <section class="cfs-sd-section">
                            <h3>Profile</h3>
                            <div class="cfs-sd-grid">
                                <v-select
                                    v-model="brand"
                                    :items="brandOptions"
                                    dense
                                    outlined
                                    clearable
                                    hide-details
                                    label="Brand"
                                    @change="onBrandChanged" />
                                <v-select
                                    v-model="material"
                                    :items="materialOptions"
                                    dense
                                    outlined
                                    clearable
                                    hide-details
                                    label="Material"
                                    @change="onMaterialChanged" />
                                <v-autocomplete
                                    v-model="selectedId"
                                    :items="profileItems"
                                    item-text="text"
                                    item-value="value"
                                    dense
                                    outlined
                                    hide-details
                                    label="Filament profile"
                                    no-data-text="No matching profile in the library"
                                    class="cfs-sd-wide"
                                    @change="loadSelected">
                                    <template #item="{ item }">
                                        <span class="cfs-sd-dot mr-3" :style="{ backgroundColor: item.color }" />
                                        <v-list-item-content>
                                            <v-list-item-title>{{ item.name }}</v-list-item-title>
                                            <v-list-item-subtitle>{{ item.detail }}</v-list-item-subtitle>
                                        </v-list-item-content>
                                    </template>
                                </v-autocomplete>
                            </div>
                            <div class="cfs-sd-hint">
                                {{ matchingProfiles.length }} matching profiles. Brand and material narrow the list.
                            </div>
                        </section>

                        <section class="cfs-sd-section">
                            <cfs-color-picker v-model="color" label="Colour of this spool" />
                        </section>
                    </div>

                    <aside class="cfs-sd-preview">
                        <div class="cfs-sd-label">Preview</div>
                        <cfs-filament-card
                            :filament="previewCard"
                            :badges="previewBadges"
                            accent
                            placeholder="Choose a profile" />
                        <p class="cfs-sd-note">
                            The profile comes from the library; the colour is stored on this slot only.
                        </p>
                        <div class="cfs-sd-label mt-4">Currently in the slot</div>
                        <div class="cfs-sd-current">
                            <span class="cfs-sd-dot" :style="{ backgroundColor: validColor(cfsSlot.color) }" />
                            <span>{{ currentText }}</span>
                        </div>
                    </aside>
                </div>
            </v-card-text>

            <v-divider />
            <v-card-actions class="cfs-sd-actions">
                <v-btn v-if="canResetSlot" text color="error" @click="clearSlot">
                    <v-icon left small>{{ mdiEraser }}</v-icon>
                    Reset slot
                </v-btn>
                <v-btn
                    v-if="cfsSlot && rfidManaged && !cfsSlot.external"
                    text
                    color="primary"
                    :disabled="printerIsPrinting || cfsSlot.loaded"
                    :title="cfsSlot.loaded ? 'Loaded toward the printhead: unload it to reread the RFID tag' : ''"
                    @click="rereadRfid">
                    <v-icon left small>{{ mdiRefresh }}</v-icon>
                    Reread RFID
                </v-btn>
                <v-btn
                    v-if="cfsSlot && cfsSlot.external"
                    text
                    color="primary"
                    :disabled="printerIsPrinting"
                    @click="readExternalRfid">
                    <v-icon left small>{{ mdiNfc }}</v-icon>
                    Read external RFID
                </v-btn>
                <v-spacer />
                <v-btn text @click="close">{{ rfidManaged ? $t('Buttons.Close') : $t('Buttons.Cancel') }}</v-btn>
                <v-btn v-if="cfsSlot && !rfidManaged" color="primary" :disabled="!canSave" @click="save">
                    <v-icon left>{{ mdiContentSave }}</v-icon>
                    {{ $t('Buttons.Save') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import CfsColorPicker from '@/components/cfs/CfsColorPicker.vue'
import CfsFilamentCard, { CfsFilamentCardBadge, CfsFilamentCardData } from '@/components/cfs/CfsFilamentCard.vue'
import { CfsBoxState, CfsFilament, CfsSlot } from '@/types/cfs'
import { cfsFilamentSource, cfsSlotLabel } from '@/plugins/cfsLabels'
import {
    mdiClose,
    mdiContentSave,
    mdiEraser,
    mdiInformationOutline,
    mdiNfc,
    mdiNfcVariant,
    mdiPackageVariantClosed,
    mdiRefresh,
} from '@mdi/js'

interface ProfileItem {
    value: string
    text: string
    name: string
    detail: string
    color: string
}

@Component({ components: { CfsColorPicker, CfsFilamentCard } })
export default class CfsSlotFilamentDialog extends Mixins(BaseMixin) {
    @VModel({ type: Boolean }) showDialog!: boolean
    @Prop({ type: Object, required: true }) readonly box!: CfsBoxState
    @Prop({ type: Object, default: null }) readonly cfsSlot!: CfsSlot | null
    // auto: RFID view for a tagged slot, editor otherwise. edit/rfid force one
    // view: the external spool opens the editor from the pencil and the tag
    // information from the RFID icon, like a CFS slot.
    @Prop({ type: String, default: 'auto' }) readonly mode!: 'auto' | 'edit' | 'rfid'

    mdiClose = mdiClose
    mdiContentSave = mdiContentSave
    mdiEraser = mdiEraser
    mdiInformationOutline = mdiInformationOutline
    mdiNfc = mdiNfc
    mdiNfcVariant = mdiNfcVariant
    mdiSpool = mdiPackageVariantClosed
    mdiRefresh = mdiRefresh

    selectedId: string | null = null
    material = ''
    brand = ''
    color = '#808080'

    get isMobile(): boolean {
        return this.$vuetify.breakpoint.xsOnly
    }

    get subtitle(): string {
        if (!this.cfsSlot) return ''
        const label = cfsSlotLabel(this.cfsSlot)
        return this.rfidManaged ? `${label} · read only` : `${label} · manual assignment`
    }

    get filaments(): CfsFilament[] {
        return Object.values(this.box.filaments ?? {}).sort((a, b) => {
            if (!!a.system !== !!b.system) return a.system ? 1 : -1
            return (a.name || a.id).localeCompare(b.name || b.id)
        })
    }

    get slotHasRfid(): boolean {
        return !!this.cfsSlot && (this.cfsSlot.rfid_active || (this.cfsSlot.present && this.cfsSlot.source === 'rfid'))
    }

    get rfidManaged(): boolean {
        if (this.mode === 'edit') return false
        if (this.mode === 'rfid') return true
        return this.slotHasRfid
    }

    // Reset belongs to the editor. Kalico's profile_clearable is false while a
    // live tag owns a CFS slot and always true for the external spool, whose
    // reader cannot tell when the tagged spool is replaced by a plain one.
    get canResetSlot(): boolean {
        if (!this.cfsSlot || this.rfidManaged) return false
        return this.cfsSlot.profile_clearable ?? !this.slotHasRfid
    }

    get rfidProfile(): CfsFilament | null {
        return this.findMatchingProfile()
    }

    get rfidName(): string {
        return this.rfidProfile?.name || this.cfsSlot?.name || ''
    }

    get rfidBrand(): string {
        return this.rfidProfile?.brand || this.cfsSlot?.brand || ''
    }

    get rfidColor(): string {
        return this.validColor(this.cfsSlot?.color || this.rfidProfile?.color || '#808080')
    }

    get rfidCard(): CfsFilamentCardData {
        const profile = this.rfidProfile
        return {
            id: this.cfsSlot?.filament_id || profile?.id || '',
            name: this.rfidName,
            material: this.cfsSlot?.material || profile?.material || '',
            brand: this.rfidBrand,
            color: this.rfidColor,
            target_temp: profile?.target_temp ?? this.cfsSlot?.target_temp ?? null,
            min_temp: profile?.min_temp ?? null,
            max_temp: profile?.max_temp ?? null,
            pressure_advance: profile?.pressure_advance ?? this.cfsSlot?.pressure_advance ?? null,
            spoolman_id: this.cfsSlot?.spoolman_id ?? null,
        }
    }

    get rfidBadges(): CfsFilamentCardBadge[] {
        const badges: CfsFilamentCardBadge[] = [{ text: 'RFID', kind: 'info' }, { text: 'Read only' }]
        if (this.cfsSlot?.rfid_code) badges.push({ text: `Code ${this.cfsSlot.rfid_code}` })
        if (this.rfidProfile?.system) badges.push({ text: 'System profile' })
        return badges
    }

    get remainingPercent(): number | null {
        const value = this.cfsSlot?.rfid_percent
        return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null
    }

    get remainingMetres(): string {
        const left = this.cfsSlot?.rfid_remaining_m
        if (typeof left !== 'number' || !Number.isFinite(left)) return ''
        const total = this.cfsSlot?.rfid_total_m
        return typeof total === 'number' && Number.isFinite(total) && total > 0
            ? `${left.toFixed(1)} m of ${total.toFixed(0)} m left`
            : `${left.toFixed(1)} m left`
    }

    get rfidRows(): { label: string; value: string; code?: boolean; color?: string }[] {
        const card = this.rfidCard
        const temp =
            card.min_temp !== null && card.max_temp !== null
                ? `${card.min_temp}–${card.max_temp} °C${card.target_temp !== null ? ` · target ${card.target_temp} °C` : ''}`
                : card.target_temp !== null
                  ? `${card.target_temp} °C`
                  : '—'
        const pa =
            typeof card.pressure_advance === 'number' && Number.isFinite(card.pressure_advance)
                ? card.pressure_advance.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
                : '—'
        return [
            { label: 'Material', value: card.material || '—' },
            { label: 'Full name', value: card.name || '—' },
            { label: 'Brand', value: card.brand || '—' },
            { label: 'Colour', value: this.rfidColor, code: true, color: this.rfidColor },
            { label: 'RFID code', value: this.cfsSlot?.rfid_code || '—', code: true },
            { label: 'Filament ID', value: this.cfsSlot?.filament_id || '—', code: true },
            { label: 'Nozzle temperature', value: temp },
            { label: 'Pressure advance', value: pa },
        ]
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

    get profileItems(): ProfileItem[] {
        return this.matchingProfiles.map((item) => ({
            value: item.id,
            name: item.name || item.id,
            detail: `${item.brand || 'Generic'} · ${item.material} · ${cfsFilamentSource(item).text} · ${item.id}`,
            text: `${item.name || item.id} · ${item.brand || 'Generic'} · ${item.material} · ${item.id}`,
            color: this.validColor(item.color),
        }))
    }

    get selectedProfile(): CfsFilament | null {
        if (!this.selectedId) return null
        return this.box.filaments?.[this.selectedId] ?? null
    }

    get previewCard(): CfsFilamentCardData {
        const profile = this.selectedProfile
        if (!profile) return { material: this.material, brand: this.brand, color: this.color }
        return { ...profile, color: this.color }
    }

    get previewBadges(): CfsFilamentCardBadge[] {
        const profile = this.selectedProfile
        if (!profile) return []
        const source = cfsFilamentSource(profile)
        return [profile.system ? source : { ...source, kind: 'info' }, { text: 'Library' }]
    }

    get currentText(): string {
        const slot = this.cfsSlot
        if (!slot) return ''
        if (!slot.material) return slot.present || slot.external ? 'Not set' : 'Empty'
        return [slot.material, slot.name || slot.brand].filter(Boolean).join(' · ')
    }

    get canSave(): boolean {
        return !!this.cfsSlot && !this.rfidManaged && !!this.selectedProfile
    }

    formatPercent(value: number): string {
        return `${value.toFixed(value < 10 ? 1 : 0)}%`
    }

    close(): void {
        this.showDialog = false
    }

    onBrandChanged(): void {
        if (this.selectedProfile && this.brand && this.selectedProfile.brand !== this.brand) this.selectedId = null
        if (this.material && !this.materialOptions.includes(this.material)) this.material = ''
    }

    onMaterialChanged(): void {
        if (this.selectedProfile && this.material && this.selectedProfile.material !== this.material) {
            this.selectedId = null
        }
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
        const candidates = this.filaments.filter(
            (item) =>
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
        if (!this.cfsSlot || !this.canResetSlot) return
        this.send(`_BOX_SLOT_CLEAR SLOT=${this.cfsSlot.index}`)
        this.close()
    }

    rereadRfid(): void {
        if (
            !this.cfsSlot ||
            !this.rfidManaged ||
            this.cfsSlot.external ||
            this.printerIsPrinting ||
            this.cfsSlot.loaded
        )
            return
        this.send(`_BOX_RFID_READ_SLOT SLOT=${this.cfsSlot.index}`)
        this.close()
    }

    readExternalRfid(): void {
        if (!this.cfsSlot?.external || this.printerIsPrinting) return
        this.send('RFID_READER_READ')
        this.close()
    }

    escape(value: string): string {
        return String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
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
.cfs-sd-title {
    flex-wrap: nowrap;
}

.cfs-sd-heading {
    min-width: 0;
    line-height: 1.2;
}

.cfs-sd-subtitle {
    font-size: 0.78rem;
    font-weight: 400;
    opacity: 0.7;
}

.cfs-sd-body {
    padding-top: 16px !important;
}

.cfs-sd-section {
    margin-bottom: 18px;
}

.cfs-sd-section h3,
.cfs-sd-label {
    margin-bottom: 10px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.75;
}

.cfs-sd-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 290px;
    gap: 20px;
    align-items: start;
}

.cfs-sd-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.cfs-sd-wide {
    grid-column: 1 / -1;
}

.cfs-sd-hint,
.cfs-sd-note {
    margin: 8px 0 0;
    font-size: 0.74rem;
    opacity: 0.7;
}

.cfs-sd-preview {
    position: sticky;
    top: 0;
}

.cfs-sd-current {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px dashed rgba(128, 128, 128, 0.45);
    border-radius: 8px;
    font-size: 0.85rem;
}

.cfs-sd-dot {
    display: inline-block;
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
    margin-right: 6px;
    vertical-align: middle;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(128, 128, 128, 0.6);
}

.cfs-sd-remaining {
    display: grid;
    gap: 6px;
}

.cfs-sd-remaining-track {
    height: 10px;
    overflow: hidden;
    border-radius: 5px;
    background: rgba(128, 128, 128, 0.25);
    box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.35);
}

.cfs-sd-remaining-fill {
    display: block;
    height: 100%;
    border-radius: 5px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
}

.cfs-sd-remaining-text {
    display: flex;
    gap: 10px;
    font-size: 0.85rem;
}

.cfs-sd-details {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 8px 18px;
    margin: 0;
    padding: 12px;
    border: 1px solid rgba(128, 128, 128, 0.28);
    border-radius: 10px;
    background: rgba(128, 128, 128, 0.05);
    font-size: 0.86rem;
}

.cfs-sd-details dt {
    font-weight: 600;
    opacity: 0.75;
}

.cfs-sd-details dd {
    display: flex;
    align-items: center;
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
}

.cfs-sd-actions {
    flex-wrap: wrap;
    gap: 6px;
}

@media (max-width: 760px) {
    .cfs-sd-split {
        grid-template-columns: minmax(0, 1fr);
    }

    .cfs-sd-preview {
        position: static;
        order: -1;
    }
}

@media (max-width: 480px) {
    .cfs-sd-grid {
        grid-template-columns: minmax(0, 1fr);
    }

    .cfs-sd-details {
        grid-template-columns: minmax(0, 1fr);
        gap: 2px;
    }

    .cfs-sd-details dd {
        margin-bottom: 8px;
    }
}
</style>
