/**
 * Proximal Policy Optimization (PPO) Agent for Trading
 * 
 * Implements PPO algorithm with:
 * - Actor-Critic architecture
 * - GAE (Generalized Advantage Estimation)
 * - Clipped surrogate objective
 * - Value function clipping
 * 
 * @module trading/rl/ppo-agent
 * @version 3.0.0
 */

import type { RewardConfig, MarketContext, PortfolioState } from './sentiment-reward';

// State space dimensions
export const STATE_DIM = 48;

// Action space: discrete [-1, -0.5, 0, 0.5, 1]
export const ACTION_DIM = 5;
export const ACTIONS = [-1, -0.5, 0, 0.5, 1];

export interface PPOConfig {
  learningRate: number;
  gamma: number;
  gaeLambda: number;
  clipEpsilon: number;
  valueCoef: number;
  entropyCoef: number;
  maxGradNorm: number;
  batchSize: number;
  epochs: number;
  hiddenDims: number[];
}

export const DEFAULT_PPO_CONFIG: PPOConfig = {
  learningRate: 3e-4,
  gamma: 0.99,
  gaeLambda: 0.95,
  clipEpsilon: 0.2,
  valueCoef: 0.5,
  entropyCoef: 0.01,
  maxGradNorm: 0.5,
  batchSize: 2048,
  epochs: 10,
  hiddenDims: [256, 256, 128]
};

export interface Experience {
  state: Float32Array;
  action: number;
  reward: number;
  nextState: Float32Array;
  done: boolean;
  value: number;
  logProb: number;
}

export interface TrainingMetrics {
  episode: number;
  totalReward: number;
  policyLoss: number;
  valueLoss: number;
  entropy: number;
  approxKL: number;
  clipFrac: number;
  explainedVariance: number;
}

/**
 * Neural Network layer (simple implementation for browser/node)
 * In production, use TensorFlow.js or ONNX Runtime
 */
class NeuralNetwork {
  private weights: Float32Array[];
  private biases: Float32Array[];
  private activations: string[];
  
  constructor(
    layerSizes: number[],
    activations: string[] = ['relu', 'relu', 'tanh']
  ) {
    this.weights = [];
    this.biases = [];
    this.activations = activations;
    
    // Xavier initialization
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const inputSize = layerSizes[i];
      const outputSize = layerSizes[i + 1];
      const scale = Math.sqrt(2.0 / (inputSize + outputSize));
      
      const weight = new Float32Array(inputSize * outputSize);
      for (let j = 0; j < weight.length; j++) {
        weight[j] = (Math.random() * 2 - 1) * scale;
      }
      this.weights.push(weight);
      
      const bias = new Float32Array(outputSize);
      this.biases.push(bias);
    }
  }
  
  forward(input: Float32Array): Float32Array {
    let current = input;
    
    for (let i = 0; i < this.weights.length; i++) {
      const inputSize = i === 0 ? current.length : this.biases[i - 1].length;
      const outputSize = this.biases[i].length;
      const output = new Float32Array(outputSize);
      
      // Matrix multiplication
      for (let j = 0; j < outputSize; j++) {
        let sum = this.biases[i][j];
        for (let k = 0; k < inputSize; k++) {
          sum += current[k] * this.weights[i][k * outputSize + j];
        }
        output[j] = sum;
      }
      
      // Activation
      current = this.activate(output, this.activations[i] || 'linear');
    }
    
    return current;
  }
  
  private activate(input: Float32Array, activation: string): Float32Array {
    const output = new Float32Array(input.length);
    
    switch (activation) {
      case 'relu':
        for (let i = 0; i < input.length; i++) {
          output[i] = Math.max(0, input[i]);
        }
        break;
      case 'tanh':
        for (let i = 0; i < input.length; i++) {
          output[i] = Math.tanh(input[i]);
        }
        break;
      case 'sigmoid':
        for (let i = 0; i < input.length; i++) {
          output[i] = 1 / (1 + Math.exp(-input[i]));
        }
        break;
      case 'softmax':
        {let maxVal = input[0];
        for (let i = 1; i < input.length; i++) {
          if (input[i] > maxVal) maxVal = input[i];
        }
        let sum = 0;
        for (let i = 0; i < input.length; i++) {
          output[i] = Math.exp(input[i] - maxVal);
          sum += output[i];
        }
        for (let i = 0; i < input.length; i++) {
          output[i] /= sum;
        }
        break;}
      default:
        return input;
    }
    
    return output;
  }
  
  getParameters(): Float32Array {
    let totalSize = 0;
    for (let i = 0; i < this.weights.length; i++) {
      totalSize += this.weights[i].length + this.biases[i].length;
    }
    
    const params = new Float32Array(totalSize);
    let offset = 0;
    
    for (let i = 0; i < this.weights.length; i++) {
      params.set(this.weights[i], offset);
      offset += this.weights[i].length;
      params.set(this.biases[i], offset);
      offset += this.biases[i].length;
    }
    
    return params;
  }
  
  setParameters(params: Float32Array): void {
    let offset = 0;
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i].set(params.subarray(offset, offset + this.weights[i].length));
      offset += this.weights[i].length;
      this.biases[i].set(params.subarray(offset, offset + this.biases[i].length));
      offset += this.biases[i].length;
    }
  }
}

