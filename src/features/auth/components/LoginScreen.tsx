import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button, Checkbox, TextField } from '@/components/ui';

import emailIcon from '../assets/login-email.svg';
import loginBackground from '../assets/login-background.svg';
import logoMark from '../assets/login-logo-mark.png';
import logoTile from '../assets/login-logo-tile.svg';
import passwordIcon from '../assets/login-password.svg';
import appleIcon from '../assets/login-social-apple.svg';
import googleIcon from '../assets/login-social-google.svg';
import kakaoIcon from '../assets/login-social-kakao.svg';
import contourBottom from '../assets/login-contour-bottom.svg';
import contourMiddle from '../assets/login-contour-middle.svg';
import contourTop from '../assets/login-contour-top.svg';
import '../auth.css';

export function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [notice, setNotice] = useState('');
  const backgroundStyle: CSSProperties = {
    backgroundImage: `url("${loginBackground}")`,
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate('/mountains');
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
            <img alt="" className="auth-login__logo-tile" src={logoTile} />
            <img alt="" className="auth-login__logo-mark" src={logoMark} />
          </div>
          <h1 className="auth-login__brand-title">다시, 산으로</h1>
          <p className="auth-login__tagline">
            <span>지도와 데이터로 만나는</span>
            <span>나만의 등산 코스</span>
          </p>
        </header>

        <div className="auth-surface auth-login__surface">
          <h2 className="auth-login__title" id="login-title">
            로그인
          </h2>
          <p className="auth-login__description">AllForLand와 함께 산을 더 가까이</p>

          <form className="auth-login__form" noValidate onSubmit={submit}>
            <TextField
              autoComplete="email"
              hideLabel
              id="login-email"
              label="이메일"
              name="email"
              onChange={(event) => {
                setEmail(event.target.value);
                setNotice('');
              }}
              placeholder="이메일을 입력해주세요"
              required
              startAdornment={<img alt="" aria-hidden="true" src={emailIcon} />}
              type="email"
              value={email}
            />
            <TextField
              autoComplete="current-password"
              endAdornment={
                <button
                  aria-label={passwordVisible ? '비밀번호 숨기기' : '비밀번호 표시'}
                  aria-pressed={passwordVisible}
                  className="auth-password-toggle"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  {passwordVisible ? '숨기기' : '표시'}
                </button>
              }
              hideLabel
              id="login-password"
              label="비밀번호"
              name="password"
              onChange={(event) => {
                setPassword(event.target.value);
                setNotice('');
              }}
              placeholder="비밀번호를 입력해주세요"
              required
              startAdornment={<img alt="" aria-hidden="true" src={passwordIcon} />}
              type={passwordVisible ? 'text' : 'password'}
              value={password}
            />

            <div className="auth-login__options">
              <Checkbox
                checked={rememberMe}
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

            <Button className="auth-submit auth-login__submit" fullWidth size="lg" type="submit">
              로그인하기
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
            {notice || '시연용 로그인입니다. 입력값 검증·인증 없이 산 선택 화면으로 이동합니다.'}
          </p>
        </div>
      </section>
    </main>
  );
}
