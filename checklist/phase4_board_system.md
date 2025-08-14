# Phase 4: 게시판 시스템 (3-4주)

## 4.1 게시판 기본 기능

### 게시글 작성 페이지 (app/write/page.tsx)
```typescript
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Editor from '@/components/editor/Editor'

export default function WritePage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    boardId: '',
    files: [],
  })

  // 로그인 체크
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* 게시판 선택 */}
        <select 
          className="w-full px-4 py-3 rounded-lg border border-outline focus:border-primary"
          value={formData.boardId}
          onChange={(e) => setFormData({...formData, boardId: e.target.value})}
        >
          <option value="">게시판을 선택하세요</option>
          {/* 권한에 따른 게시판 목록 */}
        </select>

        {/* 제목 입력 */}
        <input
          type="text"
          placeholder="제목을 입력하세요"
          className="w-full mt-4 px-4 py-3 rounded-lg border border-outline focus:border-primary text-lg"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
        />

        {/* 에디터 */}
        <div className="mt-4">
          <Editor 
            value={formData.content}
            onChange={(content) => setFormData({...formData, content})}
          />
        </div>

        {/* 파일 업로드 */}
        <FileUpload 
          onUpload={(files) => setFormData({...formData, files})}
        />

        {/* 버튼 */}
        <div className="mt-6 flex justify-end space-x-4">
          <button className="px-6 py-3 rounded-lg border border-outline">
            임시저장
          </button>
          <button className="px-6 py-3 rounded-lg bg-primary text-white shadow-elevation-1">
            게시하기
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 게시판 목록 페이지 (app/boards/page.tsx)
```typescript
export default async function BoardsPage() {
  const boards = await getBoards()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-headline-lg font-bold mb-8">게시판</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boards.map((board) => (
          <Link
            key={board.id}
            href={`/boards/${board.slug}`}
            className="block p-6 bg-white rounded-lg shadow-elevation-1 hover:shadow-elevation-2 transition-shadow"
          >
            <div className="flex items-center mb-4">
              <span className="material-symbols-rounded text-primary text-3xl">
                {board.icon || 'folder'}
              </span>
              <h2 className="ml-3 text-title-lg font-medium">{board.name}</h2>
            </div>
            <p className="text-body-lg text-gray-600">{board.description}</p>
            <div className="mt-4 text-sm text-gray-500">
              최근 활동: {board.lastActivity}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

### 게시글 목록 페이지 (app/boards/[slug]/page.tsx)
```typescript
export default async function BoardPage({ params }: { params: { slug: string } }) {
  const board = await getBoardBySlug(params.slug)
  const posts = await getPostsByBoard(board.id)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-headline-lg font-bold">{board.name}</h1>
        
        {/* 글쓰기 FAB */}
        <Link
          href="/write"
          className="flex items-center px-6 py-3 bg-primary text-white rounded-full shadow-elevation-2"
        >
          <span className="material-symbols-rounded mr-2">edit</span>
          글쓰기
        </Link>
      </div>

      {/* 필터 칩 */}
      <div className="mb-4 flex gap-2">
        <button className="px-4 py-2 rounded-full bg-primary-container text-primary">
          전체
        </button>
        <button className="px-4 py-2 rounded-full border border-outline">
          인기
        </button>
        <button className="px-4 py-2 rounded-full border border-outline">
          최신
        </button>
      </div>

      {/* 게시글 목록 */}
      <div className="bg-white rounded-lg shadow-elevation-1">
        {posts.map((post, index) => (
          <Link
            key={post.id}
            href={`/boards/${params.slug}/${post.id}`}
            className="block p-4 hover:bg-gray-50 border-b last:border-b-0"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {post.isPinned && (
                  <span className="inline-block px-2 py-1 bg-accent-container text-accent text-xs rounded mb-2">
                    고정
                  </span>
                )}
                <h2 className="text-lg font-medium text-dark">{post.title}</h2>
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <span>{post.author.name}</span>
                  <span className="mx-2">·</span>
                  <span>{formatDate(post.createdAt)}</span>
                  <span className="mx-2">·</span>
                  <span>조회 {post.viewCount}</span>
                </div>
              </div>
              <div className="ml-4 text-center">
                <div className="text-sm text-gray-500">좋아요</div>
                <div className="text-lg font-medium">{post.likeCount}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 페이지네이션 */}
      <Pagination currentPage={1} totalPages={10} />
    </div>
  )
}
```

### 게시글 상세 페이지 (app/boards/[slug]/[postId]/page.tsx)
```typescript
export default async function PostPage({ 
  params 
}: { 
  params: { slug: string; postId: string } 
}) {
  const post = await getPost(params.postId)
  
  return (
    <article className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* 게시글 헤더 */}
        <header className="mb-8">
          <h1 className="text-display-lg font-bold mb-4">{post.title}</h1>
          <div className="flex items-center text-gray-600">
            <img 
              src={post.author.image} 
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <div className="font-medium">{post.author.name}</div>
              <div className="text-sm">
                {formatDate(post.createdAt)} · 조회 {post.viewCount}
              </div>
            </div>
          </div>
        </header>

        {/* 게시글 내용 */}
        <div className="prose max-w-none mb-8">
          {post.content}
        </div>

        {/* 첨부파일 */}
        {post.files.length > 0 && (
          <div className="mb-8 p-4 bg-surface rounded-lg">
            <h3 className="font-medium mb-3">첨부파일</h3>
            {post.files.map((file) => (
              <FileItem key={file.id} file={file} />
            ))}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex justify-center gap-4 py-6 border-y">
          <button className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-100">
            <span className="material-symbols-rounded mr-2">favorite</span>
            좋아요 {post.likeCount}
          </button>
          <button className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-100">
            <span className="material-symbols-rounded mr-2">share</span>
            공유
          </button>
        </div>

        {/* 댓글 섹션 */}
        <CommentSection postId={params.postId} />
      </div>
    </article>
  )
}
```

## 4.2 댓글 시스템

### 댓글 컴포넌트
```typescript
export default function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')

  return (
    <div className="mt-8">
      <h3 className="text-title-lg font-medium mb-6">
        댓글 {comments.length}
      </h3>

      {/* 댓글 작성 폼 */}
      <div className="mb-6">
        <textarea
          className="w-full p-4 rounded-lg border border-outline focus:border-primary resize-none"
          rows={3}
          placeholder="댓글을 작성하세요"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button className="px-6 py-2 bg-primary text-white rounded-lg">
            댓글 작성
          </button>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  )
}
```

## 4.3 파일 업로드

### 파일 업로드 컴포넌트
```typescript
export default function FileUpload({ onUpload }) {
  return (
    <div className="mt-4">
      <div className="border-2 border-dashed border-outline rounded-lg p-8 text-center">
        <input
          type="file"
          multiple
          accept=".jpg,.png,.gif,.webp,.pdf,.doc,.docx,.pptx,.xlsx,.hwp,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <span className="material-symbols-rounded text-5xl text-gray-400">
            cloud_upload
          </span>
          <p className="mt-2 text-gray-600">
            클릭하거나 파일을 드래그하세요
          </p>
          <p className="text-sm text-gray-500 mt-1">
            최대 100MB, 지원 형식: 이미지, 문서, 텍스트
          </p>
        </label>
      </div>
    </div>
  )
}
```

## ✅ 체크리스트

### 게시판 기능
- [ ] 게시글 작성 페이지
- [ ] 게시판 목록 페이지
- [ ] 게시글 목록 페이지
- [ ] 게시글 상세 페이지
- [ ] 페이지네이션
- [ ] 검색 기능
- [ ] 필터링 (칩)

### 댓글 시스템
- [ ] 댓글 작성
- [ ] 댓글 목록
- [ ] 대댓글
- [ ] 좋아요
- [ ] 신고 기능

### 파일 업로드
- [ ] 드래그 앤 드롭
- [ ] 다중 파일 선택
- [ ] 진행률 표시
- [ ] S3 업로드 연동
- [ ] 파일 타입별 아이콘

### API 라우트
- [ ] POST /api/posts
- [ ] GET /api/posts
- [ ] PUT /api/posts/[id]
- [ ] DELETE /api/posts/[id]
- [ ] POST /api/comments
- [ ] POST /api/upload