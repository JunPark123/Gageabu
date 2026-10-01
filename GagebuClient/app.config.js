// app.json에 더해, 파일이 있을 때만 붙는 설정
//  - google-services.json: Firebase(안드로이드 푸시 FCM). 없으면 푸시 없이 빌드된다
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  if (fs.existsSync(path.join(__dirname, 'google-services.json'))) {
    config.android = { ...config.android, googleServicesFile: './google-services.json' };
  }
  return config;
};
