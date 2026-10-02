<template>
    <div class="cfs-color-picker">
        <div class="d-flex align-center mb-2">
            <div class="text-subtitle-2">{{ label }}</div>
            <v-spacer />
            <div class="cfs-color-value mr-2" :style="{ backgroundColor: normalizedValue }" />
            <code class="caption">{{ normalizedValue }}</code>
        </div>

        <div class="cfs-color-grid mb-2">
            <button
                v-for="preset in presetColors"
                :key="preset"
                type="button"
                class="cfs-color-preset"
                :class="{ 'cfs-color-preset-active': preset === normalizedValue }"
                :style="{ backgroundColor: preset }"
                :title="preset"
                @click="$emit('input', preset)">
                <v-icon v-if="preset === normalizedValue" small :color="contrastColor(preset)">
                    {{ mdiCheck }}
                </v-icon>
            </button>
        </div>

        <v-btn small text color="primary" @click="advanced = !advanced">
            <v-icon left small>{{ mdiPalette }}</v-icon>
            {{ advanced ? 'Hide custom color' : 'Custom color' }}
        </v-btn>

        <v-expand-transition>
            <div v-if="advanced" class="mt-2">
                <v-color-picker
                    hide-mode-switch
                    mode="hexa"
                    width="100%"
                    :value="normalizedValue"
                    @update:color="setAdvancedColor" />
            </div>
        </v-expand-transition>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { mdiCheck, mdiPalette } from '@mdi/js'
import { VColorPickerColor } from '@/types/vuetify'

@Component
export default class CfsColorPicker extends Vue {
    @Prop({ type: String, default: '#808080' }) readonly value!: string
    @Prop({ type: String, default: 'Color' }) readonly label!: string

    mdiCheck = mdiCheck
    mdiPalette = mdiPalette
    advanced = false

    readonly presetColors = [
        '#25C4DA',
        '#0099A7',
        '#0B359A',
        '#0A4AB6',
        '#11B6EE',
        '#90C6F5',
        '#FA7C0C',
        '#F7B30F',
        '#E5C20F',
        '#B18F2E',
        '#8D766D',
        '#6C4E43',
        '#E62E2E',
        '#EE2862',
        '#EA2A2B',
        '#E83D89',
        '#AE2E65',
        '#611C8B',
        '#8D60C7',
        '#B287C9',
        '#006764',
        '#018D80',
        '#42B5AE',
        '#1D822D',
        '#54B351',
        '#72E115',
        '#474747',
        '#668798',
        '#B1BEC6',
        '#58636E',
        '#F8E911',
        '#F6D311',
        '#F2EFCE',
        '#FFFFFF',
        '#000000',
    ]

    get normalizedValue(): string {
        return /^#[0-9a-f]{6}$/i.test(this.value ?? '') ? this.value.toUpperCase() : '#808080'
    }

    setAdvancedColor(value: VColorPickerColor): void {
        this.$emit('input', value.hex.toUpperCase())
    }

    contrastColor(color: string): string {
        const hex = color.replace('#', '')
        const red = parseInt(hex.substring(0, 2), 16)
        const green = parseInt(hex.substring(2, 4), 16)
        const blue = parseInt(hex.substring(4, 6), 16)
        const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
        return luminance > 0.55 ? '#000000' : '#FFFFFF'
    }
}
</script>

<style scoped>
.cfs-color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
    gap: 10px;
}

.cfs-color-preset {
    appearance: none;
    position: relative;
    width: 34px;
    height: 34px;
    margin: auto;
    border-radius: 50%;
    border: 2px solid rgba(127, 127, 127, 0.35);
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.cfs-color-preset:hover {
    transform: scale(1.08);
}

.cfs-color-preset-active {
    outline: 2px solid var(--v-primary-base);
    outline-offset: 2px;
}

.cfs-color-value {
    width: 26px;
    height: 18px;
    border-radius: 9px;
    border: 1px solid rgba(127, 127, 127, 0.55);
}
</style>