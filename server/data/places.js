// 출발지 목록
// lat: 위도, lng: 경도
const origins = [
  {
    id: 'kw',
    name: '광운대학교',
    lat: 37.619379,
    lng: 127.058263
  },
  {
    id: 'gangnam',
    name: '강남역',
    lat: 37.49799,
    lng: 127.02791
  },
  {
    id: 'hongik',
    name: '홍대입구역',
    lat: 37.55667,
    lng: 126.92361
  },
  {
    id: 'wangsimni',
    name: '왕십리역',
    lat: 37.561194,
    lng: 127.037722
  }
];

// 추천 가능한 지역 목록
// 우선 역 주변을 대표 지점으로 사용
const meetingPlaces = [
  {
    id: 'gangnam-area',
    name: '강남역 주변',
    lat: 37.49799,
    lng: 127.02791,
    features: '강남역 주변에서 만날 장소를 선택하는 후보입니다.'
  },
  {
    id: 'hongik-area',
    name: '홍대입구역 주변',
    lat: 37.55667,
    lng: 126.92361,
    features: '홍대입구역 주변에서 만날 장소를 선택하는 후보입니다.'
  },
  {
    id: 'wangsimni-area',
    name: '왕십리역 주변',
    lat: 37.561194,
    lng: 127.037722,
    features: '왕십리역 주변에서 만날 장소를 선택하는 후보입니다.'
  },
  {
    id: 'konkuk-area',
    name: '건대입구역 주변',
    lat: 37.54037,
    lng: 127.06919,
    features: '건대입구역 주변에서 만날 장소를 선택하는 후보입니다.'
  },
  {
    id: 'hyehwa-area',
    name: '혜화역 주변',
    lat: 37.58234,
    lng: 127.00184,
    features: '혜화역 주변에서 만날 장소를 선택하는 후보입니다.'
  }
];

// 좌표 참고 자료
// 광운대학교:
// https://vsi.purpleo.co.kr/view/51
// 홍대입구역:
// https://en.wikipedia.org/wiki/Hongik_University_station
// 왕십리역:
// https://en.wikipedia.org/wiki/Wangsimni_station
// 강남역, 건대입구역, 혜화역:
// https://github.com/daehyub71/seoul-subway-insight/blob/main/docs/STATION_COORDS.md

module.exports = { origins, meetingPlaces };