import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import ReactECharts from 'echarts-for-react';
import { formatDistanceToNow, subDays, subHours, startOfDay, endOfDay } from 'date-fns';

const { FiTrendingUp, FiBarChart3, FiPieChart, FiActivity, FiAlertTriangle, FiTarget, FiZap, FiBrain, FiEye, FiRefreshCw, FiDownload, FiSettings, FiClock, FiFilter } = FiIcons;

// Analytics calculation utilities
class AnalyticsCalculator {
  static calculateTrend(data, timeWindow = 24) {
    if (!data || data.length < 2) return { trend: 'stable', change: 0, confidence: 0 };
    
    const recent = data.slice(-Math.min(timeWindow, data.length));
    const older = data.slice(-Math.min(timeWindow * 2, data.length), -timeWindow);
    
    if (older.length === 0) return { trend: 'stable', change: 0, confidence: 0 };
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    const confidence = Math.min(recent.length / timeWindow, 1);
    
    return {
      trend: Math.abs(change) < 1 ? 'stable' : change > 0 ? 'increasing' : 'decreasing',
      change: Math.round(change * 100) / 100,
      confidence: Math.round(confidence * 100)
    };
  }
  
  static detectAnomalies(data, threshold = 2) {
    if (!data || data.length < 10) return [];
    
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    return data.map((value, index) => ({
      index,
      value,
      isAnomaly: Math.abs(value - mean) > threshold * stdDev,
      deviation: Math.abs(value - mean) / stdDev
    })).filter(item => item.isAnomaly);
  }
  
  static predictNextValues(data, periods = 5) {
    if (!data || data.length < 3) return [];
    
    // Simple linear regression for prediction
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return Array.from({ length: periods }, (_, i) => ({
      period: i + 1,
      value: slope * (n + i) + intercept,
      confidence: Math.max(0, 1 - (i * 0.15)) // Decreasing confidence
    }));
  }
  
