# Knöllchen-Pilot — Pitch Video

30-Sekunden-Pitch in 1920×1080 (16:9), gerendert mit [Remotion](https://www.remotion.dev/).

## Setup

```bash
cd video
npm install
```

## Befehle

```bash
npm run dev         # Remotion Studio öffnen — Live-Preview im Browser
npm run build       # Final-Render zu out/pitch.mp4 (H.264)
npm run build:webm  # Alternative: VP8/WebM
npm run build:still # Cover-Frame als PNG (out/cover.png, Frame 60)
```

Der finale MP4 landet unter `video/out/pitch.mp4` (~7 MB).

## Aufbau

| Szene | Sek | Frames | Inhalt |
|---|---|---|---|
| Hook | 0–4 | 0–119 | „Verträge. Flotte. Kunden. **Strafzettel.**" — Highway-Streaks, Auto-Silhouette |
| Problem | 4–8 | 120–239 | „**30 Minuten** pro Strafzettel" + fallender Stapel von Bußgeldbescheiden |
| Demo | 8–15 | 240–449 | Browser-Mockup mit 4-Schritte-Pipeline + Counter „30 → 0,5 Sekunden" |
| Features | 15–23 | 450–689 | 4 Quick-Cuts à 2s: Verträge / Assistent / Übergabe / Flotte |
| Tagline | 23–27 | 690–809 | „Die KI-Plattform für Autovermietungen." |
| CTA | 27–30 | 810–899 | Logo + `knoellchen-pilot.de` + „30 Tage kostenlos testen" |

## Anpassen

- **Texte** sind direkt in den Szenen-Files (`src/scenes/*.tsx`) hardcoded.
- **Farben/Konstanten** in `src/lib/constants.ts` — `COLORS.tealLight`, `FPS`, Szenen-Längen.
- **Mockup-Inhalte** in `src/scenes/SceneFeatures.tsx` (Mock1_Calendar, Mock2_Assistant, Mock3_Damage, Mock4_Fleet).
- **Komposition** in `src/Pitch.tsx` — Sequenz-Reihenfolge ändern, Szenen tauschen.

## Musik hinzufügen (optional)

Lege eine MP3-Datei unter `public/music.mp3` ab und füge in `src/Pitch.tsx` ein:

```tsx
import { Audio, staticFile } from "remotion";
// ... innerhalb von <AbsoluteFill>:
<Audio src={staticFile("music.mp3")} volume={0.6} />
```

Empfohlene Quellen für lizenzfreie Musik:
- [Pixabay Music](https://pixabay.com/music/) (CC0)
- [YouTube Audio Library](https://studio.youtube.com/) (royalty-free)
- [Epidemic Sound](https://www.epidemicsound.com/) (kostenpflichtig)

## Stock-Footage hinzufügen (optional)

Aktuell sind alle Visuals selbst gerendert (CSS/SVG-Animationen, Particle-Felder, Highway-Streaks). Wenn du echte Auto-/Office-Footage einbauen willst:

1. MP4-Files herunterladen (z.B. von [Pexels](https://www.pexels.com/videos/) oder [Pixabay](https://pixabay.com/videos/))
2. In `video/public/` ablegen
3. In der gewünschten Szene einbauen:

```tsx
import { Video, staticFile } from "remotion";

<Video
  src={staticFile("driving.mp4")}
  startFrom={0}
  endAt={120}
  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }}
/>
```

## Tech

- Remotion 4.x
- React 18
- TypeScript (strict)
- Output: H.264 MP4, 30 fps, 1920×1080

## Größe & Performance

- Render-Zeit: ~30-60 Sekunden auf moderner CPU (concurrency 4)
- Output: ~7 MB MP4
- Frames werden parallel gerendert, dann mit ffmpeg zu MP4 encoded

## Bekannte Trade-offs

- Keine Stock-Videos enthalten — ersetze die animierten CSS/SVG-Visuals nach Belieben durch echte Footage.
- Keine Voice-Over — entweder selbst aufnehmen + als Audio einbinden oder ElevenLabs/Tools nutzen.
- Keine Hintergrundmusik — siehe Abschnitt oben.
