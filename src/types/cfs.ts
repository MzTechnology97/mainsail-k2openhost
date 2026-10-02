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

export interface CfsRecovery {
    blocked: boolean
    automatic: boolean
    target: number | null
    step: string | null
    reason: string | null
    retry_command: string | null
    resume_prepared: boolean
    resume_temperature: number | null
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
    materials: Record<string, CfsMaterial>
    filaments: Record<string, CfsFilament>
    runout: CfsRunout | null
    runout_groups: CfsRunoutGroup[]
    runout_swap_enabled: boolean
    unload_after_print_enabled: boolean
    rfid_insert_reading_enabled: boolean
    rfid_startup_reading_enabled: boolean
    tracking_active: boolean
    filament_detected: boolean
    filament_sensor_error: string | null
    load_path: CfsLoadPath
    recovery: CfsRecovery
    driver_ready: boolean
}