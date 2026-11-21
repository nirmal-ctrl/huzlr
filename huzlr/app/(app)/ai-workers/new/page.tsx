import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { WorkerSetup } from "@/components/ai-workers/worker-setup";

export default function NewWorkerPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-64 items-center justify-center"
          role="status"
          aria-label="Loading worker setup"
        >
          <Loader2 className="size-5 animate-spin" />
        </div>
      }
    >
      <WorkerSetup />
    </Suspense>
  );
}
