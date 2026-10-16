# Noto Sans

Unmodified variable font from Google's public fonts repository:

- Font: https://github.com/google/fonts/blob/main/ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf
- License: SIL Open Font License 1.1, copied in `OFL.txt`.
- Source project: https://github.com/notofonts/latin-greek-cyrillic
- Retrieved: 2026-09-15.
- Local filename: `NotoSans.ttf`.
- SHA-256: `bfb7bb691513f12e734dc346c03a03f784912432d7e3fa8e56efcf906fe86b3d`.

The canvas font-family alias does not modify or rename the font binary.

## Italic face

- Unmodified font: https://github.com/google/fonts/blob/main/ofl/notosans/NotoSans-Italic%5Bwdth,wght%5D.ttf
- Same source project and OFL-1.1 license as above.
- Local filename: `NotoSans-Italic.ttf`.
- Retrieved: 2026-09-15.
- SHA-256: `58e6e0ebd1931b29a365aa2d3e2ee9a9e831a3af7cf3ad1462d4e72154f0b291`.

Both font files have unitsPerEm=1000, hhea ascent=1069, descent=-293, lineGap=0,
and post underlinePosition=-100, underlineThickness=50. These font-table metrics
are used by `src/engine/font-metrics.js`, scaled by the run's point size. Italic
is a real bundled face, not browser-synthesized slanting.

Both OS/2 tables recommend subscript/superscript XSize=650 and YSize=600,
subscript YOffset=75 and superscript YOffset=350 (unitsPerEm=1000). Upright
XOffset values are zero; italic subscript XOffset=-16 and superscript XOffset=74.
The original script-text layout uses these display transforms without changing
the stored DOCX point size. Font binaries remain unmodified.

Both OS/2 tables also specify yStrikeoutSize=50 and yStrikeoutPosition=322.
Position is the top edge above the baseline, not the stroke center. The canvas
uses these metrics for single strikethrough; its double-line preview places two
strokes symmetrically around the single stroke, with one stroke thickness between.

At the supported bold weight 700 and default width 100, both fonts' MVAR `stro`
record adds 6.100073219837122 units after `avar` maps the normalized weight 0.6
to 0.6100073219837122. The bold top-edge metric is therefore 328.1000732198371
units; thickness stays 50. The engine uses these constants for its two supported
weights (400/700), without a runtime font-table parser. Test code independently
reads fvar/avar/MVAR and evaluates the relevant variation regions. A temporary
fontTools inspection independently confirmed the delta; no fontTools code or
new dependency is distributed. Font binaries remain unmodified.

# Bebas Neue

- Unmodified regular font, copyright Dharma Type / The Bebas Neue Project Authors.
- Font: https://github.com/google/fonts/blob/1e42f687f08eac15a39bde41db3d32198d269067/ofl/bebasneue/BebasNeue-Regular.ttf
- License: SIL Open Font License 1.1, copied unmodified in `BebasNeue-OFL.txt`.
- Corresponding source: https://github.com/dharmatype/Bebas-Neue/blob/686d14af640c17af3691c597778f121d840d9051/sources/BebasNeueV2.0(2018).glyphs
- Source Git blob: `6156f286b6baccc0d88549eebfa3612642b1c78e`.
- Google Fonts records that source revision in `ofl/bebasneue/METADATA.pb`.
- Retrieved: 2026-09-19.
- Local filename: `BebasNeue-Regular.ttf`; size: 61,400 bytes.
- SHA-256: `08e4623805102d819f58601e46e345648846075e363b2ceb23313c2d1c83ec73`.

The browser loads this same-origin asset only when the document requests Bebas
Neue and no installed/selectable family is available. It does not replace an
installed family or alter the stored DOCX font name. Native font measurements
remain in use; the Noto-specific metric constants do not apply to this face.

# Oswald and Open Sans

Unmodified Google Fonts assets retrieved 2026-09-19 from revision
`f2bd09badbc763d8757951d52deec29da27e85fb`:

| Local file | Upstream path | SHA-256 |
| --- | --- | --- |
| Oswald.ttf | ofl/oswald/Oswald[wght].ttf | 5b38c246e255a12f5712d640d56bcced0472466fc68983d2d0410ec0457c2817 |
| OpenSans.ttf | ofl/opensans/OpenSans[wdth,wght].ttf | 36643644f318a812aab2d2ed3bb98f8cf0872527f835fe9398d95fe6b9adb878 |
| OpenSans-Italic.ttf | ofl/opensans/OpenSans-Italic[wdth,wght].ttf | fe269381e992f32e135801740998544d6235061e37c93ec067ad2be3edd5b17b |

