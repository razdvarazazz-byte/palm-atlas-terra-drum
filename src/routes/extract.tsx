import { createFileRoute } from "@tanstack/react-router";
import { ExtractPage } from "@/components/extract/extract-page";

export const Route = createFileRoute("/extract")({
  component: ExtractPage,
});
