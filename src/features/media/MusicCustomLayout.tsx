import type { ReactNode } from 'react';
import type { MusicModule } from '../appearance';
import type { MusicModuleGeometry } from './musicModuleGeometry';
import './MusicCustomLayout.css';

export function MusicCustomLayout({ geometry, content }: {
  geometry: MusicModuleGeometry; content: Record<MusicModule, ReactNode>;
}) {
  return <div className="music-custom" style={{ height: geometry.height }}>
    {geometry.modules.map(module => <div key={module.kind} className="music-custom__module"
      data-music-module={module.kind} data-popover={module.top < geometry.height - module.top - module.height ? 'below' : 'above'}
      style={{ top: module.top, height: module.height }}>{content[module.kind]}</div>)}
  </div>;
}