The upstream files and metadata are under
https://github.com/google/fonts/tree/f2bd09badbc763d8757951d52deec29da27e85fb/ofl .
Oswald is copyright The Oswald Project Authors; Open Sans is copyright The
Open Sans Project Authors. Their unmodified SIL Open Font License 1.1 notices
are retained as `Oswald-OFL.txt` and `OpenSans-OFL.txt` and in the application
third-party notices. OFL-1.1 permits bundling and redistribution with software
when the copyright/license notices are retained. No font binary is modified,
renamed internally or sold separately.

Corresponding editable sources recorded in upstream metadata:

- Oswald: https://github.com/googlefonts/OswaldFont/blob/89795261ac9eeb9aa8cd99f43982c4e4b0e53261/sources/Oswald.glyphs
  (Git blob `cd01ad5892cafbf78220bb77b3806cce0dafee65`).
- Open Sans: https://github.com/googlefonts/opensans/tree/bd7e37632246368c60fdcbd374dbf9bad11969b6/sources
  (UFO sources and designspaces for normal/italic, weights and widths).

The browser registers Oswald's normal weight range 200–700 and Open Sans's
normal/italic ranges 300–800, widths 75–100%. Only a requested missing family
loads; installed families take precedence. Every required face must load
before the family is registered. The document's original font declarations
remain unchanged. Oswald italic uses the browser's synthesized face because
this upstream release contains no italic asset.

The independent native reference control uses Oswald 4.100 and Open Sans 1.10; these assets
identify as Oswald 4.103 and Open Sans 3.003. Oswald control origins match within
0.2pt. Open Sans line breaks and baselines match, but individual glyph drift
remains recorded in `tests/fixtures/reviewed-family/README.md`. Font availability
does not establish identical typography across versions.

## Open Sans Light and SemiBold (exact face aliases)

Unmodified static fonts retrieved 2026-09-28 from the same reviewed Open Sans
source revision `bd7e37632246368c60fdcbd374dbf9bad11969b6`:
https://github.com/googlefonts/opensans/tree/bd7e37632246368c60fdcbd374dbf9bad11969b6/fonts/ttf

| Local/upstream file | SHA-256 |
| --- | --- |
| OpenSans-Light.ttf | 3472097ec4d9e57228cbfad3c9911e53923664d3df86568d0b05d674399e034e |
| OpenSans-LightItalic.ttf | 548dc557bcef26267d16f1afaf0770814a329c9f04a0168d396ca9d1ceafb16f |
| OpenSans-SemiBold.ttf | 4a413711684a9dd564ef0f1c10cb62b5d9f7eb6df2cff962f5341a6ecd5f64ae |
| OpenSans-SemiBoldItalic.ttf | c646a9aefc0e964f66487260639e375685328a6280856faea3e012c43fe9c56d |

Corresponding editable UFO/designspace sources:
https://github.com/googlefonts/opensans/tree/bd7e37632246368c60fdcbd374dbf9bad11969b6/sources
The existing unmodified `OpenSans-OFL.txt` and application third-party notice
apply to these files too. No font binary or internal name was modified.

Only a requested missing exact face loads these assets. Installed exact faces
retain priority. Normal and italic assets register together; a failed member
leaves the alias unavailable rather than exposing a partial family. SemiBold
registers its intrinsic weight 600, preventing an additional synthetic stroke
when DOCX also applies bold. The extra synthetic-bold advance remains separate.
The source DOCX face names are preserved through edits and exports.

Independent native reference controls cover both named faces, two sizes and four style
combinations. Baseline and ink comparisons do not claim binary font identity
or exact per-glyph equivalence across font releases.

## Source Sans Pro Light (exact face alias)

Unmodified Adobe TTF files from release `2.045R-ro/1.095R-it`, binary commit
`ce77773581f4d454f0fa985c073bb25c721bfcf5`:
https://github.com/adobe-fonts/source-sans/tree/ce77773581f4d454f0fa985c073bb25c721bfcf5/TTF

