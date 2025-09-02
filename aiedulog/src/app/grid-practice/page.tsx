'use client'

import { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  ButtonGroup,
  FormLabel,
  Slider,
  Alert,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  Chip,
  TextField,
} from '@mui/material'
import {
  Settings,
  Inventory,
  PhoneAndroid,
  Computer,
  DesktopWindows,
  Palette,
  Bolt,
  FiberManualRecord,
  Description,
  StraightenOutlined
} from '@mui/icons-material'

export default function GridPractice() {
  // Grid 설정 상태
  const [numItems, setNumItems] = useState(6)
  const [mobileColumns, setMobileColumns] = useState(1)
  const [smallTabletColumns, setSmallTabletColumns] = useState(2)
  const [largeTabletColumns, setLargeTabletColumns] = useState(3)
  const [desktopColumns, setDesktopColumns] = useState(3)
  const [largeDesktopColumns, setLargeDesktopColumns] = useState(4)
  const [gap, setGap] = useState(2)
  const [itemHeight, setItemHeight] = useState(150)
  const [padding, setPadding] = useState(2)
  const [borderWidth, setBorderWidth] = useState(2)
  const [showNumbers, setShowNumbers] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [bgColor, setBgColor] = useState('#e3f2fd')

  // 생성된 코드
  const generatedCode = `<Box 
  sx={{ 
    display: 'grid',
    gridTemplateColumns: {
      xs: 'repeat(${mobileColumns}, 1fr)',   // Mobile (0-599px)
      sm: 'repeat(${smallTabletColumns}, 1fr)',  // Small Tablet (600-899px)
      md: 'repeat(${largeTabletColumns}, 1fr)',  // Large Tablet (900-1199px)
      lg: 'repeat(${desktopColumns}, 1fr)',      // Desktop (1200-1535px)
      xl: 'repeat(${largeDesktopColumns}, 1fr)'  // Large Desktop (1536px+)
    },
    gap: ${gap},
    width: '100%'
  }}
>
  {[${Array.from({ length: numItems }, (_, i) => i + 1).join(', ')}].map((item) => (
    <Paper
      key={item}
      sx={{
        height: '${itemHeight}px',
        padding: ${padding},
        border: '${borderWidth}px solid',
        borderColor: 'primary.main',
        bgcolor: '${bgColor}'
      }}
    >
      {/* Content */}
    </Paper>
  ))}
</Box>`

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            textAlign: 'center',
          }}
        >
          Interactive CSS Grid Builder
        </Typography>
        <Typography
          variant="body1"
          sx={{
            textAlign: 'center',
            color: 'text.secondary',
            mb: 4,
          }}
        >
          CSS Grid로 반응형 레이아웃을 실시간으로 만들어보세요
        </Typography>

        <Box sx={{ display: 'flex', gap: 4, flexWrap: { xs: 'wrap', lg: 'nowrap' } }}>
          {/* Control Panel - Left */}
          <Box sx={{ flex: { xs: '1 1 100%', lg: '0 0 400px' } }}>
            <Paper sx={{ p: 3, position: { lg: 'sticky' }, top: 20 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <Settings color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Grid Controls
                </Typography>
              </Stack>

              {/* 아이템 개수 */}
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Inventory fontSize="small" />
                  <FormLabel>아이템 개수: {numItems}</FormLabel>
                </Stack>
                <Slider
                  value={numItems}
                  onChange={(e, val) => setNumItems(val as number)}
                  min={1}
                  max={20}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 반응형 컬럼 설정 */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <PhoneAndroid fontSize="small" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Responsive Columns
                </Typography>
              </Stack>

              {/* Mobile Columns */}
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <PhoneAndroid fontSize="small" />
                  <FormLabel>
                    Mobile (xs: 0-599px): {mobileColumns} column{mobileColumns > 1 ? 's' : ''}
                  </FormLabel>
                </Stack>
                <ButtonGroup size="small" fullWidth>
                  {[1, 2, 3, 4].map((col) => (
                    <Button
                      key={col}
                      variant={mobileColumns === col ? 'contained' : 'outlined'}
                      onClick={() => setMobileColumns(col)}
                    >
                      {col}
                    </Button>
                  ))}
                </ButtonGroup>
              </Box>

              {/* Small Tablet Columns */}
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <PhoneAndroid fontSize="small" />
                  <FormLabel>
                    Small Tablet (sm: 600-899px): {smallTabletColumns} column
                    {smallTabletColumns > 1 ? 's' : ''}
                  </FormLabel>
                </Stack>
                <ButtonGroup size="small" fullWidth>
                  {[1, 2, 3, 4].map((col) => (
                    <Button
                      key={col}
                      variant={smallTabletColumns === col ? 'contained' : 'outlined'}
                      onClick={() => setSmallTabletColumns(col)}
                    >
                      {col}
                    </Button>
                  ))}
                </ButtonGroup>
              </Box>

              {/* Large Tablet Columns */}
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <PhoneAndroid fontSize="small" />
                  <FormLabel>
                    Large Tablet (md: 900-1199px): {largeTabletColumns} column
                    {largeTabletColumns > 1 ? 's' : ''}
                  </FormLabel>
                </Stack>
                <ButtonGroup size="small" fullWidth>
                  {[2, 3, 4, 6].map((col) => (
                    <Button
                      key={col}
                      variant={largeTabletColumns === col ? 'contained' : 'outlined'}
                      onClick={() => setLargeTabletColumns(col)}
                    >
                      {col}
                    </Button>
                  ))}
                </ButtonGroup>
              </Box>

              {/* Desktop Columns */}
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Computer fontSize="small" />
                  <FormLabel>
                    Desktop (lg: 1200-1535px): {desktopColumns} column
                    {desktopColumns > 1 ? 's' : ''}
                  </FormLabel>
                </Stack>
                <ButtonGroup size="small" fullWidth>
                  {[2, 3, 4, 6].map((col) => (
                    <Button
                      key={col}
                      variant={desktopColumns === col ? 'contained' : 'outlined'}
                      onClick={() => setDesktopColumns(col)}
                    >
                      {col}
                    </Button>
                  ))}
                </ButtonGroup>
              </Box>

              {/* Large Desktop Columns */}
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <DesktopWindows fontSize="small" />
                  <FormLabel>
                    Large Desktop (xl: 1536px+): {largeDesktopColumns} column
                    {largeDesktopColumns > 1 ? 's' : ''}
                  </FormLabel>
                </Stack>
                <ButtonGroup size="small" fullWidth>
                  {[3, 4, 6, 8, 12].map((col) => (
                    <Button
                      key={col}
                      variant={largeDesktopColumns === col ? 'contained' : 'outlined'}
                      onClick={() => setLargeDesktopColumns(col)}
                    >
                      {col}
                    </Button>
                  ))}
                </ButtonGroup>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 스타일 설정 */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Palette fontSize="small" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Style Settings
                </Typography>
              </Stack>

              {/* Gap */}
              <Box sx={{ mb: 2 }}>
                <FormLabel>Gap: {gap * 8}px</FormLabel>
                <Slider
                  value={gap}
                  onChange={(e, val) => setGap(val as number)}
                  min={0}
                  max={5}
                  step={0.5}
                  marks
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value * 8}px`}
                />
              </Box>

              {/* Height */}
              <Box sx={{ mb: 2 }}>
                <FormLabel>Height: {itemHeight}px</FormLabel>
                <Slider
                  value={itemHeight}
                  onChange={(e, val) => setItemHeight(val as number)}
                  min={50}
                  max={300}
                  step={10}
                  valueLabelDisplay="auto"
                />
              </Box>

              {/* Padding */}
              <Box sx={{ mb: 2 }}>
                <FormLabel>Padding: {padding * 8}px</FormLabel>
                <Slider
                  value={padding}
                  onChange={(e, val) => setPadding(val as number)}
                  min={0}
                  max={5}
                  step={0.5}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value * 8}px`}
                />
              </Box>

              {/* Border Width */}
              <Box sx={{ mb: 2 }}>
                <FormLabel>Border: {borderWidth}px</FormLabel>
                <Slider
                  value={borderWidth}
                  onChange={(e, val) => setBorderWidth(val as number)}
                  min={0}
                  max={5}
                  valueLabelDisplay="auto"
                />
              </Box>

              {/* Background Color */}
              <Box sx={{ mb: 2 }}>
                <FormLabel>Background Color</FormLabel>
                <TextField
                  fullWidth
                  size="small"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  sx={{ mt: 1 }}
                />
              </Box>

              {/* Toggles */}
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showNumbers}
                      onChange={(e) => setShowNumbers(e.target.checked)}
                    />
                  }
                  label="Show Numbers"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={showLabels}
                      onChange={(e) => setShowLabels(e.target.checked)}
                    />
                  }
                  label="Show Labels"
                />
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* Preset Templates */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Bolt fontSize="small" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Quick Presets
                </Typography>
              </Stack>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setMobileColumns(1)
                    setSmallTabletColumns(2)
                    setLargeTabletColumns(2)
                    setDesktopColumns(3)
                    setLargeDesktopColumns(3)
                    setNumItems(6)
                    setGap(2)
                    setItemHeight(150)
                  }}
                >
                  Standard 3x2 Grid
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setMobileColumns(2)
                    setSmallTabletColumns(3)
                    setLargeTabletColumns(4)
                    setDesktopColumns(4)
                    setLargeDesktopColumns(6)
                    setNumItems(12)
                    setGap(1)
                    setItemHeight(120)
                  }}
                >
                  Dense 4x3 Grid
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setMobileColumns(1)
                    setSmallTabletColumns(1)
                    setLargeTabletColumns(2)
                    setDesktopColumns(2)
                    setLargeDesktopColumns(2)
                    setNumItems(4)
                    setGap(3)
                    setItemHeight(200)
                  }}
                >
                  Large 2x2 Grid
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setMobileColumns(1)
                    setSmallTabletColumns(3)
                    setLargeTabletColumns(3)
                    setDesktopColumns(6)
                    setLargeDesktopColumns(6)
                    setNumItems(6)
                    setGap(2)
                    setItemHeight(100)
                  }}
                >
                  Single Row
                </Button>
              </Stack>
            </Paper>
          </Box>

          {/* Preview Area - Right */}
          <Box sx={{ flex: 1 }}>
            {/* Current Settings */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" component="div">
                <strong>Current Viewport Layout:</strong>
                <br />
                Mobile (xs: 0-599px): {mobileColumns} column{mobileColumns > 1 ? 's' : ''} ×{' '}
                {Math.ceil(numItems / mobileColumns)} row
                {Math.ceil(numItems / mobileColumns) > 1 ? 's' : ''}
                <br />
                Small Tablet (sm: 600-899px): {smallTabletColumns} column
                {smallTabletColumns > 1 ? 's' : ''} × {Math.ceil(numItems / smallTabletColumns)} row
                {Math.ceil(numItems / smallTabletColumns) > 1 ? 's' : ''}
                <br />
                Large Tablet (md: 900-1199px): {largeTabletColumns} column
                {largeTabletColumns > 1 ? 's' : ''} × {Math.ceil(numItems / largeTabletColumns)} row
                {Math.ceil(numItems / largeTabletColumns) > 1 ? 's' : ''}
                <br />
                Desktop (lg: 1200-1535px): {desktopColumns} column{desktopColumns > 1 ? 's' : ''}{' '}
                × {Math.ceil(numItems / desktopColumns)} row
                {Math.ceil(numItems / desktopColumns) > 1 ? 's' : ''}
                <br />
                Large Desktop (xl: 1536px+): {largeDesktopColumns} column
                {largeDesktopColumns > 1 ? 's' : ''} × {Math.ceil(numItems / largeDesktopColumns)}{' '}
                row{Math.ceil(numItems / largeDesktopColumns) > 1 ? 's' : ''}
              </Typography>
            </Alert>

            {/* Live Preview */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <FiberManualRecord color="error" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Live Preview
                </Typography>
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: `repeat(${mobileColumns}, 1fr)`,
                    sm: `repeat(${smallTabletColumns}, 1fr)`,
                    md: `repeat(${largeTabletColumns}, 1fr)`,
                    lg: `repeat(${desktopColumns}, 1fr)`,
                    xl: `repeat(${largeDesktopColumns}, 1fr)`,
                  },
                  gap: gap,
                  width: '100%',
                }}
              >
                {Array.from({ length: numItems }, (_, i) => i + 1).map((item) => (
                  <Paper
                    key={item}
                    elevation={2}
                    sx={{
                      height: `${itemHeight}px`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: bgColor,
                      border: `${borderWidth}px solid`,
                      borderColor: 'primary.main',
                      p: padding,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {showNumbers && (
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 600,
                          color: 'primary.main',
                          opacity: 0.8,
                        }}
                      >
                        {item}
                      </Typography>
                    )}
                    {showLabels && (
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          bottom: 4,
                          color: 'text.secondary',
                          fontSize: '0.7rem',
                        }}
                      >
                        Item {item}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  브라우저 창 크기를 조절하여 반응형 변화를 확인하세요!
                </Typography>
              </Alert>
            </Paper>

            {/* Generated Code */}
            <Card sx={{ bgcolor: '#1e1e1e' }}>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Description sx={{ color: 'white' }} />
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                      Generated Code
                    </Typography>
                  </Stack>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => navigator.clipboard.writeText(generatedCode)}
                  >
                    Copy Code
                  </Button>
                </Stack>
                <Box
                  component="pre"
                  sx={{
                    color: '#d4d4d4',
                    fontSize: '0.875rem',
                    overflow: 'auto',
                    m: 0,
                    fontFamily: 'monospace',
                  }}
                >
                  {generatedCode}
                </Box>
              </CardContent>
            </Card>

            {/* Breakpoints Reference */}
            <Paper sx={{ p: 3, mt: 4 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <StraightenOutlined fontSize="small" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Breakpoint Reference
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip label="xs: 0-599px" color="primary" />
                <Chip label="sm: 600-899px" color="secondary" />
                <Chip label="md: 900-1199px" color="success" />
                <Chip label="lg: 1200-1535px" color="warning" />
                <Chip label="xl: 1536px+" color="error" />
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
