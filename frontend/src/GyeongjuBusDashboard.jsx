/* eslint-disable no-unused-vars */
/* global kakao */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';

const GyeongjuBusDashboard = () => {
    const [favorites, setFavorites] = useState([]);
    const [allStations, setAllStations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStation, setSelectedStation] = useState(null);
    const [searchArrivals, setSearchArrivals] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const mapRef = useRef(null);
    const kakaoMap = useRef(null);
    const markers = useRef([]); 
    const notifiedBuses = useRef(new Set()); 
    const token = localStorage.getItem('token');

    // 1. 브라우저 알림 발송 함수 (로그 강화 및 포커스 기능 추가)
    const sendNotification = useCallback((title, body) => {
        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
            try {
                const notif = new Notification(title, { 
                    body, 
                    icon: "https://cdn-icons-png.flaticon.com/512/3448/3448339.png",
                });
                console.log(`✅ 알림 발송 완료: ${title} - ${body}`);
                
                // 알림 클릭 시 브라우저 창으로 이동
                notif.onclick = () => {
                    window.focus();
                    notif.close();
                };
            } catch (e) {
                console.error("❌ 알림 발송 실패:", e);
            }
        }
    }, []);

    // 2. 시간 감소 및 알림 체크 로직 (조건 완화)
    const tickTime = useCallback((busList, stationName) => {
        if (!busList) return [];
        return busList.map(bus => {
            let sec = bus.remain_sec - 1;
            let min = bus.remain_min;
            
            if (sec < 0 && min > 0) {
                min -= 1;
                sec = 59;
            }

            // [알림 로직 개선]
            // - min이 1분~3분 사이일 때 알림 발송
            // - busKey에서 min을 제외하여 동일한 버스 회차에 대해 중복 알림 방지
            const busKey = `${stationName}-${bus.route_no}-${bus.route_id}`; 
            
            if (min > 0 && min <= 3 && !notifiedBuses.current.has(busKey)) {
                sendNotification(
                    `🚌 버스 도착 예정`,
                    `잠시 후 [${stationName}]에 ${bus.route_no}번 버스가 도착합니다! (${min}분 전)`
                );
                notifiedBuses.current.add(busKey);
                
                // 10분 후 알림 기록 삭제 (다음 버스 알림을 위해)
                setTimeout(() => notifiedBuses.current.delete(busKey), 600000);
            }

            return { ...bus, remain_min: min, remain_sec: sec };
        });
    }, [sendNotification]);

    // 서버 데이터 로드
    const loadData = useCallback(async () => {
        if (!token) return;
        setIsRefreshing(true);
        try {
            const res = await axios.get('http://localhost:3000/api/favorites-with-arrival', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const favData = res.data || [];
            setFavorites(favData);

            if (selectedStation) {
                const matchingFav = favData.find(f => f.station_id === selectedStation.station_id);
                if (matchingFav) {
                    setSearchArrivals(matchingFav.arrival_info || []);
                } else {
                    const arrivalRes = await axios.get(`http://localhost:3000/api/arrival/${selectedStation.station_id}`);
                    setSearchArrivals(arrivalRes.data || []);
                }
            }
        } catch (err) { 
            console.error("데이터 동기화 실패"); 
        } finally { 
            setTimeout(() => setIsRefreshing(false), 400); 
        }
    }, [token, selectedStation]);

    // 마커 클릭 시 정류장 선택
    const handleSelectStation = useCallback(async (station) => {
        setSelectedStation(station);
        if (kakaoMap.current) {
            const moveLatLon = new kakao.maps.LatLng(station.latitude, station.longitude);
            kakaoMap.current.panTo(moveLatLon);
        }
        
        const alreadyLoaded = favorites.find(f => f.station_id === station.station_id);
        if (alreadyLoaded) {
            setSearchArrivals(alreadyLoaded.arrival_info || []);
        } else {
            setSearchArrivals([]); 
            try {
                const res = await axios.get(`http://localhost:3000/api/arrival/${station.station_id}`);
                setSearchArrivals(res.data || []);
            } catch (e) { }
        }
    }, [favorites]);

    // 실시간 카운트다운 인터벌
    useEffect(() => {
        const interval = setInterval(() => {
            setFavorites(prev => prev.map(fav => ({
                ...fav,
                arrival_info: tickTime(fav.arrival_info, fav.station_name)
            })));
            setSearchArrivals(prev => tickTime(prev, selectedStation?.station_name || "조회 중"));
        }, 1000);
        return () => clearInterval(interval);
    }, [selectedStation, tickTime]);

    // 자동 동기화
    useEffect(() => {
        if (token) {
            loadData();
            const syncTimer = setInterval(loadData, 30000);
            return () => clearInterval(syncTimer);
        }
    }, [loadData, token]);

    // 초기 설정 및 권한 요청
    useEffect(() => {
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => {
                console.log("알림 권한 상태:", permission);
                if (permission === "granted") {
                    // 권한 획득 성공 시 테스트 알림 (최초 1회)
                    // new Notification("알림 권한 허용됨", { body: "이제 버스 도착 알림을 받을 수 있습니다." });
                }
            });
        }

        const { kakao } = window;
        if (!kakao || !mapRef.current || kakaoMap.current) return;

        kakaoMap.current = new kakao.maps.Map(mapRef.current, {
            center: new kakao.maps.LatLng(35.856, 129.224),
            level: 3
        });

        const fetchAll = async () => {
            try {
                const res = await axios.get('http://localhost:3000/api/all-stations');
                setAllStations(res.data || []);
            } catch (e) { }
        };
        fetchAll();
    }, []);

    // 지도 마커 업데이트
    useEffect(() => {
        const { kakao } = window;
        if (!kakao || !kakaoMap.current || allStations.length === 0) return;

        markers.current.forEach(m => m.setMap(null));
        markers.current = [];

        const newMarkers = allStations.map(station => {
            const marker = new kakao.maps.Marker({
                position: new kakao.maps.LatLng(station.latitude, station.longitude),
                title: station.station_name
            });
            marker.setMap(kakaoMap.current);
            kakao.maps.event.addListener(marker, 'click', () => handleSelectStation(station));
            return marker;
        });
        
        markers.current = newMarkers;
    }, [allStations, handleSelectStation]);

    const handleAddFavorite = async (station) => {
        try {
            await axios.post('http://localhost:3000/api/favorites', 
                { station_id: station.station_id }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await loadData();
            setSearchTerm('');
        } catch (err) { alert("즐겨찾기 추가 실패"); }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("삭제하시겠습니까?")) return;
        try {
            await axios.delete(`http://localhost:3000/api/favorites/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadData();
        } catch (e) { }
    };

    const renderBusRows = (busList) => {
        if (!busList || busList.length === 0) return <div style={{textAlign:'center', padding:'10px', color:'#bbb'}}>도착 정보 없음</div>;

        return busList
            .filter(bus => bus.remain_min >= 0)
            .map((bus, i) => {
                const isArriving = bus.remain_min === 0 && bus.remain_sec <= 30;
                return (
                    <div key={`${bus.route_no}-${bus.remain_sec}-${i}`} style={{ 
                        display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0'
                    }}>
                        <span style={{ 
                            background: isArriving ? '#fff2f0' : '#eff4ff', 
                            color: isArriving ? '#ff4d4f' : '#1a73e8', 
                            padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' 
                        }}>{bus.route_no}</span>
                        <span style={{ color: isArriving ? '#ff4d4f' : '#333', fontWeight: 'bold' }}>
                            {isArriving ? "잠시 후 도착 🚌" : `${bus.remain_min}분 ${String(bus.remain_sec).padStart(2, '0')}초`}
                        </span>
                    </div>
                );
            });
    };

    const styles = {
        container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Pretendard' },
        searchBox: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '10px', fontSize: '16px', boxSizing: 'border-box' },
        grid: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px' },
        card: (isSelected) => ({
            padding: '20px', borderRadius: '16px', background: '#fff',
            border: isSelected ? '2px solid #1a73e8' : '1px solid #eee',
            marginBottom: '15px', position: 'relative', cursor: 'pointer',
            boxShadow: isSelected ? '0 4px 12px rgba(26,115,232,0.1)' : '0 2px 6px rgba(0,0,0,0.02)',
            transition: 'all 0.2s ease'
        }),
        overlayPopup: { position: 'absolute', bottom: '20px', left: '20px', background: '#fff', padding: '20px', borderRadius: '12px', zIndex: 10, width: '260px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid #eee' },
        syncBtn: { padding: '5px 12px', borderRadius: '6px', border: '1px solid #1a73e8', background: '#fff', color: '#1a73e8', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
        addBtn: { width: '100%', marginTop: '15px', background: '#1a73e8', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
    };

    return (
        <div style={styles.container}>
            <div style={{ position: 'relative' }}>
                <input style={styles.searchBox} placeholder="정류장 이름을 검색하세요..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                {searchTerm && (
                    <div style={{ position: 'absolute', top: '58px', left: 0, background: '#fff', zIndex: 100, width: '100%', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        {allStations.filter(s => s.station_name.includes(searchTerm)).slice(0, 6).map(s => (
                            <div key={s.station_id} onClick={() => { handleSelectStation(s); setSearchTerm(''); }} style={{ padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #f9f9f9' }}>📍 {s.station_name}</div>
                        ))}
                    </div>
                )}
            </div>

            <div style={styles.grid}>
                <div style={{ height: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                        <h4 style={{margin: 0, color: '#666'}}>즐겨찾는 정류장</h4>
                        <button onClick={loadData} style={styles.syncBtn}>{isRefreshing ? '🔄' : '🔃 실시간 동기화'}</button>
                    </div>
                    {favorites.map(f => (
                        <div key={f.fav_id} style={styles.card(selectedStation?.station_id === f.station_id)} onClick={() => handleSelectStation(f)}>
                            <button onClick={(e) => handleDelete(e, f.fav_id)} style={{ position: 'absolute', right: '12px', top: '12px', border: 'none', background: 'none', cursor:'pointer', color: '#ccc' }}>✕</button>
                            <h3 style={{marginTop: 0, marginBottom: '12px', fontSize:'16px', color: '#333'}}>{f.station_name}</h3>
                            {renderBusRows(f.arrival_info)}
                        </div>
                    ))}
                </div>
                
                <div style={{ position: 'relative', width: '100%', height: '70vh' }}>
                    <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '16px', border:'1px solid #eee' }}></div>
                    {selectedStation && (
                        <div style={styles.overlayPopup}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px', alignItems:'flex-start'}}>
                                <h4 style={{margin:0, fontSize: '18px', color: '#1a73e8'}}>{selectedStation.station_name}</h4>
                                <button onClick={() => setSelectedStation(null)} style={{border:'none', background:'none', cursor:'pointer', fontSize: '18px', color: '#999'}}>✕</button>
                            </div>
                            <div style={{maxHeight: '200px', overflowY: 'auto'}}>{renderBusRows(searchArrivals)}</div>
                            {!favorites.some(f => f.station_id === selectedStation.station_id) && (
                                <button style={styles.addBtn} onClick={() => handleAddFavorite(selectedStation)}>⭐ 즐겨찾기 추가</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GyeongjuBusDashboard;