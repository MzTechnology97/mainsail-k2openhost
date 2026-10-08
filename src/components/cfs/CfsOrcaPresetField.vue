<template>
    <v-combobox
        :value="value"
        :items="items"
        :filter="filter"
        :search-input.sync="typed"
        dense
        outlined
        clearable
        persistent-hint
        :label="label"
        :hint="hint"
        :disabled="disabled"
        :error-messages="error"
        @change="onChange">
        <template #selection="{ item }">
            <span class="cfs-orca-selection">
                <span v-if="nameOf(item)" class="cfs-orca-name">{{ nameOf(item) }}</span>
                <code>{{ item }}</code>
            </span>
        </template>
        <template #item="{ item }">
            <v-list-item-content>
                <v-list-item-title>{{ nameOf(item) || item }}</v-list-item-title>
                <v-list-item-subtitle>
                    <code>{{ item }}</code>
                    <template v-if="presetOf(item)">· {{ presetOf(item).vendor }} {{ presetOf(item).type }}</template>
                    <template v-if="item === defaultId">· default</template>
                </v-list-item-subtitle>
            </v-list-item-content>
        </template>
    </v-combobox>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { CfsOrcaPreset } from '@/types/cfs'
import { cfsOrcaIdValid, cfsOrcaPresetMatches, cfsOrcaPresetsFor } from '@/plugins/cfsOrca'

/**
 * OrcaSlicer preset picker: search the K2 Pro presets by name, ID, vendor or
 * type, or type the ID of your own OrcaSlicer preset (P…). Emits the ID.
 */
@Component
export default class CfsOrcaPresetField extends Vue {
    @Prop({ type: String, default: '' }) readonly value!: string
    @Prop({ type: Array, default: () => [] }) readonly presets!: CfsOrcaPreset[]
    @Prop({ type: String, default: '' }) readonly material!: string
    @Prop({ type: String, default: '' }) readonly defaultId!: string
    @Prop({ type: String, default: 'OrcaSlicer preset' }) readonly label!: string
    @Prop({ type: Boolean, default: false }) readonly disabled!: boolean

    typed: string | null = null

    get byId(): Record<string, CfsOrcaPreset> {
        const map: Record<string, CfsOrcaPreset> = {}
        for (const preset of this.presets) map[preset.id] = preset
        return map
    }

    get items(): string[] {
        return cfsOrcaPresetsFor(this.presets, this.material).map((preset) => preset.id)
    }

    presetOf(id: string): CfsOrcaPreset | null {
        return this.byId[id] ?? null
    }

    nameOf(id: string): string {
        return this.presetOf(id)?.name ?? ''
    }

    filter(item: string, query: string): boolean {
        const preset = this.presetOf(item)
        return preset ? cfsOrcaPresetMatches(preset, query) : item.toLowerCase().includes((query ?? '').toLowerCase())
    }

    get error(): string[] {
        return cfsOrcaIdValid(this.value) ? [] : ['Letters, digits, . _ + - only (max 40)']
    }

    get hint(): string {
        const fallback = this.defaultId
        const fallbackName = fallback ? this.nameOf(fallback) || fallback : ''
        if (!this.value) {
            return fallback ? `Default: ${fallbackName}` : 'No OrcaSlicer preset: the slicer uses its generic one'
        }
        if (this.value === fallback) return 'Default preset for this filament'
        if (this.presetOf(this.value)) return fallback ? `Changed from the default ${fallbackName}` : 'Set by you'
        return 'Your OrcaSlicer preset (filament_id shown in its JSON, P…)'
    }

    onChange(value: unknown): void {
        const text = typeof value === 'string' ? value.trim() : ''
        this.$emit('input', text)
    }
}
</script>

<style scoped>
.cfs-orca-selection {
    display: inline-flex;
    gap: 8px;
    align-items: baseline;
    min-width: 0;
}

.cfs-orca-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
