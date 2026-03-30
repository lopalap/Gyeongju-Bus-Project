import React, { useState } from 'react';

const Login = ({ onLoginSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState(''); 
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isSignup ? '/api/signup' : '/api/login';
    const payload = isSignup ? { email, password, nickname } : { email, password };

    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (isSignup) {
          alert('회원가입이 완료되었습니다! 이제 로그인해 주세요.');
          setIsSignup(false); 
          setNickname('');
        } else {
          onLoginSuccess(data.token, data.nickname);
        }
      } else {
        setError(data.error || '요청 처리에 실패했습니다.');
      }
    } catch (err) {
      setError('서버와 연결할 수 없습니다. 서버 실행 여부를 확인하세요.');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      fontFamily: 'sans-serif',
      backgroundColor: '#f5f5f5' // 배경색을 살짝 넣어 가독성을 높였습니다.
    }}>
      <div style={{ 
        width: '350px', 
        padding: '40px', 
        backgroundColor: 'white',
        border: '1px solid #ddd', 
        borderRadius: '12px', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        textAlign: 'center' 
      }}>
        <h2 style={{ marginBottom: '10px' }}>
          {isSignup ? '경주 버스 회원가입' : '경주 버스 대시보드 로그인'}
        </h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '25px' }}>
          {isSignup ? '새로운 계정을 만들어보세요' : '서비스 이용을 위해 로그인해주세요'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isSignup && (
            <input 
              type="text" 
              placeholder="사용하실 닉네임을 입력하세요" 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              style={inputStyle} 
              required 
            />
          )}
          <input 
            type="email" 
            placeholder="이메일 주소" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={inputStyle} 
            required 
          />
          <input 
            type="password" 
            placeholder="비밀번호" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={inputStyle} 
            required 
          />
          
          {error && <p style={{ color: '#ff4d4f', fontSize: '13px', margin: '5px 0' }}>{error}</p>}
          
          <button type="submit" style={buttonStyle}>
            {isSignup ? '가입하기' : '로그인'}
          </button>
        </form>

        <div style={{ marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
          <button 
            onClick={() => { setIsSignup(!isSignup); setError(''); }} 
            style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', textDecoration: 'none' }}
          >
            {isSignup ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </button>
        </div>
      </div>
    </div>
  );
};

const inputStyle = {
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '15px',
  outline: 'none'
};

const buttonStyle = {
  padding: '12px',
  background: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '10px'
};

export default Login;