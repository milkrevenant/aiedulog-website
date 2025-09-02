'use client'

import React from 'react'
import { Box, Typography, Container } from '@mui/material'
import { ContentSectionRenderer } from '@/components/content-blocks'
import type { ContentBlock } from '@/types/content-management'

export default function DemoCMSPage() {
  // Demo content blocks to showcase the CMS system
  const demoBlocks: ContentBlock[] = [
    // Hero Block
    {
      id: 'hero-demo',
      section_id: 'demo-section',
      block_type: 'hero',
      content: {
        title: {
          ko: 'AIedulog CMS 시스템',
          en: 'AIedulog CMS System'
        },
        subtitle: {
          ko: '강력하고 유연한 콘텐츠 관리 시스템으로 웹사이트를 구축하세요',
          en: 'Build your website with a powerful and flexible content management system'
        },
        cta_text: {
          ko: '시작하기',
          en: 'Get Started'
        },
        cta_url: '/admin/main-content',
        background_type: 'gradient',
        background_gradient: {
          start: '#667eea',
          end: '#764ba2',
          direction: '135deg'
        }
      },
      metadata: {},
      layout_config: {
        container_width: 'full',
        padding: { top: 6, bottom: 6, left: 0, right: 0 }
      },
      animation_config: {},
      sort_order: 1,
      is_active: true,
      visibility: 'public',
      conditions: {},
      click_tracking: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // Feature Grid Block
    {
      id: 'features-demo',
      section_id: 'demo-section',
      block_type: 'feature_grid',
      content: {
        title: {
          ko: '주요 기능',
          en: 'Key Features'
        },
        subtitle: {
          ko: 'CMS 시스템의 핵심 기능들을 살펴보세요',
          en: 'Explore the core features of our CMS system'
        },
        columns: 3,
        items: [
          {
            id: '1',
            title: { ko: '콘텐츠 블록', en: 'Content Blocks' },
            description: { ko: '10가지 다양한 콘텐츠 블록으로 페이지를 구성하세요', en: 'Build pages with 10 different content block types' },
            icon: 'build'
          },
          {
            id: '2',
            title: { ko: '다국어 지원', en: 'Multilingual Support' },
            description: { ko: '한국어와 영어를 동시에 지원하는 콘텐츠 관리', en: 'Manage content in both Korean and English' },
            icon: 'group'
          },
          {
            id: '3',
            title: { ko: '실시간 미리보기', en: 'Live Preview' },
            description: { ko: '변경사항을 실시간으로 확인하며 편집하세요', en: 'Edit and preview changes in real-time' },
            icon: 'speed'
          }
        ]
      },
      metadata: {},
      layout_config: {
        container_width: 'wide',
        padding: { top: 8, bottom: 8, left: 2, right: 2 }
      },
      animation_config: {},
      sort_order: 2,
      is_active: true,
      visibility: 'public',
      conditions: {},
      click_tracking: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // Stats Block
    {
      id: 'stats-demo',
      section_id: 'demo-section',
      block_type: 'stats',
      content: {
        title: {
          ko: '시스템 현황',
          en: 'System Status'
        },
        items: [
          {
            id: '1',
            number: 10,
            label: { ko: '콘텐츠 블록 타입', en: 'Content Block Types' },
            suffix: ''
          },
          {
            id: '2',
            number: 11,
            label: { ko: '섹션', en: 'Sections' },
            suffix: ''
          },
          {
            id: '3',
            number: 8,
            label: { ko: '관리 테이블', en: 'Management Tables' },
            suffix: ''
          },
          {
            id: '4',
            number: 100,
            label: { ko: '완성도', en: 'Completion' },
            suffix: '%'
          }
        ]
      },
      metadata: {},
      layout_config: {
        container_width: 'wide',
        padding: { top: 6, bottom: 6, left: 2, right: 2 }
      },
      animation_config: {},
      sort_order: 3,
      is_active: true,
      visibility: 'public',
      conditions: {},
      click_tracking: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // Rich Text Block
    {
      id: 'text-demo',
      section_id: 'demo-section',
      block_type: 'text_rich',
      content: {
        content: {
          ko: `<h2>CMS 시스템 소개</h2>
          <p>AIedulog의 콘텐츠 관리 시스템은 현대적인 웹 개발 요구사항을 충족하도록 설계되었습니다. 이 시스템은 다음과 같은 특징을 가지고 있습니다:</p>
          <ul>
            <li><strong>모듈화된 구조:</strong> 각 콘텐츠 블록은 독립적으로 관리되며 재사용 가능합니다.</li>
            <li><strong>타입 안전성:</strong> TypeScript를 사용하여 개발 과정에서 오류를 방지합니다.</li>
            <li><strong>반응형 디자인:</strong> 모든 디바이스에서 완벽하게 작동하도록 최적화되었습니다.</li>
          </ul>
          <p>이 시스템을 통해 개발자와 콘텐츠 관리자 모두 효율적으로 작업할 수 있습니다.</p>`,
          en: `<h2>CMS System Overview</h2>
          <p>AIedulog's content management system is designed to meet modern web development requirements. This system features:</p>
          <ul>
            <li><strong>Modular Structure:</strong> Each content block is independently managed and reusable.</li>
            <li><strong>Type Safety:</strong> Built with TypeScript to prevent errors during development.</li>
            <li><strong>Responsive Design:</strong> Optimized to work perfectly on all devices.</li>
          </ul>
          <p>This system enables both developers and content managers to work efficiently.</p>`
        },
        format: 'html'
      },
      metadata: {},
      layout_config: {
        container_width: 'narrow',
        padding: { top: 6, bottom: 6, left: 2, right: 2 }
      },
      animation_config: {},
      sort_order: 4,
      is_active: true,
      visibility: 'public',
      conditions: {},
      click_tracking: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // CTA Block
    {
      id: 'cta-demo',
      section_id: 'demo-section',
      block_type: 'cta',
      content: {
        title: {
          ko: '지금 시작해보세요!',
          en: 'Get Started Now!'
        },
        description: {
          ko: '관리자 패널에서 새로운 콘텐츠를 만들고 관리해보세요.',
          en: 'Create and manage new content in the admin panel.'
        },
        button_text: {
          ko: '관리자 패널 열기',
          en: 'Open Admin Panel'
        },
        button_url: '/admin/main-content',
        button_style: 'primary'
      },
      metadata: {},
      layout_config: {
        container_width: 'full',
        padding: { top: 8, bottom: 8, left: 0, right: 0 }
      },
      animation_config: {},
      sort_order: 5,
      is_active: true,
      visibility: 'public',
      conditions: {},
      click_tracking: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Page Header */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography
          variant="h4"
          sx={{
            textAlign: 'center',
            mb: 2,
            color: 'text.secondary'
          }}
        >
          CMS Demo Page
        </Typography>
        <Typography
          variant="body1"
          sx={{
            textAlign: 'center',
            color: 'text.secondary',
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          This page demonstrates the content management system with various content block types.
          In production, this content would be managed through the admin interface.
        </Typography>
      </Container>

      {/* Render Demo Content Blocks */}
      <ContentSectionRenderer 
        blocks={demoBlocks}
        language="ko"
        userContext={{
          isLoggedIn: false,
          userRole: 'user'
        }}
      />
    </Box>
  )
}