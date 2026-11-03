# PDFwerk

Internes PDF-Toolkit im Stil von Sejda – **schlicht, modern, responsiv**. Alle Dateien werden ausschließlich **lokal im Browser** verarbeitet, es gibt keinen Server und keine Uploads.

## Werkzeuge

| Organisieren | Bearbeiten | Konvertieren | Optimieren & Sicherheit |
|---|---|---|---|
| PDF zusammenfügen | PDF bearbeiten (Text, Weißfläche, Markieren, Rechteck, Bild) | Bilder zu PDF | PDF komprimieren (verlustfrei / 3 Stufen / eigene) |
| PDF teilen (manuell, jede Seite, alle N, Bereiche) | PDF unterschreiben (zeichnen, tippen, Bild) | PDF zu Bild (JPG/PNG) | Graustufen |
| Seiten organisieren (Drag & Drop, drehen, duplizieren, Leerseiten, mehrere PDFs) | Formular ausfüllen (+ fixieren) | PDF zu Text | PDF schützen (AES-256 + Berechtigungen) |
| PDF drehen | Wasserzeichen | | PDF entsperren |
| Seiten löschen | Seitenzahlen | | |
| Seiten extrahieren | Zuschneiden | | |
| Abwechselnd mischen (Duplex-Scans) | Seitengröße ändern | | |
| | Metadaten | | |

Weitere Komfortfunktionen:

- **„Weiter bearbeiten mit …“** – Ergebnis direkt an das nächste Werkzeug übergeben (z. B. zusammenfügen → Seitenzahlen → schützen).
- Passwortgeschützte PDFs werden beim Öffnen erkannt und nach Passwort gefragt.
- Seitenbereiche per Klick, Umschalt‑Klick oder Eingabe (`1-3, 5, 8-`, `gerade`, `ungerade`).
- Unterschrift kann im Browser gespeichert werden (localStorage).
- Mehrere Ergebnisse werden als ZIP angeboten.

## Entwicklung

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # statische Dateien in dist/
npm run preview
```

Der Build in `dist/` ist rein statisch (Hash-Routing, relative Pfade) und kann auf jedem Webserver, in einem Unterordner oder einem internen S3/Nginx abgelegt werden.

## Technik

- React 19 + TypeScript + Vite, Tailwind CSS v4, lucide-Icons
- [`@cantoo/pdf-lib`](https://github.com/cantoo-scribe/pdf-lib) (gepflegter pdf-lib-Fork mit Ver-/Entschlüsselung) für alle Dokumentoperationen
- [`pdfjs-dist`](https://github.com/mozilla/pdf.js) für Vorschau, Rendering, Rasterisierung und Textextraktion
- `@dnd-kit` für Drag & Drop (Maus, Touch, Tastatur), `jszip` für ZIP-Downloads

```
src/
  lib/          PDF-Operationen (ops, edit, raster), pdf.js-Anbindung, Hilfsfunktionen
  components/   UI-Bausteine, Workspace, Seitenraster, Editor, Signatur-Dialog
  tools/        ein Modul je Werkzeug + registry.ts (Übersicht/Navigation)
  pages/        Startseite
```

Ein neues Werkzeug = Eintrag in `src/tools/registry.ts` + Komponente in `src/tools/`. Für Ein-Datei-Werkzeuge übernimmt `SinglePdfTool` Upload, Passwortabfrage, Vorschau, Fortschritt und Ergebnis.

## Hinweise / Grenzen

- *Komprimieren (außer verlustfrei)* und *Graustufen* bauen die Seiten als Bilder neu auf – Text ist danach nicht mehr markierbar.
- Der Editor fügt neue Inhalte hinzu (wie Sejda „Text hinzufügen“/„Weißfläche“); vorhandener Text wird nicht umgeschrieben. Schriften: Standard-PDF-Schriften (Helvetica, Times, Courier) mit westeuropäischem Zeichensatz.
- Sehr große Dateien (mehrere hundert MB) sind durch den Browser-Arbeitsspeicher begrenzt.
