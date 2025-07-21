import React, { useCallback, useState } from 'react';
import { NodeProps, Position, Handle } from 'reactflow';
import { Paper, Box, Typography, IconButton, TextField, Menu, MenuItem } from '@mui/material';
import { MoreVert as MoreIcon } from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { ungroupNodes, updateNode } from '../../../store/flowSlice';

export interface GroupNodeData {
  label: string;
  childNodeIds: string[];
}

const GroupNode: React.FC<NodeProps<GroupNodeData>> = ({ 
  id, 
  data, 
  selected, 
  isConnectable 
}) => {
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Handles
  const handles = [
    { id: 'top', position: Position.Top },
    { id: 'right', position: Position.Right },
    { id: 'bottom', position: Position.Bottom },
    { id: 'left', position: Position.Left },
  ];

  const handleLabelClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleLabelBlur = useCallback(() => {
    setIsEditing(false);
    if (label !== data.label) {
      dispatch(updateNode({ id, data: { ...data, label } }));
    }
  }, [id, data, label, dispatch]);

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (label !== data.label) {
        dispatch(updateNode({ id, data: { ...data, label } }));
      }
    }
  }, [id, data, label, dispatch]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleUngroup = useCallback(() => {
    dispatch(ungroupNodes(id));
    handleMenuClose();
  }, [id, dispatch]);

  return (
    <>
      {/* Handles for connections */}
      {handles.map((handle) => (
        <Handle
          key={handle.id}
          type="source"
          position={handle.position}
          id={`${handle.id}-source`}
          isConnectable={isConnectable}
          style={{ 
            background: '#555', 
            width: 8, 
            height: 8,
            opacity: 0.6
          }}
        />
      ))}
      
      {handles.map((handle) => (
        <Handle
          key={handle.id}
          type="target"
          position={handle.position}
          id={`${handle.id}-target`}
          isConnectable={isConnectable}
          style={{ 
            background: '#555', 
            width: 8, 
            height: 8,
            opacity: 0.6
          }}
        />
      ))}

      <Paper
        elevation={0}
        sx={{
          height: '100%',
          width: '100%',
          backgroundColor: 'rgba(240, 240, 240, 0.7)',
          border: '1px dashed',
          borderColor: selected ? 'primary.main' : '#aaa',
          borderRadius: 1,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -24,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Paper
            elevation={1}
            sx={{
              py: 0.5,
              px: 1.5,
              borderRadius: 1,
              backgroundColor: selected ? 'primary.main' : 'background.paper',
              color: selected ? 'primary.contrastText' : 'text.primary',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            {isEditing ? (
              <TextField
                autoFocus
                size="small"
                value={label}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleLabelBlur}
                onKeyDown={handleLabelKeyDown}
                variant="standard"
                sx={{ minWidth: 100 }}
                InputProps={{
                  disableUnderline: true,
                }}
              />
            ) : (
              <Typography
                variant="body2"
                fontWeight="medium"
                onClick={handleLabelClick}
                sx={{ cursor: 'text' }}
              >
                {data.label}
              </Typography>
            )}
            
            <IconButton 
              size="small" 
              onClick={handleMenuOpen}
              sx={{ p: 0.25 }}
            >
              <MoreIcon fontSize="small" />
            </IconButton>
            
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem onClick={handleUngroup}>Ungroup</MenuItem>
            </Menu>
          </Paper>
        </Box>
      </Paper>
    </>
  );
};

export default GroupNode; 