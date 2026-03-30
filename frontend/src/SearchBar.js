import React, { useState } from 'react';

const SearchBar = ({ stations, onSelectStation }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 검색어에 맞는 정류장 필터링
  const filtered = stations.filter(s => 
    s.station_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ position: 'relative', marginBottom: '20px', width: '100%' }}>
      <input 
        type="text" 
        placeholder="정류장 이름을 검색하세요 (예: 경주역)" 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          fontSize: '16px'
        }}
      />
      
      {/* 검색 결과 리스트 */}
      {searchTerm && filtered.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '0 0 8px 8px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
          listStyle: 'none',
          padding: 0,
          margin: 0,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {filtered.map(s => (
            <li 
              key={s.station_id} 
              onClick={() => {
                onSelectStation(s);
                setSearchTerm(''); // 선택 후 검색창 비우기
              }}
              style={{
                padding: '10px 15px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {/* 영문 DB 이름 대응 */}
              {s.station_name === 'Gyeongju_Station' ? '경주역' : s.station_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;