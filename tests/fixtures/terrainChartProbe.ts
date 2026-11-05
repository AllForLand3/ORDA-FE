// Vite가 실제 차트와 같은 ECharts 모듈을 해석하도록 하는 브라우저 전용 테스트 도우미.
import { getInstanceByDom } from 'echarts/core';

export function captureChart() {
  const element = document.querySelector<HTMLElement>('.elevation-profile__chart');
  if (!element) throw new Error('고도 차트 컨테이너가 없습니다.');
  const chart = getInstanceByDom(element);
  if (!chart) throw new Error('고도 차트가 초기화되지 않았습니다.');
  return { element, chart };
}

export function readChart() {
  const { element, chart } = captureChart();
  // getOption의 외부 라이브러리 반환값 중 이 테스트가 읽는 필드만 명시한다.
  const option = chart.getOption() as {
    series: { data: [number, number | null][]; connectNulls: boolean }[];
    xAxis: { min: number; max: number }[];
  };
  const color = getComputedStyle(element).getPropertyValue('--color-primary-700').trim();
  const normalizer = document.createElement('span');
  normalizer.style.color = color;
  element.append(normalizer);
  const normalizedColor = getComputedStyle(normalizer).color;
  normalizer.remove();
  const linePaths = Array.from(element.querySelectorAll('svg path'))
    .filter((path) => {
      const style = getComputedStyle(path);
      return style.stroke === normalizedColor && style.fill === 'none';
    })
    .map((path) => path.getAttribute('d') ?? '');
  return {
    data: option.series[0].data,
    connectNulls: option.series[0].connectNulls,
    min: option.xAxis[0].min,
    max: option.xAxis[0].max,
    width: chart.getWidth(),
    containerWidth: element.clientWidth,
    linePaths,
  };
}
