'use client'
/**
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 */

import { useEffect, useState, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserIdentity } from '@/lib/identity/helpers'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/hooks'
import {
  Box,
  Container,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Typography,
  Button,
  Stack,
  Divider,
  Skeleton,
  Paper,
  Chip,
  Badge,
  useTheme,
  alpha,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemAvatar,
  CircularProgress,
  ListItemText,
  ListItemButton,
  CardMedia,
} from '@mui/material'
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  Share,
  Bookmark,
  BookmarkBorder,
  MoreVert,
  VerifiedUser,
  Search as SearchIcon,
  Article,
  Person,
  Tag,
  School, // Add School icon
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'

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
      id={`search-tabpanel-${index}`}
      aria-labelledby={`search-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

function SearchContent() {
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [posts, setPosts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([]) // Add materials state

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const theme = useTheme()

  const query = searchParams.get('q') || ''

  // 검색 실행
  const performSearch = useCallback(async () => {
    if (!query.trim()) return

    setSearchLoading(true)

    try {
      // 게시글 검색 - 새로운 identity 시스템 사용
      let postsData = null
      
      try {
        const { data: identityBasedPosts } = await supabase
          .from('posts')
          .select(
            `
            *,
            author:user_profiles!posts_author_id_fkey (
              user_id,
              email,
              nickname,
              role,
              avatar_url
            ),
            post_likes (
              user_id
            ),
            comments (
              id
            ),
            bookmarks (
              user_id
            )
          `
          )
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(20)
          
        postsData = identityBasedPosts
      } catch (identityError) {
        console.warn('Identity-based post search failed, falling back to profiles:', identityError)
        
        // Fallback to legacy profiles system
        const { data: legacyPosts } = await supabase
          .from('posts')
          .select(
            `
            *,
            profiles!posts_author_id_fkey (
              id,
              email,
              nickname,
              role,
              avatar_url
            ),
            post_likes (
              user_id
            ),
            comments (
              id
            ),
            bookmarks (
              user_id
            )
          `
          )
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(20)
          
        postsData = legacyPosts
      }

      if (postsData) {
        const postsWithStats = postsData.map((post: any) => {
          // Handle both identity-based and legacy profile data
          const profileData = post.author || post.profiles
          
          return {
            ...post,
            author: {
              name: profileData?.nickname || profileData?.email?.split('@')[0] || '사용자',
              email: profileData?.email,
              role: profileData?.role || 'member',
              isVerified: ['verified', 'moderator', 'admin'].includes(profileData?.role),
              avatar_url: profileData?.avatar_url,
            },
            likes: post.post_likes?.length || 0,
            comments: post.comments?.length || 0,
            isLiked: post.post_likes?.some((like: any) => like.user_id === user?.id) || false,
            isBookmarked:
              post.bookmarks?.some((bookmark: any) => bookmark.user_id === user?.id) || false,
          }
        })
        setPosts(postsWithStats)
      }

      // 사용자 검색 - 완전히 통합된 Identity 시스템 사용
      try {
        // Use the standardized searchUsers helper from identity system
        const currentIdentity = user ? await getUserIdentity(user, supabase) : null
        const currentIdentityId = currentIdentity?.user_id
        
        // Use the helper function for consistent user search
        const { searchUsers } = await import('@/lib/identity/helpers')
        const searchResults = await searchUsers(query, supabase, currentIdentityId, 10)
        
        // Map to consistent format for UI
        const usersData = searchResults.map((profile: any) => ({
          id: profile.user_id,
          email: profile.email,
          nickname: profile.nickname,
          avatar_url: profile.avatar_url,
          role: profile.role,
          full_name: profile.full_name,
          school: profile.school
        }))

        setUsers(usersData)
      } catch (error) {
        console.error('User search failed with integrated identity system:', error)
        setUsers([])
      }

      // 태그 검색 (현재는 카테고리로 대체)
      const categories = ['general', 'education', 'tech', 'job']
      const matchedTags = categories
        .filter((cat) => cat.toLowerCase().includes(query.toLowerCase()))
        .map((cat) => ({
          name: cat,
          count: Math.floor(Math.random() * 50), // 임시 카운트
        }))
      setTags(matchedTags)

      // 연수 자료 검색
      try {
        const response = await fetch('/api/training-materials')
        if (response.ok) {
          const allMaterials = await response.json()
          const filteredMaterials = allMaterials.filter((m: any) => 
            m.title.toLowerCase().includes(query.toLowerCase()) ||
            m.description?.toLowerCase().includes(query.toLowerCase()) ||
            m.tags?.some((t: string) => t.toLowerCase().includes(query.toLowerCase()))
          )
          setMaterials(filteredMaterials)
        }
      } catch (error) {
        console.error('Materials search error:', error)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }, [query, user?.id, supabase])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && user && query) {
      performSearch()
    }
  }, [isAuthenticated, user, query, performSearch])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (!post || !user) return

    if (post.isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
    }

    setPosts(
      posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: !p.isLiked,
              likes: p.isLiked ? p.likes - 1 : p.likes + 1,
            }
          : p
      )
    )
  }

  const handleBookmark = async (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (!post || !user) return

    if (post.isBookmarked) {
      await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('bookmarks').insert({ post_id: postId, user_id: user.id })
    }

    setPosts(posts.map((p) => (p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p)))
  }

  if (authLoading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <Container maxWidth="lg" sx={{ py: 2 }}>
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader
                  avatar={<Skeleton variant="circular" width={40} height={40} />}
                  title={<Skeleton width="30%" />}
                  subheader={<Skeleton width="20%" />}
                />
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton />
                  <Skeleton width="60%" />
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Container>
      </Box>
    )
  }

  if (!isAuthenticated || !user) return null

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 8 }}>
      {/* 공통 헤더 */}
      <AppHeader user={user} profile={profile} />

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* 검색 결과 헤더 */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <SearchIcon color="action" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight="bold">
                '{query}' 검색 결과
              </Typography>
              <Typography variant="body2" color="text.secondary">
                게시글 {posts.length}개, 사용자 {users.length}명, 태그 {tags.length}개, 연수자료 {materials.length}개
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* 탭 */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab icon={<Article />} label={`게시글 (${posts.length})`} iconPosition="start" />
            <Tab icon={<Person />} label={`사용자 (${users.length})`} iconPosition="start" />
            <Tab icon={<Tag />} label={`태그 (${tags.length})`} iconPosition="start" />
            <Tab icon={<School />} label={`연수자료 (${materials.length})`} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* 게시글 탭 */}
        <TabPanel value={tabValue} index={0}>
          {searchLoading ? (
            <Stack spacing={2}>
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <Skeleton variant="rectangular" height={150} />
                </Card>
              ))}
            </Stack>
          ) : posts.length > 0 ? (
            <Stack spacing={2}>
              {posts.map((post) => (
                <Card
                  key={post.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 3 },
                  }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button, .MuiIconButton-root')) {
                      return
                    }
                    router.push(`/post/${post.id}`)
                  }}
                >
                  <CardHeader
                    avatar={
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          post.author.isVerified ? (
                            <VerifiedUser sx={{ width: 16, height: 16, color: 'success.main' }} />
                          ) : null
                        }
                      >
                        <Avatar
                          src={post.author.avatar_url || undefined}
                          sx={{ bgcolor: 'primary.main' }}
                        >
                          {post.author.name[0]}
                        </Avatar>
                      </Badge>
                    }
                    action={
                      <IconButton>
                        <MoreVert />
                      </IconButton>
                    }
                    title={
                      <Typography variant="h6" fontWeight="bold">
                        {post.title}
                      </Typography>
                    }
                    subheader={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption">{post.author.name}</Typography>
                        <Typography variant="caption">
                          · {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </Typography>
                      </Stack>
                    }
                  />

                  <CardContent>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {post.content}
                    </Typography>
                  </CardContent>

                  {post.image_urls && post.image_urls.length > 0 && (
                    <Box sx={{ px: 2, pb: 2 }}>
                      <CardMedia
                        component="img"
                        height="200"
                        image={post.image_urls[0]}
                        alt="Post image"
                        sx={{
                          objectFit: 'cover',
                          borderRadius: '12px',
                        }}
                      />
                    </Box>
                  )}

                  <CardActions disableSpacing>
                    <IconButton
                      onClick={() => handleLike(post.id)}
                      color={post.isLiked ? 'error' : 'default'}
                    >
                      {post.isLiked ? <Favorite /> : <FavoriteBorder />}
                    </IconButton>
                    <Typography variant="body2" color="text.secondary">
                      {post.likes}
                    </Typography>

                    <IconButton sx={{ ml: 1 }}>
                      <ChatBubbleOutline />
                    </IconButton>
                    <Typography variant="body2" color="text.secondary">
                      {post.comments}
                    </Typography>

                    <Box sx={{ flexGrow: 1 }} />

                    <IconButton
                      onClick={() => handleBookmark(post.id)}
                      color={post.isBookmarked ? 'primary' : 'default'}
                    >
                      {post.isBookmarked ? <Bookmark /> : <BookmarkBorder />}
                    </IconButton>
                  </CardActions>
                </Card>
              ))}
            </Stack>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                검색 결과가 없습니다
              </Typography>
            </Paper>
          )}
        </TabPanel>

        {/* 사용자 탭 */}
        <TabPanel value={tabValue} index={1}>
          {searchLoading ? (
            <Stack spacing={2}>
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <Skeleton variant="rectangular" height={80} />
                </Card>
              ))}
            </Stack>
          ) : users.length > 0 ? (
            <List>
              {users.map((user) => (
                <ListItem key={user.id} disablePadding>
                  <ListItemButton>
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          user.role === 'verified' ? (
                            <VerifiedUser sx={{ width: 16, height: 16, color: 'success.main' }} />
                          ) : null
                        }
                      >
                        <Avatar src={user.avatar_url || undefined} sx={{ bgcolor: 'primary.main' }}>
                          {user.email?.[0]?.toUpperCase()}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.nickname || user.email?.split('@')[0]}
                      secondary={
                        <Stack direction="row" spacing={1}>
                          {user.role === 'admin' && (
                            <Chip label="관리자" size="small" color="error" />
                          )}
                          {user.role === 'moderator' && (
                            <Chip label="운영진" size="small" color="warning" />
                          )}
                          {user.role === 'verified' && (
                            <Chip label="인증 교사" size="small" color="success" />
                          )}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                검색 결과가 없습니다
              </Typography>
            </Paper>
          )}
        </TabPanel>

        {/* 태그 탭 */}
        <TabPanel value={tabValue} index={2}>
          {tags.length > 0 ? (
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {tags.map((tag) => (
                <Chip
                  key={tag.name}
                  label={`#${tag.name} (${tag.count})`}
                  size="medium"
                  onClick={() => router.push(`/board/${tag.name}`)}
                  sx={{ mb: 1, fontSize: '1rem' }}
                />
              ))}
            </Stack>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                검색 결과가 없습니다
              </Typography>
            </Paper>
          )}
        </TabPanel>

        {/* 연수자료 탭 */}
        <TabPanel value={tabValue} index={3}>
          {materials.length > 0 ? (
            <Stack spacing={2}>
              {materials.map((material) => (
                <Card 
                  key={material.id}
                  sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
                  onClick={() => router.push('/training-materials')}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {material.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {material.description}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {material.tags?.map((tag: string) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                검색 결과가 없습니다
              </Typography>
            </Paper>
          )}
        </TabPanel>
      </Container>
    </Box>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
