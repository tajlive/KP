export default {
  name: 'tradeExplanation',
  type: 'document',
  title: 'Trade Forklaring',
  fields: [
    {
      name: 'strategyKey',
      type: 'string',
      title: 'Strategi-nøkkel',
      options: {
        list: [
          { title: 'DCA Smart', value: 'dca_smart' },
          { title: 'Grid Trading', value: 'grid_trading' },
          { title: 'SMA Crossover', value: 'sma_crossover' },
          { title: 'Trend Following', value: 'trend_following' },
          { title: 'Breakout', value: 'breakout' },
          { title: 'Mean Reversion', value: 'mean_reversion' },
          { title: 'Funding Arbitrage', value: 'funding_arbitrage' },
          { title: 'Sentiment Based', value: 'sentiment_based' },
        ],
      },
      validation: (Rule: unknown) => Rule.required(),
    },
    {
      name: 'language',
      type: 'string',
      title: 'Språk',
      options: {
        list: [
          { title: 'Norsk', value: 'no' },
          { title: 'Engelsk', value: 'en' },
        ],
      },
      initialValue: 'no',
    },
    {
      name: 'buyExplanation',
      type: 'text',
      title: 'Kjøp Forklaring',
      description: 'Forklaring for hvorfor strategien kjøper',
      rows: 4,
    },
    {
      name: 'sellExplanation',
      type: 'text',
      title: 'Salg Forklaring',
      description: 'Forklaring for hvorfor strategien selger',
      rows: 4,
    },
    {
      name: 'stopLossExplanation',
      type: 'text',
      title: 'Stop Loss Forklaring',
      rows: 3,
    },
    {
      name: 'takeProfitExplanation',
      type: 'text',
      title: 'Take Profit Forklaring',
      rows: 3,
    },
    {
      name: 'learnMoreUrl',
      type: 'string',
      title: 'Learn More URL',
      description: 'Lenke til kursleksjon',
    },
  ],
};