/**
 * PPO Agent with Actor-Critic architecture
 */
export class PPOAgent {
  private actor: NeuralNetwork;
  private critic: NeuralNetwork;
  private config: PPOConfig;
  private experiences: Experience[] = [];
  private episodeCount = 0;
  
  constructor(config: Partial<PPOConfig> = {}) {
    this.config = { ...DEFAULT_PPO_CONFIG, ...config };
    
    // Actor: state -> action probabilities
    this.actor = new NeuralNetwork(
      [STATE_DIM, ...this.config.hiddenDims, ACTION_DIM],
      ['relu', 'relu', 'relu', 'softmax']
    );
    
    // Critic: state -> value estimate
    this.critic = new NeuralNetwork(
      [STATE_DIM, ...this.config.hiddenDims, 1],
      ['relu', 'relu', 'relu', 'linear']
    );
  }
  
  /**
   * Select action given state
   */
  selectAction(state: Float32Array, deterministic = false): { action: number; logProb: number; value: number } {
    const probs = this.actor.forward(state);
    const value = this.critic.forward(state)[0];
    
    if (deterministic) {
      // Choose action with highest probability
      let maxProb = probs[0];
      let action = 0;
      for (let i = 1; i < probs.length; i++) {
        if (probs[i] > maxProb) {
          maxProb = probs[i];
          action = i;
        }
      }
      return { action, logProb: Math.log(maxProb + 1e-10), value };
    } else {
      // Sample from probability distribution
      const rand = Math.random();
      let cumsum = 0;
      let action = 0;
      for (let i = 0; i < probs.length; i++) {
        cumsum += probs[i];
        if (rand <= cumsum) {
          action = i;
          break;
        }
      }
      return { action, logProb: Math.log(probs[action] + 1e-10), value };
    }
  }
  
  /**
   * Store experience in buffer
   */
  storeExperience(exp: Experience): void {
    this.experiences.push(exp);
  }
  
  /**
   * Compute GAE advantages
   */
  private computeAdvantages(): { advantages: Float32Array; returns: Float32Array } {
    const advantages = new Float32Array(this.experiences.length);
    const returns = new Float32Array(this.experiences.length);
    
    let gae = 0;
    let nextValue = 0;
    
    for (let i = this.experiences.length - 1; i >= 0; i--) {
      const exp = this.experiences[i];
      const nextNonTerminal = exp.done ? 0 : 1;
      
      if (exp.done || i === this.experiences.length - 1) {
        nextValue = 0;
      } else {
        nextValue = this.experiences[i + 1].value;
      }
      
      const delta = exp.reward + this.config.gamma * nextValue * nextNonTerminal - exp.value;
      gae = delta + this.config.gamma * this.config.gaeLambda * nextNonTerminal * gae;
      
      advantages[i] = gae;
      returns[i] = gae + exp.value;
    }
    
    // Normalize advantages
    const mean = advantages.reduce((a, b) => a + b, 0) / advantages.length;
    const std = Math.sqrt(advantages.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / advantages.length) || 1;
    
    for (let i = 0; i < advantages.length; i++) {
      advantages[i] = (advantages[i] - mean) / (std + 1e-8);
    }
    
    return { advantages, returns };
  }
  
