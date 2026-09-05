import { Suspense } from "react";
import { PlannerWorkspace } from "@/components/PlannerWorkspace";

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="route-loading"><span /><p>Preparing planner…</p></div>}>
      <PlannerWorkspace />
    </Suspense>
  );
}
