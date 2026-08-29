export type PassStatus =
  | "pending_mentor"
  | "pending_hod"
  | "approved"
  | "rejected";

export function StatusBadge({ status }: { status: PassStatus | string }) {
  if (status === "approved") {
    return (
      <span className="badge badge-emerald">
        <span className="dot bg-emerald-600" />
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="badge badge-rose">
        <span className="dot bg-rose-600" />
        Rejected
      </span>
    );
  }
  if (status === "pending_hod") {
    return (
      <span className="badge badge-indigo">
        <span className="dot bg-indigo-600" />
        Pending HOD
      </span>
    );
  }
  return (
    <span className="badge badge-amber">
      <span className="dot bg-amber-600" />
      Pending Mentor
    </span>
  );
}

export function FlowBadge({
  flow,
}: {
  flow: "academic" | "free_period" | "emergency" | string;
}) {
  if (flow === "academic") {
    return <span className="badge badge-amber">Academic Hour</span>;
  }
  if (flow === "free_period") {
    return <span className="badge badge-slate">Free Period</span>;
  }
  return <span className="badge badge-rose">Emergency</span>;
}
