<template>
    <panel v-if="showPanel" :icon="mdiEngineOutline" :title="title" :collapsible="true" card-class="motors-panel">
        <v-card-text class="motors-content">
            <div v-if="!hasTelemetry" class="text--secondary text-body-2 mb-2">
                {{ $t('Panels.MotorsPanel.NoTelemetry') }}
            </div>
            <div class="motors-axes">
                <div v-for="row in axisRows" :key="row.axis" class="motors-axis">
                    <div class="motors-axis-head">
                        <span class="motors-axis-name">{{ row.axis.toUpperCase() }}</span>
                        <v-chip x-small label :color="chipColor(row.readiness.tone)" class="motors-chip">
                            {{ stateText(row.readiness.state) }}
                        </v-chip>
                    </div>
                    <div class="motors-line">
                        <v-icon small class="mr-1">{{ mdiThermometer }}</v-icon>
                        <template v-if="row.temperature.available">
                            <span :class="{ 'text--disabled': row.temperature.state !== 'current' }">
                                {{ formatTemperature(row.temperature.value) }}
                            </span>
                            <v-chip x-small label :color="chipColor(row.temperature.tone)" class="motors-chip ml-1">
                                {{ stateText(row.temperature.state) }}
                            </v-chip>
                            <span v-if="row.temperature.age !== null" class="text--secondary ml-1">
                                {{ formatAge(row.temperature.age) }}
                            </span>
                        </template>
                        <span v-else class="text--secondary">{{ $t('Panels.MotorsPanel.NotAvailable') }}</span>
                    </div>
                    <div class="motors-line">
                        <v-icon small class="mr-1">{{ mdiShieldCheckOutline }}</v-icon>
                        <template v-if="row.protection.available">
                            <v-chip x-small label :color="chipColor(row.protection.tone)" class="motors-chip">
                                {{ protectionText(row.protection) }}
                            </v-chip>
                            <span class="text--secondary ml-1">{{ stateText(row.protection.state) }}</span>
                            <span v-if="row.protection.age !== null" class="text--secondary ml-1">
                                {{ formatAge(row.protection.age) }}
                            </span>
                        </template>
                        <span v-else class="text--secondary">{{ $t('Panels.MotorsPanel.NotAvailable') }}</span>
                    </div>
                    <div
                        v-for="label in row.protection.errors.concat(row.protection.warnings)"
                        :key="label"
                        class="motors-detail">
                        {{ label }}
                    </div>
                    <div v-if="row.protection.unknownBits.length" class="motors-detail">
                        {{ $t('Panels.MotorsPanel.UnknownBits', { bits: row.protection.unknownBits.join(', ') }) }}
                    </div>
                    <div v-if="row.protection.clear && row.protection.clear !== 'pending'" class="motors-detail">
                        {{ $t('Panels.MotorsPanel.LastClear') }}: {{ stateText('clear_' + row.protection.clear) }}
                    </div>
                    <div v-if="row.readiness.available" class="motors-line text--secondary">
                        {{ $t('Panels.MotorsPanel.Parameters') }}:
                        {{
                            stateText(
                                row.readiness.parameters === 'failed' ? 'failed_parameters' : row.readiness.parameters
                            )
                        }}
                        · {{ $t('Panels.MotorsPanel.Calibration') }}: {{ stateText(row.readiness.calibration) }}
                    </div>
                    <div v-for="reason in row.readiness.reasons" :key="reason" class="motors-detail">
                        {{ reason }}
                    </div>
                </div>
            </div>

            <v-expansion-panels flat accordion multiple class="motors-sections mt-3">
                <v-expansion-panel>
                    <v-expansion-panel-header class="px-2 py-1">
                        <span>
                            {{ $t('Panels.MotorsPanel.Rs485Bus') }}
                            <v-chip x-small label :color="busChip" class="motors-chip ml-2">{{ busText }}</v-chip>
                        </span>
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <div class="text--secondary text-caption mb-1">
                            {{ $t('Panels.MotorsPanel.Rs485Note') }}
                        </div>
                        <div v-if="!bus.available" class="text--secondary">
                            {{ $t('Panels.MotorsPanel.NotAvailable') }}
                        </div>
                        <div v-for="item in bus.rows" :key="item.key" class="motors-counter">
                            <span>{{ item.key }}</span>
                            <span>{{ item.value }}</span>
                        </div>
                        <template v-for="block in busSessionBlocks">
                            <div :key="block.id + '-title'" class="text-caption font-weight-bold mt-2">
                                {{ block.title }}
                            </div>
                            <div
                                v-for="item in block.session.rows"
                                :key="block.id + item.key"
                                :class="['motors-counter', { 'warning--text': item.problem }]">
                                <span>{{ item.key }}</span>
                                <span>{{ item.value }}</span>
                            </div>
                        </template>
                    </v-expansion-panel-content>
                </v-expansion-panel>
                <v-expansion-panel>
                    <v-expansion-panel-header class="px-2 py-1">
                        <span>{{ $t('Panels.MotorsPanel.NozzleTransport') }}</span>
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <div class="text--secondary text-caption mb-1">
                            {{ $t('Panels.MotorsPanel.NozzleNote') }}
                        </div>
                        <div v-if="!nozzle.available" class="text--secondary">
                            {{ $t('Panels.MotorsPanel.NotAvailable') }}
                        </div>
                        <template v-else>
                            <div v-for="item in nozzle.rows" :key="item.key" class="motors-counter">
                                <span>{{ item.key }}</span>
                                <span>{{ item.value }}</span>
                            </div>
                            <div class="motors-counter">
                                <span>latency_ms last/avg/max</span>
                                <span>
                                    {{ formatMs(nozzle.latency.last) }} / {{ formatMs(nozzle.latency.avg) }} /
                                    {{ formatMs(nozzle.latency.max) }}
                                </span>
                            </div>
                        </template>
                    </v-expansion-panel-content>
                </v-expansion-panel>
                <v-expansion-panel>
                    <v-expansion-panel-header class="px-2 py-1">
                        <span>{{ $t('Panels.MotorsPanel.Events') }} ({{ events.length }})</span>
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <div v-if="!events.length" class="text--secondary">
                            {{ $t('Panels.MotorsPanel.NoEvents') }}
                        </div>
                        <div v-for="event in events" :key="event.seq" class="motors-event">
                            <span class="motors-event-axis">{{ event.axis }}</span>
                            <span>{{ event.type }}</span>
                            <span v-if="event.labels.length" class="text--secondary">
                                · {{ event.labels.join(', ') }}
                            </span>
                            <span v-if="event.count > 1" class="text--secondary">×{{ event.count }}</span>
                            <span v-if="event.context" class="text--secondary">({{ event.context }})</span>
                        </div>
                        <div class="text--secondary text-caption mt-1">MOTOR_EVENTS VERBOSE=1</div>
                    </v-expansion-panel-content>
                </v-expansion-panel>
            </v-expansion-panels>
        </v-card-text>
    </panel>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { mdiEngineOutline, mdiShieldCheckOutline, mdiThermometer } from '@mdi/js'
