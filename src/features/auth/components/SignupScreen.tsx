import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button, Checkbox, TextField } from '@/components/ui';

import signupBackground from '../assets/signup-background.svg';
import contourBottom from '../assets/signup-contour-bottom.svg';
import contourTop from '../assets/signup-contour-top.svg';
import '../auth.css';

type SignupField = 'email' | 'password' | 'passwordConfirm' | 'nickname';

function getEmailError(value: string) {
  if (!value.trim()) {
    return '이메일을 입력해주세요.';
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? ''
    : '올바른 이메일 주소를 입력해주세요.';
}

function getPasswordError(value: string) {
  if (!value) {
    return '비밀번호를 입력해주세요.';
  }

  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/.test(value)
    ? ''
    : '영문, 숫자, 특수문자를 포함한 8자 이상';
}

function getNicknameError(value: string) {
  if (!value.trim()) {
    return '닉네임을 입력해주세요.';
  }

  return /^[가-힣A-Za-z0-9]{2,10}$/.test(value.trim())
    ? ''
    : '2~10자, 한글/영문/숫자만 사용할 수 있습니다.';
}

export function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [serviceAgreed, setServiceAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false);
  const [expandedTerm, setExpandedTerm] = useState<'service' | 'privacy' | null>(null);
  const [touched, setTouched] = useState<Partial<Record<SignupField, boolean>>>({ password: true });
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const backgroundStyle: CSSProperties = {
    backgroundImage: `url("${signupBackground}")`,
  };

  const emailError = submitted || touched.email ? getEmailError(email) : '';
  const passwordError = submitted
    ? getPasswordError(password)
    : touched.password
      ? password
        ? getPasswordError(password)
        : '영문, 숫자, 특수문자를 포함한 8자 이상'
      : '';
  const passwordConfirmError =
    submitted || touched.passwordConfirm
      ? !passwordConfirm
        ? '비밀번호를 다시 입력해주세요.'
        : passwordConfirm !== password
          ? '비밀번호가 일치하지 않습니다.'
          : ''
      : '';
  const nicknameError = submitted || touched.nickname ? getNicknameError(nickname) : '';
  const formIsValid =
    !getEmailError(email) &&
    !getPasswordError(password) &&
    Boolean(passwordConfirm) &&
    passwordConfirm === password &&
    !getNicknameError(nickname) &&
    serviceAgreed &&
    privacyAgreed;

  function touch(field: SignupField) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setNotice('');

    if (!formIsValid) {
      const firstInvalidField: SignupField = getEmailError(email)
        ? 'email'
        : getPasswordError(password)
          ? 'password'
          : !passwordConfirm || passwordConfirm !== password
            ? 'passwordConfirm'
            : getNicknameError(nickname)
              ? 'nickname'
              : 'email';
      document.getElementById(`signup-${firstInvalidField}`)?.focus();
      return;
    }

    setNotice('인증 서버가 연결되지 않아 계정이 생성되지 않았습니다.');
  }

  function updateField(field: SignupField, value: string) {
    touch(field);
    setNotice('');

    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
    if (field === 'passwordConfirm') setPasswordConfirm(value);
    if (field === 'nickname') setNickname(value);
  }

  function renderTermDetails(term: 'service' | 'privacy') {
    const label = term === 'service' ? '서비스 이용약관' : '개인정보 수집 및 이용';
    const expanded = expandedTerm === term;

    return (
      <>
        <button
          aria-controls={`signup-${term}-details`}
          aria-expanded={expanded}
          aria-label={`${label} ${expanded ? '내용 접기' : '내용 보기'}`}
          className="auth-signup__term-toggle"
          onClick={() => setExpandedTerm(expanded ? null : term)}
          type="button"
        >
          ›
        </button>
        <p className="auth-signup__term-details" hidden={!expanded} id={`signup-${term}-details`}>
          {label} 전문은 준비 중입니다.
        </p>
      </>
    );
  }

  return (
    <main className="auth-route">
      <section
        aria-labelledby="signup-title"
        className="auth-page auth-page--signup"
        style={backgroundStyle}
      >
        <div aria-hidden="true" className="auth-contours auth-contours--signup">
          <img alt="" src={contourTop} />
          <img alt="" src={contourBottom} />
        </div>

        <header className="auth-signup__heading">
          <h1 id="signup-title">회원가입</h1>
          <p>AllForLand와 함께 더 많은 산을 만나보세요</p>
        </header>

        <div className="auth-surface auth-signup__surface">
          <form className="auth-signup__form" noValidate onSubmit={submit}>
            <div className="auth-signup__fields">
              <div className="auth-signup__field auth-signup__field--email">
                <TextField
                  autoComplete="email"
                  error={emailError || undefined}
                  id="signup-email"
                  label="이메일"
                  name="email"
                  onBlur={() => touch('email')}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="이메일을 입력해주세요"
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div className="auth-signup__field auth-signup__field--password">
                <TextField
                  autoComplete="new-password"
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
                  error={passwordError || undefined}
                  id="signup-password"
                  label="비밀번호"
                  name="password"
                  onBlur={() => touch('password')}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="비밀번호를 입력해주세요"
                  required
                  type={passwordVisible ? 'text' : 'password'}
                  value={password}
                />
              </div>

              <div className="auth-signup__field auth-signup__field--confirm">
                <TextField
                  autoComplete="new-password"
                  endAdornment={
                    <button
                      aria-label={
                        passwordConfirmVisible ? '비밀번호 확인 숨기기' : '비밀번호 확인 표시'
                      }
                      aria-pressed={passwordConfirmVisible}
                      className="auth-password-toggle"
                      onClick={() => setPasswordConfirmVisible((visible) => !visible)}
                      type="button"
                    >
                      {passwordConfirmVisible ? '숨기기' : '표시'}
                    </button>
                  }
                  error={passwordConfirmError || undefined}
                  id="signup-passwordConfirm"
                  label="비밀번호 확인"
                  name="passwordConfirm"
                  onBlur={() => touch('passwordConfirm')}
                  onChange={(event) => updateField('passwordConfirm', event.target.value)}
                  placeholder="비밀번호를 다시 입력해주세요"
                  required
                  type={passwordConfirmVisible ? 'text' : 'password'}
                  value={passwordConfirm}
                />
              </div>

              <div className="auth-signup__field auth-signup__field--nickname">
                <TextField
                  autoComplete="nickname"
                  error={nicknameError || undefined}
                  helperText={nicknameError ? undefined : '2~10자, 한글/영문/숫자 사용 가능'}
                  id="signup-nickname"
                  label="닉네임"
                  maxLength={10}
                  name="nickname"
                  onBlur={() => touch('nickname')}
                  onChange={(event) => updateField('nickname', event.target.value)}
                  placeholder="닉네임을 입력해주세요"
                  required
                  value={nickname}
                />
              </div>
            </div>

            <div className="auth-signup__terms">
              <div className="auth-signup__term-row">
                <Checkbox
                  checked={serviceAgreed}
                  label="(필수) 서비스 이용약관에 동의합니다."
                  onChange={(event) => {
                    setServiceAgreed(event.target.checked);
                    setNotice('');
                  }}
                  required
                />
                {renderTermDetails('service')}
              </div>
              <div className="auth-signup__term-row">
                <Checkbox
                  checked={privacyAgreed}
                  label="(필수) 개인정보 수집 및 이용에 동의합니다."
                  onChange={(event) => {
                    setPrivacyAgreed(event.target.checked);
                    setNotice('');
                  }}
                  required
                />
                {renderTermDetails('privacy')}
              </div>
            </div>

            <Button
              className="auth-submit auth-signup__submit"
              disabled={!formIsValid}
              fullWidth
              size="lg"
              type="submit"
            >
              회원가입하기
            </Button>
          </form>

          <p aria-live="polite" className="auth-notice auth-signup__notice" role="status">
            {notice}
          </p>
          <p className="auth-signup__login-link">
            이미 계정이 있으신가요? <Link to="/login">로그인하기</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
