<template>
    <v-dialog v-model="showDialog" max-width="480">
        <v-card v-if="result">
            <v-card-title class="text-subtitle-1">
                <v-icon left color="primary">{{ mdiChartBellCurveCumulative }}</v-icon>
                Pressure advance calibration result
            </v-card-title>
            <v-card-text>
                <p class="mb-2">
                    <strong>{{ filamentLabel }}</strong>
                    <template v-if="slotItem">in {{ slotLabel }}</template>
                    <template v-if="result.temperature">at {{ result.temperature }} °C</template>
                    · {{ result.accepted }} of {{ result.captures }} captures accepted
                </p>

                <template v-if="result.suggested !== null">
                    <div class="cfs-pa-result-value">
                        Suggested PA
                        <strong>{{ result.suggested.toFixed(4) }}</strong>
                        <v-chip v-if="result.indicative" x-small color="warning" class="ml-2">indicative</v-chip>
                    </div>
                    <p v-if="result.indicative" class="text-caption warning--text mb-2">
                        The calibration found no valid candidate; this is the median of the accepted captures.
                    </p>
                    <p class="mb-1">Check it with an OrcaSlicer pressure advance line test:</p>
                    <div v-if="result.range" class="cfs-pa-result-range mb-3">
                        <span>
                            Start
                            <strong>{{ result.range[0] }}</strong>
                        </span>
                        <span>
                            End
                            <strong>{{ result.range[1] }}</strong>
                        </span>
                        <span>
                            Step
                            <strong>{{ result.step }}</strong>
                        </span>
                    </div>
                </template>
                <p v-else class="warning--text">No value to suggest: too few captures were accepted.</p>

                <p v-if="result.reasons.length" class="text-caption mb-2">
                    {{ result.reasons.join('; ') }}
                </p>
                <p v-if="result.saved" class="text-caption success--text mb-2">Saved in {{ result.saved }}.</p>

                <template v-if="slotItem">
                    <p class="text-caption mb-2">
                        Now in the profile: {{ currentText || 'no pressure advance (printer.cfg value)' }}
                    </p>
                    <v-text-field
                        v-model.number="value"
                        dense
                        outlined
                        type="number"
                        step="0.001"
                        label="Pressure advance to save"
                        hint="The best line of the printed test"
                        persistent-hint
                        :rules="[validValue]" />
                </template>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn text @click="showDialog = false">{{ $t('Buttons.Close') }}</v-btn>
                <v-btn color="primary" text :disabled="!canSave" @click="save">Save to profile</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { mdiChartBellCurveCumulative } from '@mdi/js'
import { CfsBoxState, CfsSlot } from '@/types/cfs'
import { cfsSlotLabel } from '@/plugins/cfsLabels'
import { CfsPaCalibrationResult, cfsFilamentSettingsText, cfsPaLastCalibration } from '@/plugins/cfsFilamentSettings'

/** Last load cell PA calibration: a value to check with a printed test, then save. */
@Component
export default class CfsPaResultDialog extends Mixins(BaseMixin) {
    @VModel({ type: Boolean }) showDialog!: boolean
    @Prop({ type: Object, required: true }) readonly box!: CfsBoxState

    mdiChartBellCurveCumulative = mdiChartBellCurveCumulative
    value: number | null = null

    get result(): CfsPaCalibrationResult | null {
        return cfsPaLastCalibration(this.$store.state.printer)
    }

    get slotItem(): CfsSlot | null {
        const index = this.result?.slot
        if (index === null || index === undefined) return null
        return this.box.slots.find((slot) => slot.index === index) ?? null
    }

    get slotLabel(): string {
        return this.slotItem ? cfsSlotLabel(this.slotItem) : ''
    }

    get filamentLabel(): string {
        const slot = this.slotItem
        if (!slot) return this.result?.filamentId || 'Filament'
        return slot.name || [slot.brand, slot.material].filter(Boolean).join(' ') || 'Filament'
    }

    get currentText(): string {
        return cfsFilamentSettingsText(this.slotItem)
    }

    validValue(value: unknown): true | string {
        const number = Number(value)
        return (value !== null && value !== '' && number >= 0 && number <= 2) || 'Between 0 and 2'
    }

    get canSave(): boolean {
        return !!this.slotItem && this.validValue(this.value) === true && !this.printerIsPrinting
    }

    @Watch('showDialog')
    onShow(open: boolean): void {
        if (open) this.value = this.result?.suggested ?? null
    }

    save(): void {
        if (!this.canSave || !this.slotItem) return
        const command = `_BOX_SLOT_PA_SET SLOT=${this.slotItem.index} PRESSURE_ADVANCE=${Number(this.value).toFixed(4)}`
        this.$store.dispatch('server/addEvent', { message: command, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script: command })
        this.showDialog = false
    }
}
</script>

<style scoped>
.cfs-pa-result-value {
    font-size: 1.05rem;
    margin-bottom: 6px;
}
.cfs-pa-result-range {
    display: flex;
    gap: 16px;
}
</style>
