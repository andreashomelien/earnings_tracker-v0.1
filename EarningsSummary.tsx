import React from 'react';
import { Card, CardContent, Typography, Box, Divider } from '@mui/material';

export interface EarningsSummaryProps {
  workedDays: { [key: number]: string };
  currencyConfig: { currency: string; position: 'before' | 'after' };
  formatAmount: (amount: number, opts?: { isYAxisLabel?: boolean }) => string;
}

const EarningsSummary: React.FC<EarningsSummaryProps> = ({ workedDays, currencyConfig, formatAmount }) => {
  // Calculate earnings based on shift types
  const baseRate = 35; // Base hourly rate
  const eveningPremium = 5; // Additional per hour for evening shifts
  const nightPremium = 10; // Additional per hour for night shifts
  const hoursPerShift = 8;

  const calculateEarnings = () => {
    const earnings = {
      day: 0,
      evening: 0,
      night: 0,
    };

    Object.values(workedDays).forEach(shiftType => {
      switch (shiftType) {
        case 'day':
          earnings.day += baseRate * hoursPerShift;
          break;
        case 'evening':
          earnings.evening += (baseRate + eveningPremium) * hoursPerShift;
          break;
        case 'night':
          earnings.night += (baseRate + nightPremium) * hoursPerShift;
          break;
      }
    });

    return earnings;
  };

  const earnings = calculateEarnings();
  const totalEarnings = Object.values(earnings).reduce((a, b) => a + b, 0);

  const formatCurrency = (amount: number) => formatAmount(amount);

  return (
    <Card sx={{ bgcolor: '#1e1e1e', boxShadow: 'none', borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#00e676', mb: 3 }}>
          Earnings Summary
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ color: '#fff' }}>Day Shifts ({Object.values(workedDays).filter(t => t === 'day').length})</Typography>
            <Typography sx={{ color: '#fff' }}>{formatCurrency(earnings.day)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ color: '#fff' }}>Evening Shifts ({Object.values(workedDays).filter(t => t === 'evening').length})</Typography>
            <Typography sx={{ color: '#fff' }}>{formatCurrency(earnings.evening)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ color: '#fff' }}>Night Shifts ({Object.values(workedDays).filter(t => t === 'night').length})</Typography>
            <Typography sx={{ color: '#fff' }}>{formatCurrency(earnings.night)}</Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Typography variant="h6" sx={{ color: '#00e676' }}>Total Earnings</Typography>
          <Typography variant="h6" sx={{ color: '#00e676' }}>{formatCurrency(totalEarnings)}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EarningsSummary; 