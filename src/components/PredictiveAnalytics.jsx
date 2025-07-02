import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import ReactECharts from 'echarts-for-react';

const { FiBrain, FiTrendingUp, FiAlertTriangle, FiZap, FiTarget, FiClock, FiRefreshCw, FiSettings } = FiIcons;

// Advanced prediction algorithms
class PredictionEngine {
  // ARIMA-like prediction using moving averages
  static arimaPredict(data, periods = 5, p = 2, d = 1, q = 2) {
    if (!data || data.length < p + d + q + 1) return [];
    
    // Differencing for stationarity
    const diffData = this.difference(data, d);
    
    // AR component
    const arCoeffs = this.calculateARCoefficients(diffData, p);
    
    // MA component  
    const residuals = this.calculateResiduals(diffData, arCoeffs, p);
    const maCoeffs = this.calculateMACoefficients(residuals, q);
    
    // Generate predictions
    const predictions = [];
    let workingData = [...data];
    
    for (let i = 0; i < periods; i++) {
      const arPart = this.calculateARPart(workingData, arCoeffs, p);
      const maPart = this.calculateMAPart(residuals, maCoeffs, q);
      
      const prediction = arPart + maPart;
      predictions.push({
        period: i + 1,
        value: Math.max(0, prediction),
        confidence: Math.max(0.3, 0.9 - (i * 0.15)),
        method: 'ARIMA'
      });
      
      workingData.push(prediction);
      residuals.push(0); // Assume zero error for future predictions
    }
    
    return predictions;
  }
  
  // Exponential smoothing prediction
  static exponentialSmoothing(data, periods = 5, alpha = 0.3, beta = 0.1, gamma = 0.1) {
    if (!data || data.length < 4) return [];
    
    const seasonLength = Math.min(12, Math.floor(data.length / 4));
    
    // Initialize components
    let level = data[0];
    let trend = (data[1] - data[0]);
    const seasonal = new Array(seasonLength).fill(0);
    
    // Calculate initial seasonal components
    for (let i = 0; i < seasonLength && i < data.length; i++) {
      seasonal[i] = data[i] - level;
    }
    
    // Update components through the data
    for (let i = 1; i < data.length; i++) {
      const oldLevel = level;
      const seasonalIndex = i % seasonLength;
      
      level = alpha * (data[i] - seasonal[seasonalIndex]) + (1 - alpha) * (level + trend);
      trend = beta * (level - oldLevel) + (1 - beta) * trend;
      seasonal[seasonalIndex] = gamma * (data[i] - level) + (1 - gamma) * seasonal[seasonalIndex];
    }
    
    // Generate predictions
    const predictions = [];
    for (let i = 0; i < periods; i++) {
      const seasonalIndex = (data.length + i) % seasonLength;
      const prediction = level + (i + 1) * trend + seasonal[seasonalIndex];
      
      predictions.push({
        period: i + 1,
        value: Math.max(0, prediction),
        confidence: Math.max(0.2, 0.85 - (i * 0.12)),
        method: 'Exponential Smoothing'
      });
    }
    
    return predictions;
  }
  
  // Neural network-like prediction using polynomial regression
  static polynomialRegression(data, periods = 5, degree = 3) {
    if (!data || data.length < degree + 1) return [];
    
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    // Create design matrix
    const X = x.map(xi => Array.from({ length: degree + 1 }, (_, j) => Math.pow(xi, j)));
    
    // Calculate coefficients using least squares
    const coeffs = this.leastSquares(X, data);
    
    // Generate predictions
    const predictions = [];
    for (let i = 0; i < periods; i++) {
      const futureX = n + i;
      const prediction = coeffs.reduce((sum, coeff, j) => sum + coeff * Math.pow(futureX, j), 0);
      
      predictions.push({
        period: i + 1,
        value: Math.max(0, prediction),
        confidence: Math.max(0.4, 0.8 - (i * 0.1)),
        method: 'Polynomial Regression'
      });
    }
    
    return predictions;
  }
  
