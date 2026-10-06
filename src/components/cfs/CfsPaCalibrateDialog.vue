<template>
    <v-dialog v-model="showDialog" max-width="460">
        <v-card v-if="slotItem">
            <v-card-title class="text-subtitle-1">
                <v-icon left color="primary">{{ mdiChartBellCurveCumulative }}</v-icon>
                Calibrate pressure advance
            </v-card-title>
            <v-card-text>
                <p class="mb-2">
                    <strong>{{ filamentLabel }}</strong>
                    in {{ slotLabel }}
                </p>
                <ul class="cfs-pa-plan mb-3">
                    <li v-if="!slotItem.loaded">Loads {{ slotLabel }} (the current filament is unloaded first).</li>
                    <li>
                        Heats the nozzle to
                        <strong>{{ plan.temperature !== null ? `${plan.temperature} °C` : '—' }}</strong>
                        and extrudes short pulses into the wastebin.
                    </li>
                    <li v-if="plan.flows.length">
                        Feed rates {{ plan.flows.join(', ') }} mm/s: 20, 30 and 40 % of the max flow
                        {{ plan.maxFlow }} mm³/s
                        <template v-if="plan.maxFlowSource">({{ plan.maxFlowSource }})</template>
                        .
                    </li>
                    <li v-else class="warning--text">
                        No max flow is known for this filament: the printer uses its fixed feed rates. Set the profile's
                        max flow first for a reliable result.
                    </li>
                    <li v-if="plan.flows.length">
                        About {{ plan.filamentMm }} mm of filament and {{ plan.minutes }} min after heating.
                    </li>
                    <li>
                        At the end you get a suggested value and an OrcaSlicer PA line test range around it. Print the
                        test, then save the best value in the profile: nothing is saved automatically.
                    </li>
                </ul>
                <p v-if="currentText" class="text-caption mb-0">Now: {{ currentText }}</p>
                <p v-if="lastForSlot" class="text-caption mb-0">
                    Last result for this slot: PA
                    {{ lastForSlot.suggested !== null ? lastForSlot.suggested.toFixed(4) : '—' }}
                    <v-btn x-small text color="primary" @click="reviewLast">Review and save</v-btn>
                </p>
                <p v-if="state.reason" class="error--text text-caption mt-2 mb-0">{{ state.reason }}</p>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn text @click="showDialog = false">{{ $t('Buttons.Cancel') }}</v-btn>
                <v-btn color="primary" text :disabled="!!state.reason || plan.temperature === null" @click="start">
                    Start
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { mdiChartBellCurveCumulative } from '@mdi/js'
import { CfsBoxState, CfsSlot } from '@/types/cfs'
import { cfsSlotLabel } from '@/plugins/cfsLabels'
import {
    CfsPaCalibrationPlan,
    CfsPaCalibrationResult,
    CfsPaCalibrationState,
    cfsFilamentSettingsText,
    cfsPaLastCalibration,
    cfsPaCalibrationPlan,
    cfsPaCalibrationState,
} from '@/plugins/cfsFilamentSettings'

/** Confirms and starts LOAD_CELL_PA_CALIBRATE SLOT=n SAVE=1 for a slot's filament profile. */
@Component
export default class CfsPaCalibrateDialog extends Mixins(BaseMixin) {
    @VModel({ type: Boolean }) showDialog!: boolean
    @Prop({ type: Object, default: null }) readonly slotItem!: CfsSlot | null
    @Prop({ type: Object, required: true }) readonly box!: CfsBoxState

    mdiChartBellCurveCumulative = mdiChartBellCurveCumulative

    get state(): CfsPaCalibrationState {
        return cfsPaCalibrationState(this.$store.state.printer)
    }

    get plan(): CfsPaCalibrationPlan {
        return cfsPaCalibrationPlan(this.slotItem ?? {}, this.box.materials)
    }

    get slotLabel(): string {
        return this.slotItem ? cfsSlotLabel(this.slotItem) : ''
    }

    get filamentLabel(): string {
        const slot = this.slotItem
        if (!slot) return ''
        return slot.name || [slot.brand, slot.material].filter(Boolean).join(' ') || 'Unnamed filament'
    }

    get currentText(): string {
        return cfsFilamentSettingsText(this.slotItem)
    }

    get lastForSlot(): CfsPaCalibrationResult | null {
        const last = cfsPaLastCalibration(this.$store.state.printer)
        return last && this.slotItem && last.slot === this.slotItem.index ? last : null
    }

    reviewLast(): void {
        this.showDialog = false
        this.$emit('show-result')
    }

    start(): void {
        if (!this.slotItem || this.state.reason) return
        // No SAVE=1: the result is checked with a printed test first.
        const command = `LOAD_CELL_PA_CALIBRATE SLOT=${this.slotItem.index}`
        this.$store.dispatch('server/addEvent', { message: command, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script: command }, { loading: 'cfs_pa_calibrate' })
        this.showDialog = false
    }
}
</script>

<style scoped>
.cfs-pa-plan {
    padding-left: 18px;
}
.cfs-pa-plan li {
    margin-bottom: 4px;
}
</style>
