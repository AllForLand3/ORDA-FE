import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Tabs,
  TextArea,
  TextField,
} from '../../src/components/ui';
import '../../src/styles/global.css';

export function UIComponentsFixture() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <main className="grid gap-6 p-6">
      <section aria-label="버튼">
        <Button>저장</Button>
        <Button disabled>비활성 저장</Button>
      </section>

      <TextField
        label="이메일"
        type="email"
        placeholder="이메일을 입력해주세요"
        helperText="로그인에 사용할 이메일입니다."
      />
      <TextField label="비밀번호" type="password" error="비밀번호를 입력해주세요" invalid />
      <TextField
        label="산 검색"
        variant="search"
        placeholder="산 이름을 검색해 보세요"
        onFilterClick={() => setFiltersOpen(true)}
      />
      <output aria-live="polite">{filtersOpen ? '검색 조건 열림' : '검색 조건 닫힘'}</output>
      <TextArea label="메모" placeholder="메모를 입력해주세요" />
      <Checkbox label="서비스 이용약관에 동의합니다" description="필수 동의 항목입니다." />

      <Card aria-label="예시 코스 카드">
        <Badge variant="primary">추천</Badge>
        <span>능선 조망 코스</span>
      </Card>

      <Tabs
        ariaLabel="코스 분석 결과"
        defaultValue="compare"
        items={[
          { value: 'compare', label: '코스 비교', content: <p>코스 비교 내용</p> },
          { value: 'terrain', label: '지형 분석', content: <p>지형 분석 내용</p> },
          { value: 'facilities', label: '주변 시설', content: <p>주변 시설 내용</p> },
        ]}
      />

      <Button onClick={() => setDialogOpen(true)}>코스 편집 열기</Button>
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="코스 편집"
        description="코스의 이름과 메모를 수정합니다."
        footer={<Button onClick={() => setDialogOpen(false)}>저장</Button>}
      >
        <TextField label="코스 이름" defaultValue="능선 조망 코스" />
      </Dialog>
    </main>
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Fixture root element를 찾을 수 없습니다.');
}

createRoot(rootElement).render(<UIComponentsFixture />);
