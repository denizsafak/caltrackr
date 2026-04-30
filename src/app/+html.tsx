import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

const INTER_FONT_CSS = `
@font-face {
  font-family: 'Inter_400Regular';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-Regular.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter_500Medium';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-Medium.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter_600SemiBold';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-SemiBold.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter_700Bold';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-Bold.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter_800ExtraBold';
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-ExtraBold.woff2') format('woff2');
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <style dangerouslySetInnerHTML={{ __html: INTER_FONT_CSS }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
