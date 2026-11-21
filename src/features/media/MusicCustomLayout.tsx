import type { ReactNode } from 'react';
import type { MusicModule } from '../appearance';
import { musicRectStyle, type MusicModuleGeometry } from './musicModuleGeometry';
import type { MusicElement } from '../appearance/musicCustomLayout';

export function placeMusicElement(geometry: MusicModuleGeometry | undefined, element: MusicElement, child: ReactNode) {
  if (!geometry) return child;
  const rect = geometry.elements.find(item => item.element === element);
  return rect && <div className="music-free__element" data-music-element={element} style={musicRectStyle(rect)}>{child}</div>;
}

export function MusicCustomLayout({ geometry, content, free }: {
  geometry: MusicModuleGeometry; content: Record<MusicModule, ReactNode>; free?: ReactNode;
}) {
  if (free) return <div className="music-custom music-free" style={{height: geometry.height}}>{free}</div>;
  return <div className="music-custom" style={{ height: geometry.height }}>
    {geometry.modules.map(module => <div key={module.kind} className="music-custom__module"
      data-music-module={module.kind} data-popover={module.top < geometry.height - module.top - module.height ? 'below' : 'above'}
      style={{ top: module.top, height: module.height }}>{content[module.kind]}</div>)}
  </div>;
}
