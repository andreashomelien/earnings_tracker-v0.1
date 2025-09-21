import React, { useState, useEffect, useMemo } from 'react';
import { Grid, Typography, Box, Card, CardContent } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import Calendar from './Calendar';
import EarningsCard from './EarningsCard';
import Settings from './Settings';

interface WorkDay {
  day: number;
  month: number;
  shiftType: string;
}

interface ShiftConfig {
  type: string;
  label: string;
  color: string;
  hours: number;
  overtimeMultiplier: number;
  startTime?: string;
  endTime?: string;
  labelEn: string;
}

interface ShiftData {
  earnings: number;
  days: number;
}

interface MonthData {
  month: string;
  shiftData: {
    [key: string]: ShiftData;
  };
  total: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: MonthData;
    value: number;
  }>;
  label?: string;
}

interface Translations {
  [key: string]: {
    title: string;
    subtitle: string;
    yearlyEarnings: string;
    monthlyEarnings: string;
    baseRate: string;
    projectedEarnings: string;
    totalEarningsMonth: string;
    baseRateHour: string;
    currencySymbol: string;
  };
}

const translations: Translations = {
  en: {
    title: 'Jobbtid',
    subtitle: 'Earnings Tracker - Track your work days and calculate your earnings like a bank',
    yearlyEarnings: 'Total Yearly Earnings',
    monthlyEarnings: 'Monthly Earnings',
    baseRate: 'Base Hourly Rate',
    projectedEarnings: 'Projected earnings for',
    totalEarningsMonth: 'Total earnings for',
    baseRateHour: 'Base rate per hour',
    currencySymbol: '$'
  },
  no: {
    title: 'Jobbtid',
    subtitle: 'Inntektssporing - Spor arbeidsdagene dine og beregn inntektene dine som en bank',
    yearlyEarnings: 'Totale årlige inntekter',
    monthlyEarnings: 'Månedlige inntekter',
    baseRate: 'Grunnlønn per time',
    projectedEarnings: 'Forventede inntekter for',
    totalEarningsMonth: 'Totale inntekter for',
    baseRateHour: 'Grunnlønn per time',
    currencySymbol: 'NOK'
  }
};

