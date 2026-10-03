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

<p align="center">
  <img src="docs/images/k2-openhost/cfs-panel-multi.png" alt="CFS panel with three units and the external spool" width="560">
</p>

### What it adds

| Feature              | What you get                                                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CFS panel**        | One section per CFS unit with its own temperature/humidity and offline state, plus the external spool. Status chips for box state, loaded slot and clog/tangle detection                 |
| **Filament path**    | CFS → encoder → buffer → printhead, with a CFS icon in the real bay colours, a nozzle that takes the filament colour, and a filament-coloured line through the stages that hold filament |
| **Slot tiles**       | Colour stripe, RFID remaining gauge, material, name and temperature, source badge (RFID / Library / Spoolman / Manual), active state; load, edit, RFID and reread actions                |
| **Runout swap**      | Groups of identical spools with order, strategy and remaining filament; the group in use is marked active                                                                                |
| **Slot editor**      | Brand → Type → Profile → Colour for non-RFID spools, with a preset palette and custom colours                                                                                            |
| **RFID**             | Read-only tag data, per-slot reread, and a one-click flow to create a profile for an unknown tag                                                                                         |
| **Filament library** | Read-only Creality/Generic K2-RFID catalog plus custom profiles, with search and brand/material filters                                                                                  |
| **Print mapping**    | The Print dialog maps every slicer tool to a CFS slot (auto-map + manual choice) and starts with `BOX_PRINT_START`                                                                       |
| **Any screen**       | Layout follows the panel width (container queries): 4, 2 or 1 tile columns, compact tiles in narrow dashboard columns, larger touch targets                                              |
| **Several CFS**      | Up to four units, with unit-aware slot names (`Slot 3` with one CFS, `B2·S4` with several)                                                                                               |

### Screenshots

| Filament path while printing                                                                   | Slot tile states                                                                     |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| <img src="docs/images/k2-openhost/cfs-path-printing-wide.png" alt="Filament path" width="400"> | <img src="docs/images/k2-openhost/cfs-slot-states.png" alt="Slot tiles" width="400"> |

| Runout swap groups                                                                     | Print dialog mapping                                                                     |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| <img src="docs/images/k2-openhost/cfs-runout-multi.png" alt="Runout swap" width="400"> | <img src="docs/images/k2-openhost/cfs-print-source.png" alt="Print mapping" width="400"> |

| Slot editor                                                                           | RFID information                                                                         |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| <img src="docs/images/k2-openhost/cfs-slot-editor.png" alt="Slot editor" width="400"> | <img src="docs/images/k2-openhost/cfs-rfid-info.png" alt="RFID information" width="400"> |

| Phone                                                                                  | Filament library                                                                                |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| <img src="docs/images/k2-openhost/cfs-panel-phone.png" alt="Phone layout" width="260"> | <img src="docs/images/k2-openhost/cfs-filament-library.png" alt="Filament library" width="400"> |

Views with several CFS units use simulated status data; the development printer has one unit.

### Documentation

- [`docs/K2_CFS.md`](docs/K2_CFS.md): every K2-OpenHost feature, section by section, with the backend contract, commands, layout rules and validation status.
- [`K2-OPENHOST.md`](K2-OPENHOST.md): how this fork fits the K2-OpenHost architecture, credits and update/deployment notes.

Upstream Mainsail documentation: [docs.mainsail.xyz](https://docs.mainsail.xyz).
