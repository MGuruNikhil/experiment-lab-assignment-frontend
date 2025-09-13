import { Suspense } from "react";
import GoalsClient from "./GoalsClient";

export default function GoalsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-ctp-subtext0">Loading...</div>}>
      <GoalsClient />
    </Suspense>
  );
}


