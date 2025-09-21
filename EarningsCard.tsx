import React, { useState } from 'react';
import { Card, CardContent, Typography, IconButton, Box, TextField, InputAdornment } from '@mui/material';
import { Edit as EditIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';

export interface EarningsCardProps {
  title: string;
  amount: number;
  subtitle: string;
  prefix: string;
  editable?: boolean;
  onAmountChange?: (amount: number) => void;
  currencyPosition?: 'before' | 'after';
  formatAmount?: (amount: number) => string;
}

const EarningsCard: React.FC<EarningsCardProps> = ({
  title,
  amount,
  subtitle,
  prefix,
  editable = false,
  onAmountChange,
  currencyPosition = 'before',
  formatAmount
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(amount.toString());

  const displayAmount = formatAmount
    ? formatAmount(amount)
    : currencyPosition === 'before'
      ? `${prefix}${amount}`
      : `${amount} ${prefix}`;

  const handleEditClick = () => {
    setEditValue(amount.toString());
    setIsEditing(true);
  };

  const handleSave = () => {
    const newAmount = parseFloat(editValue);
    if (!isNaN(newAmount) && onAmountChange) {
      onAmountChange(newAmount);
    }
    setIsEditing(false);
  };

  return (
    <Card sx={{ 
      width: '100%', 
      bgcolor: '#1e1e1e',
      boxShadow: 'none',
      borderRadius: 2,
      position: 'relative'
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography sx={{ color: '#00e676', mb: 2, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.01em' }}>
          {title}
        </Typography>
        
        {isEditing ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              type="number"
              size="small"
              autoFocus
              InputProps={{
                sx: { 
                  color: '#fff',
                  fontSize: '2.2rem',
                  fontWeight: 700,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00e676',
                  },
                }
              }}
            />
            <IconButton 
              onClick={handleSave}
              size="small"
              sx={{ color: '#00e676' }}
            >
              <CheckIcon />
            </IconButton>
          </Box>
        ) : (
          <Typography 
            variant="h3" 
            sx={{ 
              color: '#fff',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: { xs: '2.1rem', md: '2.5rem' },
              letterSpacing: '0.01em',
              mb: 1
            }}
          >
            {displayAmount}
            {editable && (
              <IconButton 
                onClick={handleEditClick}
                size="small"
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    color: '#00e676'
                  }
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </Typography>
        )}
        
        <Typography 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            mt: 1,
            fontSize: '1.1rem',
            fontWeight: 500,
            letterSpacing: '0.01em'
          }}
        >
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default EarningsCard; 