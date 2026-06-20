"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VehicleForm } from "@/components/vehicle/VehicleForm";
import type { Vehicle } from "@/lib/types";

// Inline-Bearbeiten der Fahrzeug-Stammdaten auf der Detailseite: "Bearbeiten"
// schaltet die read-only-Karten gegen das vollständige VehicleForm. Speichern/
// Abbrechen schaltet zurück zur Ansicht.
export const VehicleEditPanel = ({
  vehicle,
  children,
}: {
  vehicle: Vehicle;
  children: React.ReactNode;
}) => {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <VehicleForm
        mode="edit"
        initial={vehicle}
        onCancel={() => setEditing(false)}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="data-label text-ink-muted">Stammdaten</div>
        <Button variant="signal" size="sm" onClick={() => setEditing(true)}>
          <Pencil size={14} /> Bearbeiten
        </Button>
      </div>
      {children}
    </>
  );
};