import BaseMixin from '@/components/mixins/base'
import Panel from '@/components/ui/Panel.vue'
import {
    MOTOR_AXES,
    MotorBusSession,
    MotorProtectionView,
    MotorTone,
    motorBusSessionsView,
    motorBusView,
    motorEventsView,
    motorNozzleView,
    motorProtectionView,
    motorReadinessView,
    motorSensorName,
    motorTemperatureView,
} from '@/plugins/motorStatus'

/**
 * Read-only motor diagnostics. Everything comes from objects Moonraker already
 * pushes; the panel sends no G-code and has no clear/reset/calibration action.
 */
@Component({ components: { Panel } })
export default class MotorsPanel extends Mixins(BaseMixin) {
    mdiEngineOutline = mdiEngineOutline
    mdiShieldCheckOutline = mdiShieldCheckOutline
    mdiThermometer = mdiThermometer

    get motorControl() {
        return this.$store.state.printer.motor_control ?? null
    }

    get showPanel(): boolean {
        return this.klipperReadyForGui && this.motorControl !== null
    }

    get title(): string {
        return this.$t('Panels.MotorsPanel.Headline') as string
    }

    get hasTelemetry(): boolean {
        const mc = this.motorControl ?? {}
        return 'temperatures' in mc || 'faults' in mc || 'readiness' in mc
    }