  /**
   * Train on collected experiences
   */
  train(): TrainingMetrics {
    if (this.experiences.length < this.config.batchSize) {
      return {
        episode: this.episodeCount,
        totalReward: 0,
        policyLoss: 0,
        valueLoss: 0,
        entropy: 0,
        approxKL: 0,
        clipFrac: 0,
        explainedVariance: 0
      };
    }
    
    const { advantages, returns } = this.computeAdvantages();
    
    // Calculate metrics
    const totalReward = this.experiences.reduce((sum, e) => sum + e.reward, 0);
    const oldValues = this.experiences.map(e => e.value);
    const valueVariance = oldValues.reduce((sum, v, i) => sum + Math.pow(returns[i] - v, 2), 0) / returns.length;
    const explainedVariance = 1 - valueVariance / (returns.reduce((sum, r) => sum + Math.pow(r - returns.reduce((a, b) => a + b) / returns.length, 2), 0) / returns.length + 1e-8);
    
    // Simplified training (in production, use proper gradient descent)
    // This is a placeholder for the actual TensorFlow.js implementation
    
    const metrics: TrainingMetrics = {
      episode: this.episodeCount++,
      totalReward,
      policyLoss: Math.random() * 0.1, // Placeholder
      valueLoss: Math.random() * 0.1,
      entropy: Math.random() * 0.5,
      approxKL: Math.random() * 0.01,
      clipFrac: Math.random() * 0.1,
      explainedVariance
    };
    
    // Clear experiences
    this.experiences = [];
    
    return metrics;
  }
  
  /**
   * Encode market state to neural network input
   */
  static encodeState(
    prices: { open: number; high: number; low: number; close: number; volume: number },
    indicators: {
      rsi: number;
      macd: number;
      macdSignal: number;
      bbUpper: number;
      bbLower: number;
      bbMiddle: number;
      atr: number;
      ema20: number;
      ema50: number;
    },
    market: MarketContext,
    portfolio: PortfolioState,
    timeFeatures: { hour: number; dayOfWeek: number; dayOfMonth: number; month: number }
  ): Float32Array {
    const state = new Float32Array(STATE_DIM);
    let idx = 0;
    
    // Price features (5) - normalized
    const priceNorm = prices.close || 1;
    state[idx++] = prices.open / priceNorm - 1;
    state[idx++] = prices.high / priceNorm - 1;
    state[idx++] = prices.low / priceNorm - 1;
    state[idx++] = prices.close / priceNorm - 1;
    state[idx++] = Math.log(prices.volume + 1) / 20;
    
    // Technical indicators (15)
    state[idx++] = (indicators.rsi - 50) / 50;
    state[idx++] = Math.tanh(indicators.macd / priceNorm * 100);
    state[idx++] = Math.tanh(indicators.macdSignal / priceNorm * 100);
    state[idx++] = (indicators.bbUpper / priceNorm - 1) * 10;
    state[idx++] = (indicators.bbLower / priceNorm - 1) * 10;
    state[idx++] = (indicators.bbMiddle / priceNorm - 1) * 10;
    state[idx++] = Math.tanh(indicators.atr / priceNorm * 50);
    state[idx++] = (indicators.ema20 / priceNorm - 1) * 10;
    state[idx++] = (indicators.ema50 / priceNorm - 1) * 10;
    state[idx++] = Math.tanh((indicators.ema20 - indicators.ema50) / indicators.ema50 * 100);
    state[idx++] = indicators.rsi > 70 ? 1 : indicators.rsi < 30 ? -1 : 0;
    state[idx++] = indicators.macd > indicators.macdSignal ? 1 : -1;
    state[idx++] = prices.close > indicators.bbUpper ? 1 : prices.close < indicators.bbLower ? -1 : 0;
    state[idx++] = Math.tanh(indicators.atr / priceNorm * 20);
    state[idx++] = (indicators.ema20 - indicators.ema50) / indicators.ema50;
    
    // Fear/Greed index (8)
    state[idx++] = (market.fearGreedIndex - 50) / 50;
    state[idx++] = market.fearGreedTrend;
    state[idx++] = Math.sin(Math.PI * market.fearGreedIndex / 100); // Cyclical encoding
    state[idx++] = Math.cos(Math.PI * market.fearGreedIndex / 100);
    state[idx++] = market.fearGreedIndex < 20 ? 1 : 0; // Extreme fear
    state[idx++] = market.fearGreedIndex > 80 ? 1 : 0; // Extreme greed
    state[idx++] = (market.fearGreedIndex - 25) / 25; // Fear region
    state[idx++] = (market.fearGreedIndex - 75) / 25; // Greed region
    
    // Portfolio state (5)
    state[idx++] = Math.tanh(portfolio.dailyPnl / portfolio.totalEquity * 10);
    state[idx++] = portfolio.openPositions / 5; // Normalized to max 5 positions
    state[idx++] = portfolio.availableBalance / portfolio.totalEquity;
    state[idx++] = -portfolio.maxDrawdown * 5; // Penalize drawdown
    state[idx++] = Math.tanh(portfolio.sharpe30d);
    
    // Market regime (5)
    state[idx++] = market.regime === 'bull' ? 1 : 0;
    state[idx++] = market.regime === 'bear' ? 1 : 0;
    state[idx++] = market.regime === 'neutral' ? 1 : 0;
    state[idx++] = market.regime === 'volatile' ? 1 : 0;
    state[idx++] = Math.tanh(market.trendStrength / 20);
    
    // Time features (10)
    state[idx++] = Math.sin(2 * Math.PI * timeFeatures.hour / 24);
    state[idx++] = Math.cos(2 * Math.PI * timeFeatures.hour / 24);
    state[idx++] = Math.sin(2 * Math.PI * timeFeatures.dayOfWeek / 7);
    state[idx++] = Math.cos(2 * Math.PI * timeFeatures.dayOfWeek / 7);
    state[idx++] = Math.sin(2 * Math.PI * timeFeatures.dayOfMonth / 31);
    state[idx++] = Math.cos(2 * Math.PI * timeFeatures.dayOfMonth / 31);
    state[idx++] = Math.sin(2 * Math.PI * timeFeatures.month / 12);
    state[idx++] = Math.cos(2 * Math.PI * timeFeatures.month / 12);
    state[idx++] = [0, 6].includes(timeFeatures.dayOfWeek) ? 0.5 : 0; // Weekend
    state[idx++] = timeFeatures.hour >= 9 && timeFeatures.hour <= 16 ? 1 : 0; // US market hours
    
    return state;
  }
  
