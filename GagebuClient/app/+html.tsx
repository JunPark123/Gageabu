// 웹(정적 빌드) 페이지의 <head> — 홈 화면에 추가했을 때 앱처럼 열리도록 (PWA). 폰 앱에는 영향 없음
import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* 아이폰 노치·홈 바 영역까지 쓰고(viewport-fit), 입력할 때 화면이 확대되지 않게 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <title>부자돼지</title>
        <meta name="description" content="함께 쓰고, 함께 모아가는 우리의 가계부" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FFF9F2" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#131110" media="(prefers-color-scheme: dark)" />
        {/* 아이폰 "홈 화면에 추가" */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="부자돼지" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <ScrollViewStyleReset />
        {/* 앱 화면이 뜨기 전 잠깐 보이는 배경도 앱 색으로 */}
        <style dangerouslySetInnerHTML={{ __html: BACKGROUND }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const BACKGROUND = `
body { background-color: #FFF9F2; }
@media (prefers-color-scheme: dark) { body { background-color: #131110; } }
`;
