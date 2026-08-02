self.__BUILD_MANIFEST = {
  "__rewrites": {
    "afterFiles": [
      {
        "source": "/api/paper-trading/:path*",
        "destination": "/api/paper-trading/:path*"
      },
      {
        "source": "/leksjon/:lessonId",
        "destination": "/leksjon/[lessonId]"
      }
    ],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/_app",
    "/_error"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()