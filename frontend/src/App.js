import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GyeongjuBusDashboard from './GyeongjuBusDashboard';

// --- 1. 로그인 컴포넌트 ---
const LoginForm = ({ onLoginSuccess, onSwitchToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:3000/api/login', { email, password });
            onLoginSuccess(res.data.token, res.data.nickname);
        } catch (err) {
            alert(err.response?.data?.error || '로그인 실패: 서버 연결을 확인하세요.');
        }
    };

    return (
        <div style={authStyles.container}>
            <h2 style={{ marginBottom: '30px', color: '#333' }}>🚌 경주 버스 로그인</h2>
            <form onSubmit={handleLogin} style={authStyles.form}>
                <input style={authStyles.input} type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input style={authStyles.input} type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="submit" style={authStyles.button}>로그인</button>
            </form>
            <div style={authStyles.link}>
                계정이 없으신가요? <span style={authStyles.toggleBtn} onClick={onSwitchToRegister}>회원가입</span>
            </div>
        </div>
    );
};

// --- 2. 회원가입 컴포넌트 ---
const RegisterForm = ({ onSwitchToLogin }) => {
    const [formData, setFormData] = useState({ email: '', password: '', nickname: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        setError('');
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(''); 
        try {
            await axios.post('http://localhost:3000/api/register', formData);
            alert('회원가입 성공! 로그인해주세요.');
            onSwitchToLogin();
        } catch (err) {
            if (!err.response) {
                setError('서버와 연결할 수 없습니다. 서버 실행 여부를 확인하세요.');
            } else {
                setError(err.response?.data?.error || '회원가입 실패');
            }
        }
    };

    return (
        <div style={authStyles.container}>
            <h2 style={{ marginBottom: '10px', color: '#333' }}>경주 버스 회원가입</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>새로운 계정을 만들어보세요</p>
            <form onSubmit={handleRegister} style={authStyles.form}>
                <input style={authStyles.input} type="text" placeholder="닉네임" value={formData.nickname} 
                    onChange={(e) => setFormData({...formData, nickname: e.target.value})} required />
                <input style={authStyles.input} type="email" placeholder="이메일 주소" value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                <input style={authStyles.input} type="password" placeholder="비밀번호" value={formData.password} 
                    onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                
                {error && <p style={{ color: '#ff4d4f', fontSize: '14px', margin: '0', fontWeight: 'bold' }}>{error}</p>}
                
                <button type="submit" style={authStyles.button}>가입하기</button>
            </form>
            <div style={authStyles.link}>
                이미 계정이 있으신가요? <span style={authStyles.toggleBtn} onClick={onSwitchToLogin}>로그인</span>
            </div>
        </div>
    );
};

// --- 3. 메인 App 컴포넌트 ---
function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [nickname, setNickname] = useState(localStorage.getItem('nickname'));
    const [view, setView] = useState('login'); 

    const handleLoginSuccess = (newToken, userNickname) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('nickname', userNickname);
        setToken(newToken);
        setNickname(userNickname);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('nickname');
        setToken(null);
        setNickname('');
        setView('login');
        // 새로고침 없이 상태만 깔끔하게 비웁니다.
    };

    if (!token) {
        return (
            <div className="App" style={{ background: '#f0f2f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {view === 'login' ? (
                    <LoginForm onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setView('register')} />
                ) : (
                    <RegisterForm onSwitchToLogin={() => setView('login')} />
                )}
            </div>
        );
    }

    return (
        <div className="App">
            {/* 상단 통합 헤더: 이 하얀색 버튼만 남깁니다. */}
            <header style={{ padding: '10px 25px', background: '#fff', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>🚌</span>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>Gyeongju Bus Live</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '14px', color: '#555' }}><strong>{nickname}</strong>님 반갑습니다!</span>
                    <button onClick={handleLogout} style={headerButtonStyle}>로그아웃</button>
                </div>
            </header>
            <GyeongjuBusDashboard />
        </div>
    );
}

const headerButtonStyle = {
    cursor: 'pointer',
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    background: '#fff',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s'
};

const authStyles = {
    container: { maxWidth: '400px', width: '90%', padding: '40px 30px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', background: '#fff' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { padding: '12px 15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', outline: 'none', boxSizing: 'border-box', width: '100%' },
    button: { padding: '14px', borderRadius: '8px', border: 'none', background: '#1a73e8', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' },
    link: { marginTop: '25px', color: '#666', fontSize: '14px' },
    toggleBtn: { color: '#1a73e8', cursor: 'pointer', fontWeight: 'bold', marginLeft: '8px', textDecoration: 'underline' }
};

export default App;