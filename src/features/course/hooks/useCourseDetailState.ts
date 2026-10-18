import { useParams, useSearchParams } from 'react-router-dom';

import { MOCK_MY_COURSES } from '../mocks/my-courses';

type CourseDetailTab = 'overview' | 'terrain' | 'facilities';

export function useCourseDetailState() {
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  // 향후 상세 조회 연결 지점. 현재 URL의 ID로 UI Mock만 찾는다.
  const course = MOCK_MY_COURSES.find((item) => item.id === courseId);
  const tabParam = params.get('tab');
  const tab: CourseDetailTab =
    tabParam === 'terrain' || tabParam === 'facilities' ? tabParam : 'overview';
  const listParams = new URLSearchParams(params.get('list') ?? '');
  const backHref = `/my-courses${listParams.size ? `?${listParams}` : ''}`;

  return {
    course,
    tab,
    backHref,
    isError: params.get('preview') === 'error',
    setTab: (value: string) => {
      if (value !== 'overview' && value !== 'terrain' && value !== 'facilities') return;
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set('tab', value);
        return next;
      });
    },
    retry: () =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete('preview');
          return next;
        },
        { replace: true },
      ),
  };
}
