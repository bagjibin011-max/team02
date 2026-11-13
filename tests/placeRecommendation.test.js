const assert = require('node:assert/strict');
const { recommendPlaces } =
  require('../server/placeRecommendation');

const places = [
  { id: 'a', lat: 37.5, lng: 127 },
  { id: 'b', lat: 37.6, lng: 127 },
  { id: 'c', lat: 37.7, lng: 127 },
  { id: 'd', lat: 37.8, lng: 127 }
];

function ids(result) {
  return result.map((place) => place.id);
}

// 1. 출발지가 없으면 추천하지 않음
assert.deepEqual(recommendPlaces([], places), []);

// 2. 가까운 순으로 최대 3곳 추천
assert.deepEqual(
  ids(recommendPlaces([{ lat: 37.5, lng: 127 }], places)),
  ['a', 'b', 'c']
);

// 3. 홀수 인원의 중앙값 사용
assert.equal(
  recommendPlaces([
    { lat: 37.5, lng: 127 },
    { lat: 37.6, lng: 127 },
    { lat: 37.9, lng: 127 }
  ], places)[0].id,
  'b'
);

// 4. 짝수 인원은 가운데 두 값의 평균 사용
assert.equal(
  recommendPlaces([
    { lat: 37.5, lng: 127 },
    { lat: 37.9, lng: 127 }
  ], places)[0].id,
  'c'
);

// 5. 후보가 3곳보다 적으면 있는 만큼 반환
assert.equal(
  recommendPlaces(
    [{ lat: 37.5, lng: 127 }],
    places.slice(0, 2)
  ).length,
  2
);

// 6. 잘못된 좌표 거부
assert.throws(() => {
  recommendPlaces([{ lat: '서울', lng: 127 }], places);
});

// 7. 원본 후보 목록을 변경하지 않음
const before = JSON.stringify(places);
recommendPlaces([{ lat: 37.8, lng: 127 }], places);
assert.equal(JSON.stringify(places), before);

console.log('장소 추천 계산 테스트 7개 통과');