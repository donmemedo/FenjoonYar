Self-hosted fonts (no request leaves the site; the page never contacts Google).

Vazirmatn-Variable.woff2   (variable, weight 100-900; Arabic-script and Latin in one file)
  Source:  https://github.com/rastikerdar/vazirmatn  (fonts/webfonts/Vazirmatn[wght].woff2, master)
  Author:  Saber Rastikerdar and contributors
  Licence: SIL Open Font License 1.1  https://openfontlicense.org

PlusJakartaSans-Variable.woff2   (variable, weight 200-800; Latin subset only)
  Source:  Google Fonts static CDN, "latin" subset of Plus Jakarta Sans v12
           (CSS API: https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800)
           upstream project: https://github.com/tokotype/PlusJakartaSans
  Author:  Tokotype
  Licence: SIL Open Font License 1.1  https://openfontlicense.org

Both licences allow bundling and redistribution with a web app; keep this notice with the files.
The Latin-only Jakarta subset covers U+0000-00FF and common punctuation. Persian text always
falls through to Vazirmatn, so no Arabic-script glyphs are needed from Jakarta.

To refresh: re-download from the sources above, check that each file starts with the bytes
"wOF2" (head -c4 file), and keep the file names (src/lib/fonts.ts points at them).
