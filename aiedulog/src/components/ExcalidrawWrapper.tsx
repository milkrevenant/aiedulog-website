"use client";

import { useState, useEffect } from "react";
import { Box, CircularProgress } from '@mui/material';
import dynamic from 'next/dynamic';

interface ExcalidrawWrapperProps {
  onChange?: (elements: any[], appState: any) => void;
  initialData?: any;
  height?: string | number;
  roomId?: string;
  enableCollaboration?: boolean;
  username?: string;
}

// Dynamic import of Excalidraw to avoid SSR issues
const ExcalidrawComponent = dynamic(
  async () => {
    const { Excalidraw } = await import("@excalidraw/excalidraw");
    return Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          minHeight: 400 
        }}
      >
        <CircularProgress />
      </Box>
    )
  }
);

const ExcalidrawWrapper: React.FC<ExcalidrawWrapperProps> = ({ 
  onChange, 
  initialData, 
  height = "500px",
  roomId,
  enableCollaboration = false,
  username = "User"
}) => {
  const [elementCount, setElementCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (elements: readonly any[], appState: any, files: any) => {
    setElementCount(elements?.length || 0);
    if (onChange) {
      onChange([...elements], appState);
    }
  };

  // 협업 설정
  const collaborationConfig = enableCollaboration && roomId ? {
    socketServerUrl: "https://excalidraw-socket-server.herokuapp.com",
    roomId: roomId,
    username: username,
  } : undefined;

  if (!mounted) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height,
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          background: '#ffffff'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div 
      style={{ 
        height, 
        width: "100%", 
        position: 'relative',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#ffffff'
      }}
      className="excalidraw-container"
    >
      <style jsx global>{`
        .excalidraw-container .excalidraw {
          --ui-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .excalidraw-container .Island {
          border-radius: 8px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          border: 1px solid #e0e0e0 !important;
        }
        
        .excalidraw-container .ToolIcon {
          border-radius: 6px !important;
        }
        
        .excalidraw-container .ToolIcon:hover {
          background-color: #f5f5f5 !important;
        }
        
        .excalidraw-container .ToolIcon--selected {
          background-color: #e3f2fd !important;
          border-color: #1976d2 !important;
        }
        
        /* Center ToolIcon only in top menu bar */
        .excalidraw-container .App-menu_top .ToolIcon {
          align-self: center !important;
        }
        
        .excalidraw-container .dropdown-menu {
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid #e0e0e0 !important;
        }
        
        .excalidraw-container .ButtonIconSelect {
          border-radius: 6px !important;
        }
        
        .excalidraw-container .dropdown-menu {
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid #e0e0e0 !important;
        }
        
        .excalidraw-container .dropdown-menu-item {
          border-radius: 4px !important;
          margin: 2px 4px !important;
        }
        
        .excalidraw-container .dropdown-menu-item:hover {
          background-color: #f5f5f5 !important;
        }
        
        .excalidraw-container .Modal {
          border-radius: 12px !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
        }
        
        .excalidraw-container .welcome-screen-decor {
          display: none !important;
        }
        
        .excalidraw-container .welcome-screen-center {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border-radius: 12px !important;
        }
      `}</style>
      
      <ExcalidrawComponent 
        onChange={handleChange}
        initialData={initialData}
        theme="light"
      />
    </div>
  );
};

export default ExcalidrawWrapper;