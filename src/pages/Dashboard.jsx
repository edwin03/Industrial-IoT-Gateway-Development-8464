import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import ReactECharts from 'echarts-for-react';

const { FiHardDrive, FiActivity, FiMessageSquare, FiAlertTriangle } = FiIcons;

function Dashboard() {
  const { devices, stats, logs } = useGateway();

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

  const getChartOption = () => ({
    title: {
      text: 'Device Status Overview',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
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
              <SafeIcon
                icon={card.icon}
                className={`w-8 h-8 text-${card.color}-600`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <ReactECharts option={getChartOption()} style={{ height: '300px' }} />
        </motion.div>

        {/* Recent Logs */}
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
                  <p className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default Dashboard;