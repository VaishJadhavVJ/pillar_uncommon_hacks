import { useEffect, useState } from "react";
import { panelController, type PanelState } from "@/lib/panelAudio";

export function usePanelState(): PanelState {
  const [s, setS] = useState<PanelState>(() => panelController.getState());
  useEffect(() => panelController.subscribe(setS), []);
  return s;
}
