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

The fork also ships the full Creality + Generic K2-RFID system catalog exposed by the K2-OpenHost backend. The filament library keeps the free-text search bar and adds independent Brand and Material filters for navigating the larger catalog. It can create a custom profile from one of those read-only presets, including material type, nozzle range and pressure-advance metadata. Material is selected from the known catalog rather than typed freely. Non-RFID CFS slots use a dedicated Brand → Type → Profile → Color dialog, with the DnG-Crafts preset color palette plus a full custom color picker.

The dashboard keeps CFS cards readable in a horizontal responsive grid: each slot shows the filament/profile name, material/brand/temperature metadata and remaining percentage/metres without clipping. RFID slots use a vivid spool indicator whose colored sector follows the remaining percentage; clicking **RFID** opens the complete read-only database metadata. Untagged slots use the pencil editor with Brand → Type → Profile → Color selection and an explicit **Reset slot** action. The header RFID-scan button runs `BOX_RFID_SCAN` across populated bays, and each physical slot also exposes a one-slot reread action.

The CFS dashboard uses larger two-column slot cards, vivid spool colors and a remaining-filament sector gauge. The Print dialog's **Filament source** menu shows a live color dot for every CFS/EXT choice.

Slot assignments and RFID estimates are backend state, not browser state: they survive Mainsail reloads and printer restarts through the configured K2-OpenHost `filament_box.json`. A live slot removal clears only that bay assignment; confirmed runout also clears the depleted source after persisting its remaining estimate at zero. Startup restores occupied cached slots from JSON after one CFS presence-mask query and does not rescan every RFID tag unless the optional startup reread setting is explicitly enabled. The normal Print dialog and direct Orca/Moonraker starts use the same backend auto-mapper; exact profile matches win, Generic profiles are safe fallbacks when a slicer preset name is unavailable, and unresolved multicolor jobs are blocked rather than guessing.

Detailed K2-OpenHost CFS behavior, persistence and validation boundaries are documented in [`docs/K2_CFS.md`](docs/K2_CFS.md) and [`K2-OPENHOST.md`](K2-OPENHOST.md).

## 

<img width="728" height="809" alt="image" src="https://github.com/user-attachments/assets/f31c121e-6e35-440f-acb6-1abb643e0497" /> <img width="349" height="260" alt="image" src="https://github.com/user-attachments/assets/3deb93e8-ea62-49b5-a6d8-63e8ec17dcf5" />


<img width="1102" height="1066" alt="image" src="https://github.com/user-attachments/assets/a7fd0b2a-557b-474d-aa12-3c4eff12cdcc" />
<img width="1097" height="876" alt="image" src="https://github.com/user-attachments/assets/99b2a9c4-0e64-425b-9b59-235781ae48dd" />


<img width="718" height="567" alt="image" src="https://github.com/user-attachments/assets/742a0a96-4151-43eb-9d7c-5bcd1f9b4c6b" /> <img width="721" height="667" alt="image" src="https://github.com/user-attachments/assets/7011a1fc-70e0-4ac6-a47b-0bfa2f1ca43d" />
<img width="685" height="619" alt="image" src="https://github.com/user-attachments/assets/83726864-3ae9-4054-b10b-99fa93381a2d" />
<img width="671" height="746" alt="image" src="https://github.com/user-attachments/assets/264f7b3a-fcbb-421e-a0ce-defc235db40a" />







