import { useState, type CSSProperties, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

import { Button, Checkbox, TextField } from '@/components/ui';
import { storeAccessToken } from '@/lib/accessToken';
import type { ApiErrorResponse } from '@/shared/types/api';

import loginBackground from '../assets/login-background.svg';
import logoMark from '../assets/login-logo-mark.png';
import appleIcon from '../assets/login-social-apple.svg';
import googleIcon from '../assets/login-social-google.svg';
import kakaoIcon from '../assets/login-social-kakao.svg';
import contourBottom from '../assets/login-contour-bottom.svg';
import contourMiddle from '../assets/login-contour-middle.svg';
import contourTop from '../assets/login-contour-top.svg';
import eye from '../assets/eye.svg';
import eyeOff from '../assets/eye-off.svg';
import { authQueryKeys } from '../hooks/useCurrentUserQuery';
import { useLoginMutation } from '../hooks/useLoginMutation';
import type { CurrentUserResponse } from '../types/auth';
import '../auth.css';

export function LoginScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loginMutation = useLoginMutation();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [notice, setNotice] = useState('');
  const [loginError, setLoginError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const loginIdError = !loginId.trim() && submitted ? '아이디를 입력해주세요.' : loginError;
  const passwordError = !password && submitted ? '비밀번호를 입력해주세요.' : loginError;
  const backgroundStyle: CSSProperties = {
    backgroundImage: `url("${loginBackground}")`,
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loginMutation.isPending) {
      return;
    }

    setSubmitted(true);
    setLoginError('');
    setNotice('');

    if (!loginId.trim() || !password) {
      setLoginError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    loginMutation.mutate(
      { loginId: loginId.trim(), password },
      {
        onSuccess: ({ accessToken, userId, loginId: authenticatedLoginId, nickname, role }) => {
          try {
            storeAccessToken(accessToken, rememberMe);
          } catch {
            setNotice('로그인 정보를 저장할 수 없습니다. 브라우저 설정을 확인해주세요.');
            return;
          }

          queryClient.setQueryData<CurrentUserResponse>(authQueryKeys.currentUser, {
            userId,
            loginId: authenticatedLoginId,
            nickname,
            role,
          });
          navigate('/mountains', { replace: true });
        },
        onError: (error) => {
          if (axios.isAxiosError<ApiErrorResponse>(error)) {
            if (error.response?.status === 401 || error.response?.data?.code === 'UNAUTHORIZED') {
              setLoginError('아이디 또는 비밀번호를 확인해주세요.');
              return;
            }

            if (!error.response) {
              setNotice('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
              return;
            }

            if (error.response.data.message) {
              setNotice(error.response.data.message);
              return;
            }
          }

          setNotice('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        },
      },
    );
  }

  function showUnavailableAction(action: string) {
    setNotice(`${action} 기능은 아직 연결되지 않았습니다.`);
  }

  return (
    <main className="auth-route">
      <section
        aria-labelledby="login-title"
        className="auth-page auth-page--login"
        style={backgroundStyle}
      >
        <div aria-hidden="true" className="auth-contours auth-contours--login">
          <img alt="" src={contourTop} />
          <img alt="" src={contourMiddle} />
          <img alt="" src={contourBottom} />
        </div>

        <header className="auth-login__brand">
          <div aria-label="ORDA 로고" className="auth-login__logo" role="img">
            <img alt="" className="auth-login__logo-mark" src={logoMark} />
          </div>
          <span className="auth__eyebrow">LOGIN ORDA</span>
          <h1 className="auth-login__brand-title">다시, 산으로</h1>
          <p className="auth-login__tagline">
            <span>지도와 데이터로 만나는</span>
            <span>나만의 등산 코스</span>
          </p>
          <ul className="auth-desktop-highlights">
            <li>산별 서비스 영역을 한눈에 확인</li>
            <li>조건에 맞는 등산 경로 탐색</li>
            <li>고도와 경사 데이터를 통한 코스 비교</li>
          </ul>
        </header>

        <div className="auth-surface auth-login__surface">
          <h2 className="auth-login__title" id="login-title">
            로그인
          </h2>
          <p className="auth-login__description">ORDA와 함께 산을 더 가까이</p>

          <form className="auth-login__form" noValidate onSubmit={submit}>
            <TextField
              autoComplete="username"
              disabled={loginMutation.isPending}
              hideLabel
              id="login-id"
              label="아이디"
              name="loginId"
              invalid={Boolean(loginIdError)}
              onChange={(event) => {
                setLoginId(event.target.value);
                setLoginError('');
                setSubmitted(false);
                setNotice('');
              }}
              placeholder="아이디를 입력해주세요"
              required
              type="text"
              value={loginId}
            />
            <TextField
              autoComplete="current-password"
              disabled={loginMutation.isPending}
              endAdornment={
                <button
                  aria-label={passwordVisible ? '비밀번호 숨기기' : '비밀번호 표시'}
                  aria-pressed={passwordVisible}
                  className="auth-password-toggle"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  <img src={passwordVisible ? eyeOff : eye} alt="" />
                </button>
              }
              hideLabel
              id="login-password"
              label="비밀번호"
              name="password"
              invalid={Boolean(passwordError)}
              error={loginError || undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                setLoginError('');
                setSubmitted(false);
                setNotice('');
              }}
              placeholder="비밀번호를 입력해주세요"
              required
              type={passwordVisible ? 'text' : 'password'}
              value={password}
            />

            <div className="auth-login__options">
              <Checkbox
                checked={rememberMe}
                disabled={loginMutation.isPending}
                label="로그인 상태 유지"
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <button
                className="auth-text-button auth-login__forgot"
                onClick={() => showUnavailableAction('비밀번호 찾기')}
                type="button"
              >
                비밀번호 찾기
              </button>
            </div>

            <Button
              className="auth-submit auth-login__submit"
              disabled={loginMutation.isPending}
              fullWidth
              size="lg"
              type="submit"
            >
              {loginMutation.isPending ? '로그인 중...' : '로그인하기'}
            </Button>
          </form>

          <div aria-hidden="true" className="auth-login__separator">
            <span />
            <p>또는 다른 방법으로 로그인하기</p>
            <span />
          </div>

          <div aria-label="소셜 로그인" className="auth-login__social">
            <button
              aria-label="Google로 로그인"
              className="auth-social-button"
              onClick={() => showUnavailableAction('Google 로그인')}
              type="button"
            >
              <img alt="" aria-hidden="true" src={googleIcon} />
            </button>
            <button
              aria-label="카카오톡으로 로그인"
              className="auth-social-button"
              onClick={() => showUnavailableAction('카카오 로그인')}
              type="button"
            >
              <img alt="" aria-hidden="true" src={kakaoIcon} />
            </button>
            <button
              aria-label="Apple로 로그인"
              className="auth-social-button"
              onClick={() => showUnavailableAction('Apple 로그인')}
              type="button"
            >
              <img alt="" aria-hidden="true" src={appleIcon} />
            </button>
          </div>

          <p className="auth-login__signup-link">
            계정이 없으신가요? <Link to="/signup">회원가입하기</Link>
          </p>
          <p aria-live="polite" className="auth-notice" role="status">
            {notice}
          </p>
        </div>
      </section>
    </main>
  );
}
