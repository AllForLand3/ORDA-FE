import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useBeforeUnload, useBlocker, useNavigate } from 'react-router-dom';
import { getAccessToken } from '@/lib/accessToken';
import type { ApiErrorResponse } from '@/shared/types/api';
import { useAccessToken } from '@/shared/hooks/useAccessToken';
import { createCourse } from '../api/course';
import type { CourseGeometry } from '../types/course';
import { parseCourseFile } from '../utils/courseGeometry';
import { courseQueryKeys } from './useCourseQuery';
import { useImportMountainsQuery } from './useImportMountainsQuery';
import { useCourseSessionGuard } from './useCourseSessionGuard';

const MAX_COURSE_FILE_BYTES = 128 * 1024;

export function useCourseImportState() {
  const accessToken = useAccessToken();
  const isCurrentSession = useCourseSessionGuard(accessToken);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mountainsQuery = useImportMountainsQuery();
  const mountains = Array.from(
    new Map(
      (mountainsQuery.data?.pages.flatMap((page) => page.items) ?? []).map((mountain) => [
        mountain.mountainId,
        mountain,
      ]),
    ).values(),
  );
  const [geometry, setGeometry] = useState<CourseGeometry>();
  const [fileName, setFileName] = useState('');
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');
  const [mountainId, setMountainId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [failure, setFailure] = useState('');
  const sequence = useRef(0);
  const busy = useRef(false);
  const completed = useRef(false);
  const mutation = useMutation({ mutationFn: createCourse, retry: false });
  const dirty = Boolean(fileName || name || memo || mountainId);
  const blocker = useBlocker(
    () => getAccessToken() !== null && !completed.current && (dirty || busy.current),
  );
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (completed.current || (!dirty && !busy.current)) return;
        event.preventDefault();
        event.returnValue = '';
      },
      [dirty],
    ),
  );
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );

  const nameError = !name.trim()
    ? '코스 이름을 입력해주세요.'
    : [...name.trim()].length > 100
      ? '코스 이름은 100자 이내로 입력해주세요.'
      : undefined;
  const memoError = [...memo].length > 1000 ? '메모는 1000자 이내로 입력해주세요.' : undefined;
  const mountainError = !mountains.some((mountain) => mountain.mountainId === mountainId)
    ? '코스가 속한 산을 선택해주세요.'
    : undefined;

  async function selectFile(file: File | undefined) {
    if (!file || busy.current) return;
    const current = ++sequence.current;
    setFileName(file.name);
    setGeometry(undefined);
    setFileError('');
    setFailure('');
    setReading(true);
    try {
      if (!/\.(geojson|json)$/i.test(file.name))
        throw new Error('GeoJSON 또는 JSON 파일을 선택해주세요. GPX는 지원하지 않습니다.');
      if (file.size > MAX_COURSE_FILE_BYTES)
        throw new Error('파일은 128KiB(131,072바이트) 이하만 가져올 수 있습니다.');
      const parsed = parseCourseFile(await file.text());
      if (current !== sequence.current) return;
      setGeometry(parsed);
      setName((existing) => existing || file.name.replace(/\.(geojson|json)$/i, ''));
    } catch (error) {
      if (current === sequence.current)
        setFileError(
          error instanceof Error ? error.message : '파일을 읽지 못했습니다. 다시 선택해주세요.',
        );
    } finally {
      if (current === sequence.current) setReading(false);
    }
  }

  async function save() {
    if (!isCurrentSession()) return;
    setSubmitted(true);
    if (busy.current || reading || !geometry || nameError || memoError || mountainError) return;
    busy.current = true;
    setFailure('');
    try {
      const saved = await mutation.mutateAsync({
        mountainId,
        courseName: name.trim(),
        memo: memo || null,
        createType: 'IMPORT',
        geometry,
      });
      if (!isCurrentSession()) return;
      completed.current = true;
      queryClient.setQueryData(courseQueryKeys.detail(saved.course.courseId, accessToken), saved);
      blocker.reset?.();
      navigate(`/my-courses/${encodeURIComponent(saved.course.courseId)}`, { replace: true });
    } catch (error) {
      if (!isCurrentSession()) return;
      const code = axios.isAxiosError<ApiErrorResponse>(error)
        ? error.response?.data?.code
        : undefined;
      setFailure(
        code === 'COURSE_OUTSIDE_SERVICE_AREA'
          ? '코스 전체가 선택한 산의 서비스 영역 안에 있어야 합니다. 산이나 파일을 확인해주세요.'
          : code === 'INVALID_COURSE_GEOMETRY'
            ? '서버에서 코스 경로를 처리할 수 없습니다. 좌표와 경로를 확인해주세요.'
            : code === 'MOUNTAIN_NOT_FOUND'
              ? '선택한 산을 사용할 수 없습니다. 산 목록을 다시 불러와 선택해주세요.'
              : code === 'COURSE_AREA_UNAVAILABLE'
                ? '산의 서비스 영역을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.'
                : code === 'PAYLOAD_TOO_LARGE'
                  ? '서버에서 허용하는 요청 크기를 초과했습니다. 더 작은 파일을 선택해주세요.'
                  : '등록 결과를 확인하지 못했습니다. 입력과 파일은 유지했습니다. 중복 등록되지 않도록 결과를 확인한 뒤 다시 시도해주세요.',
      );
    } finally {
      busy.current = false;
    }
  }

  return {
    geometry,
    fileName,
    reading,
    fileError,
    name,
    memo,
    mountainId,
    mountains,
    mountainsQuery,
    submitted,
    nameError: submitted ? nameError : undefined,
    memoError: submitted ? memoError : undefined,
    mountainError: submitted ? mountainError : undefined,
    failure,
    pending: mutation.isPending,
    blocker,
    canSave: Boolean(geometry) && !reading && !mutation.isPending && mountains.length > 0,
    selectFile,
    save,
    setName,
    setMemo,
    setMountainId,
    backHref: '/my-courses',
  };
}