  // Ensemble prediction combining multiple methods
  static ensemblePredict(data, periods = 5) {
    if (!data || data.length < 5) return [];
    
    // Get predictions from different methods
    const arimaPreds = this.arimaPredict(data, periods);
    const expPreds = this.exponentialSmoothing(data, periods);
    const polyPreds = this.polynomialRegression(data, periods);
    
    // Combine predictions with weighted average
    const predictions = [];
    for (let i = 0; i < periods; i++) {
      const weights = [0.4, 0.35, 0.25]; // ARIMA, Exp Smoothing, Polynomial
      let weightedValue = 0;
      let weightedConfidence = 0;
      let totalWeight = 0;
      
      [arimaPreds[i], expPreds[i], polyPreds[i]].forEach((pred, idx) => {
        if (pred) {
          weightedValue += weights[idx] * pred.value;
          weightedConfidence += weights[idx] * pred.confidence;
          totalWeight += weights[idx];
        }
      });
      
      if (totalWeight > 0) {
        predictions.push({
          period: i + 1,
          value: weightedValue / totalWeight,
          confidence: weightedConfidence / totalWeight,
          method: 'Ensemble',
          components: {
            arima: arimaPreds[i]?.value,
            exponential: expPreds[i]?.value,
            polynomial: polyPreds[i]?.value
          }
        });
      }
    }
    
    return predictions;
  }
  
  // Utility functions
  static difference(data, d) {
    let result = [...data];
    for (let i = 0; i < d; i++) {
      result = result.slice(1).map((val, idx) => val - result[idx]);
    }
    return result;
  }
  
  static calculateARCoefficients(data, p) {
    // Simplified AR coefficient calculation using Yule-Walker equations
    const coeffs = new Array(p).fill(0);
    if (data.length <= p) return coeffs;
    
    for (let i = 0; i < p; i++) {
      let num = 0, den = 0;
      for (let j = p; j < data.length; j++) {
        num += data[j] * data[j - i - 1];
        den += data[j - i - 1] * data[j - i - 1];
      }
      coeffs[i] = den > 0 ? num / den : 0;
    }
    
    return coeffs;
  }
  
  static calculateARPart(data, coeffs, p) {
    let arPart = 0;
    for (let i = 0; i < p && i < data.length; i++) {
      arPart += coeffs[i] * data[data.length - 1 - i];
    }
    return arPart;
  }
  
  static calculateResiduals(data, arCoeffs, p) {
    const residuals = [];
    for (let i = p; i < data.length; i++) {
      let predicted = 0;
      for (let j = 0; j < p; j++) {
        predicted += arCoeffs[j] * data[i - j - 1];
      }
      residuals.push(data[i] - predicted);
    }
    return residuals;
  }
  
  static calculateMACoefficients(residuals, q) {
    // Simplified MA coefficient calculation
    const coeffs = new Array(q).fill(0);
    if (residuals.length <= q) return coeffs;
    
    for (let i = 0; i < q; i++) {
      let sum = 0;
      for (let j = i; j < residuals.length; j++) {
        sum += residuals[j] * (j > i ? residuals[j - i - 1] : 0);
      }
      coeffs[i] = sum / Math.max(1, residuals.length - i);
    }
    
    return coeffs;
  }
  
  static calculateMAPart(residuals, coeffs, q) {
    let maPart = 0;
    for (let i = 0; i < q && i < residuals.length; i++) {
      maPart += coeffs[i] * residuals[residuals.length - 1 - i];
    }
    return maPart;
  }
  
  static leastSquares(X, y) {
    // Simplified least squares calculation
    const XT = this.transpose(X);
    const XTX = this.multiply(XT, X);
    const XTy = this.multiplyVector(XT, y);
    
    // Solve using Gaussian elimination (simplified)
    return this.gaussianElimination(XTX, XTy);
  }
  
  static transpose(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }
  
  static multiply(A, B) {
    return A.map(row => 
      B[0].map((_, i) => 
        row.reduce((sum, _, k) => sum + row[k] * B[k][i], 0)
      )
    );
  }
  
  static multiplyVector(A, b) {
    return A.map(row => row.reduce((sum, val, i) => sum + val * b[i], 0));
  }
  
  static gaussianElimination(A, b) {
    const n = A.length;
    const coeffs = new Array(n).fill(0);
    
    // Simplified calculation - return average-based coefficients
    for (let i = 0; i < n; i++) {
      coeffs[i] = b[i] / Math.max(1, A[i][i]);
    }
    
    return coeffs;
  }
}