  static calculateCorrelation(data1, data2) {
    if (!data1 || !data2 || data1.length !== data2.length || data1.length < 2) return 0;
    
    const n = data1.length;
    const sum1 = data1.reduce((sum, val) => sum + val, 0);
    const sum2 = data2.reduce((sum, val) => sum + val, 0);
    const sum1Sq = data1.reduce((sum, val) => sum + val * val, 0);
    const sum2Sq = data2.reduce((sum, val) => sum + val * val, 0);
    const sum12 = data1.reduce((sum, val, i) => sum + val * data2[i], 0);
    
    const numerator = n * sum12 - sum1 * sum2;
    const denominator = Math.sqrt((n * sum1Sq - sum1 * sum1) * (n * sum2Sq - sum2 * sum2));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  static calculateEfficiency(data, target = null) {
    if (!data || data.length === 0) return { score: 0, grade: 'F' };
    
    const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / data.length;
    const stability = Math.max(0, 1 - (Math.sqrt(variance) / avg));
    
    let targetScore = 1;
    if (target !== null) {
      const targetDeviation = Math.abs(avg - target) / target;
      targetScore = Math.max(0, 1 - targetDeviation);
    }
    
    const score = (stability * 0.6 + targetScore * 0.4) * 100;
    const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';
    
    return { score: Math.round(score), grade, stability: Math.round(stability * 100), targetScore: Math.round(targetScore * 100) };
  }
}

function AnalyticsEngine() {
  const { devices } = useGateway();
  const [analyticsData, setAnalyticsData] = useState({});
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [analyticsType, setAnalyticsType] = useState('overview');
  const [isCalculating, setIsCalculating] = useState(false);
  const [insights, setInsights] = useState([]);

  // Time range options
  const timeRanges = [
    { value: '1h', label: '1 Hour', hours: 1 },
    { value: '6h', label: '6 Hours', hours: 6 },
    { value: '24h', label: '24 Hours', hours: 24 },
    { value: '7d', label: '7 Days', hours: 168 },
    { value: '30d', label: '30 Days', hours: 720 }
  ];

  // Analytics types
  const analyticsTypes = [
    { value: 'overview', label: 'Overview', icon: FiActivity },
    { value: 'trends', label: 'Trends', icon: FiTrendingUp },
    { value: 'anomalies', label: 'Anomalies', icon: FiAlertTriangle },
    { value: 'predictions', label: 'Predictions', icon: FiBrain },
    { value: 'correlations', label: 'Correlations', icon: FiTarget },
    { value: 'efficiency', label: 'Efficiency', icon: FiZap }
  ];

  // Generate mock historical data for demonstration
  const generateMockHistoricalData = (device, hours) => {
    const dataPoints = Math.min(hours * 6, 1000); // 6 points per hour, max 1000
    const now = new Date();
    
    return Array.from({ length: dataPoints }, (_, i) => {
      const timestamp = new Date(now.getTime() - (dataPoints - i) * (hours * 60 * 60 * 1000) / dataPoints);
      
      // Generate realistic data based on device and data keys
      const data = {};
      if (device.lastData) {
        Object.keys(device.lastData).forEach(key => {
          const baseValue = parseFloat(device.lastData[key]) || Math.random() * 100;
          const variation = baseValue * 0.1 * (Math.random() - 0.5);
          const trend = Math.sin(i / (dataPoints / 4)) * baseValue * 0.05;
          const noise = (Math.random() - 0.5) * baseValue * 0.02;
          
          data[key] = Math.max(0, baseValue + variation + trend + noise);
        });
      }
      
      return { timestamp: timestamp.toISOString(), data };
    });
  };

  // Calculate analytics when devices or time range changes
  useEffect(() => {
    if (devices.length === 0) return;
    
    setIsCalculating(true);
    
    // Select devices if none selected
    if (selectedDevices.length === 0) {
      const onlineDevices = devices.filter(d => d.status === 'online' && d.lastData);
      setSelectedDevices(onlineDevices.slice(0, 5).map(d => d.id));
      setIsCalculating(false);
      return;
    }

    const timeRange = timeRanges.find(r => r.value === selectedTimeRange);
    const newAnalyticsData = {};
    const newInsights = [];

    selectedDevices.forEach(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      if (!device || !device.lastData) return;

      const historicalData = generateMockHistoricalData(device, timeRange.hours);
      
      // Calculate analytics for each data key
      const deviceAnalytics = {};
      Object.keys(device.lastData).forEach(dataKey => {
        const values = historicalData.map(entry => entry.data[dataKey]).filter(v => v != null);
        
        if (values.length > 0) {
          const trend = AnalyticsCalculator.calculateTrend(values);
          const anomalies = AnalyticsCalculator.detectAnomalies(values);
          const predictions = AnalyticsCalculator.predictNextValues(values);
          const efficiency = AnalyticsCalculator.calculateEfficiency(values);
          
          deviceAnalytics[dataKey] = {
            current: device.lastData[dataKey],
            trend,
            anomalies,
            predictions,
            efficiency,
            statistics: {
              min: Math.min(...values),
              max: Math.max(...values),
              avg: values.reduce((sum, val) => sum + val, 0) / values.length,
              stdDev: Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - (values.reduce((s, v) => s + v, 0) / values.length), 2), 0) / values.length)
            },
            historicalData: historicalData.map(entry => ({
              timestamp: entry.timestamp,
              value: entry.data[dataKey]
            }))
          };

          // Generate insights
          if (trend.confidence > 70) {
            if (trend.trend === 'increasing' && Math.abs(trend.change) > 10) {
              newInsights.push({
                type: 'trend',
                severity: Math.abs(trend.change) > 25 ? 'high' : 'medium',
                device: device.name,
                dataKey,
                message: `${dataKey} is ${trend.trend} by ${Math.abs(trend.change)}% over the last ${timeRange.label.toLowerCase()}`,
                confidence: trend.confidence
              });
            }
          }

          if (anomalies.length > 0) {
            newInsights.push({
              type: 'anomaly',
              severity: anomalies.length > values.length * 0.1 ? 'high' : 'medium',
              device: device.name,
              dataKey,
              message: `${anomalies.length} anomalies detected in ${dataKey}`,
              count: anomalies.length
            });
          }

          if (efficiency.score < 70) {
            newInsights.push({
              type: 'efficiency',
              severity: efficiency.score < 50 ? 'high' : 'medium',
              device: device.name,
              dataKey,
              message: `${dataKey} efficiency is ${efficiency.grade} (${efficiency.score}%)`,
              efficiency
            });
          }
        }
      });

      newAnalyticsData[deviceId] = deviceAnalytics;
    });

    // Calculate correlations between different data points
    const correlations = [];
    selectedDevices.forEach(deviceId1 => {
      selectedDevices.forEach(deviceId2 => {
        if (deviceId1 >= deviceId2) return;
        
        const device1 = devices.find(d => d.id === deviceId1);
        const device2 = devices.find(d => d.id === deviceId2);
        
        if (!device1?.lastData || !device2?.lastData) return;
        
        Object.keys(device1.lastData).forEach(key1 => {
          Object.keys(device2.lastData).forEach(key2 => {
            const data1 = newAnalyticsData[deviceId1]?.[key1]?.historicalData?.map(d => d.value) || [];
            const data2 = newAnalyticsData[deviceId2]?.[key2]?.historicalData?.map(d => d.value) || [];
            
            const correlation = AnalyticsCalculator.calculateCorrelation(data1, data2);
            
            if (Math.abs(correlation) > 0.7) {
              correlations.push({
                device1: device1.name,
                key1,
                device2: device2.name,
                key2,
                correlation: Math.round(correlation * 100) / 100,
                strength: Math.abs(correlation) > 0.9 ? 'very strong' : 'strong'
              });
            }
          });
        });
      });
    });

    if (correlations.length > 0) {
      newInsights.push({
        type: 'correlation',
        severity: 'info',
        message: `Found ${correlations.length} strong correlations between device parameters`,
        correlations
      });
    }

    setAnalyticsData(newAnalyticsData);
    setInsights(newInsights);
    setIsCalculating(false);
  }, [devices, selectedDevices, selectedTimeRange]);

  // Analytics overview charts
  const getOverviewCharts = () => {
    const charts = [];

    // Device status distribution
    const statusCounts = devices.reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {});

    charts.push({
      title: 'Device Status Distribution',
      type: 'pie',
      data: {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [{
          type: 'pie',
          radius: '60%',
          data: Object.entries(statusCounts).map(([status, count]) => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: count
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0,0,0,0.5)'
            }
          }
        }]
      }
    });

    // Protocol distribution
    const protocolCounts = devices.reduce((acc, device) => {
      acc[device.protocol] = (acc[device.protocol] || 0) + 1;
      return acc;
    }, {});

    charts.push({
      title: 'Protocol Distribution',
      type: 'bar',
      data: {
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: Object.keys(protocolCounts)
        },
        yAxis: { type: 'value' },
        series: [{
          type: 'bar',
          data: Object.values(protocolCounts),
          itemStyle: {
            color: '#3b82f6'
          }
        }]
      }
    });

    // Overall efficiency heatmap
    const efficiencyData = [];
    selectedDevices.forEach((deviceId, deviceIndex) => {
      const device = devices.find(d => d.id === deviceId);
      const deviceData = analyticsData[deviceId];
      
      if (!device || !deviceData) return;

      Object.keys(deviceData).forEach((dataKey, keyIndex) => {
        const efficiency = deviceData[dataKey].efficiency;
        efficiencyData.push([deviceIndex, keyIndex, efficiency.score, device.name, dataKey]);
      });
    });

    if (efficiencyData.length > 0) {
      charts.push({
        title: 'System Efficiency Heatmap',
        type: 'heatmap',
        data: {
          tooltip: {
            formatter: (params) => {
              const [deviceIndex, keyIndex, score, deviceName, dataKey] = params.data;
              return `${deviceName}<br/>${dataKey}: ${score}%`;
            }
          },
          grid: { height: '50%', top: '10%' },
          xAxis: {
            type: 'category',
            data: selectedDevices.map(id => devices.find(d => d.id === id)?.name).filter(Boolean),
            splitArea: { show: true }
          },
          yAxis: {
            type: 'category',
            data: [...new Set(efficiencyData.map(d => d[4]))],
            splitArea: { show: true }
          },
          visualMap: {
            min: 0,
            max: 100,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%',
            inRange: { color: ['#ff4444', '#ffaa44', '#44ff44'] }
          },
          series: [{
            type: 'heatmap',
            data: efficiencyData.map(d => [d[0], d[1], d[2]]),
            label: { show: true, formatter: '{c}%' },
            emphasis: { itemStyle: { shadowBlur: 10 } }
          }]
        }
      });
    }

    return charts;
  };

  // Trend analysis charts
  const getTrendCharts = () => {
    const charts = [];

    selectedDevices.forEach(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      const deviceData = analyticsData[deviceId];
      
      if (!device || !deviceData) return;

      Object.entries(deviceData).forEach(([dataKey, analytics]) => {
        if (!analytics.historicalData) return;

        const timestamps = analytics.historicalData.map(d => new Date(d.timestamp).toLocaleTimeString());
        const values = analytics.historicalData.map(d => d.value);

        charts.push({
          title: `${device.name} - ${dataKey} Trend`,
          type: 'line',
          data: {
            tooltip: { trigger: 'axis' },
            xAxis: {
              type: 'category',
              data: timestamps
            },
            yAxis: { type: 'value' },
            series: [{
              type: 'line',
              smooth: true,
              data: values,
              itemStyle: { color: '#10b981' },
              areaStyle: { opacity: 0.3 }
            }]
          },
          trend: analytics.trend
        });
      });
    });

    return charts;
  };

  // Anomaly detection charts
  const getAnomalyCharts = () => {
    const charts = [];

    selectedDevices.forEach(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      const deviceData = analyticsData[deviceId];
      
      if (!device || !deviceData) return;

      Object.entries(deviceData).forEach(([dataKey, analytics]) => {
        if (!analytics.anomalies || analytics.anomalies.length === 0) return;

        const timestamps = analytics.historicalData.map(d => new Date(d.timestamp).toLocaleTimeString());
        const values = analytics.historicalData.map(d => d.value);
        const anomalyPoints = analytics.anomalies.map(a => ({
          coord: [a.index, a.value],
          value: a.deviation.toFixed(2)
        }));

        charts.push({
          title: `${device.name} - ${dataKey} Anomalies`,
          type: 'line',
          data: {
            tooltip: { trigger: 'axis' },
            xAxis: {
              type: 'category',
              data: timestamps
            },
            yAxis: { type: 'value' },
            series: [
              {
                type: 'line',
                data: values,
                itemStyle: { color: '#6b7280' },
                lineStyle: { opacity: 0.6 }
              },
              {
                type: 'scatter',
                data: anomalyPoints.map(p => p.coord),
                itemStyle: { color: '#ef4444' },
                symbolSize: 8
              }
            ]
          },
          anomalies: analytics.anomalies
        });
      });
    });

    return charts;
  };

  // Prediction charts
  const getPredictionCharts = () => {
    const charts = [];

    selectedDevices.forEach(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      const deviceData = analyticsData[deviceId];
      
      if (!device || !deviceData) return;

      Object.entries(deviceData).forEach(([dataKey, analytics]) => {
        if (!analytics.predictions || analytics.predictions.length === 0) return;

        const historicalTimestamps = analytics.historicalData.slice(-20).map(d => new Date(d.timestamp).toLocaleTimeString());
        const historicalValues = analytics.historicalData.slice(-20).map(d => d.value);
        const predictionTimestamps = analytics.predictions.map((_, i) => `+${i + 1}`);
        const predictionValues = analytics.predictions.map(p => p.value);

        charts.push({
          title: `${device.name} - ${dataKey} Predictions`,
          type: 'line',
          data: {
            tooltip: { trigger: 'axis' },
            legend: { data: ['Historical', 'Predicted'] },
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
                itemStyle: { color: '#3b82f6' }
              },
              {
                name: 'Predicted',
                type: 'line',
                data: [...Array(historicalValues.length).fill(null), ...predictionValues],
                itemStyle: { color: '#f59e0b' },
                lineStyle: { type: 'dashed' }
              }
            ]
          },
          predictions: analytics.predictions
        });
      });
    });

    return charts;
  };

  // Correlation analysis
  const getCorrelationCharts = () => {
    const charts = [];

    // Build correlation matrix
    const devices_data = [];
    const labels = [];

    selectedDevices.forEach(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      const deviceData = analyticsData[deviceId];
      
      if (!device || !deviceData) return;

      Object.entries(deviceData).forEach(([dataKey, analytics]) => {
        if (!analytics.historicalData) return;
        
        labels.push(`${device.name}-${dataKey}`);
        devices_data.push(analytics.historicalData.map(d => d.value));
      });
    });

    if (devices_data.length > 1) {
      const correlationMatrix = [];
      
      for (let i = 0; i < devices_data.length; i++) {
        for (let j = 0; j < devices_data.length; j++) {
          const correlation = AnalyticsCalculator.calculateCorrelation(devices_data[i], devices_data[j]);
          correlationMatrix.push([i, j, Math.round(correlation * 100) / 100]);
        }
      }

      charts.push({
        title: 'Parameter Correlation Matrix',
        type: 'heatmap',
        data: {
          tooltip: {
            formatter: (params) => {
              const [x, y, corr] = params.data;
              return `${labels[x]} vs ${labels[y]}<br/>Correlation: ${corr}`;
            }
          },
          grid: { height: '70%', top: '10%' },
          xAxis: {
            type: 'category',
            data: labels,
            splitArea: { show: true },
            axisLabel: { rotate: 45 }
          },
          yAxis: {
            type: 'category',
            data: labels,
            splitArea: { show: true }
          },
          visualMap: {
            min: -1,
            max: 1,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%',
            inRange: { color: ['#ff4444', '#ffffff', '#44ff44'] }
          },
          series: [{
            type: 'heatmap',
            data: correlationMatrix,
            label: { show: true, formatter: '{c}' },
            emphasis: { itemStyle: { shadowBlur: 10 } }
          }]
        }
      });
    }

    return charts;
  };

  // Efficiency analysis charts
  const getEfficiencyCharts = () => {
    const charts = [];

    // Device efficiency comparison
    const efficiencyData = [];
    selectedDevices.forEach(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      const deviceData = analyticsData[deviceId];
      
      if (!device || !deviceData) return;

      const efficiencies = Object.values(deviceData).map(analytics => analytics.efficiency?.score || 0);
      const avgEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
      
      efficiencyData.push({
        name: device.name,
        value: Math.round(avgEfficiency),
        grade: AnalyticsCalculator.calculateEfficiency([avgEfficiency]).grade
      });
    });

    if (efficiencyData.length > 0) {
      charts.push({
        title: 'Device Efficiency Comparison',
        type: 'bar',
        data: {
          tooltip: {
            formatter: (params) => `${params.name}<br/>Efficiency: ${params.value}% (${params.data.grade})`
          },
          xAxis: {
            type: 'category',
            data: efficiencyData.map(d => d.name),
            axisLabel: { rotate: 45 }
          },
          yAxis: { 
            type: 'value',
            max: 100,
            axisLabel: { formatter: '{value}%' }
          },
          series: [{
            type: 'bar',
            data: efficiencyData.map(d => ({
              value: d.value,
              grade: d.grade,
              itemStyle: {
                color: d.value >= 80 ? '#10b981' : d.value >= 60 ? '#f59e0b' : '#ef4444'
              }
            }))
          }]
        }
      });

      // Efficiency trend over time
      const timeLabels = ['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now'];
      charts.push({
        title: 'System Efficiency Trend',
        type: 'line',
        data: {
          tooltip: { trigger: 'axis' },
          xAxis: {
            type: 'category',
            data: timeLabels
          },
          yAxis: { 
            type: 'value',
            max: 100,
            axisLabel: { formatter: '{value}%' }
          },
          series: [{
            type: 'line',
            smooth: true,
            data: efficiencyData.map((_, i) => 
              Math.max(20, Math.min(100, 75 + Math.sin(i) * 15 + (Math.random() - 0.5) * 10))
            ),
            itemStyle: { color: '#8b5cf6' },
            areaStyle: { opacity: 0.3 }
          }]
        }
      });
    }

    return charts;
  };

  // Get current charts based on analytics type
  const getCurrentCharts = () => {
    switch (analyticsType) {
      case 'overview': return getOverviewCharts();
      case 'trends': return getTrendCharts();
      case 'anomalies': return getAnomalyCharts();
      case 'predictions': return getPredictionCharts();
      case 'correlations': return getCorrelationCharts();
      case 'efficiency': return getEfficiencyCharts();
      default: return [];
    }
  };

  const exportAnalytics = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      timeRange: selectedTimeRange,
      devices: selectedDevices.map(id => devices.find(d => d.id === id)?.name),
      analyticsType,
      insights,
      analyticsData,
      summary: {
        totalDevices: devices.length,
        selectedDevices: selectedDevices.length,
        totalInsights: insights.length,
        insightsByType: insights.reduce((acc, insight) => {
          acc[insight.type] = (acc[insight.type] || 0) + 1;
          return acc;
        }, {}),
        avgEfficiency: selectedDevices.length > 0 ? 
          selectedDevices.reduce((sum, deviceId) => {
            const deviceData = analyticsData[deviceId];
            if (!deviceData) return sum;
            const efficiencies = Object.values(deviceData).map(a => a.efficiency?.score || 0);
            return sum + (efficiencies.reduce((s, e) => s + e, 0) / efficiencies.length);
          }, 0) / selectedDevices.length : 0
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${analyticsType}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'trend': return FiTrendingUp;
      case 'anomaly': return FiAlertTriangle;
      case 'correlation': return FiTarget;
      case 'efficiency': return FiZap;
      default: return FiActivity;
    }
  };

  const getInsightColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'info': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const charts = getCurrentCharts();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiBrain} className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Advanced Analytics</h2>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportAnalytics}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors"
          >
            <SafeIcon icon={FiDownload} className="w-4 h-4" />
            <span>Export</span>
          </motion.button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Analytics Type */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Analytics Type</label>
            <div className="flex flex-wrap gap-2">
              {analyticsTypes.map(type => (
                <motion.button
                  key={type.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAnalyticsType(type.value)}
                  className={`px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    analyticsType === type.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <SafeIcon icon={type.icon} className="w-4 h-4" />
                  <span className="text-sm">{type.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>

          {/* Device Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Devices ({selectedDevices.length})
            </label>
            <select
              multiple
              value={selectedDevices}
              onChange={(e) => setSelectedDevices(Array.from(e.target.selectedOptions, option => option.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-48"
              size={4}
            >
              {devices.filter(d => d.status === 'online' && d.lastData).map(device => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isCalculating && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <SafeIcon icon={FiRefreshCw} className="w-8 h-8 mx-auto mb-4 animate-spin text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Calculating Analytics</h3>
          <p className="text-gray-600">Processing device data and generating insights...</p>
        </div>
      )}

      {/* Insights Panel */}
      {!isCalculating && insights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <SafeIcon icon={FiEye} className="w-5 h-5" />
            <span>Key Insights ({insights.length})</span>
          </h3>
          <div className="space-y-3">
            {insights.slice(0, 5).map((insight, index) => (
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
                    {insight.device && (
                      <p className="text-xs opacity-75 mt-1">Device: {insight.device}</p>
                    )}
                    {insight.confidence && (
                      <p className="text-xs opacity-75 mt-1">Confidence: {insight.confidence}%</p>
                    )}
                    {insight.correlations && (
                      <div className="mt-2 space-y-1">
                        {insight.correlations.slice(0, 3).map((corr, i) => (
                          <p key={i} className="text-xs opacity-75">
                            {corr.device1}({corr.key1}) ↔ {corr.device2}({corr.key2}): {corr.correlation}
                          </p>
                        ))}
                      </div>
                    )}
                    {insight.efficiency && (
                      <div className="mt-2">
                        <p className="text-xs opacity-75">
                          Stability: {insight.efficiency.stability}% | Target Score: {insight.efficiency.targetScore}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {!isCalculating && charts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {charts.map((chart, index) => (
              <motion.div
                key={`${chart.title}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-900">{chart.title}</h4>
                  {chart.trend && (
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        chart.trend.trend === 'increasing' ? 'bg-green-100 text-green-800' :
                        chart.trend.trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {chart.trend.trend} {Math.abs(chart.trend.change)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {chart.trend.confidence}% confidence
                      </span>
                    </div>
                  )}
                </div>
                <ReactECharts
                  option={chart.data}
                  style={{ height: '300px' }}
                  className="w-full"
                />
                {chart.anomalies && chart.anomalies.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    {chart.anomalies.length} anomalies detected
                  </div>
                )}
                {chart.predictions && chart.predictions.length > 0 && (
                  <div className="mt-2 text-xs text-yellow-600">
                    Next value predicted: {chart.predictions[0].value.toFixed(2)} 
                    ({Math.round(chart.predictions[0].confidence * 100)}% confidence)
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!isCalculating && charts.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <SafeIcon icon={FiBrain} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600 mb-4">
            Select devices with active data to generate analytics insights
          </p>
          {devices.filter(d => d.status === 'online' && d.lastData).length === 0 && (
            <p className="text-sm text-yellow-600">
              No online devices with data found. Add devices and ensure they are collecting data.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default AnalyticsEngine;