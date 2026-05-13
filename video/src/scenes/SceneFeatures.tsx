import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_DISPLAY } from "../lib/constants";
import { BrowserMock } from "../components/BrowserMock";
import { RadialGlow } from "../components/RadialGlow";
import { ParticleField } from "../components/ParticleField";

const FEATURES = [
  { eyebrow: "Vertragsverwaltung", title: "Mietverträge.\nDigital & intelligent." },
  { eyebrow: "KI-Sprachassistent", title: "Einfach sagen,\nwas du brauchst." },
  { eyebrow: "Übergabe & Schaden", title: "Vorher. Nachher.\nKI sieht alles." },
  { eyebrow: "Flotte & Kalender", title: "Wer fährt was?\nAuf einen Blick." },
];

// Mockup body for each feature — visually distinct
const Mock1_Calendar = () => (
  <div style={{ padding: 24, color: COLORS.stone900, background: "#fff" }}>
    <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 14 }}>Mietverträge — KW 18</div>
    {[
      { car: "VW Golf", who: "S. Müller", color: "#3b82f6", offset: 0, span: 4 },
      { car: "BMW 320d", who: "T. Schmidt", color: "#8b5cf6", offset: 2, span: 5 },
      { car: "Audi A4", who: "L. Weber", color: "#10b981", offset: 4, span: 4 },
      { car: "Tesla M3", who: "M. Wagner", color: "#0d9488", offset: 5, span: 3 },
    ].map((row, i) => (
      <div
        key={i}
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: 12,
          alignItems: "center",
          height: 36,
          marginBottom: 4,
        }}
      >
        <div style={{ fontSize: 13, color: "#374151" }}>{row.car}</div>
        <div style={{ position: "relative", height: 26, background: "#f5f5f4", borderRadius: 6 }}>
          <div
            style={{
              position: "absolute",
              left: `${(row.offset / 7) * 100}%`,
              width: `${(row.span / 7) * 100}%`,
              top: 3,
              bottom: 3,
              background: row.color,
              borderRadius: 5,
              color: "#fff",
              fontSize: 11,
              padding: "0 8px",
              display: "flex",
              alignItems: "center",
              fontWeight: 500,
            }}
          >
            {row.who}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const Mock2_Assistant = () => (
  <div style={{ padding: 24, color: "#fff", background: "#0a0a0a" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 99,
          background: `linear-gradient(135deg, ${COLORS.tealLight}, ${COLORS.emerald})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#000",
          fontSize: 14,
        }}
      >
        ✦
      </div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>KP-Assistent</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ alignSelf: "flex-end", maxWidth: "85%" }}>
        <div
          style={{
            background: COLORS.teal,
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 16,
            borderBottomRightRadius: 4,
            fontSize: 14,
          }}
        >
          Tesla nächste Woche frei?
        </div>
      </div>
      <div style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.9)",
            padding: "10px 14px",
            borderRadius: 16,
            borderBottomLeftRadius: 4,
            fontSize: 14,
          }}
        >
          Tesla M3 (K-GH 3456) ist Mo-Mi frei. Buche ich?
        </div>
      </div>
      <div
        style={{
          padding: "10px 14px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 12,
          fontSize: 12,
          fontFamily: "ui-monospace, monospace",
          marginTop: 4,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ opacity: 0.6 }}>Fahrzeug</span>
          <span>Tesla M3</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ opacity: 0.6 }}>Zeitraum</span>
          <span>02.05. – 09.05.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: COLORS.tealLight }}>
          <span>Summe</span>
          <span>€ 623,00</span>
        </div>
      </div>
    </div>
  </div>
);

const Mock3_Damage = () => (
  <div style={{ padding: 24, background: "#fff" }}>
    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.stone900, marginBottom: 14 }}>
      Übergabe-Vergleich · Audi A4
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
      {[0, 1].map((i) => (
        <div
          key={`b${i}`}
          style={{
            aspectRatio: "4/3",
            borderRadius: 6,
            background: `linear-gradient(135deg, #d6d3d1, #78716c)`,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              padding: "2px 6px",
              borderRadius: 3,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              fontSize: 10,
            }}
          >
            Vorher
          </div>
        </div>
      ))}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {[0, 1].map((i) => (
        <div
          key={`a${i}`}
          style={{
            aspectRatio: "4/3",
            borderRadius: 6,
            background: `linear-gradient(135deg, #d6d3d1, #78716c)`,
            position: "relative",
            border: i === 1 ? `2px solid ${COLORS.red}` : "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              padding: "2px 6px",
              borderRadius: 3,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              fontSize: 10,
            }}
          >
            Nachher
          </div>
          {i === 1 && (
            <div
              style={{
                position: "absolute",
                top: "40%",
                left: "30%",
                width: 70,
                height: 28,
                borderRadius: 5,
                border: `2px solid ${COLORS.red}`,
                background: "rgba(239,68,68,0.18)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 32,
                  left: -2,
                  padding: "2px 6px",
                  background: COLORS.red,
                  color: "#fff",
                  fontSize: 10,
                  borderRadius: 3,
                  fontWeight: 600,
                }}
              >
                Kratzer · 94%
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
    <div
      style={{
        marginTop: 14,
        padding: "10px 14px",
        background: "#fef2f2",
        borderRadius: 8,
        border: `1px solid #fecaca`,
        fontSize: 12,
        color: "#991b1b",
        fontWeight: 500,
      }}
    >
      ⚠ 1 neuer Schaden erkannt · automatisch protokolliert
    </div>
  </div>
);

const Mock4_Fleet = () => (
  <div style={{ padding: 24, background: "#0a0a0a", color: "#fff" }}>
    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Flotte · Live</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
      {[
        ["Vermietet", "28", COLORS.emerald],
        ["Frei", "4", "#3b82f6"],
        ["Wartung", "2", COLORS.amber],
        ["Aussteuern", "1", COLORS.red],
      ].map(([l, v, c]) => (
        <div
          key={l as string}
          style={{
            padding: 10,
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: c as string }} />
            <span style={{ fontSize: 9, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>
              {l}
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{v}</div>
        </div>
      ))}
    </div>
    {[
      { car: "VW Golf VIII", plate: "M-AB 1234", offset: 0, span: 4, who: "Müller", color: "#3b82f6" },
      { car: "BMW 320d", plate: "B-CD 5678", offset: 2, span: 5, who: "Schmidt", color: "#8b5cf6" },
      { car: "Audi A4", plate: "F-EF 9012", offset: 1, span: 3, who: "Weber", color: "#10b981" },
      { car: "Tesla M3", plate: "K-GH 3456", offset: 4, span: 3, who: "Wagner", color: "#0d9488" },
    ].map((row, i) => (
      <div
        key={i}
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr",
          gap: 12,
          height: 30,
          marginBottom: 4,
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{row.car}</div>
          <div style={{ fontSize: 10, fontFamily: "monospace", opacity: 0.5 }}>{row.plate}</div>
        </div>
        <div
          style={{
            position: "relative",
            height: 22,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 4,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: `${(row.offset / 7) * 100}%`,
              width: `${(row.span / 7) * 100}%`,
              top: 2,
              bottom: 2,
              background: row.color,
              borderRadius: 3,
              color: row.color === "#0d9488" ? "#000" : "#fff",
              fontSize: 10,
              padding: "0 6px",
              display: "flex",
              alignItems: "center",
              fontWeight: 500,
            }}
          >
            {row.who}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const MOCKS = [Mock1_Calendar, Mock2_Assistant, Mock3_Damage, Mock4_Fleet];
const VARIANTS: Array<"light" | "dark"> = ["light", "dark", "light", "dark"];
const URLS = [
  "app.knoellchen-pilot.de/contracts",
  "app.knoellchen-pilot.de/assistant",
  "app.knoellchen-pilot.de/handover",
  "app.knoellchen-pilot.de/fleet",
];

// Each feature gets ~2 seconds (60 frames). With 8s total → 4 × 2s = 240 frames
export const SceneFeatures = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slotFrames = 60; // 2 seconds per feature

  return (
    <AbsoluteFill style={{ background: COLORS.black }}>
      <RadialGlow color="rgba(45,212,191,0.18)" y="50%" size={1500} />
      <ParticleField count={30} color={COLORS.tealLight} />

      {FEATURES.map((feat, i) => {
        const start = i * slotFrames;
        const local = frame - start;
        if (local < -10 || local > slotFrames + 10) return null;

        const enterSpring = spring({
          frame: local - 2,
          fps,
          config: { damping: 18, stiffness: 110 },
        });
        const exitProgress = interpolate(local, [slotFrames - 12, slotFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const opacity = enterSpring * (1 - exitProgress);
        const yIn = interpolate(enterSpring, [0, 1], [40, 0]);
        const yOut = exitProgress * -30;
        const scale = interpolate(enterSpring, [0, 1], [0.92, 1]) * (1 - exitProgress * 0.04);

        const Mock = MOCKS[i];

        return (
          <AbsoluteFill
            key={i}
            style={{
              opacity,
              transform: `translateY(${yIn + yOut}px) scale(${scale})`,
              transformOrigin: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1.1fr",
                gap: 80,
                alignItems: "center",
                padding: "0 120px",
                fontFamily: FONT_DISPLAY,
              }}
            >
              {/* Text */}
              <div>
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: 99,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    fontSize: 18,
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: 24,
                  }}
                >
                  {feat.eyebrow}
                </div>
                <div
                  style={{
                    fontSize: 84,
                    fontWeight: 500,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.05,
                    color: COLORS.white,
                    whiteSpace: "pre-line",
                  }}
                >
                  {feat.title.split("\n").map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        color: idx === 1 ? "transparent" : COLORS.white,
                        background:
                          idx === 1
                            ? `linear-gradient(135deg, ${COLORS.tealLight}, ${COLORS.emerald})`
                            : "none",
                        WebkitBackgroundClip: idx === 1 ? "text" : undefined,
                        backgroundClip: idx === 1 ? "text" : undefined,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              {/* Browser mock */}
              <div style={{ width: "100%", maxWidth: 760 }}>
                <BrowserMock url={URLS[i]} variant={VARIANTS[i]}>
                  <Mock />
                </BrowserMock>
              </div>
            </div>
          </AbsoluteFill>
        );
      })}

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
