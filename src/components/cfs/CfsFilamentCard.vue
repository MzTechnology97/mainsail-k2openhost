<template>
    <article class="cfs-fcard" :class="{ 'cfs-fcard--accent': accent }">
        <div class="cfs-fcard-main">
            <span class="cfs-fcard-spool" :style="spoolStyle">
                <span v-if="percentLabel" class="cfs-fcard-percent">{{ percentLabel }}</span>
            </span>
            <div class="cfs-fcard-text">
                <div class="cfs-fcard-name" :title="title">{{ title }}</div>
                <div class="cfs-fcard-meta">
                    <span class="cfs-fcard-material">{{ filament.material || '—' }}</span>
                    <span v-if="filament.brand">{{ filament.brand }}</span>
                </div>
            </div>
            <slot name="actions" />
        </div>

        <div v-if="badges.length" class="cfs-fcard-badges">
            <span
                v-for="badge in badges"
                :key="badge.text"
                class="cfs-fcard-badge"
                :class="badge.kind ? `cfs-fcard-badge--${badge.kind}` : ''"
                :title="badge.title || ''">
                {{ badge.text }}
            </span>
        </div>

        <div class="cfs-fcard-temp" :title="temperatureHint">
            <div class="cfs-fcard-temp-track">
                <span class="cfs-fcard-temp-range" :style="rangeStyle" />
                <span v-if="target !== null" class="cfs-fcard-temp-target" :style="{ left: `${percent(target)}%` }" />
            </div>
            <span class="cfs-fcard-temp-text">{{ temperatureText }}</span>
        </div>

        <div v-if="showFoot" class="cfs-fcard-foot">
            <span v-if="filament.id" class="cfs-fcard-id">{{ filament.id }}</span>
            <span v-if="validNumber(filament.pressure_advance)">PA {{ filament.pressure_advance }}</span>
            <span v-if="validNumber(filament.max_flow)" title="Maximum volumetric flow">
                max {{ filament.max_flow }} mm³/s
            </span>
            <span v-if="validNumber(filament.spoolman_id)">Spoolman #{{ filament.spoolman_id }}</span>
            <v-spacer />
            <slot name="foot" />
        </div>
    </article>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

export interface CfsFilamentCardData {
    id?: string
    name?: string
    material?: string
    brand?: string
    color?: string
    target_temp?: number | null
    min_temp?: number | null
    max_temp?: number | null
    pressure_advance?: number | null
    max_flow?: number | null
    spoolman_id?: number | null
}

export interface CfsFilamentCardBadge {
    text: string
    kind?: 'info' | 'success' | 'warning'
    title?: string
}

const SCALE_MIN = 150
const SCALE_MAX = 350

/** Shared filament profile card: library, editor preview, RFID sheet, slot editor. */
@Component
export default class CfsFilamentCard extends Vue {
    @Prop({ type: Object, required: true }) readonly filament!: CfsFilamentCardData
    @Prop({ type: Array, default: () => [] }) readonly badges!: CfsFilamentCardBadge[]
    @Prop({ type: Boolean, default: false }) readonly accent!: boolean
    @Prop({ type: Boolean, default: true }) readonly showFoot!: boolean
    /** Remaining filament in percent: the spool shows it as a filled sector. */
    @Prop({ type: Number, default: null }) readonly remaining!: number | null
    @Prop({ type: String, default: '' }) readonly placeholder!: string

    get title(): string {
        return this.filament.name || this.filament.id || this.placeholder || 'Unnamed filament'
    }

    get color(): string {
        return /^#[0-9a-f]{6}$/i.test(this.filament.color ?? '') ? (this.filament.color as string) : '#808080'
    }

    get percentLabel(): string {
        return this.validNumber(this.remaining)
            ? `${Math.round(Math.max(0, Math.min(100, Number(this.remaining))))}%`
            : ''
    }

    get spoolStyle(): Record<string, string> {
        if (!this.validNumber(this.remaining)) return { background: this.color }
        const degrees = Math.max(0, Math.min(100, Number(this.remaining))) * 3.6
        return {
            background: `conic-gradient(${this.color} 0deg ${degrees}deg, rgba(128, 128, 128, 0.3) ${degrees}deg 360deg)`,
        }
    }

    get target(): number | null {
        return this.validNumber(this.filament.target_temp) ? Number(this.filament.target_temp) : null
    }

