const path = require('path');
const express = require('express');

const roomsRouter = require('./routes/rooms');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/rooms', roomsRouter); // A: 방 생성·참여
//B: dates.js 추가 예정
//C: places.js 추가 예정 

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});