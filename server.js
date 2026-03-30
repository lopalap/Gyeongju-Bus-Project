const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 데이터베이스 연결 설정
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_DATABASE,
    charset: 'utf8mb4'
});

const JWT_SECRET = process.env.JWT_SECRET || 'gyeongju_bus_secret_key'; 

// 토큰 인증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: '세션이 만료되었습니다.' });
        req.user = user;
        next();
    });
};

/**
 * 실시간 버스 도착 정보를 가져오는 함수 (상세 로그 포함)
 */
const getBusArrivalData = async (stationId, stationName = "알 수 없음") => {
    try {
        const pureNodeId = String(stationId).startsWith('KUB') 
            ? stationId 
            : `KUB${String(stationId).replace(/[^0-9]/g, "")}`; 

        const serviceKey = process.env.BUS_API_KEY;
        const fullUrl = `https://apis.data.go.kr/1613000/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList?serviceKey=${serviceKey}&cityCode=37020&nodeId=${pureNodeId}&_type=json&numOfRows=10&pageNo=1`;

        console.log(`🔎 데이터 처리: ${stationName} (${pureNodeId})`);
        
        const response = await axios.get(fullUrl);
        const result = response.data;
        
        if (result?.response?.header?.resultCode !== '00') {
            console.log(`⚠️ API 응답 이상: ${result?.response?.header?.resultMsg}`);
            return [];
        }

        const items = result?.response?.body?.items?.item;
        if (!items) {
            console.log(`📭 [정보 없음] ${stationName}: 현재 운행 중인 버스가 없습니다.`);
            return [];
        }

        const busList = Array.isArray(items) ? items : [items];
        console.log(`✨ [성공] ${pureNodeId}: ${busList.length}개 노선 정보 수신!`);
        
        return busList.map(bus => ({
            route_no: bus.routeno,
            remain_min: Math.floor(parseInt(bus.arrtime) / 60),
            remain_sec: parseInt(bus.arrtime) % 60,
            remain_stations: bus.arrprevstationcnt
        }));
    } catch (error) {
        console.error(`❌ API 에러 (${stationName}): ${error.message}`);
        return [];
    }
};

// --- API 엔드포인트 ---

// 1. 회원가입 API
app.post('/api/register', async (req, res) => {
    const { email, password, nickname } = req.body;
    try {
        const [existing] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: '이미 존재하는 이메일입니다.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO Users (email, password, nickname) VALUES (?, ?, ?)', 
            [email, hashedPassword, nickname]);

        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
        console.log(`✅ 새로운 회원 탄생: ${nickname} (${email})`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '회원가입 실패' });
    }
});

// 2. 로그인 API (평문/암호화 통합 지원)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ error: '이메일을 확인해주세요.' });
        
        const user = users[0];
        let validPassword = false;

        // DB 비번이 $2b$로 시작하면 bcrypt 비교, 아니면 평문 직접 비교
        if (user.password.startsWith('$2b$')) {
            validPassword = await bcrypt.compare(password, user.password);
        } else {
            validPassword = (password === user.password);
        }

        if (!validPassword) return res.status(401).json({ error: '비밀번호가 틀립니다.' });
        
        const token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        console.log(`🔑 로그인 성공: ${user.nickname}`);
        res.json({ token, nickname: user.nickname });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: '로그인 실패' }); 
    }
});

// 3. 정류장 목록 조회
app.get('/api/all-stations', async (req, res) => {
    try {
        const [stations] = await pool.query('SELECT station_id, station_name, latitude, longitude FROM All_Gyeongju_Stations');
        res.json(stations);
    } catch (err) { res.status(500).json({ error: '목록 로드 실패' }); }
});

// 4. 단일 정류장 도착 정보
app.get('/api/arrival/:stationId', async (req, res) => {
    try {
        const arrivalData = await getBusArrivalData(req.params.stationId, "상세조회");
        res.json(arrivalData);
    } catch (err) { res.status(500).json({ error: '도착 정보 로드 실패' }); }
});

// 5. 즐겨찾기 목록 + 실시간 정보 (로그인 필요)
app.get('/api/favorites-with-arrival', authenticateToken, async (req, res) => {
    try {
        const [favorites] = await pool.query('SELECT * FROM Favorite_Stations WHERE user_id = ?', [req.user.user_id]);
        const enriched = await Promise.all(favorites.map(async (fav) => {
            const arrivalBuses = await getBusArrivalData(fav.station_id, fav.station_name);
            return { ...fav, arrival_info: arrivalBuses };
        }));
        res.json(enriched);
    } catch (err) { res.status(500).json({ error: '즐겨찾기 로드 실패' }); }
});

// 6. 즐겨찾기 추가
app.post('/api/favorites', authenticateToken, async (req, res) => {
    const { station_id } = req.body;
    try {
        await pool.query('DELETE FROM Favorite_Stations WHERE user_id = ? AND station_id = ?', [req.user.user_id, station_id]);
        const [info] = await pool.query('SELECT station_name, latitude, longitude FROM All_Gyeongju_Stations WHERE station_id = ?', [station_id]);
        
        if (info.length === 0) return res.status(404).json({ error: '정류장 정보를 찾을 수 없습니다.' });

        await pool.query('INSERT INTO Favorite_Stations (user_id, station_id, station_name, latitude, longitude) VALUES (?, ?, ?, ?, ?)', 
            [req.user.user_id, station_id, info[0].station_name, info[0].latitude, info[0].longitude]);
        res.status(201).json({ message: '즐겨찾기에 추가되었습니다.' });
    } catch (err) { res.status(500).json({ error: '즐겨찾기 추가 실패' }); }
});

// 7. 즐겨찾기 삭제
app.delete('/api/favorites/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM Favorite_Stations WHERE fav_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
        res.json({ message: '삭제되었습니다.' });
    } catch (err) { res.status(500).json({ error: '삭제 실패' }); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 서버 가동 중: http://localhost:${PORT}`));