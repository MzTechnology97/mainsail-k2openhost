# Mainsail in the K2-OpenHost project

Updated: **2026-10-01**.

This repository is a fork of the **Mainsail** project retained for the K2-OpenHost UI/integration track. All original Mainsail authorship, licensing and upstream documentation remain authoritative for Mainsail itself.

## Upstream attribution

Original project:

- `mainsail-crew/mainsail`

K2-OpenHost does not claim authorship of the Mainsail UI. This fork exists so K2-specific UI experiments can be developed separately without rewriting or obscuring upstream credit.

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
        +-- Mainsail
        `-- Cartographer direct USB (target topology)
```

Mainsail runs against Moonraker on the external host. The original K2 T113 remains a candidate for a future local-screen UI such as HelixScreen, while browser Mainsail remains the primary development interface.

## Current validated machine-control milestone

As of 2026-10-01, the external-host stack has validated on the real K2 Pro:

- Main MCU and Nozzle MCU communication;
- RS-485 closed-loop motor control;
- normal CoreXY movement;
- X/Y sensorless/stall homing;
- correct Z direction;
- complete homing using the original PRTouch stack;
- bed/nozzle/chamber heater control and PID tuning;
- emergency shutdown of active heater loads;
- a successful Klippain-ShakeTune resonance test;
- protected CFS observation mode.

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
