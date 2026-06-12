import React from 'react';
import {
  Box,
  Button,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  alpha,
  useTheme,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { motion } from 'framer-motion';

export default function BulkActionToolbar({
  selectedCount = 0,
  onClear,
  actions = [],
  onAction = () => {},
  loading = false,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [actionDialog, setActionDialog] = React.useState(null);
  const [reason, setReason] = React.useState('');
  const [selectedActionId, setSelectedActionId] = React.useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (action) => {
    handleMenuClose();
    if (action.requiresReason) {
      setActionDialog(action);
      setSelectedActionId(action.id);
      setReason('');
    } else {
      onAction(action.id, {});
    }
  };

  const handleConfirmAction = () => {
    onAction(selectedActionId, { reason });
    setActionDialog(null);
    setReason('');
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Toolbar
        sx={{
          background: theme.palette.mode === 'light'
            ? alpha(theme.palette.primary.main, 0.1)
            : alpha(theme.palette.primary.main, 0.2),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          borderRadius: 2,
          mb: 2,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CheckCircleIcon sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {selectedCount} Selected
          </Typography>
          <Chip
            label={selectedCount}
            size="small"
            variant="filled"
            color="primary"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Quick actions */}
          {actions.slice(0, 2).map((action) => (
            <Button
              key={action.id}
              size="small"
              variant="contained"
              color={action.color || 'primary'}
              startIcon={action.icon}
              onClick={() => handleActionClick(action)}
              disabled={loading || action.disabled}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {action.label}
            </Button>
          ))}

          {/* More actions menu */}
          {actions.length > 2 && (
            <>
              <IconButton
                onClick={handleMenuOpen}
                size="small"
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                {actions.slice(2).map((action) => (
                  <MenuItem
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    disabled={action.disabled}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {action.icon}
                      <span>{action.label}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          {/* Clear button */}
          <IconButton
            onClick={onClear}
            size="small"
            sx={{
              ml: 1,
              '&:hover': {
                bgcolor: alpha(theme.palette.error.main, 0.1),
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Toolbar>

      {/* Action confirmation dialog */}
      <Dialog open={Boolean(actionDialog)} onClose={() => setActionDialog(null)} maxWidth="sm" fullWidth>
        {actionDialog && (
          <>
            <DialogTitle>
              {actionDialog.label} - {selectedCount} items
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {actionDialog.requiresReason && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Reason"
                  placeholder="Enter reason for this action..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  variant="outlined"
                />
              )}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {actionDialog.confirmMessage || `Are you sure you want to ${actionDialog.label.toLowerCase()} these items?`}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setActionDialog(null)} variant="outlined">
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAction}
                variant="contained"
                color={actionDialog.color || 'primary'}
                disabled={actionDialog.requiresReason && !reason}
              >
                Confirm
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </motion.div>
  );
}
