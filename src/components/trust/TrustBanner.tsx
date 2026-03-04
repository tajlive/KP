export default function TrustBanner() {
  return (
    <div className="bg-green-900/20 border border-green-700 rounded-xl p-5 mb-6">
      <div className="flex items-start gap-4">
        <div className="text-3xl flex-shrink-0">🛡️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-green-400 mb-2 text-lg">
            Dine penger er aldri på Klarpakke
          </h3>
          <p className="text-gray-300 leading-relaxed">
            Vi håndterer <strong className="text-white">IKKE</strong> dine penger. Du kobler din Binance-konto via API 
            (kun lese + trade). Uttak er alltid deaktivert. 
            Du har full kontroll til enhver tid.
          </p>
        </div>
      </div>
    </div>
  );
}