| Local/upstream file | SHA-256 |
| --- | --- |
| SourceSansPro-Light.ttf | ce323db75733028ec2961b442b3368117d4daf724e3217d120f1990da8533fd0 |
| SourceSansPro-LightIt.ttf | 8358a9a3bc57435de6c4310528c7e244c64de6a1cf2a302de7cd83d2099e81d3 |

Corresponding editable Roman/Italic sources and build scripts:
https://github.com/adobe-fonts/source-sans/tree/574db6de9c9c1dd68366d27dc2bf35282e9db7a5
Its `relnotes.txt` identifies Roman 2.045 / Italic 1.095, created 2019-01-11.

Copyright 2010-2018 Adobe, Reserved Font Name 'Source'. The original OFL-1.1
notice is retained in `SourceSansPro-OFL.txt` and the application notices.
The license permits bundling with software while retaining these notices.
No binary or internal font name was modified; the fonts are not sold alone.

The DOCX name `Source sans pro light` is an exact-face alias. On Windows,
CSS may silently resolve it to an installed regular sibling when local()
reports the light face missing. For this reviewed alias, only an exact local
load avoids loading the reviewed normal/italic assets. Both assets must load
before registration. They are registered at normal CSS weight under the
requested light-family name, preserving the document's stored declarations.
Bold uses browser synthesis, as the native reference control uses the same light face
with synthetic emboldening. Ordinary family detection remains unchanged.


## Source Sans Pro regular/bold family and Black face

Regular/Bold/Black/BlackIt are unmodified TTFs from the same Adobe release, binary commit
`ce77773581f4d454f0fa985c073bb25c721bfcf5`, and corresponding editable source
commit `574db6de9c9c1dd68366d27dc2bf35282e9db7a5` documented above.
The same retained OFL-1.1 license and application notices cover these files.

| Local/upstream file | SHA-256 |
| --- | --- |
| SourceSansPro-Regular.ttf | c6f835b6a6d942b196e2607bf73a7b086407ae8dbdc928c23a2fb4893ec383f6 |
| SourceSansPro-It.ttf | 36133e9f508b0b4c639e84b2a09855350be0b13700ad729ab519aa78e5c48d20 |
| SourceSansPro-Bold.ttf | 8d869f2aeac0220984a430120af819fbcb12a88e8ea4ad72aae4c5f6d6a2b985 |
| SourceSansPro-BoldIt.ttf | eab3e6c76c677dda287b2e56f41f718cc975a14150f72ef82e0a87f1b56eac4c |
| SourceSansPro-Black.ttf | 4183f9ae34bd50bde1ee5601302c0d1666638cad52ff2a8886d8c47535be1999 |
| SourceSansPro-BlackIt.ttf | 9ed6ca5d09d1651aa2d0d4526d952c73a0aa345ea408cd8b5682712ea4c5ff7c |

Regular/italic/bold/bold-italic load atomically only when the native family
is absent. Black/Black Italic load under the exact requested Black face alias,
independently of the regular family and existing Light alias. Stored DOCX font
names and formatting remain unchanged. No font binaries were modified.

Regular-family Italic/BoldItalic instead use unmodified version 1.075 from
binary commit `778e10a3656a899e0bc9f8a54d50a1ab4ba55308`, with corresponding
editable source/build scripts at `dcf70932c8e161860f62a48787fd1c89d1c0ef6d`:
https://github.com/adobe-fonts/source-sans/tree/778e10a3656a899e0bc9f8a54d50a1ab4ba55308/TTF
https://github.com/adobe-fonts/source-sans/tree/dcf70932c8e161860f62a48787fd1c89d1c0ef6d
Its original copyright 2010, 2012, 2014 Adobe and OFL-1.1 license are retained
in `SourceSansPro-1.075-OFL.txt` and the generated application notices.
This release removes the measured regular-italic advance difference from the
1.076 face embedded in the native reference. No glyph, advance, font name or binary was edited.

## Selawik Semibold

Unmodified `selawksb.ttf` from Microsoft's Selawik 1.01 release, stored here as
`Selawik-Semibold.ttf` (only the filesystem name changes):
https://github.com/microsoft/Selawik/releases/tag/1.01

