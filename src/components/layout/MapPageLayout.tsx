import { useId, useState } from 'react';
import type { ReactNode, Ref } from 'react';

import { ResponsivePanel } from '@/components/layout/ResponsivePanel';

export interface MapPageLayoutProps {
  bottomNavigation?: ReactNode;
  bottomNavigationLabel?: string;
  defaultPanelOpen?: boolean;
  header?: ReactNode;
  mapContent?: ReactNode;
  mapContainerRef?: Ref<HTMLDivElement>;
  mapControls?: ReactNode;
  mapLabel?: string;
  onPanelOpenChange?: (isOpen: boolean) => void;
  mobilePanelResizable?: boolean;
  panel: ReactNode;
  panelFooter?: ReactNode;
  panelLabel?: string;
  panelOpen?: boolean;
  panelSize?: 'content' | 'expanded';
}

export function MapPageLayout({
  bottomNavigation,
  bottomNavigationLabel = '하단 내비게이션',
  defaultPanelOpen = true,
  header,
  mapContent,
  mapContainerRef,
  mapControls,
  mapLabel = '지도 영역',
  onPanelOpenChange,
  mobilePanelResizable = false,
  panel,
  panelFooter,
  panelLabel = '지도 작업 패널',
  panelOpen,
  panelSize = 'content',
}: MapPageLayoutProps) {
  const [internalPanelOpen, setInternalPanelOpen] = useState(defaultPanelOpen);
  const panelId = useId();
  const isPanelOpen = panelOpen ?? internalPanelOpen;

  const handlePanelOpenChange = (nextIsOpen: boolean) => {
    if (panelOpen === undefined) {
      setInternalPanelOpen(nextIsOpen);
    }

    onPanelOpenChange?.(nextIsOpen);
  };

  return (
    <div
      className={`orda-map-layout${bottomNavigation ? ' orda-map-layout--with-bottom-navigation' : ''}`}
    >
      {header ? <header className="orda-map-layout__header">{header}</header> : null}

      <main className="orda-map-layout__workspace" data-panel-open={isPanelOpen}>
        <ResponsivePanel
          footer={panelFooter}
          id={panelId}
          isOpen={isPanelOpen}
          label={panelLabel}
          onOpenChange={handlePanelOpenChange}
          mobileResizable={mobilePanelResizable}
          size={panelSize}
        >
          {panel}
        </ResponsivePanel>

        <section aria-label={mapLabel} className="orda-map-layout__map" role="region">
          <div className="orda-map-layout__map-surface" ref={mapContainerRef}>
            {mapContent ?? (
              <div className="orda-map-layout__placeholder" role="note">
                <strong>지도 표시 영역</strong>
                <span>OpenLayers 연결 전</span>
              </div>
            )}
          </div>
          {mapControls ? (
            <div aria-label="지도 컨트롤" className="orda-map-layout__controls" role="group">
              {mapControls}
            </div>
          ) : null}
        </section>
      </main>

      {bottomNavigation ? (
        <nav aria-label={bottomNavigationLabel} className="orda-map-layout__bottom-navigation">
          {bottomNavigation}
        </nav>
      ) : null}
    </div>
  );
}
