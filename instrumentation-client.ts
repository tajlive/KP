// import * as Sentry from '@sentry/nextjs';
//
// Sentry.init({
//   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
//   environment: process.env.NODE_ENV,
//   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
//   debug: false,
//   integrations: [
//     Sentry.replayIntegration({
//       maskAllText: true,
//       blockAllMedia: true,
//     }),
//   ],
//   replaysSessionSampleRate: 0.1,
//   replaysOnErrorSampleRate: 1.0,
//   beforeSend(event) {
//     if (event.extra?.api_key) delete event.extra.api_key;
//     if (event.extra?.api_secret) delete event.extra.api_secret;
//     if (event.extra?.balance) delete event.extra.balance;
//     if (event.extra?.password) delete event.extra.password;
//     if (event.extra?.token) delete event.extra.token;
//     if (event.user?.email) delete event.user.email;
//     return event;
//   },
// });
//
// // Required by Sentry to instrument client-side navigations
// export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