- Release archive: https://github.com/microsoft/Selawik/releases/download/1.01/Selawik_Release.zip
- Archive SHA-256: `3f62c51e05e3b5a1e6241cf92a371f0be2ea1183aa87b30718bbd40832a8d423`.
- Font SHA-256: `0a9e9d0549a10f24bef9b3a29e06fe6e0b5c21e7a784c503b048a307841a7783`.
- Release/source commit: `b65ff9ce7c4673e75ec5c622924a6b6f61f2f876`.
- Editable Glyphs source, including the Semibold interpolation instance:
  https://github.com/microsoft/Selawik/blob/b65ff9ce7c4673e75ec5c622924a6b6f61f2f876/Source%20files/Glyphs/selawik.glyphs
- Original license: https://github.com/microsoft/Selawik/blob/b65ff9ce7c4673e75ec5c622924a6b6f61f2f876/LICENSE.txt
  retained byte-for-byte in `Selawik-OFL.txt`; application notices include the
  same text with trailing formatting whitespace normalized.

Copyright 2015 Microsoft Corporation, Reserved Font Name Selawik, OFL-1.1.
The original license permits bundling with software when copyright and license
notices are retained. No outlines, metrics, internal names, or binary tables
were modified, and the font is not sold separately or installed on the host.

The exact requested face alias loads lazily only when the native face is absent.
Registration uses the font's actual OS/2 weight 600. The independent native
reference control keeps Semibold ink and advances under an added bold declaration; a
normal-weight registration incorrectly forced synthetic emboldening. Italic
uses synthesis because this upstream release has no italic face. DOCX font
names and styling remain intact. The face embedded in the native reference identifies version
`1.01;O365`; the reviewed upstream asset identifies version `1.01`.


## Karla 2.002

Unmodified upstream assets from https://github.com/googlefonts/karla at commit
`1bd63a928e0f1122373b2a3dfe6c82cdb20569b3`. Regular/Bold are the original
`fonts/ttf/static` files and retain upstream internal names and metrics. The corresponding
editable sources and build files are in that commit's `sources/` directory.

Copyright 2019 The Karla Project Authors, SIL OFL-1.1. The original license is
retained in `Karla-OFL.txt` and included in the application notices. Nothing is
installed on the host. No proprietary font file is copied or redistributed.

| File | SHA-256 |
| --- | --- |
| Karla-Regular.ttf | a533ac149c87d6ca172d86c918dff422ba7cea09dccad338c1af2f77e6ff838e |
| Karla-Bold.ttf | 63858c99c0db9e443160b2c3bd4293b50b1a98c99c464cb40bef6f56670ade41 |

The native reference identifies Karla 2.002 Regular/Bold and synthesizes italic
from those upright faces. The separate upstream italic design has different
advances and is not part of this reviewed family asset set. CSS retains its
ordinary synthesis when no installed italic face exists. These files load together only
when a document requests Karla and no selectable installed family is found.
Installed fonts retain priority. Original DOCX declarations and package parts
remain unchanged; these browser assets are not embedded into exported DOCX.


# Montserrat and Montserrat Light 7.200

Unmodified static fonts from the official Montserrat project, tag `v7.200`,
commit `711e8ae6b4fa9d33d8482c9ec4871d906a345344`, retrieved 2026-09-29.
Copyright 2011 The Montserrat Project Authors. The unmodified OFL-1.1 notice
is retained in `Montserrat-OFL.txt` and the application third-party notices.
No binary or internal name was modified.

Upstream directory: https://github.com/JulietaUla/Montserrat/tree/711e8ae6b4fa9d33d8482c9ec4871d906a345344/fonts/ttf

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| Montserrat-Regular.ttf | 264340 | `2de60e08e1fef5ebac94d6c5e6935320b656564783b21748224c6a801ccb3b41` |
| Montserrat-Italic.ttf | 267820 | `e86b9f14c6f27f3735b7a969d7f60e91f8b661566d0b22d741655f5ba5489b6b` |
| Montserrat-Bold.ttf | 262608 | `0173e2eaf1a0382c57cb27de557dbde928d959ceb94f632cb16fcfe9fea0d128` |
| Montserrat-BoldItalic.ttf | 267860 | `31a78b4a1dea9dda81aa398bb04f5cecc31a4494222dcaf54695308f995f7232` |
| Montserrat-Light.ttf | 260500 | `ec895e15246a50bd490cc8e0429915016d4ed3738af4f5cc4763948303b898d0` |
| Montserrat-LightItalic.ttf | 264876 | `73128d8186c0989281044188bdfb363c61c57ae5930c7247525365bc733824a3` |

