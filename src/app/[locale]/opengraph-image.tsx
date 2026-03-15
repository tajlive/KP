import { ImageResponse } from 'next/og';

// Edge required for ImageResponse (OG image). Build warning "disables static generation" is expected.
export const runtime = 'edge';
export const alt = 'Klarpakke - Norges Smarteste Kryptobot';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              margin: '0 0 20px 0',
              textAlign: 'center',
            }}
          >
            Klarpakke
          </h1>
          <p
            style={{
              fontSize: '32px',
              color: '#333',
              margin: '0',
              textAlign: 'center',
            }}
          >
            Norges Smarteste Kryptobot
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
