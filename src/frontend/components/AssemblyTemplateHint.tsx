import { Boxes, KeyRound, Layers3 } from "lucide-react";

export default function AssemblyTemplateHint({ kind }: { kind: "part" | "asset" }) {
  return <aside className="assembly-template-hint">
    <div className="assembly-template-title"><KeyRound size={17} /><div><strong>Assembly template: Set of keys</strong><small>Use this pattern when building a nested inventory record.</small></div></div>
    <div className="assembly-template-flow">
      <span><Layers3 size={15} /><strong>Parent part</strong><small>Complete key set</small></span>
      <span><Boxes size={15} /><strong>{kind === "part" ? "Sub-parts" : "Assets"}</strong><small>Car key · 2 house keys · keychain</small></span>
      <span><KeyRound size={15} /><strong>{kind === "part" ? "Create assets next" : "Sub-assets"}</strong><small>{kind === "part" ? "Track each physical key" : "Copper front-door key · silver garage key"}</small></span>
    </div>
  </aside>;
}