// Add proper types for utility functions
interface CurrencyFormatOptions {
  isYAxisLabel?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const formatNorwegianAmount = (amount: number, options: CurrencyFormatOptions = {}): string => {
  const {
    isYAxisLabel = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options;

  // For Y-axis, we want a simpler format without decimals and proper spacing for large numbers
  if (isYAxisLabel) {
    const wholePart = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${wholePart}\u00A0NOK`; // Using non-breaking space to keep NOK on same line
  }

  // For smaller numbers or non-axis labels, use the detailed format with proper spacing
  const formattedNumber = amount.toLocaleString('nb-NO', {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping: true
  }).replace(/\s/g, ' '); // Ensure consistent space character

  return `${formattedNumber}\u00A0NOK`; // Using non-breaking space to keep NOK on same line
};

const DEFAULT_SHIFT_TYPES = [
  { type: 'day', label: 'Dag skift 🌇', color: '#FFFFFF', hours: 7.3, overtimeMultiplier: 0, startTime: '06:00', endTime: '14:10', labelEn: 'Day Shift 🌇' },
  { type: 'evening', label: 'Kvelds skift 🏙️', color: '#22C55E', hours: 7.3, overtimeMultiplier: 50, startTime: '14:00', endTime: '22:10', labelEn: 'Evening Shift 🏙️' },
  { type: 'night', label: 'Natt skift 🌃', color: '#2196f3', hours: 7.3, overtimeMultiplier: 60, startTime: '22:00', endTime: '06:10', labelEn: 'Night Shift 🌃' },
  { type: 'overtime', label: 'Overtid 🕜💵', color: '#EF4444', hours: 10.1, overtimeMultiplier: 100, startTime: '11:30', endTime: '22:10', labelEn: 'Overtime 🕜💵' }
];

const Dashboard: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [workedDays, setWorkedDays] = useState<{ [year: number]: WorkDay[] }>(() => {
    const saved = localStorage.getItem('workedDays');
    return saved ? JSON.parse(saved) : {};
  });
  const [language, setLanguage] = useState<'en' | 'no'>('no');
  const [baseRate, setBaseRate] = useState(() => {
    const saved = localStorage.getItem('baseRate');
    return saved ? JSON.parse(saved) : 300;
  });
  const t = translations[language];
  const [shiftTypes, setShiftTypes] = useState<ShiftConfig[]>(() => {
    const saved = localStorage.getItem('shiftTypes');
    const lang = localStorage.getItem('language') || 'no';
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4 && parsed.every(s => s.type && s.label)) {
          // Patch labels and colors if needed
          return DEFAULT_SHIFT_TYPES.map(def => {
            const found = parsed.find(s => s.type === def.type);
            if (!found) return { ...def, label: lang === 'no' ? def.label : def.labelEn };
            return {
              ...def,
              ...found,
              label: lang === 'no' ? def.label : def.labelEn,
              color: def.color,
              labelEn: def.labelEn
            };
          });
        }
        return parsed;
      } catch {
        return DEFAULT_SHIFT_TYPES.map(def => ({ ...def, label: lang === 'no' ? def.label : def.labelEn }));
      }
    }
    return DEFAULT_SHIFT_TYPES.map(def => ({ ...def, label: lang === 'no' ? def.label : def.labelEn }));
  });
  const [currencyConfig, setCurrencyConfig] = useState<{ currency: string; position: 'before' | 'after' }>(() => {
    const saved = localStorage.getItem('currencyConfig');
    return saved ? JSON.parse(saved) : { currency: 'kr', position: 'after' };
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('workedDays', JSON.stringify(workedDays));
  }, [workedDays]);
  useEffect(() => {
    localStorage.setItem('shiftTypes', JSON.stringify(shiftTypes));
  }, [shiftTypes]);
  useEffect(() => {
    localStorage.setItem('currencyConfig', JSON.stringify(currencyConfig));
  }, [currencyConfig]);
  useEffect(() => {
    localStorage.setItem('baseRate', JSON.stringify(baseRate));
  }, [baseRate]);

  // Add after the shiftTypes state initialization
  useEffect(() => {
    setShiftTypes(prev => {
      // Only update the 4 default types, leave custom types untouched
      return prev.map(shift => {
        const def = DEFAULT_SHIFT_TYPES.find(d => d.type === shift.type);
        if (def) {
          return {
            ...shift,
            label: language === 'no' ? def.label : def.labelEn,
            color: def.color,
            labelEn: def.labelEn,
          };
        }
        return shift; // custom types
      });
    });
    // Also persist language in localStorage for reloads
    localStorage.setItem('language', language);
  }, [language]);

  // Universal currency formatter
  const formatAmount = (
    amount: number,
    opts?: { isYAxisLabel?: boolean }
  ): string => {
    const { currency, position } = currencyConfig;
    const { isYAxisLabel = false } = opts || {};
    const isWhole = Number.isInteger(amount);
    // Use ' ' (space) as thousands separator
    const formattedNumber = amount
      .toLocaleString('en-US', {
        minimumFractionDigits: isWhole ? 0 : 2,
        maximumFractionDigits: isWhole ? 0 : 2
      })
      .replace(/,/g, ' ');
    if (position === 'before') {
      return `${currency}${formattedNumber}`;
    } else {
      return `${formattedNumber} ${currency}`;
    }
  };

  // Update baseRate for the current language
  const handleBaseRateChange = (newRate: number) => {
    setBaseRate(newRate);
  };

  // Add currency conversion functions
  const NOKtoUSD = (nok: number): number => nok / 10; // Simplified conversion rate 1:10
  const USDtoNOK = (usd: number): number => usd * 10; // Simplified conversion rate 1:10

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleDayClick = (day: number, shiftType: string) => {
    setWorkedDays(prev => {
      const yearDays = prev[selectedYear] || [];
      // Remove any existing entry for this day in the selected month
      const filtered = yearDays.filter(
        wd => !(wd.day === day && wd.month === selectedMonth)
      );
      
      // Add the new work day if it's not being toggled off
      const newYearDays = shiftType
        ? [...filtered, { day, month: selectedMonth, shiftType }]
        : filtered;

      return {
        ...prev,
        [selectedYear]: newYearDays
      };
    });
  };

  const getWorkedDaysForMonth = (year: number, month: number): { [key: number]: string } => {
    const yearData = workedDays[year] || [];
    return yearData
      .filter(wd => wd.month === month)
      .reduce((acc, { day, shiftType }) => ({
        ...acc,
        [day]: shiftType
      }), {});
  };

  const calculateMonthlyEarnings = (year: number, month: number) => {
    const monthWorkedDays = getWorkedDaysForMonth(year, month);
    return Object.entries(monthWorkedDays).reduce((total, [_, shiftType]) => {
      const shift = shiftTypes.find(s => s.type === shiftType);
      if (!shift) return total;

      const basePayForShift = baseRate * shift.hours;
      const overtimeRate = shift.overtimeMultiplier > 0 ? shift.overtimeMultiplier / 100 : 0;
      return total + (basePayForShift * (1 + overtimeRate));
    }, 0);
  };

  const calculateYearlyEarnings = (year: number) => {
    return Array.from({ length: 12 }, (_, i) => calculateMonthlyEarnings(year, i))
      .reduce((sum, monthEarnings) => sum + monthEarnings, 0);
  };

  const handleShiftHoursChange = (shiftType: string, hours: number, overtimeMultiplier?: number) => {
    setShiftTypes(prev => prev.map(shift => 
      shift.type === shiftType 
        ? { 
            ...shift, 
            hours,
            overtimeMultiplier: overtimeMultiplier !== undefined ? overtimeMultiplier : shift.overtimeMultiplier 
          }
        : shift
    ));
  };

  const handleShiftTypesChange = (newShiftTypes: ShiftConfig[]) => {
    setShiftTypes(newShiftTypes);
  };

  // Memoize the worked days for the current month/year
  const currentMonthWorkedDays = useMemo(() => 
    getWorkedDaysForMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth, workedDays]
  );

  // Memoize monthly data calculation
  const monthlyData = useMemo(() => Array.from({ length: 12 }, (_, month) => {
    const monthWorkedDays = getWorkedDaysForMonth(selectedYear, month);
    
    // Calculate earnings per shift type
    const shiftData = Object.entries(monthWorkedDays).reduce((acc, [_, shiftType]) => {
      if (!acc[shiftType]) {
        acc[shiftType] = { earnings: 0, days: 0 };
      }

      const shift = shiftTypes.find(s => s.type === shiftType);
      if (shift) {
        const basePayForShift = baseRate * shift.hours;
        const overtimeRate = shift.overtimeMultiplier > 0 ? shift.overtimeMultiplier / 100 : 0;
        const earnings = basePayForShift * (1 + overtimeRate);
        
        acc[shiftType].earnings += earnings;
        acc[shiftType].days += 1;
      }

      return acc;
    }, {} as { [key: string]: { earnings: number; days: number } });

    const total = Object.values(shiftData).reduce((sum, { earnings }) => sum + earnings, 0);

    return {
      month: new Date(selectedYear, month).toLocaleString('default', { month: 'short' }),
      shiftData,
      total
    };
  }), [selectedYear, workedDays, shiftTypes, baseRate]);

  // Memoize yearly earnings calculation
  const yearlyEarnings = useMemo(() => 
    calculateYearlyEarnings(selectedYear),
    [selectedYear, workedDays, shiftTypes, baseRate]
  );

  // Memoize monthly earnings calculation
  const monthlyEarnings = useMemo(() => 
    calculateMonthlyEarnings(selectedYear, selectedMonth),
    [selectedYear, selectedMonth, workedDays, shiftTypes, baseRate]
  );

  // Add a helper function for display label
  const getDisplayLabel = (shift: ShiftConfig, language: 'en' | 'no') => {
    if (!shift) return '';
    if (shift.type === 'day' || shift.type === 'evening' || shift.type === 'night' || shift.type === 'overtime') {
      return language === 'no' ? shift.label : shift.labelEn;
    }
    return language === 'no' ? shift.label : (shift.labelEn || shift.label);
  };

  // Define CustomTooltip as a function component
  function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthData;
      const totalEarnings = data.total;
      return (
        <Box
          sx={{
            bgcolor: '#1e1e1e',
            p: 2,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 1
          }}
        >
          <Typography sx={{ color: '#fff', mb: 1, fontWeight: 500 }}>{label}</Typography>
          {Object.entries(data.shiftData).map(([shiftType, { earnings, days }]) => {
            const shift = shiftTypes.find(s => s.type === shiftType);
            if (shift && earnings > 0) {
              return (
                <Typography
                  key={shiftType}
                  sx={{
                    color: shift.color,
                    fontSize: '0.875rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2
                  }}
                >
                  <span>{getDisplayLabel(shift, language)} ({days})</span>
                  <span>{formatAmount(earnings, { isYAxisLabel: true })}</span>
                </Typography>
              );
            }
            return null;
          })}
          {totalEarnings > 0 && (
            <Typography
              sx={{
                color: '#fff',
                mt: 1,
                pt: 1,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
                fontWeight: 500
              }}
            >
              <span>Total</span>
              <span>{formatAmount(totalEarnings, { isYAxisLabel: true })}</span>
            </Typography>
          )}
        </Box>
      );
    }
    return null;
  }

  // Memoize the CustomTooltip component
  const MemoizedTooltip = React.memo(CustomTooltip);

  const formatLegendText = (value: any, _entry: any) => {
    // Find the shift type from the current value
    const shift = shiftTypes.find(s => {
      if (language === 'no') return s.label === value;
      return (s.labelEn || s.label) === value;
    });
    if (!shift) return value;
    // Count total days for this shift type
    const totalDays = monthlyData.reduce((acc, month) => {
      const shiftData = month.shiftData[shift.type];
      return acc + (shiftData?.days || 0);
    }, 0);
    return `${value} (${totalDays} ${language === 'no' ? 'dager' : 'days'})`;
  };

  // Add CSV headers constant
  const CSV_HEADERS = ['Date', 'Day Type', 'Shift Type', 'Work Time', 'Paid Hours', 'Total Earnings'];
  const CSV_HEADERS_NO = ['Dato', 'Type dag', 'Skift type', 'Arbeidstid', 'Betalte timer', 'Totale inntekter'];

  // Add type for the download data
  interface DownloadRow {
    date: string;
    dayOfWeek: string;
    shiftLabel: string;
    workTime: string;
    hours: string;
    earnings: string;
  }

  // Helper to get shift label without emoji for CSV
  const getShiftLabel = (shift: ShiftConfig, language: 'en' | 'no') => {
    if (!shift) return '';
    // Remove emoji and trim
    if (language === 'no') {
      if (shift.type === 'day') return 'Dag skift';
      if (shift.type === 'evening') return 'Kvelds skift';
      if (shift.type === 'night') return 'Natt skift';
      if (shift.type === 'overtime') return 'Overtid';
    } else {
      if (shift.type === 'day') return 'Day Shift';
      if (shift.type === 'evening') return 'Evening Shift';
      if (shift.type === 'night') return 'Night Shift';
      if (shift.type === 'overtime') return 'Overtime';
    }
    // fallback
    return shift.label.replace(/[^\u0000-\u007f]+/g, '').trim();
  };

  // Generate CSV download data
  const generateDownloadData = (
    year: number,
    month: number | null,
    language: 'en' | 'no',
    shiftTypes: ShiftConfig[],
    baseRate: number,
    getWorkedDaysForMonth: (year: number, month: number) => { [key: number]: string }
  ): DownloadRow[] => {
    const rows: DownloadRow[] = [];
    const monthStart = month !== null ? month : 0;
    const monthEnd = month !== null ? month : 11;

    for (let m = monthStart; m <= monthEnd; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const monthData = getWorkedDaysForMonth(year, m);

      for (let day = 1; day <= daysInMonth; day++) {
        const shiftType = monthData[day];
        if (!shiftType) continue;

        const shift = shiftTypes.find(s => s.type === shiftType);
        if (!shift) continue;

        const date = new Date(year, m, day);
        const basePayForShift = baseRate * shift.hours;
        const overtimeRate = shift.overtimeMultiplier > 0 ? shift.overtimeMultiplier / 100 : 0;
        const dailyEarnings = basePayForShift * (1 + overtimeRate);
        const formattedDate = `${String(m + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
        const shiftLabel = getShiftLabel(shift, language);
        const workTime = shift.startTime && shift.endTime ? `${shift.startTime}-${shift.endTime}` : 'undefined-undefined';
        const hours = shift.hours.toString();
        let earnings = '';
        if (language === 'en') {
          const earningsNum = parseFloat(dailyEarnings.toString().replace(/ /g, '').replace(',', '.'));
          if (!isNaN(earningsNum)) {
            if (Number.isInteger(earningsNum)) {
              earnings = earningsNum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, ' ');
            } else {
              earnings = earningsNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ').replace(/\./, ',');
            }
          }
        } else {
          earnings = dailyEarnings.toLocaleString('nb-NO').replace(/\s/g, ' ');
        }
        rows.push({
          date: formattedDate,
          dayOfWeek: weekday,
          shiftLabel,
          workTime,
          hours,
          earnings
        });
      }
    }
    return rows;
  };

  const handleYearlyDownload = (year: number) => {
    if (language === 'no' || language === 'en') {
      let allMonthsContent: string[] = [];
      let yearlyTotal = 0;
      for (let month = 0; month < 12; month++) {
        const rows = generateDownloadData(year, month, language, shiftTypes, baseRate, getWorkedDaysForMonth);
        const monthName = getMonthName(month);
        // Build summary for this month
        const monthWorkedDays = getWorkedDaysForMonth(year, month);
        // Skip months with no work days
        if (Object.keys(monthWorkedDays).length === 0) {
          continue;
        }
        const shiftSummary: { [shiftType: string]: { hours: number; earnings: number, overtime: number } } = {};
        let totalEarnings = 0;
        Object.entries(monthWorkedDays).forEach(([_, shiftType]) => {
          const shift = shiftTypes.find(s => s.type === shiftType);
          if (!shift) return;
          const basePayForShift = baseRate * shift.hours;
          const overtimeRate = shift.overtimeMultiplier > 0 ? shift.overtimeMultiplier / 100 : 0;
          const dailyEarnings = basePayForShift * (1 + overtimeRate);
          if (!shiftSummary[shiftType]) {
            shiftSummary[shiftType] = { hours: 0, earnings: 0, overtime: shift.overtimeMultiplier };
          }
          shiftSummary[shiftType].hours += shift.hours;
          shiftSummary[shiftType].earnings += dailyEarnings;
          totalEarnings += dailyEarnings;
        });
        yearlyTotal += totalEarnings;
        // Prepare summary lines
        const shiftTypeOrder = ['day', 'overtime', 'evening', 'night'];
        const shiftTypeLabelsNo: { [key: string]: string } = {
          day: 'Dag skift',
          overtime: 'Overtid',
          evening: 'Kvelds skift',
          night: 'Natt skift',
        };
        const shiftTypeLabelsEn: { [key: string]: string } = {
          day: 'Day shift',
          overtime: 'Overtime',
          evening: 'Evening shift',
          night: 'Night shift',
        };
        const shiftTypeLabels: { [key: string]: string } = language === 'no' ? { ...shiftTypeLabelsNo } : { ...shiftTypeLabelsEn };
        Object.keys(shiftSummary).forEach(type => {
          if (!Object.prototype.hasOwnProperty.call(shiftTypeLabels, type)) shiftTypeLabels[type] = type;
        });
        const summaryRows: string[] = [];
        summaryRows.push('');
        if (language === 'no') {
          summaryRows.push(`${monthName.charAt(0).toUpperCase() + monthName.slice(1)} Oversikt|Vaktype|Antall timer|Beløp`);
        } else {
          summaryRows.push(`${monthName.charAt(0).toUpperCase() + monthName.slice(1)} Overview|Shift Type|Total Hours|Amount`);
        }
        shiftTypeOrder.concat(Object.keys(shiftSummary).filter(t => !shiftTypeOrder.includes(t))).forEach(type => {
          if (shiftSummary[type]) {
            const hours = shiftSummary[type].hours.toLocaleString(language === 'no' ? 'nb-NO' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
            let earningsNum = shiftSummary[type].earnings;
            let earnings = '';
            if (language === 'en') {
              // English: show decimals only if needed, use space as thousands separator, comma as decimal
              if (Number.isInteger(earningsNum)) {
                earnings = earningsNum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, ' ');
              } else {
                earnings = earningsNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ').replace(/\./, ',');
              }
            } else {
              earnings = earningsNum.toLocaleString('nb-NO').replace(/\s/g, ' ');
            }
            const overtime = shiftSummary[type].overtime;
            let label = shiftTypeLabels[type];
            if (typeof overtime === 'number') {
              if (overtime > 0) {
                label += ` (${overtime}%)`;
              } else if (type === 'day') {
                label += language === 'no' ? ' (No OT)' : ' (No OT)';
              }
            }
            if (currencyConfig.position === 'before') {
              earnings = `${currencyConfig.currency}${earnings}`;
            } else {
              earnings = `${earnings} ${currencyConfig.currency}`;
            }
            if (language === 'no') {
              summaryRows.push(`${label}|${hours} timer|${earnings}`);
            } else {
              summaryRows.push(`${label}|${hours} hours|${earnings}`);
            }
          }
        });
        let totalEarningsStr = totalEarnings.toLocaleString(language === 'no' ? 'nb-NO' : 'en-US').replace(/\s/g, ' ');
        if (language === 'en') {
          if (Number.isInteger(totalEarnings)) {
            totalEarningsStr = totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, ' ');
          } else {
            totalEarningsStr = totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ').replace(/\./, ',');
          }
        }
        if (language === 'no') {
          summaryRows.push(`Totalt: ${currencyConfig.position === 'before' ? currencyConfig.currency + totalEarningsStr : totalEarningsStr + ' ' + currencyConfig.currency}`.trim());
        } else {
          summaryRows.push(`Total: ${currencyConfig.position === 'before' ? currencyConfig.currency + totalEarningsStr : totalEarningsStr + ' ' + currencyConfig.currency}`.trim());
        }
        // Build CSV content for this month
        const csvRows = [(language === 'no' ? CSV_HEADERS_NO : CSV_HEADERS), ...rows.map(row => {
          let date = row.date;
          if (language === 'no') {
            const [mm, dd, yyyy] = row.date.split('/');
            date = `${dd.padStart(2, '0')}.${mm.padStart(2, '0')}.${yyyy}`;
          }
          let workTime = row.workTime;
          if (workTime === 'undefined-undefined') {
            workTime = language === 'no' ? 'ikke definert - ikke definert' : 'not defined - not defined';
          }
          let earnings = row.earnings.replace(/kr|NOK|USD|\$/g, '').trim();
          if (language === 'en') {
            const earningsNum = parseFloat(earnings.replace(/ /g, '').replace(',', '.'));
            if (!isNaN(earningsNum)) {
              if (Number.isInteger(earningsNum)) {
                earnings = earningsNum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, ' ');
              } else {
                earnings = earningsNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ').replace(/\./, ',');
              }
            }
          }
          if (currencyConfig.position === 'before') {
            earnings = `${currencyConfig.currency}${earnings}`;
          } else {
            earnings = `${earnings} ${currencyConfig.currency}`;
          }
          let dayOfWeek = row.dayOfWeek;
          if (language === 'no') {
            const dayOfWeekMap: Record<string, string> = {
              'Mon': 'Man', 'Tue': 'Tir', 'Wed': 'Ons', 'Thu': 'Tor', 'Fri': 'Fre', 'Sat': 'Lør', 'Sun': 'Søn',
            };
            if (Object.prototype.hasOwnProperty.call(dayOfWeekMap, dayOfWeek)) {
              dayOfWeek = dayOfWeekMap[dayOfWeek as keyof typeof dayOfWeekMap];
            }
          }
          return [date, dayOfWeek, row.shiftLabel, workTime, row.hours, earnings];
        })];
        allMonthsContent.push(csvRows.map(row => row.join('|')).join('\n') + '\n' + summaryRows.join('\n'));
      }
      // 2 blank lines between each month, 3 after last
      const BOM = '\uFEFF';
      let yearlyTotalStr = yearlyTotal.toLocaleString(language === 'no' ? 'nb-NO' : 'en-US').replace(/\s/g, ' ');
      if (language === 'en') {
        if (Number.isInteger(yearlyTotal)) {
          yearlyTotalStr = yearlyTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, ' ');
        } else {
          yearlyTotalStr = yearlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ').replace(/\./, ',');
        }
      }
      let yearSummary = '';
      if (language === 'no') {
        yearSummary = `${'\n'.repeat(3)}Totale inntekter hele året (${year}): ${currencyConfig.position === 'before' ? currencyConfig.currency + yearlyTotalStr : yearlyTotalStr + ' ' + currencyConfig.currency}`.trim();
      } else {
        yearSummary = `${'\n'.repeat(3)}Total earnings for the year (${year}): ${currencyConfig.position === 'before' ? currencyConfig.currency + yearlyTotalStr : yearlyTotalStr + ' ' + currencyConfig.currency}`.trim();
      }
      const csvContent = BOM + allMonthsContent.join('\n\n') + '\n\n\n' + yearSummary;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `earnings_${year}_${language === 'no' ? 'NOK' : 'USD'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
    const rows = generateDownloadData(year, null, language, shiftTypes, baseRate, getWorkedDaysForMonth);
      downloadCSV(rows, CSV_HEADERS, `earnings_${year}_USD.csv`);
    }
  };

  const handleMonthlyDownload = (month: number) => {
    const rows = generateDownloadData(selectedYear, month, language, shiftTypes, baseRate, getWorkedDaysForMonth);
    const monthName = getMonthName(month);
    if (language === 'no' || language === 'en') {
      // Build summary (localized)
      const monthWorkedDays = getWorkedDaysForMonth(selectedYear, month);
      const shiftSummary: { [shiftType: string]: { hours: number; earnings: number, overtime: number } } = {};
      let totalEarnings = 0;
      Object.entries(monthWorkedDays).forEach(([_, shiftType]) => {
        const shift = shiftTypes.find(s => s.type === shiftType);
        if (!shift) return;
        const basePayForShift = baseRate * shift.hours;
        const overtimeRate = shift.overtimeMultiplier > 0 ? shift.overtimeMultiplier / 100 : 0;
        const dailyEarnings = basePayForShift * (1 + overtimeRate);
        if (!shiftSummary[shiftType]) {
          shiftSummary[shiftType] = { hours: 0, earnings: 0, overtime: shift.overtimeMultiplier };
        }
        shiftSummary[shiftType].hours += shift.hours;
        shiftSummary[shiftType].earnings += dailyEarnings;
        totalEarnings += dailyEarnings;
      });
      // Prepare summary lines
      const shiftTypeOrder = ['day', 'overtime', 'evening', 'night'];
      const shiftTypeLabelsNo: { [key: string]: string } = {
        day: 'Dag skift',
        overtime: 'Overtid',
        evening: 'Kvelds skift',
        night: 'Natt skift',
      };
      const shiftTypeLabelsEn: { [key: string]: string } = {
        day: 'Day shift',
        overtime: 'Overtime',
        evening: 'Evening shift',
        night: 'Night shift',
      };
      const shiftTypeLabels: { [key: string]: string } = language === 'no' ? { ...shiftTypeLabelsNo } : { ...shiftTypeLabelsEn };
      Object.keys(shiftSummary).forEach(type => {
        if (!Object.prototype.hasOwnProperty.call(shiftTypeLabels, type)) shiftTypeLabels[type] = type;
      });
      const summaryRows: string[] = [];
      summaryRows.push('');
      if (language === 'no') {
        summaryRows.push(`${monthName.charAt(0).toUpperCase() + monthName.slice(1)} Oversikt|Vaktype|Antall timer|Beløp`);
      } else {
        summaryRows.push(`${monthName.charAt(0).toUpperCase() + monthName.slice(1)} Overview|Shift Type|Total Hours|Amount`);
      }
      shiftTypeOrder.concat(Object.keys(shiftSummary).filter(t => !shiftTypeOrder.includes(t))).forEach(type => {
        if (shiftSummary[type]) {
          const hours = shiftSummary[type].hours.toLocaleString(language === 'no' ? 'nb-NO' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
          let earningsNum = shiftSummary[type].earnings;
          let earnings = '';
          if (language === 'en') {
            // English: show decimals only if needed, use space as thousands separator, comma as decimal
            if (Number.isInteger(earningsNum)) {
              earnings = earningsNum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, ' ');
            } else {
              earnings = earningsNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ').replace(/\./, ',');
            }
          } else {
            earnings = earningsNum.toLocaleString('nb-NO').replace(/\s/g, ' ');
          }
          const overtime = shiftSummary[type].overtime;
          let label = shiftTypeLabels[type];
          if (typeof overtime === 'number') {
            if (overtime > 0) {
              label += ` (${overtime}%)`;
            } else if (type === 'day') {
              label += language === 'no' ? ' (No OT)' : ' (No OT)';
            }
          }
          if (currencyConfig.position === 'before') {
            earnings = `${currencyConfig.currency}${earnings}`;
          } else {
            earnings = `${earnings} ${currencyConfig.currency}`;
          }
          if (language === 'no') {
            summaryRows.push(`${label}|${hours} timer|${earnings}`);
          } else {
            summaryRows.push(`${label}|${hours} hours|${earnings}`);
          }
        }
      });
      let totalEarningsStr = totalEarnings.toLocaleString(language === 'no' ? 'nb-NO' : 'en-US').replace(/\s/g, ' ');
      if (language === 'en') {
        if (Number.isInteger(totalEarnings)) {
          totalEarningsStr = totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, ' ');
        } else {
          totalEarningsStr = totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ').replace(/\./, ',');
        }
      }
      if (language === 'no') {
        summaryRows.push(`Totalt: ${currencyConfig.position === 'before' ? currencyConfig.currency + totalEarningsStr : totalEarningsStr + ' ' + currencyConfig.currency}`.trim());
      } else {
        summaryRows.push(`Total: ${currencyConfig.position === 'before' ? currencyConfig.currency + totalEarningsStr : totalEarningsStr + ' ' + currencyConfig.currency}`.trim());
      }
      // Build CSV content with localized date, day, and work time fallback
      const csvRows = [(language === 'no' ? CSV_HEADERS_NO : CSV_HEADERS), ...rows.map(row => {
        // Convert date from MM/DD/YYYY to DD.MM.YYYY for no, else keep as is
        let date = row.date;
        if (language === 'no') {
          const [mm, dd, yyyy] = row.date.split('/');
          date = `${dd.padStart(2, '0')}.${mm.padStart(2, '0')}.${yyyy}`;
        }
        let workTime = row.workTime;
        if (workTime === 'undefined-undefined') {
          workTime = language === 'no' ? 'ikke definert - ikke definert' : 'not defined - not defined';
        }
        // Replace currency in daily earnings
        let earnings = row.earnings.replace(/kr|NOK|USD|\$/g, '').trim();
        if (language === 'en') {
          const earningsNum = parseFloat(earnings.replace(/ /g, '').replace(',', '.'));
          if (!isNaN(earningsNum)) {
            if (Number.isInteger(earningsNum)) {
              earnings = earningsNum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, ' ');
            } else {
              earnings = earningsNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ').replace(/\./, ',');
            }
          }
        }
        if (currencyConfig.position === 'before') {
          earnings = `${currencyConfig.currency}${earnings}`;
        } else {
          earnings = `${earnings} ${currencyConfig.currency}`;
        }
        // Day of week
        let dayOfWeek = row.dayOfWeek;
        if (language === 'no') {
          const dayOfWeekMap: Record<string, string> = {
            'Mon': 'Man', 'Tue': 'Tir', 'Wed': 'Ons', 'Thu': 'Tor', 'Fri': 'Fre', 'Sat': 'Lør', 'Sun': 'Søn',
          };
          if (Object.prototype.hasOwnProperty.call(dayOfWeekMap, dayOfWeek)) {
            dayOfWeek = dayOfWeekMap[dayOfWeek as keyof typeof dayOfWeekMap];
          }
        }
        return [date, dayOfWeek, row.shiftLabel, workTime, row.hours, earnings];
      })];
      const csvContent = csvRows.map(row => row.join('|')).join('\n') + '\n' + summaryRows.join('\n');
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `earnings_${monthName}_${selectedYear}_${language === 'no' ? 'NOK' : 'USD'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      downloadCSV(rows, CSV_HEADERS, `earnings_${monthName}_${selectedYear}_USD.csv`);
    }
  };

  const downloadCSV = (rows: DownloadRow[], headers: string[], filename: string) => {
    // Pipe-separated, no quotes
    const csvRows = [
      headers,
      ...rows.map(row => [
        row.date,
        row.dayOfWeek,
        row.shiftLabel,
        row.workTime,
        row.hours,
        row.earnings
      ])
    ];
    const csvContent = csvRows.map(row => row.join('|')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get available years from workedDays
  const availableYears = Object.keys(workedDays)
    .map(Number)
    .sort((a, b) => b - a);

  const getMonthName = (month: number): string => {
    const monthNames = language === 'no' ? 
      ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] :
      ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[month];
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#121212', minHeight: '100vh' }}>
      <Settings
        onLanguageChange={(newLanguage) => {
          setLanguage(newLanguage);
        }}
        currentLanguage={language}
        availableYears={availableYears.length ? availableYears : [selectedYear]}
        onYearlyDownload={handleYearlyDownload}
        onCurrencyChange={setCurrencyConfig}
      />
      
      {/* Header */}
      <Typography 
        variant="h2" 
        sx={{ 
          color: '#fff', 
          textAlign: 'center', 
          mb: 2,
          fontWeight: 700,
          letterSpacing: '0.04em',
          fontSize: { xs: '2.2rem', md: '3rem' }
        }}
      >
        {t.title}
      </Typography>
      <Typography 
        variant="subtitle1" 
        sx={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          textAlign: 'center', 
          mb: 5,
          fontSize: { xs: '1.2rem', md: '1.35rem' },
          fontWeight: 400,
          letterSpacing: '0.01em'
        }}
      >
        {t.subtitle}
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <EarningsCard
            title={t.yearlyEarnings}
            amount={yearlyEarnings}
            subtitle={`${t.projectedEarnings} ${selectedYear}`}
            prefix={currencyConfig.currency}
            currencyPosition={currencyConfig.position}
            formatAmount={formatAmount}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <EarningsCard
            title={t.monthlyEarnings}
            amount={monthlyEarnings}
            subtitle={`${t.totalEarningsMonth} ${getMonthName(selectedMonth)}`}
            prefix={currencyConfig.currency}
            currencyPosition={currencyConfig.position}
            formatAmount={formatAmount}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <EarningsCard
            title={t.baseRate}
            amount={baseRate}
            subtitle={t.baseRateHour}
            prefix={currencyConfig.currency}
            currencyPosition={currencyConfig.position}
            editable={true}
            onAmountChange={handleBaseRateChange}
            formatAmount={formatAmount}
          />
        </Grid>
      </Grid>

      {/* Monthly Earnings Chart */}
      <Box
        sx={{
          bgcolor: '#1e1e1e',
          borderRadius: 2,
          p: 3,
          mb: 4,
          height: '400px',
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Typography 
          variant="h5" 
          sx={{ 
            color: '#00e676', 
            mb: 3,
            fontWeight: 700,
            fontSize: { xs: '1.4rem', md: '1.7rem' },
            letterSpacing: '0.01em'
          }}
        >
          {t.monthlyEarnings} ({selectedYear})
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255, 255, 255, 0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: '#fff', fontSize: 16, fontWeight: 600 }}
              axisLine={{ stroke: '#00e676' }}
            />
            <YAxis
              tick={{ fill: '#fff', fontSize: 16, fontWeight: 600 }}
              axisLine={{ stroke: '#00e676' }}
              tickFormatter={(value: number) => formatAmount(value, { isYAxisLabel: true })}
              tickCount={7}
              width={120}
            />
            <Tooltip content={<MemoizedTooltip />} />
            <Legend 
              formatter={formatLegendText as (value: string, entry: any) => string} 
            />
            {shiftTypes.map(shift => (
              <Bar
                key={shift.type}
                dataKey={`shiftData.${shift.type}.earnings`}
                name={
                  (shift.type === 'day' || shift.type === 'evening' || shift.type === 'night' || shift.type === 'overtime')
                    ? (language === 'no' ? shift.label : shift.labelEn)
                    : (language === 'no' ? shift.label : (shift.labelEn || shift.label))
                }
                stackId="a"
                fill={shift.color}
                stroke={shift.color === '#FFFFFF' ? 'rgba(255, 255, 255, 0.3)' : undefined}
                strokeWidth={shift.color === '#FFFFFF' ? 1 : 0}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Calendar */}
      <Calendar
        year={selectedYear}
        month={selectedMonth}
        workedDays={currentMonthWorkedDays}
        onDayClick={handleDayClick}
        onMonthChange={handleMonthChange}
        baseRate={baseRate}
        onShiftHoursChange={handleShiftHoursChange}
        onShiftTypesChange={handleShiftTypesChange}
        language={language}
        onMonthlyDownload={handleMonthlyDownload}
        currencyConfig={currencyConfig}
        formatAmount={formatAmount}
        shiftTypes={shiftTypes}
      />
    </Box>
  );
};

export default Dashboard; 