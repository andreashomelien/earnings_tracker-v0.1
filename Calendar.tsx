import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, IconButton, Box, Button, TextField, InputAdornment } from '@mui/material';
import { ChevronLeft, ChevronRight, Edit as EditIcon, Check as CheckIcon, Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon, Backspace as BackspaceIcon, Download as DownloadIcon } from '@mui/icons-material';
import { SxProps, Theme } from '@mui/material/styles';

interface CalendarProps {
  year: number;
  month: number;
  workedDays: { [key: number]: string };
  onDayClick: (day: number, shiftType: string) => void;
  onMonthChange: (month: number, year: number) => void;
  baseRate: number;
  onShiftHoursChange: (shiftType: string, hours: number, overtimeMultiplier: number) => void;
  onShiftTypesChange: (shiftTypes: ShiftConfig[]) => void;
  language: 'en' | 'no';
  onMonthlyDownload: (month: number) => void;
  currencyConfig: { currency: string; position: 'before' | 'after' };
  formatAmount: (amount: number, opts?: { isYAxisLabel?: boolean }) => string;
  shiftTypes: ShiftConfig[];
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

interface NewShiftValues {
  isCreating: boolean;
  label: string;
  hours: string;
  color: string;
  overtimeMultiplier: string;
  startTime: string;
  endTime: string;
}

interface CalendarData {
  [key: string]: string;
}

interface NorwegianHoliday {
  date: Date;
  name: string;
}

interface CalendarDay {
  date: number;
  isCurrentMonth: boolean;
}

const PRESET_COLORS = [
  '#22C55E', // Green
  '#178838', // dark green
  '#2196f3', // Blue
  '#00bcd4',  // Cyan
  '#EF4444', // Red
  '#ff9800', // Orange
  '#ffeb3b', // Yellow
  '#795548', // Brown
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#9c27b0', // Purple
  '#607d8b', // Blue Grey
  '#FFFFFF', // white
];

const translations = {
  en: {
    monthNames: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    selectShiftType: 'Select Shift Type',
    addNewShift: 'Add New Shift',
    eraseShifts: 'Erase Shifts',
    shiftName: 'Shift Name',
    hours: 'hours',
    overtime: 'Overtime %',
    color: 'Color:',
    startTime: 'Start Time',
    endTime: 'End Time',
    cancel: 'Cancel',
    download: 'Download'
  },
  no: {
    monthNames: [
      'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
    ],
    weekDays: ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'],
    selectShiftType: 'Velg vakttype',
    addNewShift: 'Legg til ny vakt',
    eraseShifts: 'Slett vakter',
    shiftName: 'Vaktnavn',
    hours: 'timer',
    overtime: 'Overtid %',
    color: 'Farge:',
    startTime: 'Start tid',
    endTime: 'Slutt tid',
    cancel: 'Avbryt',
    download: 'Last ned'
  }
};

const getNorwegianHolidays = (year: number): NorwegianHoliday[] => {
  const holidays: NorwegianHoliday[] = [
    { date: new Date(year, 0, 1), name: 'Første nyttårsdag' },
    { date: new Date(year, 3, 13), name: 'Palmesøndag' },
    { date: new Date(year, 3, 17), name: 'Skjærtorsdag' },
    { date: new Date(year, 3, 18), name: 'Langfredag' },
    { date: new Date(year, 3, 20), name: 'Første påskedag' },
    { date: new Date(year, 3, 21), name: 'Andre påskedag' },
    { date: new Date(year, 4, 1), name: 'Arbeidernes dag' },
    { date: new Date(year, 4, 8), name: 'Frigjøringsdagen' },
    { date: new Date(year, 4, 17), name: 'Grunnlovsdag' },
    { date: new Date(year, 4, 29), name: 'Kristi himmelfartsdag' },
    { date: new Date(year, 5, 8), name: 'Første pinsedag' },
    { date: new Date(year, 5, 9), name: 'Andre pinsedag' },
    { date: new Date(year, 11, 25), name: 'Første juledag' },
    { date: new Date(year, 11, 26), name: 'Andre juledag' }
  ];
  return holidays;
};

const isNorwegianHoliday = (date: Date, holidays: NorwegianHoliday[]): NorwegianHoliday | undefined => {
  return holidays.find(holiday => 
    holiday.date.getDate() === date.getDate() &&
    holiday.date.getMonth() === date.getMonth()
  );
};

const Calendar: React.FC<CalendarProps> = ({
  year,
  month,
  workedDays,
  onDayClick,
  onMonthChange,
  baseRate,
  onShiftHoursChange,
  onShiftTypesChange,
  language,
  onMonthlyDownload,
  currencyConfig,
  formatAmount,
  shiftTypes
}) => {
  const [selectedShiftType, setSelectedShiftType] = useState<string>('day');
  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    hours: string;
    label: string;
    color: string;
    overtimeMultiplier: string;
    startTime: string;
    endTime: string;
  }>({
    hours: '',
    label: '',
    color: '',
    overtimeMultiplier: '150',
    startTime: '',
    endTime: ''
  });

