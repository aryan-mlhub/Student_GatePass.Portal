export function RotatingLogo({
  size = "md",
  showLabel = true,
}: {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const stageClass = size === "lg" ? "logo-stage lg" : "logo-stage";
  return (
    <div className="flex items-center gap-3">
      <div className={stageClass}>
        <div className="logo-cube">
          <div className="logo-face f-front">SBJ</div>
          <div className="logo-face f-back">ITMR</div>
          <div className="logo-face f-right">SBJ</div>
          <div className="logo-face f-left">ITMR</div>
          <div className="logo-face f-top">EST. 2010</div>
          <div className="logo-face f-bottom">NAAC A</div>
        </div>
      </div>
      {showLabel && (
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-slate-900">
            SBJITMR Gate Pass
          </div>
          <div className="text-[11px] font-medium text-slate-500">
            S.B. Jain Institute of Technology, Management &amp; Research
          </div>
        </div>
      )}
    </div>
  );
}
