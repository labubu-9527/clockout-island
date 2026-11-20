export function IslandGlassLayers({ liquid, rail = false }: { liquid: boolean; rail?: boolean }) {
  return <>
    <div className={`island__glass-backdrop${rail ? ' island__glass-backdrop--rail' : ''}`} aria-hidden="true"><canvas /></div>
    <div className="island__glass" aria-hidden="true">
      {liquid && <span className="island__glass-refraction" />}
      {liquid && <span className="island__glass-highlight" />}
    </div>
  </>;
}
