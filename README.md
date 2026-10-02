<p align="center">
  <a>
    <img src="https://raw.githubusercontent.com/mainsail-crew/docs/master/assets/img/logo.png" alt='Mainsail logo' height="152">
    <h1 align="center">Mainsail</h1>
  </a>
</p>
<p align="center">
  Makes Klipper more accessible by adding a lightweight, responsive web user interface, centred around an intuitive and consistent design philosophy.
</p>
<p align="center">
  <a aria-label="Downloads" href="https://github.com/mainsail-crew/mainsail/releases">
    <img src="https://img.shields.io/github/downloads/mainsail-crew/mainsail/total?style=flat-square">
  </a>
  <a aria-label="Stars" href="https://github.com/mainsail-crew/mainsail/stargazers">
    <img src="https://img.shields.io/github/stars/mainsail-crew/mainsail?style=flat-square">
  </a>
  <a aria-label="Forks" href="https://github.com/mainsail-crew/mainsail/network/members">
    <img src="https://img.shields.io/github/forks/mainsail-crew/mainsail?style=flat-square">
  </a>
  <a href="https://hosted.weblate.org/engage/mainsail/">
    <img src="https://hosted.weblate.org/widget/mainsail/mainsail/svg-badge.svg" alt="Übersetzungsstatus" />
  </a>
  <a aria-label="License" href="https://github.com/mainsail-crew/mainsail/blob/develop/LICENSE">
    <img src="https://img.shields.io/github/license/mainsail-crew/mainsail?style=flat-square">
  </a>
  <a aria-label="Last commit" href="https://github.com/mainsail-crew/mainsail/commits/">
    <img src="https://img.shields.io/github/last-commit/meteyou/mainsail?style=flat-square">
  </a>
  <br />
  <a aria-label="Size" href="https://github.com/mainsail-crew/mainsail/">
    <img src="https://img.shields.io/github/repo-size/meteyou/mainsail?style=flat-square">
  </a>
  <a aria-label="Discord" href="https://discord.gg/skWTwTD">
    <img src="https://img.shields.io/discord/758059413700345988?color=%235865F2&label=discord&logo=discord&logoColor=white&style=flat-square">
  </a>
  <a aria-label="Patreon" href="https://www.patreon.com/meteyou">
    <img src="https://img.shields.io/endpoint.svg?url=https%3A%2F%2Fshieldsio-patreon.vercel.app%2Fapi%3Fusername%3Dmeteyou%26type%3Dpatrons&style=flat-square">
  </a>
</p>

## K2-OpenHost fork

This branch adds a native Creality K2/OpenHost CFS workflow while keeping the upstream Mainsail UI structure. The CFS panel reads the canonical `printer.objects.box` object and adds:

- persistent custom filament library management;
- manual slot assignment for non-RFID slots, including the external spool;
- automatic display of RFID/Spoolman/library/manual slot provenance;
- temperature/humidity and filament-path state;
- logical-tool to physical-slot mapping in the normal Print dialog;
- compatibility with the K2-OpenHost `BOX_PRINT_INFO` / `BOX_PRINT_START` API used by Jacob10383's OrcaSlicer mapping workflow.

Custom filament IDs may use the same five-character material IDs used by DnG-Crafts/K2-RFID. K2-OpenHost recognizes the corresponding `1xxxxx` RFID `filamentId` automatically, so the external K2-RFID writer can continue to be used for physical tag programming while Mainsail manages the OpenHost inventory. When a live tag contains an unknown material code, the affected slot exposes **Map RFID**; the filament editor is prefilled with the tag ID/color and saving the new profile resolves the slot immediately.

The fork also ships the full Creality + Generic K2-RFID system catalog exposed by the K2-OpenHost backend. The filament library can create a custom profile from one of those read-only presets, including material type, nozzle range and pressure-advance metadata. Material is selected from the known catalog rather than typed freely. Non-RFID CFS slots use a dedicated Brand → Type → Profile → Color dialog, with the DnG-Crafts preset color palette plus a full custom color picker.

The dashboard keeps CFS cards readable in a horizontal responsive grid: each slot shows the filament/profile name, material/brand/temperature metadata and remaining percentage/metres without clipping. RFID slots use a vivid spool indicator whose colored sector follows the remaining percentage; clicking **RFID** opens the complete read-only database metadata. Untagged slots use the pencil editor with Brand → Type → Profile → Color selection and an explicit **Reset slot** action. The header RFID-scan button runs `BOX_RFID_SCAN` across populated bays, and each physical slot also exposes a one-slot reread action.

Slot assignments and RFID estimates are backend state, not browser state: they survive Mainsail reloads and printer restarts through the configured K2-OpenHost `filament_box.json`. A live slot removal clears only that bay assignment; confirmed runout also clears the depleted source after persisting its remaining estimate at zero. Startup restores occupied cached slots from JSON after one CFS presence-mask query and does not rescan every RFID tag unless the optional startup reread setting is explicitly enabled. The normal Print dialog and direct Orca/Moonraker starts use the same backend auto-mapper; exact profile matches win, Generic profiles are safe fallbacks when a slicer preset name is unavailable, and unresolved multicolor jobs are blocked rather than guessing.

## Getting Started

<img width="721" height="459" alt="image" src="https://github.com/user-attachments/assets/a6e1af74-ba30-47e0-8e49-311fedb4d1fd" />

<img width="900" height="987" alt="image" src="https://github.com/user-attachments/assets/daad238c-0782-43da-816a-d09b9a8c926d" />

<img width="903" height="847" alt="image" src="https://github.com/user-attachments/assets/3f11339a-56a2-403b-8701-56527337e5fc" />