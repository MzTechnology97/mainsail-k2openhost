# Creality CFS on K2-OpenHost

Updated: **2026-10-02**.

`mainsail-k2openhost` contains the native browser UI for the K2-OpenHost Creality Filament System integration. It consumes the public Klipper/Kalico `box` object through Moonraker; it does not parse RS-485, query Creality's private web service or read the backend JSON file directly.

## Backend contract

The current K2-OpenHost backend advertises:

```text
box.api_version = 1
box.fluidd_widget_version >= 2
box.filament_inventory_version = 2
box.print_mapping_version = 1
```

Keeping `api_version: 1` preserves the Jacob/Helix/Orca base contract. Inventory and print mapping are additive.

Important status fields include:

- `slots[]` — physical CFS lanes plus the external spool;
- `filaments[]` — custom and system filament profiles;
- `materials` — known material families;
- `temp_c` / `humidity_pct` — K2 Pro CFS environment state;
- `load_path` — buffer, encoder, printhead sensor and clog state;
- `recovery` — blocked/retry state;
- `print_info`, `print_mapping`, `auto_mapping` — slicer-tool mapping state.

## Dashboard layout

The **Filaments · CFS** panel uses a two-column desktop grid (one column on narrow screens) so slot names and metadata remain readable instead of collapsing into narrow cards. Each slot card can show:

- material/profile name;
- brand and target nozzle temperature;
- full, vivid spool color;
- RFID/manual/library provenance;
- reported and estimated remaining filament;
- load/reread/edit controls;
- external-spool state.

RFID spool graphics use the remaining percentage as the filled sector. Color and remaining amount are independent: a brown/red/black/etc. spool remains visually saturated while its fill sector communicates the remaining quantity.

The panel also shows CFS temperature, relative humidity, API/inventory version and load-path state.

## System and custom filament library

The backend ships a generated system catalog sourced from the public DnG-Crafts/K2-RFID K2 database. The current catalog contains **61 read-only Creality + Generic profiles**.

The library UI provides:

- free-text search;
- independent Brand and Material filters;
- system/custom provenance;
- creation of a custom profile from a system preset;
- editable custom profiles;
- read-only system profiles.

Known material types are presented through a selector instead of an unrestricted text field.

Custom profiles can carry:

- material;
- brand;
- name;
- default color;
- target/min/max nozzle temperature;
- pressure advance;
- RFID material ID;
- optional Spoolman ID.

## Manual non-RFID slot editor

Clicking the pencil on an untagged CFS slot opens the dedicated slot editor.

The intended flow is:

```text
Brand -> Type -> Profile -> Color -> Apply
```

The color control provides both:

- a preset palette derived from the K2-RFID/Creality application color set;
- a full custom color picker.

A **Reset slot** action clears only that physical slot assignment. Saved library profiles remain available for reuse.

Manual assignment is disabled for a slot currently managed by a live RFID record. Removing the tagged spool releases the slot for manual assignment.

## RFID behavior

RFID-managed slots display an **RFID** badge and expose the resolved metadata read-only.

When a tag contains an unknown material code, the backend exposes the unknown code/color and Mainsail offers **Map RFID**. The filament editor is prefilled from that tag; saving a matching custom profile resolves the live slot immediately.

The panel exposes:

- full-box `BOX_RFID_SCAN`;
- per-slot reread;
- external RFID-reader action when configured.

Normal printer startup does not perform a full RFID sweep unless the backend setting `rfid_startup_reading_enabled` is explicitly enabled.

## Persistence

Slot assignments and remaining estimates are backend state. The operational backend normally stores them in:

```text
~/printer_data/filament_box.json
```

Mainsail never reads this file directly. After restart the backend restores cached assignments for slots still physically present. A removed spool clears that bay's live assignment; confirmed runout persists zero remaining and clears the depleted source.

## Remaining filament

The UI distinguishes hardware-reported and OpenHost-estimated remaining state.

The public slot contract may include:

```text
rfid_reported_percent
rfid_estimated_percent
rfid_percent
rfid_total_m
rfid_remaining_m
```

The spool gauge follows the selected current remaining percentage and the card can show the estimated remaining metres.

## Commands used by the UI

Operational CFS controls include:

```text
T<n>
BOX_UNLOAD
BOX_RFID_SCAN
_BOX_SLOT_SET
_BOX_SLOT_CLEAR
_BOX_SLOT_ASSIGN
_BOX_FILAMENT_SET
_BOX_FILAMENT_DELETE
_BOX_SET_RUNOUT_SWAP
_BOX_SET_UNLOAD_AFTER_PRINT
_BOX_SET_RFID_INSERT_READING
_BOX_SET_RFID_STARTUP_READING
```

The panel disables unsafe manual actions while a print is active. Print-driven tool changes remain backend-controlled.

## Print mapping

The normal Mainsail **Print** dialog integrates with:

```text
BOX_PRINT_INFO
BOX_PRINT_START
```

Logical slicer tools are mapped to physical CFS slots before the job starts. The **Filament source** selector renders each candidate with the live slot color swatch, slot label, profile name and secondary material/brand/remaining metadata, so manual mapping visually matches the CFS inventory.

Auto mapping uses the backend inventory and prefers safe compatible candidates. Exact profile information is preferred, compatible Generic profiles may be used as a fallback when the slicer preset name is unavailable, and otherwise-equivalent RFID candidates may prefer the lowest known remaining quantity.

Multimaterial jobs with unresolved tools remain blocked rather than guessing a slot.

## Update/deployment note

The development source tree is:

```text
~/mainsail-k2openhost-src
branch: develop
```

The runtime web root is:

```text
~/mainsail
```

The K2-OpenHost deployment helper builds the fork and synchronizes `dist/` into the live web root while preserving `config.json`. The Moonraker updater tracks the source repository; the local deploy helper completes the build/deploy step after a source update.

## Validation boundary

The CFS dashboard, inventory editor, RFID metadata paths and print-mapping UI are implemented and exercised against the live K2 Pro backend.

The project still requires full hardware validation of:

- complete mapped `BOX_PRINT_START`;
- real multi-material tool change;
- runout/recovery swap during a mapped job;
- remaining-filament tracking over a complete supervised print.