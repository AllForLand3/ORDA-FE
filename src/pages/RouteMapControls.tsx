import { useSearchParams } from 'react-router-dom';
import { MapControls } from '@/features/map';
import type { BaseMapType, MapControlsProps } from '@/features/map';

export function RouteMapControls(props: Pick<MapControlsProps, 'controller' | 'mountainName'>) {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mapMode');
  function updateMode(next: BaseMapType) {
    const updated = new URLSearchParams(params);
    if (next === 'street') updated.delete('mapMode');
    else updated.set('mapMode', next);
    setParams(updated, { replace: true });
  }
  return (
    <MapControls
      {...props}
      preferredBaseMap={mode === 'satellite' || mode === 'terrain' ? mode : 'street'}
      onBaseMapChange={updateMode}
    />
  );
}
