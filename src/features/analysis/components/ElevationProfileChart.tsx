import { useEffect, useRef } from 'react';

import { LineChart, type LineSeriesOption } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  TooltipComponent,
  type AriaComponentOption,
  type GridComponentOption,
  type TooltipComponentOption,
} from 'echarts/components';
import { init, use as register, type ComposeOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

import type { TerrainAnalysisSample } from '../types/terrainAnalysis';

register([LineChart, GridComponent, TooltipComponent, AriaComponent, SVGRenderer]);

type ProfileOption = ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption | AriaComponentOption
>;

interface ElevationProfileChartProps {
  samples: readonly TerrainAnalysisSample[];
  isExample?: boolean;
}

const numberFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 1,
});

/** 원본 값을 변경하지 않고 툴팁·표에 표시할 m 단위 숫자를 반올림한다. */
function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** 입력 샘플의 순서와 결측을 유지하며 거리 범위에 맞는 단위로 고도를 표시한다. */
export function ElevationProfileChart({ samples, isExample = false }: ElevationProfileChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ReturnType<typeof init> | null>(null);
  const distanceUnit = (samples[samples.length - 1]?.distanceM ?? 0) < 1000 ? 'm' : 'km';

  const description = isExample
    ? `실제 코스와 무관한 예시 고도 프로파일입니다. 가로축은 거리 ${distanceUnit}, 세로축은 고도 m입니다.`
    : `현재 코스의 고도 프로파일입니다. 가로축은 거리 ${distanceUnit}, 세로축은 고도 m입니다.`;

  // 차트 생성과 크기 감지, 해제를 담당한다.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const chart = init(element, undefined, { renderer: 'svg' });
    instanceRef.current = chart;

    const resize = () => {
      if (chart.isDisposed() || element.clientWidth === 0 || element.clientHeight === 0) {
        return;
      }

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

      instanceRef.current = null;
      chart.dispose();

      delete element.dataset.chartReady;
      delete element.dataset.chartWidth;
    };
  }, []);

  // 데이터가 바뀌면 기존 차트 인스턴스의 내용을 교체한다.
  useEffect(() => {
    const chart = instanceRef.current;
    const element = containerRef.current;

    if (!chart || !element || chart.isDisposed()) return;

    if (samples.length === 0) {
      chart.clear();
      return;
    }

    const styles = getComputedStyle(element);
    const color = (name: string) => styles.getPropertyValue(name).trim();

    // 정렬·필터링하지 않고 서버가 제공한 순서를 유지한다.
    const data = samples.map((sample): [number, number | null] => [
      sample.distanceM,
      sample.elevationM,
    ]);

    const lastDistanceM = samples[samples.length - 1]?.distanceM;
    const hasElevation = samples.some((sample) => sample.elevationM !== null);

    const option: ProfileOption = {
      animation: false,

      aria: {
        enabled: true,
        label: {
          description: `${description} 아래 데이터 표에서도 수치를 확인할 수 있습니다.`,
        },
      },

      textStyle: {
        fontFamily: styles.fontFamily,
      },

      grid: {
        top: 36,
        left: 60,
        right: 24,
        bottom: 48,
      },

      tooltip: {
        trigger: 'axis',
        confine: true,
        renderMode: 'richText',
        backgroundColor: color('--color-primary-900'),
        borderWidth: 0,
        textStyle: {
          color: color('--color-text-inverse'),
          fontSize: 11,
        },
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          const value = item?.value;

          if (!Array.isArray(value)) return '';

          const [distanceM, elevationM] = value;

          if (typeof distanceM !== 'number') return '';

          const elevationText =
            typeof elevationM === 'number' ? `고도 ${formatNumber(elevationM)} m` : '고도 미제공';

          return [`거리 ${formatNumber(distanceM)} m`, elevationText].join('\n');
        },
      },

      xAxis: {
        type: 'value',
        name: `거리 (${distanceUnit})`,
        nameLocation: 'middle',
        nameGap: 30,
        min: 0,
        max: lastDistanceM !== undefined && lastDistanceM > 0 ? lastDistanceM : undefined,
        nameTextStyle: {
          color: color('--color-text-secondary'),
          fontSize: 10,
        },
        axisLabel: {
          formatter: (value: number) =>
            new Intl.NumberFormat('ko-KR', {
              maximumFractionDigits: 2,
            }).format(distanceUnit === 'm' ? value : value / 1000),
          hideOverlap: true,
          fontSize: 10,
          color: color('--color-text-secondary'),
        },
        axisLine: {
          lineStyle: {
            color: color('--color-border-default'),
          },
        },
        splitLine: {
          show: false,
        },
      },

      yAxis: {
        type: 'value',
        name: '고도 (m)',
        scale: true,
        min: hasElevation ? ({ min }) => Math.floor((min - 10) / 10) * 10 : undefined,
        max: hasElevation ? ({ max }) => Math.ceil((max + 10) / 10) * 10 : undefined,
        nameTextStyle: {
          color: color('--color-text-secondary'),
          fontSize: 10,
        },
        axisLabel: {
          fontSize: 10,
          color: color('--color-text-secondary'),
        },
        splitLine: {
          lineStyle: {
            color: color('--color-border-default'),
            type: 'dashed',
          },
        },
      },

      series: [
        {
          type: 'line',
          name: isExample ? '예시 고도' : '고도',
          data,
          smooth: false,
          connectNulls: false,
          showSymbol: true,
          symbolSize: 4,
          lineStyle: {
            color: color('--color-primary-700'),
            width: 2,
          },
          itemStyle: {
            color: color('--color-primary-700'),
          },
        },
      ],
    };

    // 이전 데이터와 병합하지 않고 새 옵션으로 교체한다.
    chart.setOption(option, { notMerge: true });
  }, [samples, description, isExample, distanceUnit]);

  return (
    <figure className="elevation-profile">
      {samples.length === 0 ? <p role="status">표시할 고도 샘플이 없습니다.</p> : null}

      <div
        aria-label={`${description} 아래 데이터 표에서 수치를 확인할 수 있습니다.`}
        className="elevation-profile__chart"
        ref={containerRef}
        role="img"
      />

      <figcaption>
        {isExample
          ? '예시 고도 · 실제 코스 분석이 아닙니다.'
          : '거리별 고도 · 고도 미제공 구간은 선을 연결하지 않습니다.'}
      </figcaption>

      <details className="elevation-profile__table">
        <summary>{isExample ? '샘플 데이터 표 보기' : '고도 데이터 표 보기'}</summary>

        <table>
          <caption>{isExample ? '도식용 샘플 거리·고도' : '현재 코스 거리·고도'}</caption>

          <thead>
            <tr>
              <th scope="col">거리 (m)</th>
              <th scope="col">고도 (m)</th>
            </tr>
          </thead>

          <tbody>
            {samples.map((sample) => (
              <tr key={sample.seqNo}>
                <td>{formatNumber(sample.distanceM)}</td>
                <td>
                  {sample.elevationM === null ? '고도 미제공' : formatNumber(sample.elevationM)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
