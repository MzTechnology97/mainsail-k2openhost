# Mainsail in the K2-OpenHost project

Updated: **2026-10-02**.

This repository is a fork of the **Mainsail** project retained for the K2-OpenHost UI/integration track. All original Mainsail authorship, licensing and upstream documentation remain authoritative for Mainsail itself.

## Upstream attribution

Original project:

- `mainsail-crew/mainsail`

K2-OpenHost does not claim authorship of the Mainsail UI. This fork exists so K2-specific UI experiments can be developed separately without rewriting or obscuring upstream credit.

The CFS integration is informed by two public projects while intentionally using a K2-OpenHost-native architecture:

- **Jacob10383/k2-plus-custom-firmware** and **Jacob10383/fluidd** — source/reference for the Box API, Filament Box workflow, `BOX_PRINT_INFO`, `BOX_PRINT_START`, logical-tool mapping and the Fluidd CFS user experience;
- **HimAndRobot/creality-cfs-mainsail-integration** — useful UI/UX reference for CFS slot cards, colors and busy/loading presentation.

K2-OpenHost does **not** use the HimAndRobot direct Creality `web-server` / port `9999` communication path. The Mainsail fork consumes the native Klipper `box` object through Moonraker.

## Current K2-OpenHost architecture

```text
Creality K2 Pro
  |
  +-- T113 display/touch + hardware bridges
  |     +-- Main MCU bridge
  |     +-- Nozzle MCU bridge
  |     `-- RS-485/CFS bridge
  |
  `-- Raspberry Pi CM5 / external Linux host
        +-- kalico-k2pro:k2-pro-openhost
        +-- Moonraker
        +-- mainsail-k2openhost
        `-- Cartographer direct USB (target topology)
```

Mainsail runs against Moonraker on the external host. The original K2 T113 remains a candidate for a future local-screen UI such as HelixScreen, while browser Mainsail remains the primary development interface.

## Native CFS integration

The dashboard contains a native **CFS / Filament Box** panel driven by:

```text
Kalico Box/CFS
    -> printer.objects.box
    -> Moonraker WebSocket
    -> Mainsail Vue/Vuex state
```

There is no extra CFS HTTP daemon, no direct RS-485 parsing in the frontend, and no injected JavaScript layer.

The panel consumes the Box API for:

- CFS/external slot presence and loaded state;
- persistent inventory v2 with custom and read-only system filament profiles;
- material, color, brand/name, nozzle metadata and RFID/manual/library provenance;
- hardware-reported and OpenHost-estimated remaining filament;
- K2 Pro CFS temperature and humidity;
- buffer, encoder, printhead sensor and clog state;
- runout/recovery state;
- manual non-RFID slot editing, preset colors and explicit RFID reread controls;
- Box settings and CFS actions when the backend is in operational mode.

The base Box API remains `api_version: 1`; the current additive contracts are `filament_inventory_version: 2` and `print_mapping_version: 1`.

## CFS print mapping

K2-OpenHost now follows Jacob's current print-start model rather than treating slicer `T0`, `T1`, etc. as fixed physical CFS slots.

The backend exposes:

```text
BOX_PRINT_INFO FILENAME="path/file.gcode"
BOX_PRINT_START FILENAME="path/file.gcode" MAP="0:1,1:3"
```

and adds these fields to `printer.objects.box`:

```text
print_mapping_version
print_mapping_enabled
print_info
print_mapping
```

When the normal Mainsail **Print** dialog opens, the K2-OpenHost frontend asks Kalico to inspect the Orca G-code footer. If filament usage metadata is present, the dialog shows each logical slicer tool and asks which CFS slot should supply it. It uses the backend auto-mapper against the persistent physical-slot inventory and still allows manual selection. Exact profile matches are preferred; compatible Generic system profiles can safely fill in when the slicer-specific preset name is unavailable.

Conceptually:

```text
Orca logical T0 -----> CFS physical slot T1
Orca logical T1 -----> CFS physical slot T3

BOX_PRINT_START ... MAP="0:1,1:3"
```

The backend validates that every used tool is mapped, that physical slots are online and contain filament, then starts Virtual SD with the mapping installed before the first file command executes. During the job, logical `Tn` commands are resolved through that map.

If no supported filament-usage metadata is found, Mainsail falls back to its normal print-start path. If Box is in K2-OpenHost `observation_mode`, metadata inspection remains available but mapped CFS printing is disabled.

The current compatibility bridge also translates Orca purge-matrix and nozzle-temperature metadata from logical tool indices to the physical slot indices expected by the already hardware-validated OpenHost `BoxChangeEngine`. This preserves the existing K2 Pro transport/control code while adopting Jacob's newer frontend/backend contract.

## Current validated machine-control milestone

As of 2026-10-02, the external-host stack has validated on the real K2 Pro:

- Main MCU and Nozzle MCU communication;
- RS-485 closed-loop motor control;
- normal CoreXY movement;
- X/Y sensorless/stall homing;
- correct Z direction;
- complete homing using the original PRTouch stack;
- bed/nozzle/chamber heater control and PID tuning;
- emergency shutdown of active heater loads;
- a successful Klippain-ShakeTune resonance test;
- protected CFS observation mode plus operational Box/CFS mode;
- K2 Pro CFS temperature/humidity;
- persistent inventory schema v2 and K2-RFID/Creality system profiles;
- persisted manual/RFID slot lifecycle with startup restore that does not require a full RFID sweep;
- native Moonraker visibility of the `box` object and CFS slot/path state.

The Box backend is now intentionally running in operational mode on the development K2 Pro. `BOX_PRINT_INFO`, real inventory and backend auto-map decisions are validated; the remaining mapped-print milestone is a controlled `BOX_PRINT_START`, real tool change/runout behavior and a complete supervised print.

Cartographer direct-USB validation and a complete supervised print remain pending.

## Update Manager role

Mainsail exposes Moonraker's Update Manager for the two active K2-OpenHost source trees:

- `kalico-k2pro:k2-pro-openhost` through Moonraker's built-in Klipper updater;
- `cartographer3d-plugin-k2openhost` through its dedicated `git_repo` updater.

The Kalico checkout must remain clean for normal updates. Third-party local extras should not overwrite tracked K2-OpenHost files; local-only modules may be excluded from Git status when appropriate.

The Cartographer repository documents its supported Moonraker section in:

- `MzTechnology97/cartographer3d-plugin-k2openhost/docs/UPDATE_MANAGER.md`

## Scope of this fork

This fork should remain close to upstream Mainsail unless a K2-OpenHost-specific UI change is actually required and tested. Generic Mainsail improvements should continue to be credited to and preferably contributed upstream.

For the canonical K2-OpenHost architecture and current test status, see:

- `MzTechnology97/K2-OpenHost`