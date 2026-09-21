import { useEffect } from "react";
import { bootUiMode } from "@/lib/ui-mode";

export function UiModeBoot() {
  useEffect(() => {
    bootUiMode();
  }, []);
  return null;
}
