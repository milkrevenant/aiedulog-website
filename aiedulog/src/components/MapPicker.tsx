'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Stack,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  InputAdornment
} from '@mui/material'
import { Close, MyLocation, Search } from '@mui/icons-material'

interface MapPickerProps {
  open: boolean
  onClose: () => void
  onSelectLocation: (address: string, lat?: number, lng?: number) => void
  initialAddress?: string
}

const mapContainerStyle = {
  width: '100%',
  height: '400px'
}

// 서울 시청 기본 위치
const defaultCenter = {
  lat: 37.5665,
  lng: 126.9780
}

const libraries: ("places")[] = ["places"]

export default function MapPicker({
  open,
  onClose,
  onSelectLocation,
  initialAddress = ''
}: MapPickerProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [center, setCenter] = useState(defaultCenter)
  const [marker, setMarker] = useState<google.maps.LatLng | null>(null)
  const [address, setAddress] = useState(initialAddress)
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const searchBoxRef = useRef<HTMLInputElement>(null)

  // Google Maps API 키 (환경변수에서 가져오기)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  useEffect(() => {
    setAddress(initialAddress)
  }, [initialAddress])

  // 현재 위치 가져오기
  const getCurrentLocation = useCallback(() => {
    setLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setCenter(newCenter)
          setMarker(new google.maps.LatLng(newCenter.lat, newCenter.lng))
          
          // 역지오코딩으로 주소 가져오기
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode({ location: newCenter }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setAddress(results[0].formatted_address)
            }
            setLoading(false)
          })
          
          if (map) {
            map.panTo(newCenter)
            map.setZoom(17)
          }
        },
        (error) => {
          console.error('Error getting location:', error)
          setError('현재 위치를 가져올 수 없습니다.')
          setLoading(false)
        }
      )
    } else {
      setError('브라우저가 위치 정보를 지원하지 않습니다.')
      setLoading(false)
    }
  }, [map])

  // 지도 클릭 핸들러
  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setMarker(e.latLng)
      
      // 역지오코딩으로 주소 가져오기
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ location: e.latLng }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setAddress(results[0].formatted_address)
        }
      })
    }
  }, [])

  // 자동완성 선택 핸들러
  const onPlaceSelected = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()
      
      if (place.geometry && place.geometry.location) {
        const newCenter = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
        setCenter(newCenter)
        setMarker(place.geometry.location)
        setAddress(place.formatted_address || '')
        
        if (map) {
          map.panTo(newCenter)
          map.setZoom(17)
        }
      }
    }
  }, [map])

  // 검색 실행
  const handleSearch = useCallback(() => {
    if (!searchInput.trim()) return
    
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ address: searchInput }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location
        const newCenter = {
          lat: location.lat(),
          lng: location.lng()
        }
        setCenter(newCenter)
        setMarker(location)
        setAddress(results[0].formatted_address)
        
        if (map) {
          map.panTo(newCenter)
          map.setZoom(17)
        }
      } else {
        setError('검색 결과를 찾을 수 없습니다.')
      }
    })
  }, [searchInput, map])

  const handleConfirm = () => {
    if (address) {
      const lat = marker?.lat()
      const lng = marker?.lng()
      onSelectLocation(address, lat, lng)
      onClose()
    }
  }

  if (!apiKey) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>위치 선택</Typography>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Google Maps API 키가 설정되지 않았습니다.
            <br />
            환경변수에 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY를 설정해주세요.
          </Alert>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="주소 직접 입력"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="예: 서울특별시 강남구 테헤란로 123"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>취소</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (address) {
                onSelectLocation(address)
                onClose()
              }
            }}
            disabled={!address.trim()}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography>위치 선택</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {/* 검색 바 */}
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              placeholder="주소 또는 장소를 검색하세요"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearch} size="small">
                      <Search />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={20} /> : <MyLocation />}
              onClick={getCurrentLocation}
              disabled={loading}
            >
              내 위치
            </Button>
          </Stack>

          {/* 구글 맵 */}
          <Box sx={{ borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
            <LoadScript
              googleMapsApiKey={apiKey}
              libraries={libraries}
            >
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={15}
                onClick={onMapClick}
                onLoad={setMap}
                options={{
                  streetViewControl: false,
                  fullscreenControl: false,
                  mapTypeControl: false
                }}
              >
                {marker && (
                  <Marker position={marker} />
                )}
              </GoogleMap>
            </LoadScript>
          </Box>

          {/* 선택된 주소 */}
          <TextField
            fullWidth
            label="선택된 주소"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            multiline
            rows={2}
            helperText="지도를 클릭하거나 검색하여 위치를 선택하세요"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button 
          variant="contained" 
          onClick={handleConfirm}
          disabled={!address.trim()}
        >
          위치 선택
        </Button>
      </DialogActions>
    </Dialog>
  )
}