  const [newShift, setNewShift] = useState<NewShiftValues>({
    isCreating: false,
    label: '',
    hours: '8',
    color: PRESET_COLORS[0],
    overtimeMultiplier: '150',
    startTime: '',
    endTime: ''
  });

  const [isErasing, setIsErasing] = useState(false);
  const [norwegianHolidays, setNorwegianHolidays] = useState<NorwegianHoliday[]>([]);

  const t = translations[language];

  // Replace monthNames and weekDays arrays with translations
  const monthNames = t.monthNames;
  const weekDays = t.weekDays;

  // Use shiftTypes from props
  // const [shiftTypes, setShiftTypes] = useState<ShiftConfig[]>(...);
  const setShiftTypes = onShiftTypesChange;

  useEffect(() => {
    setNorwegianHolidays(getNorwegianHolidays(year));
  }, [year]);

  const handleEditStart = (shiftType: string) => {
    const shift = shiftTypes.find(s => s.type === shiftType);
    if (shift) {
      setEditValues({
        hours: shift.hours.toString(),
        label: shift.label,
        color: shift.color,
        overtimeMultiplier: shift.overtimeMultiplier.toString(),
        startTime: shift.startTime || '',
        endTime: shift.endTime || ''
      });
      setEditingShift(shiftType);
    }
  };

  const handleEditSave = () => {
    if (editingShift) {
      const hours = parseFloat(editValues.hours);
      const overtimeMultiplier = parseFloat(editValues.overtimeMultiplier);
      if (!isNaN(hours) && hours > 0 && !isNaN(overtimeMultiplier) && overtimeMultiplier >= 0) {
        const newShiftTypes = shiftTypes.map(shift => 
          shift.type === editingShift ? {
            ...shift,
            hours,
            label: editValues.label,
            color: editValues.color,
            overtimeMultiplier,
            startTime: editValues.startTime,
            endTime: editValues.endTime
          } : shift
        );
        setShiftTypes(newShiftTypes);
        // Notify parent component about hours and overtime changes
        onShiftHoursChange(editingShift, hours, overtimeMultiplier);
        // Notify parent about shift types update
        onShiftTypesChange(newShiftTypes);
      }
      setEditingShift(null);
      setEditValues({
        hours: '',
        label: '',
        color: '',
        overtimeMultiplier: '150',
        startTime: '',
        endTime: ''
      });
    }
  };

  const handleEditCancel = () => {
    setEditingShift(null);
    setEditValues({
      hours: '',
      label: '',
      color: '',
      overtimeMultiplier: '150',
      startTime: '',
      endTime: ''
    });
  };

  const handleAddNewShift = () => {
    setNewShift(prev => ({ ...prev, isCreating: true }));
  };

  const handleSaveNewShift = () => {
    const hours = parseFloat(newShift.hours);
    const overtimeMultiplier = parseFloat(newShift.overtimeMultiplier);
    if (newShift.label && !isNaN(hours) && hours > 0 && !isNaN(overtimeMultiplier) && overtimeMultiplier >= 0) {
      const newShiftType: ShiftConfig = {
        type: newShift.label.toLowerCase().replace(/\s+/g, '_'),
        label: newShift.label,
        hours,
        color: newShift.color,
        overtimeMultiplier,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        labelEn: ''
      };
      const newShiftTypes = [...shiftTypes, newShiftType];
      setShiftTypes(newShiftTypes);
      // Notify parent about shift types update
      onShiftTypesChange(newShiftTypes);
    }
    setNewShift({
      isCreating: false,
      label: '',
      hours: '8',
      color: PRESET_COLORS[0],
      overtimeMultiplier: '150',
      startTime: '',
      endTime: ''
    });
  };