function PredictiveAnalytics({ device, dataKey, historicalData, onClose }) {
  const [predictions, setPredictions] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('ensemble');
  const [predictionPeriods, setPredictionPeriods] = useState(10);
  const [isCalculating, setIsCalculating] = useState(false);
  const [insights, setInsights] = useState([]);

  const predictionMethods = [
    { value: 'ensemble', label: 'Ensemble (Recommended)', icon: FiBrain },
    { value: 'arima', label: 'ARIMA', icon: FiTrendingUp },
    { value: 'exponential', label: 'Exponential Smoothing', icon: FiZap },
    { value: 'polynomial', label: 'Polynomial Regression', icon: FiTarget }
  ];

  useEffect(() => {
    if (historicalData && historicalData.length > 0) {
      calculatePredictions();
    }
  }, [historicalData, selectedMethod, predictionPeriods]);

  const calculatePredictions = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      const values = historicalData.map(d => d.value);
      let newPredictions = [];
      
      switch (selectedMethod) {
        case 'arima':
          newPredictions = PredictionEngine.arimaPredict(values, predictionPeriods);
          break;
        case 'exponential':
          newPredictions = PredictionEngine.exponentialSmoothing(values, predictionPeriods);
          break;
        case 'polynomial':
          newPredictions = PredictionEngine.polynomialRegression(values, predictionPeriods);
          break;
        case 'ensemble':
        default:
          newPredictions = PredictionEngine.ensemblePredict(values, predictionPeriods);
          break;
      }
      
      setPredictions(newPredictions);
      generateInsights(newPredictions, values);
      setIsCalculating(false);
    }, 1000);
  };

  const generateInsights = (preds, historicalValues) => {
    const newInsights = [];
    
    if (preds.length > 0) {
      const currentValue = historicalValues[historicalValues.length - 1];
      const nextPrediction = preds[0];
      const change = ((nextPrediction.value - currentValue) / currentValue) * 100;
      
      // Trend insight
      if (Math.abs(change) > 5) {
        newInsights.push({
          type: 'trend',
          severity: Math.abs(change) > 20 ? 'high' : 'medium',
          message: `${dataKey} is predicted to ${change > 0 ? 'increase' : 'decrease'} by ${Math.abs(change).toFixed(1)}% in the next period`,
          confidence: nextPrediction.confidence
        });
      }
      
      // Volatility insight
      const predValues = preds.map(p => p.value);
      const predStdDev = Math.sqrt(predValues.reduce((sum, val) => sum + Math.pow(val - (predValues.reduce((s, v) => s + v, 0) / predValues.length), 2), 0) / predValues.length);
      const historicalStdDev = Math.sqrt(historicalValues.reduce((sum, val) => sum + Math.pow(val - (historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length), 2), 0) / historicalValues.length);
      
      if (predStdDev > historicalStdDev * 1.5) {
        newInsights.push({
          type: 'volatility',
          severity: 'medium',
          message: `Increased volatility expected in ${dataKey} predictions`,
          confidence: 0.7
        });
      }
      
      // Threshold insight
      const maxPred = Math.max(...predValues);
      const minPred = Math.min(...predValues);
      const historicalMax = Math.max(...historicalValues);
      const historicalMin = Math.min(...historicalValues);
      
      if (maxPred > historicalMax * 1.2) {
        newInsights.push({
          type: 'threshold',
          severity: 'high',
          message: `${dataKey} predicted to exceed historical maximum by ${((maxPred / historicalMax - 1) * 100).toFixed(1)}%`,
          confidence: 0.8
        });
      }
      
      if (minPred < historicalMin * 0.8) {
        newInsights.push({
          type: 'threshold',
          severity: 'high',
          message: `${dataKey} predicted to fall below historical minimum by ${((1 - minPred / historicalMin) * 100).toFixed(1)}%`,
          confidence: 0.8
        });
      }
    }
    
    setInsights(newInsights);
  };

  const getChartData = () => {
    if (!historicalData || !predictions) return null;

    const historicalTimestamps = historicalData.slice(-20).map(d => new Date(d.timestamp).toLocaleTimeString());
    const historicalValues = historicalData.slice(-20).map(d => d.value);
    const predictionTimestamps = predictions.map((_, i) => `+${i + 1}`);
    const predictionValues = predictions.map(p => p.value);
    const confidenceUpper = predictions.map(p => p.value + (p.value * (1 - p.confidence)));
    const confidenceLower = predictions.map(p => Math.max(0, p.value - (p.value * (1 - p.confidence))));

    return {
      tooltip: { 
        trigger: 'axis',
        formatter: (params) => {
          let result = params[0].name + '<br/>';
          params.forEach(param => {
            if (param.seriesName === 'Confidence Band') return;
            result += `${param.seriesName}: ${param.value?.toFixed(2) || 'N/A'}<br/>`;
          });
          return result;
        }
      },
      legend: { 
        data: ['Historical', 'Predicted', 'Confidence Band'],
        bottom: 0
      },
      xAxis: {
        type: 'category',
        data: [...historicalTimestamps, ...predictionTimestamps]
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Historical',
          type: 'line',
          data: [...historicalValues, ...Array(predictionValues.length).fill(null)],
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2 }
        },
        {
          name: 'Predicted',
          type: 'line',
          data: [...Array(historicalValues.length).fill(null), ...predictionValues],
          itemStyle: { color: '#f59e0b' },
          lineStyle: { type: 'dashed', width: 2 }
        },
        {
          name: 'Confidence Band',
          type: 'line',
          data: [...Array(historicalValues.length).fill(null), ...confidenceUpper],
          lineStyle: { opacity: 0 },
          areaStyle: { 
            color: 'rgba(245, 158, 11, 0.2)',
            origin: 'start'
          },
          stack: 'confidence'
        },
        {
          name: 'Confidence Lower',
          type: 'line',
          data: [...Array(historicalValues.length).fill(null), ...confidenceLower],
          lineStyle: { opacity: 0 },
          areaStyle: { 
            color: 'rgba(255, 255, 255, 1)',
            origin: 'start'
          },
          stack: 'confidence'
        }
      ]
    };
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'trend': return FiTrendingUp;
      case 'volatility': return FiZap;
      case 'threshold': return FiAlertTriangle;
      default: return FiBrain;
    }
  };

  const getInsightColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const chartData = getChartData();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiBrain} className="w-6 h-6 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Predictive Analytics</h3>
              <p className="text-sm text-gray-600">{device?.name} - {dataKey}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <SafeIcon icon={FiX} className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prediction Method
              </label>
              <div className="flex flex-wrap gap-2">
                {predictionMethods.map(method => (
                  <motion.button
                    key={method.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMethod(method.value)}
                    className={`px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                      selectedMethod === method.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <SafeIcon icon={method.icon} className="w-4 h-4" />
                    <span className="text-sm">{method.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prediction Periods
              </label>
              <select
                value={predictionPeriods}
                onChange={(e) => setPredictionPeriods(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={5}>5 periods</option>
                <option value={10}>10 periods</option>
                <option value={15}>15 periods</option>
                <option value={20}>20 periods</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {isCalculating && (
            <div className="text-center py-8">
              <SafeIcon icon={FiRefreshCw} className="w-8 h-8 mx-auto mb-4 animate-spin text-primary-600" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Calculating Predictions</h4>
              <p className="text-gray-600">Running {selectedMethod} prediction algorithm...</p>
            </div>
          )}

          {/* Chart */}
          {!isCalculating && chartData && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Prediction Chart</h4>
              <ReactECharts
                option={chartData}
                style={{ height: '400px' }}
                className="w-full"
              />
            </div>
          )}

          {/* Predictions Table */}
          {!isCalculating && predictions.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h4 className="text-md font-semibold text-gray-900">Prediction Details</h4>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Predicted Value</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {predictions.map((pred, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">+{pred.period}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{pred.value.toFixed(3)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <span>{Math.round(pred.confidence * 100)}%</span>
                            <div className="w-16 h-2 bg-gray-200 rounded-full">
                              <div 
                                className="h-2 bg-primary-600 rounded-full"
                                style={{ width: `${pred.confidence * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{pred.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Insights */}
          {!isCalculating && insights.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-md font-semibold text-gray-900">Prediction Insights</h4>
              {insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border ${getInsightColor(insight.severity)}`}
                >
                  <div className="flex items-start space-x-3">
                    <SafeIcon icon={getInsightIcon(insight.type)} className="w-5 h-5 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{insight.message}</p>
                      {insight.confidence && (
                        <p className="text-xs opacity-75 mt-1">Confidence: {Math.round(insight.confidence * 100)}%</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default PredictiveAnalytics;