Corresponding editable sources at that same revision:
- `sources/Montserrat.glyphs`, Git blob `c9fe48eed29cc406285a59886b57244900b92f40`.
- `sources/Montserrat-Italic.glyphs`, Git blob `f7c585b1767c48c98bd69f9374784dbb12f977b9`.

Source directory: https://github.com/JulietaUla/Montserrat/tree/711e8ae6b4fa9d33d8482c9ec4871d906a345344/sources

Installed/selectable Montserrat families retain priority. A missing ordinary
family loads four normal/bold/italic/bold-italic faces together. The exact
Montserrat Light name loads regular/italic faces together, avoiding sibling
substitution. Assets load only when requested; DOCX declarations stay unchanged.
The native reference's font metadata reports version 7.200. Independent
layout/ink controls and the original cover-letter comparison establish the
bounded rendering evidence; matching versions alone is not full fidelity.


## Source Sans Pro SemiBold (exact face alias)

Unmodified upright 2.045 TTF from binary commit
`ce77773581f4d454f0fa985c073bb25c721bfcf5`, with corresponding editable
source/build scripts at `574db6de9c9c1dd68366d27dc2bf35282e9db7a5` above.
The italic 1.075 TTF comes from binary commit
`778e10a3656a899e0bc9f8a54d50a1ab4ba55308`, with source/build scripts at
`dcf70932c8e161860f62a48787fd1c89d1c0ef6d` above.

| Local/upstream file | SHA-256 |
| --- | --- |
| SourceSansPro-Semibold.ttf | 72bf9aa2e78b8c78444ae74b6be09411d5fb5bf0eb9bcdfd47082cc5d9b536df |
| SourceSansPro-SemiboldIt.ttf | e7687a5558387aa42c340012f24adc6d447f43cfaf3974e75fd91fff6451fe79 |

The original OFL-1.1 notices remain in `SourceSansPro-OFL.txt` and
`SourceSansPro-1.075-OFL.txt` and application notices. Both files retain their
original bytes and internal font names. The exact requested face loads only
when native lookup fails, and both styles load before registration. Intrinsic
CSS weight 600 retains the native control's advances for bold as well as normal
runs. Stored DOCX font names remain unchanged. The independent four-style
control is `tests/fixtures/semibold-face/control.docx`.

# Metric-compatible substitutes for common document fonts

Loaded only when a document asks for the original family and the browser has no
installed or selectable font of that name; the stored DOCX declaration is never
changed. Each substitute matches the original's advance widths and vertical
metrics, so line breaks and pagination follow the original fonts. Binaries are unmodified;
SHA-256 values are checked by `tools/check-licenses.mjs`. Retrieved 2026-10-09.

| Document family | Substitute | Source | License |
| --- | --- | --- | --- |
| Calibri | Carlito Regular/Bold/Italic/BoldItalic | https://github.com/google/fonts/tree/main/ofl/carlito (project https://github.com/googlefonts/carlito) | OFL-1.1, `Carlito-OFL.txt` |
| Cambria | Caladea Regular/Bold/Italic/BoldItalic (2013 metric-compatible release) | `crosextrafonts-20130214.tar.gz` from https://commondatastorage.googleapis.com/chromeos-localmirror/distfiles/ (Huerta Tipográfica for Google; later redesigns in google/fonts are not metric-compatible) | Apache-2.0, `Caladea-Apache-2.0.txt` |
| Arial | Liberation Sans 2.1.5 | https://github.com/liberationfonts/liberation-fonts (release 2.1.5, `liberation-fonts-ttf-2.1.5.tar.gz`) | OFL-1.1, `Liberation-OFL.txt` |
| Times New Roman | Liberation Serif 2.1.5 | same release | OFL-1.1 |
| Courier New | Liberation Mono 2.1.5 | same release | OFL-1.1 |

Advance widths were compared against the original Calibri, Cambria, Arial, Times New Roman and Courier New fonts on 2026-10-09 (opentype.js, a sample sentence in each face): Carlito, Liberation Sans/Serif/Mono match exactly; Caladea 2013 matches Cambria within 0.03%.
