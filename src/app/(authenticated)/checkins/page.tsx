"use client";

import CheckinList from "@/components/checkin/CheckinList";

export default function CheckinsPage() {
  return (
    <div className="min-h-screen bg-ctp-base p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-ctp-text">All Check-ins</h1>
        <div className="bg-ctp-surface0 border border-ctp-overlay1/40 rounded-lg p-4">
          <CheckinList limit={20} />
        </div>
      </div>
    </div>
  );
}