  const handleCancelNewShift = () => {
    setNewShift({
      isCreating: false,
      label: '',
      hours: '8',
      color: PRESET_COLORS[0],
      overtimeMultiplier: '150',
      startTime: '',
      endTime: ''
    });
  };

  const handleDeleteShift = (shiftType: string) => {
    const newShiftTypes = shiftTypes.filter(shift => shift.type !== shiftType);
    setShiftTypes(newShiftTypes);
    // Notify parent about shift types update
    onShiftTypesChange(newShiftTypes);
    setIsErasing(true);
  };

  const isToday = (date: number) => {
    const today = new Date();
    return today.getFullYear() === year && 
           today.getMonth() === month && 
           today.getDate() === date;
  };

  const getCalendarDays = () => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    // Calculate days needed from previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const prevMonthDays = [];
    for (let i = 0; i < adjustedFirstDay; i++) {
      prevMonthDays.unshift({
        date: daysInPrevMonth - i,
        isCurrentMonth: false
      });
    }
    
    // Current month's days
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentMonthDays = Array.from(
      { length: daysInMonth },
      (_, i) => ({ date: i + 1, isCurrentMonth: true })
    );
    
    // Calculate days needed from next month
    const totalDaysShown = 42; // 6 rows × 7 days
    const nextMonthDays = Array.from(
      { length: totalDaysShown - (prevMonthDays.length + currentMonthDays.length) },
      (_, i) => ({ date: i + 1, isCurrentMonth: false })
    );
    
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };

  const getDayStyles = (day: { date: number; isCurrentMonth: boolean }): SxProps<Theme> => {
    const currentDate = new Date(year, month, day.date);
    const holiday = day.isCurrentMonth ? isNorwegianHoliday(currentDate, norwegianHolidays) : undefined;
    const baseStyles: SxProps<Theme> = {
      height: '130px',
      display: 'flex',
      flexDirection: 'column',
      padding: '8px',
      position: 'relative',
      cursor: day.isCurrentMonth ? (isErasing ? 'not-allowed' : 'pointer') : 'default',
      opacity: day.isCurrentMonth ? 1 : 0.3,
      transition: 'all 0.2s ease',
      border: holiday ? '1px solid rgba(255, 0, 0, 0.5)' : undefined,
      borderRadius: holiday ? '8px' : undefined,
      background: holiday ? 'linear-gradient(135deg, rgba(255, 0, 0, 0.1) 0%, rgba(255, 0, 0, 0.2) 100%)' : undefined,
      '&:hover': day.isCurrentMonth ? {
        bgcolor: isErasing && workedDays[day.date] ? 'rgba(255, 82, 82, 0.1)' : 'rgba(255, 255, 255, 0.1)',
        '& .eraser-hover': {
          opacity: isErasing && workedDays[day.date] ? 1 : 0
        }
      } : {}
    };

    return baseStyles;
  };

  const getDateStyles = (isCurrentMonth: boolean, isCurrentDay: boolean, isHoliday: boolean): SxProps<Theme> => ({
    color: isHoliday ? '#ff6b6b' : '#fff',
    opacity: isCurrentMonth ? 1 : 0.3,
    position: 'relative',
    zIndex: 1,
    ...(isCurrentDay && {
      '&::after': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '35px',
        height: '35px',
        border: '2px solid #00e676',
        borderRadius: '50%',
        zIndex: -1
      }
    })
  });

  const calendarDays = getCalendarDays();

  // Split the calendar days into weeks
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const calculateShiftEarnings = (shiftType: string): number => {
    const shift = shiftTypes.find(s => s.type === shiftType);
    if (!shift) return 0;

    const basePayForShift = baseRate * shift.hours;
    // Only apply overtime if multiplier is greater than 0
    const overtimeRate = shift.overtimeMultiplier > 0 ? shift.overtimeMultiplier / 100 : 0;
    
    return basePayForShift * (1 + overtimeRate);
  };

  const calculateMonthlyEarnings = (year: number, month: number): number => {
    let total = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const shiftType = workedDays[day];
      if (shiftType) {
        total += calculateShiftEarnings(shiftType);
      }
    }

    return total;
  };

  const calculateYearlyEarnings = (year: number): number => {
    let total = 0;
    for (let month = 0; month < 12; month++) {
      total += calculateMonthlyEarnings(year, month);
    }
    return total;
  };

  const formatHours = (hours: number, language: 'en' | 'no'): string => {
    return `${hours} ${language === 'no' ? 'timer' : 'hours'}`;
  };

  const calculateShiftPay = (hours: number, overtimeMultiplier: number): number => {
    const basePayForShift = baseRate * hours;
    return basePayForShift * (1 + overtimeMultiplier / 100);
  };

  const getAchievementEmojis = (dailyEarnings: number, baseRate: number): string => {
    if (dailyEarnings >= baseRate * 25) return '🎆🎉';
    if (dailyEarnings >= baseRate * 20) return '💎🏆';
    if (dailyEarnings >= baseRate * 15) return '🥇💰';
    if (dailyEarnings >= baseRate * 10) return '💵';
    return '';
  };

  const calculateDailyEarnings = (shiftType: string, baseRate: number): number => {
    const shift = shiftTypes.find(s => s.type === shiftType);
    if (!shift) return 0;
    const basePayForShift = baseRate * shift.hours;
    return basePayForShift * (1 + shift.overtimeMultiplier / 100);
  };

  const renderShiftEditor = (shift: ShiftConfig) => {
    if (editingShift === shift.type) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', mt: 2 }}>
          <TextField
            label={t.shiftName}
            value={editValues.label}
            onChange={(e) => setEditValues(prev => ({ ...prev, label: e.target.value }))}
            size="small"
            fullWidth
            InputProps={{
              sx: { 
                color: '#fff',
                fontSize: '1.2rem',
                fontWeight: 600,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: shift.color,
                },
              }
            }}
            InputLabelProps={{
              sx: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 }
            }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={t.hours}
              value={editValues.hours}
              onChange={(e) => setEditValues(prev => ({ ...prev, hours: e.target.value }))}
              type="number"
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">{t.hours}</InputAdornment>,
                sx: { color: '#fff', fontSize: '1.2rem', fontWeight: 600, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23)' } }
              }}
              InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 } }}
            />
            <TextField
              label={t.overtime}
              value={editValues.overtimeMultiplier}
              onChange={(e) => setEditValues(prev => ({ ...prev, overtimeMultiplier: e.target.value }))}
              type="number"
              size="small"
              inputProps={{ min: "0" }}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                sx: { color: '#fff', fontSize: '1.2rem', fontWeight: 600, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23)' } }
              }}
              InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 } }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 }}>{t.startTime}</Typography>
              <TextField
                value={editValues.startTime}
                onChange={(e) => setEditValues(prev => ({ ...prev, startTime: e.target.value }))}
                type="time"
                size="small"
                InputProps={{ sx: { color: '#fff', fontSize: '1.2rem', fontWeight: 600, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23)' } } }}
                InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 } }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 }}>{t.endTime}</Typography>
              <TextField
                value={editValues.endTime}
                onChange={(e) => setEditValues(prev => ({ ...prev, endTime: e.target.value }))}
                type="time"
                size="small"
                InputProps={{ sx: { color: '#fff', fontSize: '1.2rem', fontWeight: 600, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23)' } } }}
                InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 } }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography sx={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600 }}>{t.color}</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((color) => (
                <Box
                  key={color}
                  onClick={() => setEditValues(prev => ({ ...prev, color }))}
                  sx={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    bgcolor: color,
                    cursor: 'pointer',
                    border: editValues.color === color ? '2px solid #fff' : '2px solid rgba(255, 255, 255, 0.23)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      border: '2px solid rgba(255, 255, 255, 0.5)',
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
            <IconButton 
              size="large" 
              onClick={() => handleDeleteShift(shift.type)}
              sx={{ color: '#ff5252' }}
            >
              <DeleteIcon sx={{ fontSize: '2rem' }} />
            </IconButton>
            <IconButton 
              size="large" 
              onClick={handleEditSave}
              sx={{ color: '#00e676' }}
            >
              <CheckIcon sx={{ fontSize: '2rem' }} />
            </IconButton>
            <IconButton 
              size="large" 
              onClick={handleEditCancel}
              sx={{ color: '#ff5252' }}
            >
              <CloseIcon sx={{ fontSize: '2rem' }} />
            </IconButton>
          </Box>
        </Box>
      );
    }

    const formatShiftAmount = (amount: number): string => {
      const formatted = formatAmount(amount);
      return `(${formatted})`;
    };

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ color: '#fff', minWidth: '150px', fontSize: '1.25rem' }}>
          {formatHours(shift.hours, language)} {formatShiftAmount(calculateShiftPay(shift.hours, shift.overtimeMultiplier))}
          <Typography component="span" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1em', ml: 1 }}>
            {shift.overtimeMultiplier > 0 ? `${t.overtime.replace('%', '')}: ${shift.overtimeMultiplier}%` : 'No OT'}
          </Typography>
          {shift.startTime && shift.endTime && (
            <Typography component="span" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1em', ml: 1 }}>
              ({shift.startTime}-{shift.endTime})
            </Typography>
          )}
        </Typography>
        <IconButton 
          size="large" 
          onClick={() => handleEditStart(shift.type)}
          sx={{ color: shift.color }}
        >
          <EditIcon sx={{ fontSize: '2rem' }} />
        </IconButton>
      </Box>
    );
  };

  const handleDayClick = (date: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    
    if (isErasing) {
      onDayClick(parseInt(date), '');
    } else if (selectedShiftType) {
      onDayClick(parseInt(date), selectedShiftType);
    }
  };

  const handleDownloadCSV = () => {
    // Create CSV header
    const headers = ['Date', 'Day Type', 'Shift Type', 'Work Time', 'Paid Hours', 'Total Earnings'];
    const csvRows = [headers];

    // Get all days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Generate data for each day
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      const shiftType = workedDays[day];
      
      if (shiftType) {
        const shift = shiftTypes.find(s => s.type === shiftType);
        if (shift) {
          const earnings = calculateShiftEarnings(shiftType);
          const formattedDate = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
          const workTime = `${shift.startTime}-${shift.endTime}`;
          
          csvRows.push([
            formattedDate,
            dayOfWeek,
            shift.label,
            workTime,
            shift.hours.toString(),
            earnings.toFixed(2)
          ]);
        }
      }
    }

    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join('|')).join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `earnings_${monthNames[month]}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    let newMonth = month;
    let newYear = year;

    if (direction === 'next') {
      if (month === 11) {
        newMonth = 0;
        newYear = year + 1;
      } else {
        newMonth = month + 1;
      }
    } else {
      if (month === 0) {
        newMonth = 11;
        newYear = year - 1;
      } else {
        newMonth = month - 1;
      }
    }

    onMonthChange(newMonth, newYear);
  };

  return (
    <>
    <Card sx={{ 
      width: '100%', 
      bgcolor: '#1e1e1e',
      boxShadow: 'none',
      borderRadius: 2,
    }}>
      <CardContent sx={{ p: 3 }}>
        {/* Month and Year Header */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 4,
          }}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              color: '#00e676',
              fontSize: '2.4rem',
              fontWeight: 700,
            }}
          >
            {monthNames[month]} {year}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton 
              onClick={() => handleMonthChange('prev')} 
              size="large"
              sx={{
                width: '44px',
                height: '44px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                color: '#fff',
              }}
            >
              <ChevronLeft sx={{ fontSize: '2rem' }} />
            </IconButton>
            <IconButton 
              onClick={() => handleMonthChange('next')} 
              size="large"
              sx={{
                width: '44px',
                height: '44px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                color: '#fff',
              }}
            >
              <ChevronRight sx={{ fontSize: '2rem' }} />
            </IconButton>
            <IconButton
              onClick={() => onMonthlyDownload(month)}
              size="large"
              sx={{
                width: '44px',
                height: '44px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                color: '#00e676',
                ml: 1,
                '&:hover': {
                  bgcolor: 'rgba(0, 230, 118, 0.1)',
                }
              }}
            >
              <DownloadIcon sx={{ fontSize: '2rem' }} />
            </IconButton>
          </Box>
        </Box>

        {/* Calendar Grid */}
        <Box>
          {/* Weekday Headers */}
            <Grid container spacing={6}>
            {weekDays.map((day) => (
              <Grid item xs key={day}>
                <Typography
                  sx={{
                      color: (day === 'Sat' || day === 'Sun' || day === 'Lør' || day === 'Søn') ? '#ff4444' : '#00e676',
                      fontSize: '20px',
                      fontWeight: 500,
                      mb: 3,
                  }}
                >
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

            {/* Calendar Days - Week by Week */}
            {weeks.map((week, weekIndex) => (
              <Grid container spacing={6} key={weekIndex} sx={{ mb: 3 }}>
                {week.map((day, dayIndex) => (
                  <Grid item xs key={dayIndex}>
                <Box
                      onClick={() => handleDayClick(day.date.toString(), day.isCurrentMonth)}
                      sx={getDayStyles(day)}
                    >
                      <Box sx={{ 
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '6px',
                        width: '100%',
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <Typography sx={{
                            ...getDateStyles(
                              day.isCurrentMonth, 
                              isToday(day.date),
                              !!isNorwegianHoliday(new Date(year, month, day.date), norwegianHolidays)
                            ),
                            flexShrink: 0,
                            fontSize: '1.5rem'
                          }}>
                            {day.date}
                          </Typography>
                          {day.isCurrentMonth && isNorwegianHoliday(new Date(year, month, day.date), norwegianHolidays) && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '1.1rem',
                                color: '#ff6b6b',
                                display: 'inline',
                                lineHeight: 1.2,
                                fontWeight: 600
                              }}
                            >
                              {isNorwegianHoliday(new Date(year, month, day.date), norwegianHolidays)?.name}
                            </Typography>
                          )}
                        </Box>
                        {day.isCurrentMonth && workedDays[day.date] && (
                          <Typography
                            sx={{
                              fontSize: '1.3rem',
                              lineHeight: 1,
                              marginLeft: 'auto',
                              letterSpacing: '-1px'
                            }}
                          >
                            {getAchievementEmojis(calculateDailyEarnings(workedDays[day.date], baseRate), baseRate)}
                          </Typography>
                        )}
                      </Box>
                      {day.isCurrentMonth && workedDays[day.date] && (
                        <>
                          <Typography
                            variant="caption"
                            sx={{
                              position: 'absolute',
                              bottom: '16px',
                              left: '8px',
                              fontSize: '1.05rem',
                              color: shiftTypes.find(s => s.type === workedDays[day.date])?.color || '#00e676',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 'calc(100% - 16px)',
                              fontWeight: 600
                            }}
                          >
                            {shiftTypes.find(s => s.type === workedDays[day.date])?.label}
                          </Typography>
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: '8px',
                              left: '8px',
                              right: '8px',
                              height: '4px',
                              borderRadius: '2px',
                              backgroundColor: shiftTypes.find(s => s.type === workedDays[day.date])?.color || '#00e676'
                            }}
                          />
                        </>
                      )}
                      {isErasing && day.isCurrentMonth && workedDays[day.date] && (
                        <BackspaceIcon 
                          className="eraser-hover"
                          sx={{ 
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            opacity: 0,
                            color: '#ff5252',
                            transition: 'opacity 0.2s ease',
                            zIndex: 2
                          }} 
                        />
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Shift Type Selector */}
      <Card sx={{ 
        width: '100%', 
        bgcolor: '#1e1e1e',
        boxShadow: 'none',
        borderRadius: 2,
        mt: 3 
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#fff', fontSize: '2rem', fontWeight: 700 }}>{t.selectShiftType}</Typography>
            {shiftTypes.map((shift) => (
              <Box key={shift.type} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Button
                  onClick={() => {
                    setSelectedShiftType(shift.type);
                    setIsErasing(false);
                  }}
                  variant={selectedShiftType === shift.type ? 'contained' : 'outlined'}
                  sx={{
                    bgcolor: selectedShiftType === shift.type ? shift.color : 'transparent',
                    borderColor: shift.color,
                    color: selectedShiftType === shift.type ? '#000' : shift.color,
                    '&:hover': {
                      bgcolor: selectedShiftType === shift.type ? shift.color : `${shift.color}22`,
                      borderColor: shift.color,
                    },
                    minWidth: '150px',
                    height: '56px',
                    fontSize: '1.4rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.5em',
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3em', width: '100%', whiteSpace: 'nowrap' }}>
                    {(shift.type === 'day' || shift.type === 'evening' || shift.type === 'night' || shift.type === 'overtime')
                      ? (language === 'no' ? shift.label : shift.labelEn)
                      : shift.label}
                  </span>
                </Button>
                {renderShiftEditor(shift)}
              </Box>
            ))}
            
            {/* Add New Shift and Eraser Section */}
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              {newShift.isCreating ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, p: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                  <TextField
                    label={t.shiftName}
                    value={newShift.label}
                    onChange={(e) => setNewShift(prev => ({ ...prev, label: e.target.value }))}
                    size="small"
                    fullWidth
                    InputProps={{
                      sx: { 
                        color: '#fff',
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.23)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.23)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: newShift.color,
                        },
                      }
                    }}
                    InputLabelProps={{
                      sx: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 }
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label={t.hours}
                      value={newShift.hours}
                      onChange={(e) => setNewShift(prev => ({ ...prev, hours: e.target.value }))}
                      type="number"
                      size="small"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">{t.hours}</InputAdornment>,
                        sx: { color: '#fff', fontSize: '1.2rem', fontWeight: 600, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23)' } }
                      }}
                      InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 } }}
                    />
                    <TextField
                      label={t.overtime}
                      value={newShift.overtimeMultiplier}
                      onChange={(e) => setNewShift(prev => ({ ...prev, overtimeMultiplier: e.target.value }))}
                      type="number"
                      size="small"
                      inputProps={{ min: "0" }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        sx: { color: '#fff', fontSize: '1.2rem', fontWeight: 600, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23)' } }
                      }}
                      InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 } }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 }}>{t.startTime}</Typography>
                      <TextField
                        value={newShift.startTime}
                        onChange={(e) => setNewShift(prev => ({ ...prev, startTime: e.target.value }))}
                        type="time"
                        size="small"
                        InputProps={{ sx: { color: '#fff', fontSize: '1.2rem', fontWeight: 600, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23)' } } }}
                        InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 } }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 }}>{t.endTime}</Typography>
                      <TextField
                        value={newShift.endTime}
                        onChange={(e) => setNewShift(prev => ({ ...prev, endTime: e.target.value }))}
                        type="time"
                        size="small"
                        InputProps={{ sx: { color: '#fff', fontSize: '1.2rem', fontWeight: 600, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23)' } } }}
                        InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.2rem', fontWeight: 600 } }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography sx={{ color: '#fff' }}>{t.color}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {PRESET_COLORS.map((color) => (
                        <Box
                          key={color}
                          onClick={() => setNewShift(prev => ({ ...prev, color }))}
                          sx={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '4px',
                            bgcolor: color,
                            cursor: 'pointer',
                            border: newShift.color === color ? '2px solid #fff' : '2px solid rgba(255, 255, 255, 0.23)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              border: '2px solid rgba(255, 255, 255, 0.5)',
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                    <IconButton 
                      size="large" 
                      onClick={handleSaveNewShift}
                      sx={{ color: '#00e676' }}
                    >
                      <CheckIcon sx={{ fontSize: '2rem' }} />
                    </IconButton>
                    <IconButton 
                      size="large" 
                      onClick={handleCancelNewShift}
                      sx={{ color: '#ff5252' }}
                    >
                      <CloseIcon sx={{ fontSize: '2rem' }} />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <>
                  <Button
                    onClick={handleAddNewShift}
                    variant="outlined"
                    startIcon={<AddIcon sx={{ fontSize: '2rem' }} />}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                      fontSize: '1.2rem',
                      fontWeight: 600,
                      px: 3,
                      height: '56px',
                      '&:hover': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        bgcolor: 'rgba(255, 255, 255, 0.05)'
                      }
                    }}
                  >
                    {t.addNewShift}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedShiftType('');
                      setIsErasing(!isErasing);
                    }}
                    variant={isErasing ? 'contained' : 'outlined'}
                    startIcon={<BackspaceIcon sx={{ fontSize: '2rem' }} />}
                    sx={{
                      color: isErasing ? '#000' : 'rgba(255, 255, 255, 0.7)',
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                      bgcolor: isErasing ? '#ff5252' : 'transparent',
                      fontSize: '1.2rem',
                      fontWeight: 600,
                      px: 3,
                      height: '56px',
                      '&:hover': {
                        bgcolor: isErasing ? '#ff5252' : 'rgba(255, 255, 255, 0.05)',
                        borderColor: isErasing ? '#ff5252' : 'rgba(255, 255, 255, 0.5)',
                      }
                    }}
                  >
                    {t.eraseShifts}
                  </Button>
                </>
              )}
            </Box>
        </Box>
      </CardContent>
    </Card>
    </>
  );
};

export default Calendar; 