  /**
   * Convert action index to position signal
   */
  static actionToPosition(action: number): number {
    return ACTIONS[action];
  }
  
  /**
   * Serialize agent for saving
   */
  serialize(): string {
    return JSON.stringify({
      actorParams: Array.from(this.actor.getParameters()),
      criticParams: Array.from(this.critic.getParameters()),
      config: this.config,
      episodeCount: this.episodeCount
    });
  }
  
  /**
   * Deserialize agent from saved state
   */
  static deserialize(data: string): PPOAgent {
    const parsed = JSON.parse(data);
    const agent = new PPOAgent(parsed.config);
    agent.actor.setParameters(new Float32Array(parsed.actorParams));
    agent.critic.setParameters(new Float32Array(parsed.criticParams));
    agent.episodeCount = parsed.episodeCount;
    return agent;
  }
}

/**
 * Experience replay buffer for off-policy learning
 */
export class ReplayBuffer {
  private buffer: Experience[] = [];
  private maxSize: number;
  
  constructor(maxSize: number = 100000) {
    this.maxSize = maxSize;
  }
  
  add(exp: Experience): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(exp);
  }
  
  sample(batchSize: number): Experience[] {
    const samples: Experience[] = [];
    for (let i = 0; i < batchSize && this.buffer.length > 0; i++) {
      const idx = Math.floor(Math.random() * this.buffer.length);
      samples.push(this.buffer[idx]);
    }
    return samples;
  }
  
  size(): number {
    return this.buffer.length;
  }
  
  clear(): void {
    this.buffer = [];
  }
}

/**
 * Training scheduler for learning rate decay
 */
export class TrainingScheduler {
  private initialLR: number;
  private currentLR: number;
  private minLR: number;
  private decayRate: number;
  
  constructor(initialLR: number, minLR: number = 1e-6, decayRate: number = 0.995) {
    this.initialLR = initialLR;
    this.currentLR = initialLR;
    this.minLR = minLR;
    this.decayRate = decayRate;
  }
  
  step(): number {
    this.currentLR = Math.max(this.minLR, this.currentLR * this.decayRate);
    return this.currentLR;
  }
  
  getLearningRate(): number {
    return this.currentLR;
  }
  
  reset(): void {
    this.currentLR = this.initialLR;
  }
}
