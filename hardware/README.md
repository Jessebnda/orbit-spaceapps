# Hardware: mechanical designs

3D-printable parts for the ORBIT wearables. The electronics that go inside them are programmed from [`firmware/`](../firmware).

```
hardware/
├── wrist/
│   ├── MunecaAssem.glb    full wrist assembly (3D preview)
│   └── stl/               printable parts
└── vest/
    ├── PecheraAssem.glb   full chest vest assembly (3D preview)
    ├── step/              editable CAD (STEP)
    └── stl/               printable parts
```

- **`stl/`**: the files to slice and print.
- **`step/`**: neutral CAD files to open and edit in any CAD tool (SolidWorks, Fusion, FreeCAD, Onshape).
- **`.glb`**: the whole assembly in one file. GitHub shows it as an interactive 3D view, and it can be loaded in a web app with three.js.

## Design for spaceflight

ORBIT has to work on a crew that floats, works with its hands full and has no doctor on board. The enclosures were shaped around that:

- **Nothing floats away.** In microgravity anything you let go of drifts off and becomes a hazard in the cabin. The crew phone is fixed to the wrist, the sensor boxes are fixed to the body, and the vest covers are screwed shut, so no part comes loose during exercise or work.
- **One-handed, quick-release phone.** The phone mount slides onto the wrist band on a quick-release rail sled. An astronaut can take the phone off or put it back with one hand while the other holds a handrail. With the phone on the wrist, the SOS button is always within reach.
- **Sensors where the signal is.** The vest core sits over the chest so the ECG electrodes and heart-rate sensor stay close to the heart for a clean 250 Hz signal. The wrist box keeps the IMU tight against the forearm to measure movement and the daily physical test.
- **Health you can see from across the module.** The vest logo is a status light: a translucent disc diffuses the LED, a dark mask shapes it into the logo, and it pulses with each heartbeat in the astronaut's pet colour, turning red as heart rate rises. Crewmates can tell how someone is doing at a glance, without looking at a screen. This supports the team-awareness side of behavioral health, not only the vitals.
- **Protected electronics.** The armour cover closes over the vest core so bumps against walls and equipment in a tight habitat don't reach the boards.

**Prototype vs. flight version.** These parts are printed in PLA for the prototype. PLA is not acceptable in a spacecraft cabin. A flight version would be printed in flame-retardant, low off-gassing materials such as ULTEM 9085 or PEEK, and would have to pass NASA's flammability and off-gassing tests (NASA-STD-6001).

## Wrist (`wrist/`)

| File | Part |
|---|---|
| `wristleBand_v3.STL` | Wrist band |
| `soporte_S23plus_v3_respaldo_plano.STL` | Phone mount for the Samsung S23+ (flat back) |
| `trineo_rieles_v7b.stl` | Rail sled that holds the phone mount on the band |
| `caja_c3_mpu.stl` | Box for the XIAO ESP32-C3 and the MPU IMU |
| `caja_c3_mpu_tapa.stl` | Lid for the C3 + MPU box |

## Chest vest (`vest/`)

| Part | STL | STEP |
|---|---|---|
| Base that sits on the chest | `pechera_base.STL` | `pechera_base.step` |
| Core that holds the ESP32 and sensors | `pechera_nucleo.STL` | `pechera_nucleo.step` |
| Armour cover | `pechera_tapa_armadura.STL` | `pechera_tapa_armadura.step` |
| Logo cover over the LED status light | `pechera_logo_tapa.STL` | `pechera_logo_tapa.step` |
| Translucent logo disc (light diffuser) | | `pechera_logo_disco_translucido.step` |
| Dark logo mask | | `pechera_logo_mascara_oscura.step` |

Units are millimetres, as exported from SolidWorks.
