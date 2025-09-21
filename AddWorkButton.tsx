import React from 'react';
import { Fab } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const AddWorkButton: React.FC = () => {
  return (
    <Fab
      color="primary"
      aria-label="add work"
      sx={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        boxShadow: '0 8px 16px rgba(0,200,83,0.2)',
      }}
    >
      <AddIcon />
    </Fab>
  );
};

export default AddWorkButton; 