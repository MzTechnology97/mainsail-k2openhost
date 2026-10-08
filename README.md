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

This fork adds a native **Creality CFS** (Creality Filament System) panel and print-start mapping to Mainsail for [K2-OpenHost](https://github.com/MzTechnology97/K2-OpenHost), where a Creality K2 Pro runs Kalico + Moonraker on an external host. It reads only the Klipper `box` object through Moonraker; the rest of Mainsail is unchanged upstream code.

> [!WARNING]
> **Experienced users only — use at your own risk.** K2-OpenHost voids the manufacturer's warranty and can damage the printer beyond repair, brick its firmware or, in case of malfunction, cause a fire. The authors accept no liability for damage to property or persons.
> In OpenHost mode the **nozzle and chamber cameras** cannot be managed by the T113 and must be rewired directly to the external Linux host, and the printer's **external USB port** cannot be used to print and stops working completely in gadget mode.
> Read the [disclaimer and hardware limitations](https://github.com/MzTechnology97/K2-OpenHost/blob/main/docs/en/DISCLAIMER.md) ([italiano](https://github.com/MzTechnology97/K2-OpenHost/blob/main/docs/it/DISCLAIMER.md)) before using this repository.

<p align="center">
  <img src="docs/images/k2-openhost/cfs-panel-multi.png" alt="CFS panel with three units and the external spool" width="560">
</p>

### What it adds

| Feature                         | What you get                                                                                                                                                                                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CFS panel**                   | One section per CFS unit with its own temperature/humidity and offline state, plus the external spool. Status chips for box state, loaded slot and clog/tangle detection                                                                                                                 |
| **Filament path**               | CFS → encoder → buffer → printhead joined by a PTFE tube with the filament inside in the real spool colour, filled as far as the sensors report and animated live during loads/unloads; CFS icon in the real bay colours, nozzle with hotend temperature                                 |
| **Slot tiles**                  | Colour stripe, RFID remaining gauge, material, name and temperature, source badge (RFID / Library / Spoolman / Manual), active state; load, edit, RFID and reread actions                                                                                                                |
| **Runout swap**                 | Groups of identical spools with order, strategy and remaining filament; the group in use is marked active                                                                                                                                                                                |
| **Slot editor**                 | Brand → Material → Profile → Colour for non-RFID spools and the external spool, with live preview, preset palette and custom colours                                                                                                                                                     |
| **RFID**                        | Read-only tag data, per-slot reread, and a one-click flow to create a profile for an unknown tag                                                                                                                                                                                         |
| **Filament library**            | Card view of the read-only Creality/Generic K2-RFID catalog and your custom profiles (saved in `config/cfs_filaments.json`), with origin and In-use badges, quick filters, Use in slot, duplicate/edit/delete, brand management and a sectioned editor with live preview and K2-RFID IDs |
| **Print mapping**               | The Print dialog maps every slicer tool to a CFS slot (auto-map + manual choice) and starts with `BOX_PRINT_START`                                                                                                                                                                       |
| **Any screen**                  | Layout follows the panel width (container queries): 4, 2 or 1 tile columns, compact tiles in narrow dashboard columns, larger touch targets                                                                                                                                              |
| **Several CFS**                 | Up to four units, with unit-aware slot names (`Slot 3` with one CFS, `B2·S4` with several)                                                                                                                                                                                               |
| **Settings**                    | Switches for runout swap, unload after print, RFID on insert and at startup, and clog detection (shown when the backend reports it)                                                                                                                                                      |
| **During a print**              | Free slots can still be filled and assigned (a spool identical to the loaded one joins the runout chain); the loaded slot, its runout chain and the external spool stay locked, and the loaded slot cannot be reread                                                                     |
| **Filament warnings**           | Low filament and material warnings of the print mapping in Mainsail's notification bell                                                                                                                                                                                                  |
| **Pressure advance / max flow** | Per filament profile and per slot, shown on the tiles and in the editors                                                                                                                                                                                                                 |
| **Spool length**                | Nominal length per filament profile for third-party RFID spools (Bambu, QIDI); empty uses the material reference (PLA 335 m, ABS 400 m…), shown on the library cards                                                                                                                     |
| **Fans**                        | The K2's part fans read **Toolhead Part Fan** (`[fan]`) and **Side Part Fan** (`aux_fans`) in Miscellaneous; the chamber exhaust fans get a **Chamber Exhaust Fans** slider                                                                                                              |

### Screenshots

| Filament path while loading                                                                                 | Slot tile states                                                                     |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| <img src="docs/images/k2-openhost/cfs-path-loading-wide.png" alt="Filament path while loading" width="400"> | <img src="docs/images/k2-openhost/cfs-slot-states.png" alt="Slot tiles" width="400"> |

| Runout swap groups                                                                     | Print dialog mapping                                                                     |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| <img src="docs/images/k2-openhost/cfs-runout-multi.png" alt="Runout swap" width="400"> | <img src="docs/images/k2-openhost/cfs-print-source.png" alt="Print mapping" width="400"> |

| Slot editor                                                                           | RFID information                                                                         |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| <img src="docs/images/k2-openhost/cfs-slot-editor.png" alt="Slot editor" width="400"> | <img src="docs/images/k2-openhost/cfs-rfid-info.png" alt="RFID information" width="400"> |

| Phone                                                                                  | Filament library                                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| <img src="docs/images/k2-openhost/cfs-panel-phone.png" alt="Phone layout" width="260"> | <img src="docs/images/k2-openhost/cfs-library-list.png" alt="Filament library" width="400"> |

| Parts of a slot tile ([legend](docs/K2_CFS.md#3-cfs-units-and-slot-tiles))                         | Profile card in the library ([legend](docs/K2_CFS.md#9-filament-library-filament-database))                |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| <img src="docs/images/k2-openhost/cfs-tile-anatomy.png" alt="Parts of the slot tiles" width="400"> | <img src="docs/images/k2-openhost/cfs-library-card-anatomy.png" alt="Parts of a profile card" width="300"> |

| Adding a custom filament                                                                                | Unknown RFID tag → new profile                                                                                        |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| <img src="docs/images/k2-openhost/cfs-example-4-filled.png" alt="Adding a custom filament" width="400"> | <img src="docs/images/k2-openhost/cfs-unknown-rfid-editor.png" alt="Profile created from an unknown tag" width="400"> |

Views with several CFS units use simulated status data; the development printer has one unit. The step-by-step guide to adding a custom filament is in [`docs/K2_CFS.md`](docs/K2_CFS.md#10-example-adding-a-custom-filament).

### Documentation

- [`docs/K2_CFS.md`](docs/K2_CFS.md): every K2-OpenHost feature, section by section, with step-by-step guides (slot editor, filament library, adding a custom filament, unknown RFID tags), the backend contract, commands, layout rules and validation status.
- [`docs/K2_MOTORS.md`](docs/K2_MOTORS.md): the read-only Motors panel (X/Y/E temperatures, protection validity, startup readiness, RS-485 and Nozzle transport counters, recent motor events), its states and colours, and the backend keys it reads.
- [K2-OpenHost Installer Helper](https://github.com/MzTechnology97/k2-openhost-installer-helper): installs this fork, Kalico and Moonraker on an external host.
- [`K2-OPENHOST.md`](K2-OPENHOST.md): how this fork fits the K2-OpenHost architecture, credits and update/deployment notes.

Upstream Mainsail documentation: [docs.mainsail.xyz](https://docs.mainsail.xyz).
