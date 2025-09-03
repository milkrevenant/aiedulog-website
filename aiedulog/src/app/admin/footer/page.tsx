'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import AuthGuard from '@/components/AuthGuard'
import AppHeader from '@/components/AppHeader'
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Stack,
  IconButton,
  TextField,
  Switch,
  FormControlLabel,
  
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  DragHandle as DragHandleIcon,
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import {
  FooterCategory,
  FooterLink,
  FooterSocialLink,
  FooterSetting,
  FooterCategoryFormData,
  FooterLinkFormData,
  FooterSocialLinkFormData,
  FooterSettingFormData,
  SOCIAL_PLATFORMS,
  FOOTER_SETTING_KEYS,
} from '@/types/footer-management'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`footer-tabpanel-${index}`}
      aria-labelledby={`footer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function FooterManagementPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Data states
  const [categories, setCategories] = useState<FooterCategory[]>([])
  const [links, setLinks] = useState<FooterLink[]>([])
  const [socialLinks, setSocialLinks] = useState<FooterSocialLink[]>([])
  const [settings, setSettings] = useState<FooterSetting[]>([])

  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [linkDialog, setLinkDialog] = useState(false)
  const [socialDialog, setSocialDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    type: 'category' | 'link' | 'social' | null
    id: string | null
    name: string
  }>({
    open: false,
    type: null,
    id: null,
    name: '',
  })

  // Edit states
  const [editingCategory, setEditingCategory] = useState<FooterCategory | null>(null)
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null)
  const [editingSocial, setEditingSocial] = useState<FooterSocialLink | null>(null)

  // Forms
  const categoryForm = useForm<FooterCategoryFormData>({
    defaultValues: {
      title_ko: '',
      title_en: '',
      display_order: 0,
      is_active: true,
    },
  })

  const linkForm = useForm<FooterLinkFormData>({
    defaultValues: {
      category_id: '',
      title_ko: '',
      title_en: '',
      url: '',
      display_order: 0,
      is_active: true,
      is_external: false,
    },
  })

  const socialForm = useForm<FooterSocialLinkFormData>({
    defaultValues: {
      platform: '',
      icon_name: '',
      url: '',
      display_order: 0,
      is_active: true,
    },
  })

  const settingsForm = useForm<Record<string, FooterSettingFormData>>()

  // Load data
  useEffect(() => {
    loadFooterData()
  }, [])

  const loadFooterData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [categoriesRes, linksRes, socialRes, settingsRes] = await Promise.all([
        fetch('/api/admin/footer/categories'),
        fetch('/api/admin/footer/links'),
        fetch('/api/admin/footer/social'),
        fetch('/api/admin/footer/settings'),
      ])

      if (!categoriesRes.ok || !linksRes.ok || !socialRes.ok || !settingsRes.ok) {
        throw new Error('Failed to load footer data')
      }

      const [categoriesData, linksData, socialData, settingsData] = await Promise.all([
        categoriesRes.json(),
        linksRes.json(),
        socialRes.json(),
        settingsRes.json(),
      ])

      setCategories(categoriesData.data || [])
      setLinks(linksData.data || [])
      setSocialLinks(socialData.data || [])
      setSettings(settingsData.data || [])

      // Initialize settings form
      const settingsFormData = settingsData.data.reduce((acc: any, setting: FooterSetting) => {
        acc[setting.setting_key] = {
          setting_key: setting.setting_key,
          setting_value_ko: setting.setting_value_ko || '',
          setting_value_en: setting.setting_value_en || '',
          is_active: setting.is_active,
        }
        return acc
      }, {})

      settingsForm.reset(settingsFormData)
    } catch (err) {
      console.error('Error loading footer data:', err)
      setError('Failed to load footer data')
    } finally {
      setLoading(false)
    }
  }

  // Category handlers
  const handleCreateCategory = async (data: FooterCategoryFormData) => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/admin/footer/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create category')
      }

      await loadFooterData()
      setCategoryDialog(false)
      categoryForm.reset()
      setSuccess('Category created successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCategory = async (data: FooterCategoryFormData) => {
    if (!editingCategory) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/admin/footer/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update category')
      }

      await loadFooterData()
      setCategoryDialog(false)
      setEditingCategory(null)
      categoryForm.reset()
      setSuccess('Category updated successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteDialog.id) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/admin/footer/categories/${deleteDialog.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete category')
      }

      await loadFooterData()
      setDeleteDialog({ open: false, type: null, id: null, name: '' })
      setSuccess('Category deleted successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Link handlers
  const handleCreateLink = async (data: FooterLinkFormData) => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/admin/footer/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create link')
      }

      await loadFooterData()
      setLinkDialog(false)
      linkForm.reset()
      setSuccess('Link created successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateLink = async (data: FooterLinkFormData) => {
    if (!editingLink) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/admin/footer/links/${editingLink.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update link')
      }

      await loadFooterData()
      setLinkDialog(false)
      setEditingLink(null)
      linkForm.reset()
      setSuccess('Link updated successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLink = async () => {
    if (!deleteDialog.id) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/admin/footer/links/${deleteDialog.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete link')
      }

      await loadFooterData()
      setDeleteDialog({ open: false, type: null, id: null, name: '' })
      setSuccess('Link deleted successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Social link handlers
  const handleCreateSocial = async (data: FooterSocialLinkFormData) => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/admin/footer/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create social link')
      }

      await loadFooterData()
      setSocialDialog(false)
      socialForm.reset()
      setSuccess('Social link created successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSocial = async (data: FooterSocialLinkFormData) => {
    if (!editingSocial) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/admin/footer/social/${editingSocial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update social link')
      }

      await loadFooterData()
      setSocialDialog(false)
      setEditingSocial(null)
      socialForm.reset()
      setSuccess('Social link updated successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSocial = async () => {
    if (!deleteDialog.id) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/admin/footer/social/${deleteDialog.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete social link')
      }

      await loadFooterData()
      setDeleteDialog({ open: false, type: null, id: null, name: '' })
      setSuccess('Social link deleted successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Settings handlers
  const handleUpdateSettings = async (data: Record<string, FooterSettingFormData>) => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/admin/footer/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update settings')
      }

      await loadFooterData()
      setSuccess('Settings updated successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Dialog handlers
  const openCategoryDialog = (category?: FooterCategory) => {
    if (category) {
      setEditingCategory(category)
      categoryForm.reset({
        title_ko: category.title_ko,
        title_en: category.title_en || '',
        display_order: category.display_order,
        is_active: category.is_active,
      })
    } else {
      setEditingCategory(null)
      categoryForm.reset({
        title_ko: '',
        title_en: '',
        display_order: categories.length,
        is_active: true,
      })
    }
    setCategoryDialog(true)
  }

  const openLinkDialog = (link?: FooterLink) => {
    if (link) {
      setEditingLink(link)
      linkForm.reset({
        category_id: link.category_id,
        title_ko: link.title_ko,
        title_en: link.title_en || '',
        url: link.url,
        display_order: link.display_order,
        is_active: link.is_active,
        is_external: link.is_external,
      })
    } else {
      setEditingLink(null)
      linkForm.reset({
        category_id: categories[0]?.id || '',
        title_ko: '',
        title_en: '',
        url: '',
        display_order: links.length,
        is_active: true,
        is_external: false,
      })
    }
    setLinkDialog(true)
  }

  const openSocialDialog = (social?: FooterSocialLink) => {
    if (social) {
      setEditingSocial(social)
      socialForm.reset({
        platform: social.platform,
        icon_name: social.icon_name,
        url: social.url,
        display_order: social.display_order,
        is_active: social.is_active,
      })
    } else {
      setEditingSocial(null)
      socialForm.reset({
        platform: '',
        icon_name: '',
        url: '',
        display_order: socialLinks.length,
        is_active: true,
      })
    }
    setSocialDialog(true)
  }

  const openDeleteDialog = (
    type: 'category' | 'link' | 'social',
    id: string,
    name: string
  ) => {
    setDeleteDialog({
      open: true,
      type,
      id,
      name,
    })
  }

  // Clear alerts
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  if (loading) {
    return (
      <AuthGuard>
        <AppHeader />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Container>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <AppHeader />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
              Footer Management
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Manage footer categories, links, social media, and settings
            </Typography>

            {/* Alerts */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                aria-label="footer management tabs"
              >
                <Tab label="Categories" icon={<LinkIcon />} iconPosition="start" />
                <Tab label="Links" icon={<LinkIcon />} iconPosition="start" />
                <Tab label="Social Media" icon={<ShareIcon />} iconPosition="start" />
                <Tab label="Settings" icon={<SettingsIcon />} iconPosition="start" />
              </Tabs>
            </Box>

            {/* Tab Panels */}
            {/* Categories Tab */}
            <TabPanel value={activeTab} index={0}>
              <Stack spacing={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Footer Categories</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openCategoryDialog()}
                  >
                    Add Category
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  {categories.map((category) => (
                    <Grid
                      key={category.id}
                      size={{
                        xs: 12,
                        sm: 6,
                        md: 4
                      }}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {category.title_ko}
                          </Typography>
                          {category.title_en && (
                            <Typography variant="body2" color="text.secondary">
                              {category.title_en}
                            </Typography>
                          )}
                          <Box mt={1}>
                            <Chip
                              size="small"
                              label={`Order: ${category.display_order}`}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={category.is_active ? 'Active' : 'Inactive'}
                              color={category.is_active ? 'success' : 'default'}
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        </CardContent>
                        <CardActions>
                          <IconButton
                            size="small"
                            onClick={() => openCategoryDialog(category)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() =>
                              openDeleteDialog('category', category.id, category.title_ko)
                            }
                          >
                            <DeleteIcon />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </TabPanel>

            {/* Links Tab */}
            <TabPanel value={activeTab} index={1}>
              <Stack spacing={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Footer Links</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openLinkDialog()}
                    disabled={categories.length === 0}
                  >
                    Add Link
                  </Button>
                </Box>

                {categories.length === 0 ? (
                  <Alert severity="info">
                    Please create at least one category before adding links.
                  </Alert>
                ) : (
                  categories.map((category) => (
                    <Accordion key={category.id} defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">{category.title_ko}</Typography>
                        <Chip
                          size="small"
                          label={
                            links.filter((link) => link.category_id === category.id).length
                          }
                          sx={{ ml: 2 }}
                        />
                      </AccordionSummary>
                      <AccordionDetails>
                        <List>
                          {links
                            .filter((link) => link.category_id === category.id)
                            .map((link) => (
                              <ListItem key={link.id} divider>
                                <ListItemText
                                  primary={link.title_ko}
                                  secondary={
                                    <Stack direction="row" spacing={1} mt={0.5}>
                                      <Chip size="small" label={link.url} variant="outlined" />
                                      <Chip
                                        size="small"
                                        label={link.is_active ? 'Active' : 'Inactive'}
                                        color={link.is_active ? 'success' : 'default'}
                                      />
                                      {link.is_external && (
                                        <Chip size="small" label="External" color="info" />
                                      )}
                                    </Stack>
                                  }
                                />
                                <ListItemSecondaryAction>
                                  <IconButton
                                    size="small"
                                    onClick={() => openLinkDialog(link)}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      openDeleteDialog('link', link.id, link.title_ko)
                                    }
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </ListItemSecondaryAction>
                              </ListItem>
                            ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
              </Stack>
            </TabPanel>

            {/* Social Media Tab */}
            <TabPanel value={activeTab} index={2}>
              <Stack spacing={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Social Media Links</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openSocialDialog()}
                  >
                    Add Social Link
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  {socialLinks.map((social) => (
                    <Grid
                      key={social.id}
                      size={{
                        xs: 12,
                        sm: 6,
                        md: 4
                      }}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {social.platform}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Icon: {social.icon_name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              wordBreak: 'break-all',
                              mb: 1,
                            }}
                          >
                            {social.url}
                          </Typography>
                          <Box>
                            <Chip
                              size="small"
                              label={`Order: ${social.display_order}`}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={social.is_active ? 'Active' : 'Inactive'}
                              color={social.is_active ? 'success' : 'default'}
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        </CardContent>
                        <CardActions>
                          <IconButton
                            size="small"
                            onClick={() => openSocialDialog(social)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() =>
                              openDeleteDialog('social', social.id, social.platform)
                            }
                          >
                            <DeleteIcon />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </TabPanel>

            {/* Settings Tab */}
            <TabPanel value={activeTab} index={3}>
              <form onSubmit={settingsForm.handleSubmit(handleUpdateSettings)}>
                <Stack spacing={3}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Footer Settings</Typography>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={saving}
                    >
                      Save Settings
                    </Button>
                  </Box>

                  <Grid container spacing={3}>
                    {FOOTER_SETTING_KEYS.map((key) => (
                      <Grid
                        key={key}
                        size={{
                          xs: 12,
                          md: 6
                        }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {key.replace(/_/g, ' ').toUpperCase()}
                            </Typography>
                            <Stack spacing={2}>
                              <Controller
                                name={`${key}.setting_value_ko`}
                                control={settingsForm.control}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    label="Korean Value"
                                    variant="outlined"
                                    fullWidth
                                  />
                                )}
                              />
                              <Controller
                                name={`${key}.setting_value_en`}
                                control={settingsForm.control}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    label="English Value"
                                    variant="outlined"
                                    fullWidth
                                  />
                                )}
                              />
                              <Controller
                                name={`${key}.is_active`}
                                control={settingsForm.control}
                                render={({ field }) => (
                                  <FormControlLabel
                                    control={<Switch {...field} checked={field.value} />}
                                    label="Active"
                                  />
                                )}
                              />
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </form>
            </TabPanel>
          </Paper>
        </motion.div>

        {/* Dialogs */}
        {/* Category Dialog */}
        <Dialog
          open={categoryDialog}
          onClose={() => setCategoryDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <form
            onSubmit={categoryForm.handleSubmit(
              editingCategory ? handleUpdateCategory : handleCreateCategory
            )}
          >
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Controller
                  name="title_ko"
                  control={categoryForm.control}
                  rules={{ required: 'Korean title is required' }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Korean Title"
                      variant="outlined"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name="title_en"
                  control={categoryForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="English Title (Optional)"
                      variant="outlined"
                      fullWidth
                    />
                  )}
                />
                <Controller
                  name="display_order"
                  control={categoryForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Display Order"
                      type="number"
                      variant="outlined"
                      fullWidth
                      inputProps={{ min: 0 }}
                    />
                  )}
                />
                <Controller
                  name="is_active"
                  control={categoryForm.control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Active"
                    />
                  )}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCategoryDialog(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Link Dialog */}
        <Dialog
          open={linkDialog}
          onClose={() => setLinkDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <form
            onSubmit={linkForm.handleSubmit(
              editingLink ? handleUpdateLink : handleCreateLink
            )}
          >
            <DialogTitle>{editingLink ? 'Edit Link' : 'Create Link'}</DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Controller
                  name="category_id"
                  control={linkForm.control}
                  rules={{ required: 'Category is required' }}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth error={!!fieldState.error}>
                      <InputLabel>Category</InputLabel>
                      <Select {...field} label="Category">
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.title_ko}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <Controller
                  name="title_ko"
                  control={linkForm.control}
                  rules={{ required: 'Korean title is required' }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Korean Title"
                      variant="outlined"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name="title_en"
                  control={linkForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="English Title (Optional)"
                      variant="outlined"
                      fullWidth
                    />
                  )}
                />
                <Controller
                  name="url"
                  control={linkForm.control}
                  rules={{ required: 'URL is required' }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="URL"
                      variant="outlined"
                      fullWidth
                      placeholder="#, /, /page, https://example.com"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name="display_order"
                  control={linkForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Display Order"
                      type="number"
                      variant="outlined"
                      fullWidth
                      inputProps={{ min: 0 }}
                    />
                  )}
                />
                <Controller
                  name="is_external"
                  control={linkForm.control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="External Link"
                    />
                  )}
                />
                <Controller
                  name="is_active"
                  control={linkForm.control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Active"
                    />
                  )}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setLinkDialog(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Social Dialog */}
        <Dialog
          open={socialDialog}
          onClose={() => setSocialDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <form
            onSubmit={socialForm.handleSubmit(
              editingSocial ? handleUpdateSocial : handleCreateSocial
            )}
          >
            <DialogTitle>
              {editingSocial ? 'Edit Social Link' : 'Create Social Link'}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Controller
                  name="platform"
                  control={socialForm.control}
                  rules={{ required: 'Platform is required' }}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth error={!!fieldState.error}>
                      <InputLabel>Platform</InputLabel>
                      <Select
                        {...field}
                        label="Platform"
                        onChange={(e) => {
                          field.onChange(e)
                          const platform = SOCIAL_PLATFORMS.find(
                            (p) => p.value === e.target.value
                          )
                          if (platform) {
                            socialForm.setValue('icon_name', platform.icon)
                          }
                        }}
                      >
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <MenuItem key={platform.value} value={platform.value}>
                            {platform.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <Controller
                  name="icon_name"
                  control={socialForm.control}
                  rules={{ required: 'Icon name is required' }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Icon Name"
                      variant="outlined"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name="url"
                  control={socialForm.control}
                  rules={{
                    required: 'URL is required',
                    pattern: {
                      value: /^https?:\/\/.+/,
                      message: 'Must be a valid HTTP/HTTPS URL',
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="URL"
                      variant="outlined"
                      fullWidth
                      placeholder="https://example.com"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name="display_order"
                  control={socialForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Display Order"
                      type="number"
                      variant="outlined"
                      fullWidth
                      inputProps={{ min: 0 }}
                    />
                  )}
                />
                <Controller
                  name="is_active"
                  control={socialForm.control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Active"
                    />
                  )}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSocialDialog(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, type: null, id: null, name: '' })}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{deleteDialog.name}"? This action cannot be
              undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() =>
                setDeleteDialog({ open: false, type: null, id: null, name: '' })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deleteDialog.type === 'category') {
                  handleDeleteCategory()
                } else if (deleteDialog.type === 'link') {
                  handleDeleteLink()
                } else if (deleteDialog.type === 'social') {
                  handleDeleteSocial()
                }
              }}
              color="error"
              variant="contained"
              disabled={saving}
            >
              {saving ? <CircularProgress size={20} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AuthGuard>
  );
}