import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Language as LanguageIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';

interface SettingsProps {
  onLanguageChange: (lang: 'en' | 'no') => void;
  currentLanguage: 'en' | 'no';
  availableYears: number[];
  onYearlyDownload: (year: number) => void;
  onCurrencyChange?: (currency: { currency: string; position: 'before' | 'after' }) => void;
}

const DEFAULT_SHIFT_TYPES = [
  { type: 'day', label: 'Day Shift', color: '#FFFFFF', hours: 7.4, overtimeMultiplier: 0, startTime: '06:00', endTime: '14:10' },
  { type: 'evening', label: 'Evening Shift', color: '#22C55E', hours: 7.4, overtimeMultiplier: 50, startTime: '14:00', endTime: '22:10' },
  { type: 'night', label: 'Night Shift', color: '#178838', hours: 7.4, overtimeMultiplier: 60, startTime: '22:00', endTime: '06:10' },
  { type: 'overtime', label: 'Overtime', color: '#EF4444', hours: 10.1, overtimeMultiplier: 100, startTime: '11:30', endTime: '22:10' }
];

const Settings: React.FC<SettingsProps> = ({
  onLanguageChange,
  currentLanguage,
  availableYears,
  onYearlyDownload,
  onCurrencyChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears[availableYears.length - 1] || new Date().getFullYear()
  );
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('$');
  const [customCurrency, setCustomCurrency] = useState('');
  const [currencyPosition, setCurrencyPosition] = useState<'before' | 'after'>('before');
  const currencyList = ['kr', '$', '€', '£', '¥', '₹', '₣', '₩', '₽'];
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (lang: 'en' | 'no') => {
    onLanguageChange(lang);
    handleClose();
  };

  const handleDownloadClick = () => {
    setDownloadDialogOpen(true);
    handleClose();
  };

  const handleDownloadConfirm = () => {
    onYearlyDownload(selectedYear);
    setDownloadDialogOpen(false);
  };

  const handleCurrencyDialogOpen = () => {
    setCurrencyDialogOpen(true);
    setAnchorEl(null);
  };
  const handleCurrencyDialogClose = () => {
    setCurrencyDialogOpen(false);
    setCustomCurrency('');
  };
  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency);
    setCustomCurrency('');
  };
  const handleCurrencyDone = () => {
    const currency = customCurrency.trim() ? customCurrency.trim() : selectedCurrency;
    if (currency && typeof onCurrencyChange === 'function') {
      onCurrencyChange({ currency, position: currencyPosition });
    }
    setCurrencyDialogOpen(false);
  };

  const handleClearData = () => {
    localStorage.removeItem('workedDays');
    localStorage.removeItem('currencyConfig');
    localStorage.removeItem('baseRate');
    localStorage.setItem('shiftTypes', JSON.stringify(DEFAULT_SHIFT_TYPES));
    window.location.reload();
  };

  const translations = {
    en: {
      downloadYearlyData: 'Download Yearly Data',
      selectYear: 'Select Year',
      cancel: 'Cancel',
      download: 'Download',
      changeCurrency: '💎 Change Currency',
      setYourCurrency: 'Set Your Currency',
      typeYourCurrency: 'Type your currency',
      or: 'or',
      done: 'Done',
      currencySymbolPosition: 'Currency Symbol Position',
      before: 'before',
      after: 'after',
      beforeExample: (cur: string) => `${cur}2500`,
      afterExample: (cur: string) => `2500 ${cur}`,
    },
    no: {
      downloadYearlyData: 'Last ned data for året',
      selectYear: 'Velg året',
      cancel: 'Avbryt',
      download: 'Last ned',
      changeCurrency: '💎 Endre valuta',
      setYourCurrency: 'Velg din valuta',
      typeYourCurrency: 'Skriv din valuta',
      or: 'eller',
      done: 'Ferdig',
      currencySymbolPosition: 'Plassering av valutasymbol',
      before: 'før',
      after: 'etter',
      beforeExample: (cur: string) => `${cur}2500`,
      afterExample: (cur: string) => `2500 ${cur}`,
    },
  };

  const t = translations[currentLanguage];

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="large"
        sx={{
          color: '#00e676',
          position: 'absolute',
          top: 16,
          right: 16,
        }}
      >
        <SettingsIcon sx={{ fontSize: '2.2rem' }} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
          },
        }}
      >
        <MenuItem onClick={() => handleLanguageChange('en')}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img
              src="https://flagcdn.com/w20/gb.png"
              alt="English"
              style={{ width: 28, height: 'auto' }}
            />
            <Typography sx={{ color: currentLanguage === 'en' ? '#00e676' : '#fff', fontSize: '1.15rem', fontWeight: 500 }}>
              English
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('no')}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img
              src="https://flagcdn.com/w20/no.png"
              alt="Norwegian"
              style={{ width: 28, height: 'auto' }}
            />
            <Typography sx={{ color: currentLanguage === 'no' ? '#00e676' : '#fff', fontSize: '1.15rem', fontWeight: 500 }}>
              Norsk
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={handleCurrencyDialogOpen}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 500 }}>{t.changeCurrency}</Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={handleDownloadClick}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DownloadIcon sx={{ fontSize: '1.5rem' }} />
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 500 }}>{t.downloadYearlyData}</Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={() => setClearDialogOpen(true)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteIcon sx={{ fontSize: '1.5rem', color: '#ff5252' }} />
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 500, color: '#ff5252' }}>
              {currentLanguage === 'no' ? 'Fjern data' : 'Clear data'}
            </Typography>
          </Box>
        </MenuItem>
      </Menu>

      <Dialog
        open={downloadDialogOpen}
        onClose={() => setDownloadDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: '#fff',
            minWidth: 300,
          },
        }}
      >
        <DialogTitle sx={{ color: '#00e676', fontSize: '2rem', fontWeight: 700, textAlign: 'center' }}>{t.downloadYearlyData}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1, fontWeight: 500 }}>
              {t.selectYear}
            </Typography>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              sx={{
                color: '#fff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00e676',
                },
              }}
            >
              {availableYears.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDownloadDialogOpen(false)}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            {t.cancel}
          </Button>
          <Button
            onClick={handleDownloadConfirm}
            variant="contained"
            sx={{
              bgcolor: '#00e676',
              color: '#000',
              '&:hover': {
                bgcolor: '#00c853',
              },
            }}
          >
            {t.download}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={currencyDialogOpen}
        onClose={handleCurrencyDialogClose}
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: '#fff',
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ color: '#00e676', textAlign: 'center', fontWeight: 700 }}>{t.setYourCurrency}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <Select
              value={selectedCurrency}
              onChange={e => handleCurrencySelect(e.target.value as string)}
              IconComponent={ArrowDropDownIcon}
              sx={{
                color: '#fff',
                bgcolor: '#232323',
                borderRadius: 1,
                mb: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.23)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00e676',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00e676',
                },
              }}
            >
              {currencyList.map(cur => (
                <MenuItem key={cur} value={cur}>{cur}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography align="center" sx={{ color: '#fff', my: 1 }}>{t.or}</Typography>
          <TextField
            fullWidth
            variant="outlined"
            value={customCurrency}
            onChange={e => setCustomCurrency(e.target.value)}
            placeholder={t.typeYourCurrency}
            sx={{
              bgcolor: '#232323',
              borderRadius: 1,
              input: { color: '#fff' },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.23)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00e676',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00e676',
              },
              mt: 1,
            }}
          />
          <Box sx={{ mt: 3 }}>
            <FormLabel sx={{ color: '#fff', mb: 1, display: 'block' }}>{t.currencySymbolPosition}</FormLabel>
            <RadioGroup
              row
              value={currencyPosition}
              onChange={e => setCurrencyPosition(e.target.value as 'before' | 'after')}
            >
              <FormControlLabel
                value="before"
                control={<Radio sx={{ color: '#00e676', '&.Mui-checked': { color: '#00e676' } }} />}
                label={<span>{t.before} (<b>{t.beforeExample(customCurrency ? customCurrency : selectedCurrency)}</b>)</span>}
              />
              <FormControlLabel
                value="after"
                control={<Radio sx={{ color: '#00e676', '&.Mui-checked': { color: '#00e676' } }} />}
                label={<span>{t.after} (<b>{t.afterExample(customCurrency ? customCurrency : selectedCurrency)}</b>)</span>}
              />
            </RadioGroup>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCurrencyDialogClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>{t.cancel}</Button>
          <Button onClick={handleCurrencyDone} variant="contained" sx={{ bgcolor: '#00e676', color: '#000', '&:hover': { bgcolor: '#00c853' } }}>{t.done}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: '#fff',
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ color: '#ff5252', textAlign: 'center', fontWeight: 700 }}>
          {currentLanguage === 'no' ? 'Fjern all data?' : 'Clear all data?'}
        </DialogTitle>
        <DialogContent>
          <Typography align="center" sx={{ color: '#fff', mb: 2 }}>
            {currentLanguage === 'no'
              ? 'Dette vil slette alle lagrede skift, kalenderdata og innstillinger, men beholde standard vakttyper.'
              : 'This will delete all saved shifts, calendar data, and settings, but keep the default shift types.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setClearDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {currentLanguage === 'no' ? 'Avbryt' : 'Cancel'}
          </Button>
          <Button onClick={handleClearData} variant="contained" sx={{ bgcolor: '#ff5252', color: '#fff', '&:hover': { bgcolor: '#d32f2f' } }}>
            {currentLanguage === 'no' ? 'Fjern data' : 'Clear data'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Settings; 