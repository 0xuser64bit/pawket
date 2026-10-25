# Bundled assets

Pawket's source is MIT-licensed. Bundled third-party assets retain their own
licenses; the MIT license does not replace them.

| Asset | Source | License and notice |
| --- | --- | --- |
| 3D pets | [Kenney Cube Pets 2.0](https://kenney.nl/assets/cube-pets) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); source in `assets/pets/`, built variants in `public/3d/pets/` |
| Human bodies and hair | [Quaternius Universal Base Characters, Standard edition](https://quaternius.com/packs/universalbasecharacters.html) | CC0 1.0; source in `assets/human/`, built variants in `public/3d/human/` |
| Fraunces | [Fraunces project](https://github.com/undercasetype/Fraunces) | [SIL Open Font License 1.1](src/fonts/Fraunces.LICENSE.txt) |
| Hanken Grotesk | [Hanken Grotesk project](https://github.com/marcologous/hanken-grotesk) | [SIL Open Font License 1.1](src/fonts/HankenGrotesk.LICENSE.txt) |
| DM Mono | [DM Mono project](https://github.com/googlefonts/dm-mono) | [SIL Open Font License 1.1](src/fonts/DMMono.LICENSE.txt) |

Fonts are bundled locally in `src/fonts/`; preserve their copyright and
license notices when redistributing the source or font files. Fraunces is an
instance of the upstream variable font, cut with fontTools'
`varLib.instancer`: weight fixed at 600 and Wonky at 1, Softness limited to
64–100, optical size kept. Fraunces declares no Reserved Font Name, so the
instance keeps its name under the same license. The 3D build
pipeline recolors and adapts the CC0 models and authors clothing and animation;
[ROOM-3D.md](docs/ROOM-3D.md) describes those modifications.

Package dependencies and the Android Gradle wrapper retain their upstream
licenses. Their package metadata and distributions carry those notices;
`pnpm-lock.yaml`, `Cargo.lock` and Android build files identify the versions.
