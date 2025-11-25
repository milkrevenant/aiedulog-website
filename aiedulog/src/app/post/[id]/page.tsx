'use client'
/**
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
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
  TextField,
  Stack,
  Divider,
  Skeleton,
  Paper,
  Chip,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  alpha,
  Breadcrumbs,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  Share,
  Bookmark,
  BookmarkBorder,
  MoreVert,
  Send,
  VerifiedUser,
  NavigateNext,
  ArrowBack,
  Edit,
  Delete,
  Reply,
  MoreHoriz,
} from '@mui/icons-material'
import AppHeader from '@/components/AppHeader'

const categoryInfo = {
  general: { name: '자유게시판' },
  education: { name: '교육 자료실' },
  tech: { name: '에듀테크 트렌드' },
  job: { name: '구인구직' },
}

export default function PostDetailPage() {
  const params = useParams()
  const postId = params.id as string
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [commentLoading, setCommentLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const router = useRouter()
  const supabase = createClient()
  const theme = useTheme()

  // 게시글 상세 정보 가져오기
  const fetchPost = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      // First try the new identity-based query
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          identities!posts_author_id_fkey (
            id,
            status,
            user_profiles!identities_user_profiles_identity_id_fkey (
              email,
              nickname,
              role,
              avatar_url
            )
          ),
          post_likes (user_id),
          bookmarks (user_id)
        `)
        .eq('id', postId)
        .single()

      if (error) {
        // Fallback to legacy profiles query
        console.warn('Falling back to legacy profiles query:', error)
        const { data: legacyData, error: legacyError } = await supabase
          .from('posts')
          .select(`
            *,
            profiles!posts_author_id_fkey (
              id,
              email,
              nickname,
              role,
              avatar_url
            ),
            post_likes (user_id),
            bookmarks (user_id)
          `)
          .eq('id', postId)
          .single()

        if (legacyError) throw legacyError

        const postWithStats = {
          ...legacyData,
          author: {
            id: legacyData.profiles?.id,
            name: legacyData.profiles?.nickname || legacyData.profiles?.email?.split('@')[0] || '사용자',
            email: legacyData.profiles?.email,
            role: legacyData.profiles?.role || 'member',
            isVerified: legacyData.profiles?.role === 'verified',
            avatar_url: legacyData.profiles?.avatar_url,
          },
          likes: legacyData.post_likes?.length || 0,
          isLiked: legacyData.post_likes?.some((like: any) => like.user_id === user?.id) || false,
          isBookmarked: legacyData.bookmarks?.some((bookmark: any) => bookmark.user_id === user?.id) || false,
        }
        setPost(postWithStats)
        setEditTitle(legacyData.title)
        setEditContent(legacyData.content)
        return
      }

      if (data) {
        const userProfile = data.identities?.user_profiles?.[0]
        const postWithStats = {
          ...data,
          author: {
            id: data.identities?.id,
            name: userProfile?.nickname || userProfile?.email?.split('@')[0] || '사용자',
            email: userProfile?.email,
            role: userProfile?.role || 'member',
            isVerified: userProfile?.role === 'verified' || userProfile?.role === 'moderator' || userProfile?.role === 'admin',
            avatar_url: userProfile?.avatar_url,
          },
          likes: data.post_likes?.length || 0,
          isLiked: data.post_likes?.some((like: any) => like.user_id === user?.id) || false,
          isBookmarked: data.bookmarks?.some((bookmark: any) => bookmark.user_id === user?.id) || false,
        }
        setPost(postWithStats)
        setEditTitle(data.title)
        setEditContent(data.content)

        // 조회수 증가
        if (user) {
          await supabase.rpc('increment_view_count', { post_id: postId })
        }
      }
    } catch (err) {
      console.error('Error fetching post:', err)
    }
  }, [supabase, user?.id, postId, isAuthenticated])

  // 댓글 목록 가져오기
  const fetchComments = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      // First try the new identity-based query
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          identities!comments_author_id_fkey (
            id,
            status,
            user_profiles!identities_user_profiles_identity_id_fkey (
              email,
              nickname,
              role,
              avatar_url
            )
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) {
        // Fallback to legacy profiles query
        console.warn('Falling back to legacy profiles query for comments:', error)
        const { data: legacyData, error: legacyError } = await supabase
          .from('comments')
          .select(`
            *,
            profiles!comments_author_id_fkey (
              id,
              email,
              nickname,
              role,
              avatar_url
            )
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: true })

        if (legacyError) throw legacyError

        const commentsWithAuthor = legacyData.map((comment: any) => ({
          ...comment,
          author: {
            id: comment.identities?.user_profiles?.id,
            name: comment.identities?.user_profiles?.nickname || comment.identities?.user_profiles?.email?.split('@')[0] || '사용자',
            email: comment.identities?.user_profiles?.email,
            role: comment.identities?.user_profiles?.role || 'member',
            isVerified: comment.identities?.user_profiles?.role === 'verified',
            avatar_url: comment.identities?.user_profiles?.avatar_url,
          },
        }))
        setComments(commentsWithAuthor)
        return
      }

      if (data) {
        const commentsWithAuthor = data.map((comment: any) => {
          const userProfile = comment.identities?.user_profiles?.[0]
          return {
            ...comment,
            author: {
              id: comment.identities?.id,
              name: userProfile?.nickname || userProfile?.email?.split('@')[0] || '사용자',
              email: userProfile?.email,
              role: userProfile?.role || 'member',
              isVerified: userProfile?.role === 'verified' || userProfile?.role === 'moderator' || userProfile?.role === 'admin',
              avatar_url: userProfile?.avatar_url,
            },
          }
        })
        setComments(commentsWithAuthor)
      }
    } catch (err) {
      console.error('Error fetching comments:', err)
    }
  }, [supabase, postId, isAuthenticated])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchPost()
      fetchComments()
    }
  }, [isAuthenticated, authLoading, fetchPost, fetchComments])

  const handleLike = async () => {
    if (!post || !user) return

    if (post.isLiked) {
      // 좋아요 취소
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      // 좋아요 추가
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
    }

    // UI 업데이트
    setPost({
      ...post,
      isLiked: !post.isLiked,
      likes: post.isLiked ? post.likes - 1 : post.likes + 1,
    })
  }

  const handleBookmark = async () => {
    if (!post || !user) return

    if (post.isBookmarked) {
      // 북마크 취소
      await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      // 북마크 추가
      await supabase.from('bookmarks').insert({ post_id: postId, user_id: user.id })
    }

    // UI 업데이트
    setPost({
      ...post,
      isBookmarked: !post.isBookmarked,
    })
  }

  const handleComment = async () => {
    if (!newComment.trim() || !user) return

    setCommentLoading(true)

    const { data, error } = await supabase
      .from('comments')
      .insert({
        content: newComment,
        author_id: user.id,
        post_id: postId,
        parent_id: replyTo,
      })
      .select()
      .single()

    if (data) {
      // 새 댓글을 목록에 추가
      const newCommentData = {
        ...data,
        author: {
          id: profile?.user_id,
          name: profile?.email?.split('@')[0] || '사용자',
          email: profile?.email,
          role: profile?.role || 'member',
          isVerified: profile?.role === 'verified',
        },
      }

      setComments([...comments, newCommentData])
      setNewComment('')
      setReplyTo(null)
    }

    setCommentLoading(false)
  }

  const handleEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) return

    const { error } = await supabase
      .from('posts')
      .update({
        title: editTitle,
        content: editContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (!error) {
      setPost({
        ...post,
        title: editTitle,
        content: editContent,
      })
      setEditMode(false)
    }
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('posts').delete().eq('id', postId)

    if (!error) {
      router.push(`/board/${post.category}`)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)

    if (!error) {
      setComments(comments.filter((c) => c.id !== commentId))
    }
  }

  if (authLoading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
        <AppHeader user={user} profile={profile} />
        <Container maxWidth="md" sx={{ pt: 2 }}>
          <Card>
            <CardHeader
              avatar={<Skeleton variant="circular" width={40} height={40} />}
              title={<Skeleton width="30%" />}
              subheader={<Skeleton width="20%" />}
            />
            <CardContent>
              <Skeleton height={30} />
              <Skeleton />
              <Skeleton />
              <Skeleton width="60%" />
            </CardContent>
          </Card>
        </Container>
      </Box>
    )
  }

  if (!user || !profile || !post) return null

  const isAuthor = user.id === post.author.id
  const isAdmin = profile.role === 'admin'
  const canEdit = isAuthor || isAdmin
  const canDelete = isAuthor || isAdmin

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 8 }}>
      {/* 공통 헤더 */}
      <AppHeader user={user} profile={profile} />

      <Container maxWidth="md" sx={{ pt: 3 }}>
        {/* 브레드크럼 */}
        <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            href="/feed"
            onClick={(e) => {
              e.preventDefault()
              router.push('/feed')
            }}
          >
            홈
          </Link>
          <Link
            underline="hover"
            color="inherit"
            href={`/board/${post.category}`}
            onClick={(e) => {
              e.preventDefault()
              router.push(`/board/${post.category}`)
            }}
          >
            {categoryInfo[post.category as keyof typeof categoryInfo]?.name || '게시판'}
          </Link>
          <Typography color="text.primary">게시글</Typography>
        </Breadcrumbs>

        {/* 뒤로가기 버튼 */}
        <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 2 }}>
          목록으로
        </Button>

        {/* 게시글 본문 */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            avatar={
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  post.author.isVerified ? (
                    <VerifiedUser
                      sx={{
                        width: 16,
                        height: 16,
                        color: 'success.main',
                        bgcolor: 'background.paper',
                        borderRadius: '50%',
                      }}
                    />
                  ) : null
                }
              >
                <Avatar sx={{ bgcolor: 'primary.main' }}>{post.author.name[0]}</Avatar>
              </Badge>
            }
            action={
              canEdit && (
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                  <MoreVert />
                </IconButton>
              )
            }
            title={
              <Stack>
                {post.is_pinned && (
                  <Chip
                    label="고정"
                    size="small"
                    color="error"
                    sx={{ mb: 1, width: 'fit-content' }}
                  />
                )}
                {editMode ? (
                  <TextField
                    fullWidth
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    variant="standard"
                    sx={{ mb: 1 }}
                  />
                ) : (
                  <Typography variant="h5" fontWeight="bold">
                    {post.title}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2">{post.author.name}</Typography>
                  {post.author.role === 'verified' && (
                    <Chip label="인증 교사" size="small" color="success" sx={{ height: 20 }} />
                  )}
                  {post.author.role === 'admin' && (
                    <Chip label="관리자" size="small" color="error" sx={{ height: 20 }} />
                  )}
                </Stack>
              </Stack>
            }
            subheader={
              <Stack direction="row" spacing={2}>
                <Typography variant="caption">
                  {new Date(post.created_at).toLocaleString('ko-KR')}
                </Typography>
                <Typography variant="caption">조회 {post.view_count || 0}</Typography>
              </Stack>
            }
          />

          <CardContent>
            {editMode ? (
              <TextField
                fullWidth
                multiline
                rows={10}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                variant="outlined"
              />
            ) : (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mt: 1 }}>
                {post.content}
              </Typography>
            )}
          </CardContent>

          {post.image_urls && post.image_urls.length > 0 && (
            <Box sx={{ px: 2, pb: 2 }}>
              {post.image_urls.map((imageUrl: string, index: number) => (
                <Box
                  key={index}
                  component="img"
                  src={imageUrl}
                  alt={`Post image ${index + 1}`}
                  sx={{
                    width: '100%',
                    maxHeight: 600,
                    objectFit: 'contain',
                    borderRadius: '12px',
                    mb: index < post.image_urls.length - 1 ? 2 : 0,
                  }}
                />
              ))}
            </Box>
          )}

          <CardActions disableSpacing>
            {editMode ? (
              <>
                <Button variant="contained" onClick={handleEdit} sx={{ mr: 1 }}>
                  저장
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setEditMode(false)
                    setEditTitle(post.title)
                    setEditContent(post.content)
                  }}
                >
                  취소
                </Button>
              </>
            ) : (
              <>
                <IconButton onClick={handleLike} color={post.isLiked ? 'error' : 'default'}>
                  {post.isLiked ? <Favorite /> : <FavoriteBorder />}
                </IconButton>
                <Typography variant="body2" color="text.secondary">
                  {post.likes}
                </Typography>

                <IconButton sx={{ ml: 1 }}>
                  <ChatBubbleOutline />
                </IconButton>
                <Typography variant="body2" color="text.secondary">
                  {comments.length}
                </Typography>

                <IconButton sx={{ ml: 1 }}>
                  <Share />
                </IconButton>

                <Box sx={{ flexGrow: 1 }} />

                <IconButton
                  onClick={handleBookmark}
                  color={post.isBookmarked ? 'primary' : 'default'}
                >
                  {post.isBookmarked ? <Bookmark /> : <BookmarkBorder />}
                </IconButton>
              </>
            )}
          </CardActions>
        </Card>

        {/* 댓글 섹션 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              댓글 {comments.length}개
            </Typography>

            {/* 댓글 작성 */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>{profile.email?.[0]?.toUpperCase()}</Avatar>
              <Stack spacing={1} sx={{ flex: 1 }}>
                {replyTo && (
                  <Chip
                    label={`@${comments.find((c) => c.id === replyTo)?.author.name}에게 답글`}
                    onDelete={() => setReplyTo(null)}
                    size="small"
                  />
                )}
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="댓글을 작성하세요..."
                  variant="outlined"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Box sx={{ textAlign: 'right' }}>
                  <Button
                    variant="contained"
                    endIcon={<Send />}
                    onClick={handleComment}
                    disabled={!newComment.trim() || commentLoading}
                    size="small"
                  >
                    {commentLoading ? '작성중...' : '댓글 작성'}
                  </Button>
                </Box>
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* 댓글 목록 */}
            <List>
              {comments.map((comment) => {
                const isCommentAuthor = user.id === comment.author.id
                const canDeleteComment = isCommentAuthor || isAdmin

                return (
                  <ListItem
                    key={comment.id}
                    alignItems="flex-start"
                    sx={{
                      ml: comment.parent_id ? 6 : 0,
                      bgcolor: comment.parent_id
                        ? alpha(theme.palette.action.selected, 0.04)
                        : 'transparent',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                        {comment.author.name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle2">{comment.author.name}</Typography>
                          {comment.author.role === 'verified' && (
                            <Chip label="인증" size="small" color="success" sx={{ height: 18 }} />
                          )}
                          {comment.author.role === 'admin' && (
                            <Chip label="관리자" size="small" color="error" sx={{ height: 18 }} />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            · {new Date(comment.created_at).toLocaleString('ko-KR')}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                            sx={{ display: 'block', mt: 0.5, whiteSpace: 'pre-line' }}
                          >
                            {comment.content}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {!comment.parent_id && (
                              <Button
                                size="small"
                                startIcon={<Reply />}
                                onClick={() => setReplyTo(comment.id)}
                              >
                                답글
                              </Button>
                            )}
                            {canDeleteComment && (
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                삭제
                              </Button>
                            )}
                          </Stack>
                        </>
                      }
                    />
                  </ListItem>
                )
              })}
            </List>
          </CardContent>
        </Card>
      </Container>

      {/* 메뉴 */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {canEdit && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null)
              setEditMode(true)
            }}
          >
            <Edit sx={{ mr: 1 }} /> 수정하기
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null)
              setDeleteDialogOpen(true)
            }}
          >
            <Delete sx={{ mr: 1 }} /> 삭제하기
          </MenuItem>
        )}
        <MenuItem onClick={() => setAnchorEl(null)}>
          <Share sx={{ mr: 1 }} /> 공유하기
        </MenuItem>
      </Menu>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>게시글 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            정말로 이 게시글을 삭제하시겠습니까? 삭제된 게시글은 복구할 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
