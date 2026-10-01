<template>
    <v-dialog
        v-model="showDialog"
        :max-width="cfsExists ? 680 : 400"
        content-class="overflow-x-hidden"
        @click:outside="closeDialog"
        @keydown.esc="closeDialog">
        <v-card>
            <start-print-dialog-thumbnail :file="file" :current-path="currentPath" />
            <v-card-title class="text-h5">{{ $t('Dialogs.StartPrint.Headline') }}</v-card-title>
            <v-card-text class="pb-0">
                <p class="body-2">
                    {{ question }}
                </p>
            </v-card-text>
            <start-print-dialog-cfs
                v-if="cfsExists"
                ref="cfs"
                :file="file"
                :current-path="currentPath"
                :active="showDialog"
                @state="onCfsState" />
            <start-print-dialog-afc v-else-if="afcExists" :file="file" />
            <start-print-dialog-mmu v-else-if="existsMmu" :file="file" />
            <start-print-dialog-spoolman v-else-if="existsSpoolman" :file="file" />
            <start-print-dialog-timelapse v-if="existsTimelapse" />
            <v-divider v-if="showDivider" class="my-0" />
            <v-card-actions>
                <v-spacer />
                <v-btn text @click="closeDialog">{{ $t('Buttons.Cancel') }}</v-btn>
                <v-btn
                    color="primary"
                    text
                    :disabled="printerIsPrinting || !klipperReadyForGui || (cfsExists && !cfsCanStart)"
                    @click="startPrint(file.filename)">
                    {{ $t('Dialogs.StartPrint.Print') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { FileStateGcodefile } from '@/store/files/types'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiPrinter3d } from '@mdi/js'
import { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import AfcMixin from '@/components/mixins/afc'
import { CfsBoxState } from '@/types/cfs'

interface CfsDialogState {
    canStart: boolean
    requiresMapping: boolean
    mappingValid: boolean
    waiting: boolean
}

interface CfsStartDialogRef {
    startMappedPrint: (filename: string) => boolean
}

@Component({
    components: { SettingsRow },
})
export default class StartPrintDialog extends Mixins(BaseMixin, AfcMixin) {
    mdiPrinter3d = mdiPrinter3d
    cfsCanStart = true

    @VModel({ type: Boolean }) showDialog!: boolean
    @Prop({ required: true, default: '' }) readonly currentPath!: string
    @Prop({ required: true }) readonly file!: FileStateGcodefile

    get cfsBox(): CfsBoxState | undefined {
        return this.$store.state.printer.box as CfsBoxState | undefined
    }

    get cfsExists(): boolean {
        return (this.cfsBox?.print_mapping_version ?? 0) >= 1
    }

    get existsMmu() {
        return this.$store.state.printer.mmu?.enabled && this.$store.state.printer.mmu?.gate !== -2
    }

    get existsSpoolman() {
        return this.moonrakerComponents.includes('spoolman')
    }

    get existsTimelapse() {
        return this.moonrakerComponents.includes('timelapse')
    }

    get showDivider() {
        return this.cfsExists || this.afcExists || this.existsSpoolman || this.existsTimelapse
    }

    get active_spool(): ServerSpoolmanStateSpool | null {
        return this.$store.state.server.spoolman.active_spool ?? null
    }

    get question() {
        if (this.active_spool)
            return this.$t('Dialogs.StartPrint.DoYouWantToStartFilenameFilament', {
                filename: this.file?.filename ?? 'unknown',
            })

        return this.$t('Dialogs.StartPrint.DoYouWantToStartFilename', { filename: this.file?.filename ?? 'unknown' })
    }

    startPrint(filename = '') {
        if (!filename.includes('/')) {
            filename = `${this.currentPath}/${filename}`
        }

        if (filename.startsWith('/')) {
            filename = filename.substring(1)
        }

        if (this.cfsExists) {
            const cfs = this.$refs.cfs as unknown as CfsStartDialogRef | undefined
            if (cfs?.startMappedPrint(filename)) {
                this.closeDialog()
                return
            }
        }

        this.closeDialog()
        this.$socket.emit('printer.print.start', { filename }, { action: 'switchToDashboard' })
    }

    onCfsState(state: CfsDialogState): void {
        this.cfsCanStart = state.canStart
    }

    closeDialog() {
        this.showDialog = false
    }

    @Watch('showDialog')
    onShowDialogChanged(newVal: boolean) {
        if (newVal && this.cfsExists) this.cfsCanStart = false
        else if (!newVal) this.cfsCanStart = true

        if (!newVal || !this.file || this.file.metadataPulled || this.file.metadataRequested) return

        const fullPath = ['gcodes']
        if (this.currentPath) fullPath.push(this.currentPath.replace(/^\/+/, ''))
        fullPath.push(this.file.filename)
        this.$store.dispatch('files/requestMetadata', [{ filename: fullPath.join('/') }])
    }
}
</script>
