import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Scale,
  CoreScaleOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface MonthlyChartProps {
  data?: number[];
  year: number;
  currencyConfig: { currency: string; position: 'before' | 'after' };
  formatAmount: (amount: number, opts?: { isYAxisLabel?: boolean }) => string;
}

const MonthlyChart: React.FC<MonthlyChartProps> = ({ data = Array(12).fill(6250), year, currencyConfig, formatAmount }) => {
  const chartData = {
    labels: months,
    datasets: [
      {
        label: 'Monthly Earnings',
        data: data,
        backgroundColor: '#00e676',
        borderRadius: 4,
        barThickness: 16,
      },
    ],
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: 'linear' as const,
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#fff',
          callback: function(this: Scale<CoreScaleOptions>, value: number | string) {
            if (typeof value === 'number') {
              return formatAmount(value as number, { isYAxisLabel: true });
            }
            return '';
          }
        },
      },
      x: {
        type: 'category' as const,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#fff',
        }
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <Card sx={{ bgcolor: '#1e1e1e', boxShadow: 'none', borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#00e676', mb: 3 }}>
          Monthly Earnings ({year})
        </Typography>
        <Box sx={{ height: 300, width: '100%' }}>
          <Bar data={chartData} options={chartOptions} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default MonthlyChart; 