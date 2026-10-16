# Liberation Sans source (GPLv2 with the font exception)

The production build bundles the PDF.js "standard font" substitutes for the
standard 14 PDF fonts. Four of them are **Liberation Sans 1.07.4**
(`LiberationSans-Regular.ttf`, `-Bold.ttf`, `-Italic.ttf`, `-BoldItalic.ttf`),
which Red Hat, Inc. licenses under the **GNU General Public License version 2
with a font exception** (Copyright © 2007–2011 Red Hat, Inc.; original design
by Steve Matteson, Ascender Corp.). The other standard-font files are Foxit
fonts under a permissive BSD-3-Clause-style license and carry no source
obligation.

GPLv2 requires the complete corresponding source to accompany the distributed
font binaries. This directory holds that source and is copied into the build
next to the fonts (see below).

## What is here

- `liberation-fonts-ttf-1.07.4.tar.gz` — the exact upstream 1.07.4 source
  release from the Liberation Fonts project (contains the fonts, `License.txt`,
  `COPYING` (GPLv2), `AUTHORS`, `ChangeLog`, and the fontforge-based `README`
  build instructions, i.e. the preferred form for making modifications).
- `LICENSE_LIBERATION` — the license text (GPLv2 with the font exception),
  identical to the copy PDF.js ships beside the fonts.
- `SHA256SUMS.txt` — checksums of the tarball and of the four Liberation Sans
  binaries the build distributes.

## Provenance

Downloaded over HTTPS from the official Liberation Fonts release archive:

    https://releases.pagure.org/liberation-fonts/liberation-fonts-ttf-1.07.4.tar.gz

Tarball SHA-256: `61a7e2b6742a43c73e8762cdfeaf6dfcf9abdd2cfa0b099a9854d69bc4cfee5c`
Project home: https://github.com/liberationfonts/liberation-fonts

## Relationship to the distributed binaries

The fonts the app distributes are the Liberation Sans 1.07.4 fonts as vendored
and byte-optimized by the PDF.js project (same typeface, version, and font
revision; a few bytes differ from the upstream release because PDF.js
re-compiles them). Under the GPL these remain the Liberation 1.07.4 fonts. The
upstream 1.07.4 source above is their corresponding source; the exact
optimization tooling is part of PDF.js (Apache-2.0), whose source is at
https://github.com/mozilla/pdf.js (`external/standard_fonts`).

## Where downstream recipients get the source

The build copies this source into `dist/pdfjs/standard_fonts/` next to the
fonts, and `THIRD_PARTY_NOTICES.txt` records both the bundled path and the
upstream URL, plus a written offer valid for three years. Regenerate the
notices with `npm run licenses`.
