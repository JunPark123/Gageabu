// Metro 설정: Expo 기본값 + 번들 캐시 위치만 변경
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// 기본값은 OS 임시 폴더(C 드라이브). 프로젝트 안에 두어 C 드라이브에 남지 않게 한다.
config.cacheStores = [new FileStore({ root: path.join(__dirname, '.metro-cache') })];

module.exports = config;
