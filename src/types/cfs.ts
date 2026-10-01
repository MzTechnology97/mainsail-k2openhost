export interface CfsSlot {
    index: number
    present: boolean
    loaded: boolean
    material: string
    color: string
    brand: string
    name: string
    spoolman_id: number | null
    rfid_percent: number | null
    rfid_reserve: string
    external: boolean
}

export interface CfsMaterial {
    target_temp: number
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
    fluidd_widget_version: number
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
    runout: unknown
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
