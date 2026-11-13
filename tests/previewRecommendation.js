const { recommendPlaces } =
  require('../server/placeRecommendation');

const { origins, meetingPlaces } =
  require('../server/data/places');

function preview(originIds) {
  // 사람마다 출발지를 하나씩 가져옴
  // 같은 출발지를 선택한 사람이 있어도 중복 유지
  const selectedOrigins = originIds.map((id) => {
    const origin = origins.find((item) => item.id === id);

    if (!origin) {
      throw new Error(`등록되지 않은 출발지: ${id}`);
    }

    return origin;
  });

  const recommendations =
    recommendPlaces(selectedOrigins, meetingPlaces);

  console.log(
    '\n출발지:',
    selectedOrigins.map((origin) => origin.name).join(', ')
  );

  console.table(
    recommendations.map((place, index) => ({
      순위: index + 1,
      후보: place.name,
      '중앙값 기준점과의 거리(km)':
        place.distanceKm.toFixed(2)
    }))
  );
}

preview(['kw', 'gangnam']);
preview(['hongik', 'hongik', 'wangsimni']);
preview(['gangnam']);