import { createFileRoute } from "@tanstack/react-router";
import { StudioApp } from "@/components/studio/studio-app";

export const Route = createFileRoute("/mix/$projectId")({
  component: MixPage,
});

function MixPage() {
  const { projectId } = Route.useParams();
  return <StudioApp projectId={projectId} />;
}
