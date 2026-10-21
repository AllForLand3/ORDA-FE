import { useEffect, useRef } from 'react';

import { LineChart, type LineSeriesOption } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  type AriaComponentOption,
  type GridComponentOption,
  type LegendComponentOption,
  type TooltipComponentOption,
} from 'echarts/components';
import { init, use as register, type ComposeOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

import { SAMPLE_ELEVATION_PROFILE } from '../mocks/terrain';

register([LineChart, GridComponent, LegendComponent, TooltipComponent, AriaComponent, SVGRenderer]);

type ProfileOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | AriaComponentOption
>;

export function ElevationProfileChart() {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const styles = getComputedStyle(element);
    const color = (name: string) => styles.getPropertyValue(name).trim();
    const chart = init(element, undefined, { renderer: 'svg' });
    const option: ProfileOption = {
      animation: false,
      aria: {
        enabled: true,
        label: {
          description:
            '실제 경로와 무관한 샘플 고도 프로파일입니다. 가로축은 거리 km, 세로축은 고도 m이며 아래 데이터 표에서 수치를 확인할 수 있습니다.',
        },
      },
      textStyle: { fontFamily: styles.fontFamily },
      grid: { top: 52, left: 42, right: 16, bottom: 44 },
      legend: {
        top: 0,
        left: 'center',
        data: ['샘플 고도'],
        icon: 'roundRect',
        itemWidth: 14,
        itemHeight: 3,
        textStyle: { color: color('--color-text-secondary'), fontSize: 11 },
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        renderMode: 'richText',
        backgroundColor: color('--color-primary-900'),
        borderWidth: 0,
        textStyle: { color: color('--color-text-inverse'), fontSize: 11 },
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          const value = item?.value;
          if (!Array.isArray(value)) return '';
          const [distanceM, elevationM] = value;
          if (typeof distanceM !== 'number' || typeof elevationM !== 'number') return '';
          return `샘플 거리 ${distanceM / 1000}km\n샘플 고도 ${elevationM}m`;
        },
      },
      xAxis: {
        type: 'value',
        name: '거리 (km)',
        nameLocation: 'middle',
        nameGap: 27,
        nameTextStyle: { color: color('--color-text-secondary'), fontSize: 10 },
        min: 0,
        max: 5800,
        interval: 2000,
        axisLabel: {
          formatter: (value: number) => String(value / 1000),
          fontSize: 10,
          color: color('--color-text-secondary'),
        },
        axisLine: { lineStyle: { color: color('--color-border-default') } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '고도 (m)',
        min: 0,
        max: 600,
        interval: 200,
        nameTextStyle: { color: color('--color-text-secondary'), fontSize: 10 },
        axisLabel: { fontSize: 10, color: color('--color-text-secondary') },
        splitLine: { lineStyle: { color: color('--color-border-default'), type: 'dashed' } },
      },
      series: [
        {
          type: 'line',
          name: '샘플 고도',
          data: SAMPLE_ELEVATION_PROFILE.map((point) => [point.distanceM, point.elevationM]),
          smooth: 0.25,
          showSymbol: false,
          lineStyle: { color: color('--color-primary-700'), width: 2 },
          itemStyle: { color: color('--color-primary-700') },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: color('--color-primary-100') },
                { offset: 1, color: color('--color-background-surface') },
              ],
            },
          },
        },
      ],
    };
    chart.setOption(option);

    const resize = () => {
      if (chart.isDisposed() || element.clientWidth === 0 || element.clientHeight === 0) return;
      chart.resize();
      element.dataset.chartReady = 'true';
      element.dataset.chartWidth = String(chart.getWidth());
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(element);
    window.addEventListener('resize', resize);
    const initialFrame = window.requestAnimationFrame(resize);

    return () => {
      window.cancelAnimationFrame(initialFrame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      chart.dispose();
      delete element.dataset.chartReady;
      delete element.dataset.chartWidth;
    };
  }, []);

  return (
    <figure className="elevation-profile">
      <div
        aria-label="샘플 고도 프로파일, 선택 코스와 무관함. 가로축 거리 km, 세로축 고도 m. 아래 표에서 수치를 확인할 수 있습니다."
        className="elevation-profile__chart"
        ref={chartRef}
        role="img"
      />
      <figcaption>샘플 고도 · 실제 코스 분석이 아닙니다.</figcaption>
      <details className="elevation-profile__table">
        <summary>샘플 데이터 표 보기</summary>
        <table>
          <caption>도식용 샘플 거리·고도</caption>
          <thead>
            <tr>
              <th scope="col">거리 (m)</th>
              <th scope="col">고도 (m)</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ELEVATION_PROFILE.map((point) => (
              <tr key={point.distanceM}>
                <td>{point.distanceM}</td>
                <td>{point.elevationM}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