    get rangeStyle(): Record<string, string> {
        const min = this.validNumber(this.filament.min_temp)
            ? Number(this.filament.min_temp)
            : this.target !== null
              ? this.target - 5
              : null
        const max = this.validNumber(this.filament.max_temp)
            ? Number(this.filament.max_temp)
            : this.target !== null
              ? this.target + 5
              : null
        if (min === null || max === null) return { display: 'none' }
        const left = this.percent(min)
        return { left: `${left}%`, width: `${Math.max(2, this.percent(max) - left)}%` }
    }

    get temperatureText(): string {
        const range =
            this.validNumber(this.filament.min_temp) && this.validNumber(this.filament.max_temp)
                ? `${this.filament.min_temp}–${this.filament.max_temp} °C`
                : ''
        const target = this.target !== null ? `target ${this.target} °C` : ''
        return [range, target].filter(Boolean).join(' · ') || 'No temperature data'
    }

    get temperatureHint(): string {
        return `Nozzle range on a ${SCALE_MIN}–${SCALE_MAX} °C scale; the marker is the target/flush temperature`
    }

    percent(value: number): number {
        return Math.max(0, Math.min(100, ((value - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100))
    }

    validNumber(value: unknown): boolean {
        return value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value))
    }
}
</script>

<style scoped>
.cfs-fcard {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    padding: 12px;
    border: 1px solid rgba(128, 128, 128, 0.28);
    border-radius: 12px;
    background: rgba(128, 128, 128, 0.06);
}

.cfs-fcard--accent {
    border-color: rgba(128, 128, 128, 0.45);
    background: rgba(128, 128, 128, 0.1);
}

.cfs-fcard-main {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

/* Spool: ring in the profile colour (or remaining sector) with a dark hub. */
.cfs-fcard-spool {
    position: relative;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.35),
        inset 0 0 0 1px rgba(255, 255, 255, 0.2),
        0 0 0 1px rgba(128, 128, 128, 0.5);
}

.cfs-fcard-spool::after {
    content: '';
    position: absolute;
    inset: 13px;
    border-radius: 50%;
    background: rgba(20, 20, 20, 0.88);
}

.cfs-fcard-percent {
    position: relative;
    z-index: 1;
    color: #fff;
    font-size: 0.56rem;
    font-weight: 800;
}

.cfs-fcard-text {
    flex: 1 1 auto;
    min-width: 0;
}

.cfs-fcard-name {
    overflow: hidden;
    font-size: 0.95rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cfs-fcard-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    font-size: 0.78rem;
    opacity: 0.85;
}

.cfs-fcard-material {
    padding: 0 6px;
    border-radius: 6px;
    background: rgba(128, 128, 128, 0.22);
    font-weight: 700;
}

.cfs-fcard-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.cfs-fcard-badge {
    padding: 1px 7px;
    border: 1px solid rgba(128, 128, 128, 0.45);
    border-radius: 9px;
    font-size: 0.68rem;
    font-weight: 600;
    line-height: 16px;
}

.cfs-fcard-badge--info {
    border-color: var(--v-info-base);
    color: var(--v-info-base);
}

.cfs-fcard-badge--success {
    border-color: var(--v-success-base);
    color: var(--v-success-base);
}

.cfs-fcard-badge--warning {
    border-color: var(--v-warning-base);
    color: var(--v-warning-base);
}

.cfs-fcard-temp {
    display: grid;
    gap: 4px;
}

.cfs-fcard-temp-track {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(90deg, rgba(66, 165, 245, 0.25), rgba(255, 167, 38, 0.25), rgba(239, 83, 80, 0.3));
}

.cfs-fcard-temp-range {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 3px;
    background: linear-gradient(90deg, #42a5f5, #ffa726, #ef5350);
}

.cfs-fcard-temp-target {
    position: absolute;
    top: -3px;
    width: 3px;
    height: 12px;
    margin-left: -1px;
    border-radius: 2px;
    background: #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
}

.cfs-fcard-temp-text {
    font-size: 0.74rem;
    opacity: 0.8;
}

.cfs-fcard-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    margin-top: auto;
    font-size: 0.72rem;
    opacity: 0.85;
}

.cfs-fcard-id {
    font-family: monospace;
}
</style>
