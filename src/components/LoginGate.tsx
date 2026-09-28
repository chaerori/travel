import { signInWithGoogle } from '../utils/auth';

export function LoginGate() {
  async function handleSignIn() {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google 로그인 실패', err);
    }
  }

  return (
    <div className="login-gate">
      <p className="login-gate__title">여행 일정</p>
      <p className="login-gate__desc">Google 계정으로 로그인하면 여행 일정을 볼 수 있어요.</p>
      <button type="button" className="btn btn--primary" onClick={handleSignIn}>
        Google로 로그인
      </button>
    </div>
  );
}
