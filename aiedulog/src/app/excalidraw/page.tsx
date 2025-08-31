"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Box, Typography, Paper, Stack, Chip, Alert, Button } from "@mui/material";
import Link from "next/link";

// Dynamic import as recommended by official docs
const ExcalidrawWrapper = dynamic(
  () => import("@/components/ExcalidrawWrapper"),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
        <Typography>Excalidraw 로딩 중...</Typography>
      </Box>
    ),
  },
);

export default function ExcalidrawPage() {
  const [elementCount, setElementCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const handleChange = (elements: any[], appState: any) => {
    setElementCount(elements?.length || 0);
    setLastUpdate(new Date().toLocaleTimeString('ko-KR'));
    console.log('Elements changed:', elements?.length);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={0} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h5">
            🎨 Excalidraw 통합
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Chip 
            label={`요소: ${elementCount}개`} 
            color="primary" 
            variant="outlined"
          />
          {lastUpdate && (
            <Chip 
              label={`마지막 업데이트: ${lastUpdate}`} 
              variant="outlined"
            />
          )}
          <Button 
            component={Link} 
            href="/chat" 
            variant="outlined"
            size="small"
          >
            채팅으로 돌아가기
          </Button>
        </Stack>
      </Paper>
      
      <Alert severity="success" sx={{ m: 2 }}>
        ✅ Excalidraw가 성공적으로 통합되었습니다! 모든 그리기 도구를 사용할 수 있습니다.
      </Alert>
      
      <Box sx={{ flex: 1, p: 2 }}>
        <ExcalidrawWrapper 
          onChange={handleChange}
          height="calc(100vh - 200px)"
        />
      </Box>
    </Box>
  );
}