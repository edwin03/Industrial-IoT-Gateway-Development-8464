import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import ReactECharts from 'echarts-for-react';
import ChartBuilder from '../components/ChartBuilder';
import DashboardChart from '../components/DashboardChart';

const { FiHardDrive, FiActivity, FiMessageSquare, FiAlertTriangle, FiPlus, FiBarChart3 } = FiIcons;

function Dashboard() {
  const { devices, stats, logs } = useGateway();
  const [customCharts, setCustomCharts] = useState([]);
  const [showChartBuilder, setShowChartBuilder] = useState(false);
  const [editingChart, setEditingChart] = useState(null);

  useEffect(() => {
    // Load custom charts from localStorage
    const savedCharts = localStorage.getItem('dashboardCharts');
    if (savedCharts) {
      setCustomCharts(JSON.parse(savedCharts));
    }
  }, []);

  const saveChartsToStorage = (charts) => {
    localStorage.setItem('dashboardCharts', JSON.stringify(charts));
    setCustomCharts(charts);
  };

  const handleSaveChart = (chartData) => {
    if (editingChart) {
      // Update existing chart
      const updatedCharts = customCharts.map(chart =>
        chart.id === chartData.id ? chartData : chart
      );
      saveChartsToStorage(updatedCharts);
    } else {
      // Add new chart
      saveChartsToStorage([...customCharts, chartData]);
    }
    setEditingChart(null);
  };

  const handleEditChart = (chart) => {
    setEditingChart(chart);
    setShowChartBuilder(true);
  };

  const handleDeleteChart = (chartId) => {
    if (confirm('Are you sure you want to delete this chart?')) {
      const updatedCharts = customCharts.filter(chart => chart.id !== chartId);
      saveChartsToStorage(updatedCharts);
    }
  };

  const statCards = [
    {
      title: 'Total Devices',
      value: stats.totalDevices,
      icon: FiHardDrive,
      color: 'primary',
      change: '+5.2%'
    },
    {
      title: 'Active Devices',
      value: stats.activeDevices,
      icon: FiActivity,
      color: 'success',
      change: '+2.1%'
    },
    {
      title: 'Messages/Hour',
      value: stats.messagesProcessed,
      icon: FiMessageSquare,
      color: 'warning',
      change: '+12.3%'
    },
    {
      title: 'Errors',
      value: stats.errors,
      icon: FiAlertTriangle,
      color: 'error',
      change: '-8.4%'
    }
  ];

  const getDefaultChartOption = () => ({
    title: {
      text: 'Device Status Overview',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: { fontSize: 10 }
    },
    series: [
      {
        name: 'Device Status',
        type: 'pie',
        radius: '50%',
        data: [
          { value: devices.filter(d => d.status === 'online').length, name: 'Online' },
          { value: devices.filter(d => d.status === 'offline').length, name: 'Offline' },
          { value: devices.filter(d => d.status === 'error').length, name: 'Error' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className={`text-sm ${card.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {card.change}
                </p>
              </div>
              <SafeIcon icon={card.icon} className={`w-8 h-8 text-${card.color}-600`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Charts</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setEditingChart(null);
              setShowChartBuilder(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Create Chart</span>
          </motion.button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Default Device Status Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <ReactECharts option={getDefaultChartOption()} style={{ height: '300px' }} />
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {logs.slice(0, 10).map((log, index) => (
                <div key={index} className="flex items-start space-x-3 text-sm">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    log.level === 'error' ? 'bg-red-500' :
                    log.level === 'warning' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-gray-900">{log.message}</p>
                    <p className="text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Custom Charts */}
        {customCharts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Custom Charts</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence>
                {customCharts.map((chart) => (
                  <DashboardChart
                    key={chart.id}
                    chart={chart}
                    onEdit={handleEditChart}
                    onDelete={handleDeleteChart}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty State for Charts */}
        {customCharts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center"
          >
            <SafeIcon icon={FiBarChart3} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Custom Charts</h3>
            <p className="text-gray-600 mb-4">
              Create custom charts to visualize your device data in real-time
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setEditingChart(null);
                setShowChartBuilder(true);
              }}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors mx-auto"
            >
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
              <span>Create Your First Chart</span>
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Chart Builder Modal */}
      <ChartBuilder
        isOpen={showChartBuilder}
        onClose={() => {
          setShowChartBuilder(false);
          setEditingChart(null);
        }}
        onSave={handleSaveChart}
        chart={editingChart}
      />
    </motion.div>
  );
}

export default Dashboard;