    get axisRows() {
        const printer = this.$store.state.printer
        return MOTOR_AXES.map((axis) => ({
            axis,
            temperature: motorTemperatureView(this.motorControl, printer[motorSensorName(axis)], axis),
            protection: motorProtectionView(this.motorControl, axis),
            readiness: motorReadinessView(this.motorControl, axis),
        }))
    }

    get bus() {
        return motorBusView(this.$store.state.printer['serial_485 serial485'])
    }

    /** RS-485 counters for the running print and the last finished one. */
    get busSessionBlocks(): { id: string; title: string; session: MotorBusSession }[] {
        const view = motorBusSessionsView(this.$store.state.printer['serial_485 serial485'])
        const blocks: { id: string; title: string; session: MotorBusSession }[] = []
        if (view.current) {
            blocks.push({
                id: 'current',
                title: this.$t('Panels.MotorsPanel.PrintCounters', {
                    duration: this.durationText(view.current.durationMin),
                }).toString(),
                session: view.current,
            })
        }
        if (view.last) {
            blocks.push({
                id: 'last',
                title: this.$t('Panels.MotorsPanel.LastPrintCounters', {
                    result: view.last.result ?? '?',
                    duration: this.durationText(view.last.durationMin),
                }).toString(),
                session: view.last,
            })
        }
        return blocks
    }

    durationText(minutes: number | null): string {
        if (minutes === null) return '?'
        return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
    }

    get busChip(): string {
        if (!this.bus.available) return 'grey'
        return this.bus.connected ? 'success' : 'error'
    }

    get busText(): string {
        if (!this.bus.available) return this.stateText('unavailable')
        return this.stateText(this.bus.connected ? 'connected' : 'disconnected')
    }

    get nozzle() {
        return motorNozzleView(this.motorControl)
    }

    get events() {
        return motorEventsView(this.motorControl, 8)
    }

    chipColor(tone: MotorTone): string {
        return tone === 'grey' ? 'grey darken-1' : tone
    }

    stateText(state: string | null): string {
        if (!state) return '—'
        const key = `Panels.MotorsPanel.States.${state}`
        return this.$te(key) ? (this.$t(key) as string) : state
    }

    protectionText(view: MotorProtectionView): string {
        if (view.errors.length) return this.$t('Panels.MotorsPanel.Fault') as string
        if (view.warnings.length || view.unknownBits.length) return this.$t('Panels.MotorsPanel.Warning') as string
        // "No fault" only for a verified answer; anything else is not proof.
        if (view.state === 'current') return this.$t('Panels.MotorsPanel.NoFault') as string
        return this.$t('Panels.MotorsPanel.Unverified') as string
    }

    formatTemperature(value: number | null): string {
        return value === null ? '—' : `${value.toFixed(1)} °C`
    }

    formatMs(value: number | null): string {
        return value === null ? '—' : value.toFixed(1)
    }

    formatAge(seconds: number): string {
        if (seconds < 90) return this.$t('Panels.MotorsPanel.SecondsAgo', { n: Math.round(seconds) }) as string
        return this.$t('Panels.MotorsPanel.MinutesAgo', { n: Math.round(seconds / 60) }) as string
    }
}
</script>

<style scoped>
.motors-content {
    container-type: inline-size;
    padding-top: 12px;
}

.motors-axes {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
}

@container (min-width: 620px) {
    .motors-axes {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

.motors-axis {
    min-width: 0;
    padding: 10px;
    border: 1px solid rgba(128, 128, 128, 0.26);
    border-radius: 12px;
}

.motors-axis-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}

.motors-axis-name {
    font-size: 1.15rem;
    font-weight: 600;
}

.motors-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    font-size: 0.875rem;
    margin-top: 4px;
}

.motors-detail {
    font-size: 0.8rem;
    padding-left: 22px;
    opacity: 0.85;
}

.motors-chip {
    font-weight: 600;
}

.motors-counter {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.85rem;
    font-family: monospace;
}

.motors-counter > span:last-child {
    white-space: nowrap;
    text-align: right;
}

.motors-event {
    font-size: 0.85rem;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.motors-event-axis {
    font-weight: 600;
    min-width: 1.2em;
}

.motors-sections .v-expansion-panel {
    background: transparent !important;
}
</style>
