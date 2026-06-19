"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import SignaturePad from "signature_pad";

export interface SignatureCanvasHandle {
  /** PNG-Data-URL der Unterschrift, oder null wenn leer. */
  toPNG: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

// Canvas-basiertes Unterschriftsfeld mit dem Handy-Fix: bei window "resize"
// (Adressleiste ein/aus) wird NUR bei tatsächlich geänderter Breite neu
// skaliert und die laufende Unterschrift erhalten — sonst würde sie gelöscht.
export const SignatureCanvas = forwardRef<
  SignatureCanvasHandle,
  { height?: number; onInkChange?: (hasInk: boolean) => void }
>(({ height = 180, onInkChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const onInkRef = useRef(onInkChange);
  onInkRef.current = onInkChange;

  useImperativeHandle(ref, () => ({
    toPNG: () => {
      const pad = padRef.current;
      if (!pad || pad.isEmpty()) return null;
      return pad.toDataURL("image/png");
    },
    clear: () => {
      padRef.current?.clear();
      onInkRef.current?.(false);
    },
    isEmpty: () => padRef.current?.isEmpty() ?? true,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgba(255,255,255,0)",
      penColor: "#0f172a",
      minWidth: 0.6,
      maxWidth: 2.4,
    });
    pad.addEventListener("endStroke", () => onInkRef.current?.(!pad.isEmpty()));
    padRef.current = pad;

    let lastWidth = -1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.round(rect.width);
      if (width === 0 || width === lastWidth) return;
      lastWidth = width;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.toData();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);
      pad.clear();
      if (data.length > 0) pad.fromData(data);
      onInkRef.current?.(!pad.isEmpty());
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      pad.off();
      padRef.current = null;
    };
  }, []);

  return (
    <div
      className="relative rounded-input border border-hairline bg-canvas overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full"
        style={{ height, display: "block" }}
      />
    </div>
  );
});

SignatureCanvas.displayName = "SignatureCanvas";
