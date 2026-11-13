// 숫자 배열의 중앙값
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

// 두 좌표 사이의 직선거리 근삿값(km)
// 서울 주변의 가까운 지역을 비교하는 용도
function distanceKm(a, b) {
  const averageLatitude = (a.lat + b.lat) / 2;
  const radians = averageLatitude * Math.PI / 180;

  const northSouth = (a.lat - b.lat) * 111.32;
  const eastWest =
    (a.lng - b.lng) * 111.32 * Math.cos(radians);

  return Math.sqrt(
    northSouth * northSouth + eastWest * eastWest
  );
}

function isValidCoordinate(point) {
  return point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 && point.lat <= 90 &&
    point.lng >= -180 && point.lng <= 180;
}

function recommendPlaces(origins, places) {
  if (!Array.isArray(origins) || !Array.isArray(places)) {
    throw new Error('출발지와 후보 목록은 배열이어야 합니다.');
  }

  if (!origins.every(isValidCoordinate) ||
      !places.every(isValidCoordinate)) {
    throw new Error('올바른 위도와 경도가 필요합니다.');
  }

  if (origins.length === 0 || places.length === 0) {
    return [];
  }

  const center = {
    lat: median(origins.map((origin) => origin.lat)),
    lng: median(origins.map((origin) => origin.lng))
  };

  return places
    .map((place, index) => ({
      ...place,
      distanceKm: distanceKm(center, place),
      originalIndex: index
    }))
    .sort((a, b) =>
      a.distanceKm - b.distanceKm ||
      a.originalIndex - b.originalIndex
    )
    .slice(0, 3)
    .map(({ originalIndex, ...place }) => place);
}

module.exports = { recommendPlaces };