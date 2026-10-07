export interface CfsSlot {
    index: number
    present: boolean
    loaded: boolean
    material: string
    color: string
    brand: string
    name: string
    target_temp: number | null
    pressure_advance: number | null
    spoolman_id: number | null
    filament_id: string
    source: string
    rfid_code: string
    rfid_active: boolean
    rfid_unknown_code: string
    rfid_unknown_color: string
    rfid_percent: number | null
    rfid_reported_percent: number | null
    rfid_estimated_percent: number | null
    rfid_total_m: number | null
    rfid_remaining_m: number | null
    rfid_reserve: string
    external: boolean
    // Kalico: false while a live RFID tag owns a CFS bay. The external spool
    // stays clearable: its reader has no removal event.
    profile_clearable?: boolean
}

export interface CfsFilament {
    id: string
    material: string
    color: string
    brand: string
    name: string
    target_temp: number | null
    min_temp: number | null
    max_temp: number | null
    pressure_advance: number | null
    rfid_code: string
    rfid_codes?: string[]
    aliases?: string[]
    spoolman_id: number | null
    system: boolean
    /** Origin: shipped catalog, created by the user, K2-RFID import or auto-registered from a tag. */
    source?: 'system' | 'user' | 'import' | 'rfid'
}

export interface CfsFilamentLibrary {
    /** Library file holding the custom profiles (the state file on older firmware). */
    path: string
    separate_file: boolean
    custom_count: number
    system_count: number
    /** Set when the file is damaged: library writes are refused until it is fixed. */
    error: string
}

export interface CfsRunoutChainItem {
    slot: number
    percent: number | null
    rfid: boolean
}

export interface CfsRunout {
    loaded_slot: number
    chain: number[]
    chain_detail?: CfsRunoutChainItem[]
    sequence?: number[]
    strategy?: string
}

export interface CfsRunoutGroup {
    material: string
    color: string
    slots: number[]
    detail: CfsRunoutChainItem[]
    strategy: string
}

export interface CfsMaterial {
    target_temp: number
}

export interface CfsPrintTool {
    tool: number
    color: string
    material: string
    name: string
    /** Filament the slicer expects this tool to use (newer backend). */
    length_mm?: number
}

/** Mapping warning from the backend: informational, it never blocks a print. */
export interface CfsMappingWarning {
    kind: 'low_filament' | 'material_variant' | 'material_mismatch'
    tool: number
    slot: number
    needed_m?: number
    remaining_m?: number
    includes_swap?: boolean
    tool_material?: string
    slot_material?: string
}

export interface CfsPrintInfo {
    filename: string
    tools: CfsPrintTool[]
}

export interface CfsPrintMapping {
    filename: string | null
    map: Record<string, number>
    active_tool: number | null
    active_slot: number | null
}

export interface CfsAutoMapping {
    state: string
    map: Record<string, number>
    unresolved: number[]
    warnings?: CfsMappingWarning[]
}

export interface CfsLoadPath {
    source_slot: number | null
    loaded_slot: number
    loaded_mask: number
    slot_filament_mask: number
    box_addr: number | null
    tracking_active: boolean
    encoder: {
        position_mm: number | null
        active: boolean
    }
    buffer: {
        status_code: number
        state_code: number | null
        active: boolean
    }
    printhead_sensor: {
        detected: boolean
        error: string | null
    }
    clog_detection: {
        state: string
        baseline_ready: boolean
        extruder_delta_mm: number | null
        encoder_delta_mm: number | null
        extruder_threshold_mm: number
        encoder_reset_mm: number
        triggered: boolean
        event_count: number
        last_event: {
            extruder_mm: number | null
            encoder_mm: number | null
        }
    }
}

export interface CfsBoxUnit {
    address: number
    online: boolean
    status_code: number | null
    state_code: number | null
    temp_c: number | null
    humidity_pct: number | null
    slots: number[]
}

export interface CfsOperation {
    active: boolean
    kind: 'load' | 'unload' | null
    slot: number | null
    stage: string | null
    change_step: string | null
    change_target: number | null
}

export interface CfsRecovery {
    blocked: boolean
    automatic: boolean
    target: number | null
    step: string | null
    reason: string | null
    // Older backends only (before the 071c813 pause contract).
    retry_command?: string | null
    resume_prepared?: boolean
    resume_temperature?: number | null
}

export interface CfsBoxState {
    api_version: number
    filament_inventory_version?: number
    fluidd_widget_version: number
    print_mapping_version?: number
    print_mapping_enabled?: boolean
    print_info?: CfsPrintInfo | null
    print_mapping?: CfsPrintMapping
    auto_mapping?: CfsAutoMapping
    /** Warnings of the map used by the current print (newer backend). */
    mapping_warnings?: CfsMappingWarning[]
    data_ready: boolean
    status: string
    status_code: number
    state: string
    state_code: number | null
    temp_c: number | null
    humidity_pct: number | null
    loaded_slot: number
    loaded_mask: number
    slot_filament_mask: number
    slots: CfsSlot[]
    boxes?: CfsBoxUnit[]
    operation?: CfsOperation
    materials: Record<string, CfsMaterial>
    filaments: Record<string, CfsFilament>
    filament_library?: CfsFilamentLibrary
    runout: CfsRunout | null
    runout_groups: CfsRunoutGroup[]
    /** Physical slots in the user's runout order; empty = automatic (newer backend). */
    runout_order?: number[]
    runout_swap_enabled: boolean
    unload_after_print_enabled: boolean
    rfid_insert_reading_enabled: boolean
    rfid_startup_reading_enabled: boolean
    /** Clog check on (saved by the CFS); absent on older backends. */
    clog_detection_enabled?: boolean
    tracking_active: boolean
    filament_detected: boolean
    filament_sensor_error: string | null
    load_path: CfsLoadPath
    recovery: CfsRecovery
    driver_ready: boolean
}
