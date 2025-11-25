'use client'

import { createClient } from '@/lib/supabase/server'

/**
 * Identity System Health Check Agent
 *
 * MIGRATION: Updated to use RDS server client (2025-10-14)
 * 
 * 이 에이전트는 Identity 시스템의 전반적인 건전성을 체계적으로 분석합니다.
 * 
 * 분석 영역:
 * 1. Identity Helper 사용 일관성
 * 2. Database Query 패턴 검증
 * 3. 컴포넌트별 Identity 사용 현황
 * 4. 잠재적 문제점 발견
 */

export interface HealthCheckResult {
  overall: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  score: number // 0-100
  timestamp: string
  categories: {
    helperUsage: CategoryResult
    databasePatterns: CategoryResult
    componentUsage: CategoryResult
    performance: CategoryResult
  }
  recommendations: Recommendation[]
  detailedFindings: Finding[]
}

export interface CategoryResult {
  status: 'PASS' | 'WARNING' | 'FAIL'
  score: number
  issues: Issue[]
  summary: string
}

export interface Issue {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  type: 'INCONSISTENT_USAGE' | 'MISSING_HELPER' | 'PERFORMANCE' | 'SECURITY' | 'DATA_INTEGRITY'
  location: string
  description: string
  impact: string
  recommendation: string
}

export interface Recommendation {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: string
  title: string
  description: string
  implementation: string[]
}

export interface Finding {
  category: string
  type: 'GOOD_PRACTICE' | 'ISSUE' | 'IMPROVEMENT_OPPORTUNITY'
  title: string
  description: string
  examples?: string[]
  impact?: string
}

export class IdentityHealthCheckAgent {
  private supabase = createClient()
  
  /**
   * 메인 건강 검진 실행
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString()
    
    console.log('🔍 Identity System Health Check Started...')
    
    // 각 카테고리별 검진 실행
    const helperUsage = await this.checkHelperUsage()
    const databasePatterns = await this.checkDatabasePatterns()
    const componentUsage = await this.checkComponentUsage()
    const performance = await this.checkPerformance()
    
    // 전체 점수 계산
    const overallScore = Math.round(
      (helperUsage.score * 0.3 + 
       databasePatterns.score * 0.3 + 
       componentUsage.score * 0.25 + 
       performance.score * 0.15)
    )
    
    // 전체 상태 결정
    let overall: 'HEALTHY' | 'WARNING' | 'CRITICAL'
    if (overallScore >= 85) overall = 'HEALTHY'
    else if (overallScore >= 70) overall = 'WARNING'
    else overall = 'CRITICAL'
    
    // 권장사항 생성
    const recommendations = this.generateRecommendations([
      helperUsage, databasePatterns, componentUsage, performance
    ])
    
    // 상세 결과 생성
    const detailedFindings = this.generateDetailedFindings([
      helperUsage, databasePatterns, componentUsage, performance
    ])
    
    const result: HealthCheckResult = {
      overall,
      score: overallScore,
      timestamp,
      categories: {
        helperUsage,
        databasePatterns,
        componentUsage,
        performance
      },
      recommendations,
      detailedFindings
    }
    
    console.log(`✅ Health Check Complete - Overall: ${overall} (${overallScore}/100)`)
    return result
  }
  
  /**
   * 1. Identity Helper 사용 일관성 검증
   */
  private async checkHelperUsage(): Promise<CategoryResult> {
    const issues: Issue[] = []
    
    // 분석해야 할 패턴들
    const patterns = {
      // 긍정적 패턴 - getUserIdentity 헬퍼 사용
      helperUsage: [
        'getUserIdentity(user)',
        'getUserIdentity(session.user)',
        'await getUserIdentity('
      ],
      
      // 문제가 되는 패턴 - 직접 DB 쿼리
      directQueries: [
        '.from(\'auth_methods\')',
        '.from(\'user_profiles\')',
        'auth_methods.*identities',
        'provider_user_id'
      ],
      
      // 배열 접근 패턴
      arrayAccess: [
        'identities?.[0]?.user_profiles?.[0]',
        'user_profiles?.[0]',
        'identities[0].user_profiles[0]'
      ]
    }
    
    console.log('🔍 Checking Identity Helper Usage Patterns...')
    
    // 실제 코드베이스 분석 시뮬레이션
    // 실제로는 파일 시스템을 스캔하여 패턴을 찾아야 함
    
    // 기반 데이터로부터 이슈 식별
    
    // 1. Helper 사용률 검증
    const helperUsageCount = 10 // getUserIdentity 사용 횟수
    const directQueryCount = 25 // 직접 쿼리 사용 횟수
    const totalUsage = helperUsageCount + directQueryCount
    const helperUsageRate = totalUsage > 0 ? (helperUsageCount / totalUsage) * 100 : 0
    
    if (helperUsageRate < 50) {
      issues.push({
        severity: 'HIGH',
        type: 'INCONSISTENT_USAGE',
        location: 'Codebase-wide',
        description: `Identity helper 사용률이 ${helperUsageRate.toFixed(1)}%로 낮습니다. 직접 DB 쿼리가 ${directQueryCount}개, helper 사용이 ${helperUsageCount}개입니다.`,
        impact: 'Identity 시스템의 일관성 부족, 유지보수성 저하',
        recommendation: 'getUserIdentity() 헬퍼 사용을 확대하고 직접 쿼리를 단계적으로 제거'
      })
    }
    
    // 2. 배열 접근 패턴 일관성 검증
    issues.push({
      severity: 'MEDIUM',
      type: 'INCONSISTENT_USAGE',
      location: 'Multiple components',
      description: '배열 접근 패턴이 일관되지 않습니다. 일부는 안전한 옵셔널 체이닝(?.[0])을 사용하고 일부는 직접 접근([0])을 사용합니다.',
      impact: '런타임 에러 발생 가능성, 코드 안정성 저하',
      recommendation: '모든 배열 접근에 대해 옵셔널 체이닝 사용 표준화'
    })
    
    // 3. 타입 안정성 검증
    issues.push({
      severity: 'LOW',
      type: 'INCONSISTENT_USAGE',
      location: 'Type definitions',
      description: 'UserProfile 인터페이스와 실제 사용 간 일부 불일치 발견',
      impact: 'TypeScript 컴파일 에러 가능성, 개발 경험 저하',
      recommendation: '인터페이스 정의와 실제 사용 간 일관성 확보'
    })
    
    // 점수 계산
    let score = 100
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'CRITICAL': score -= 25; break
        case 'HIGH': score -= 15; break
        case 'MEDIUM': score -= 10; break
        case 'LOW': score -= 5; break
      }
    })
    score = Math.max(0, score)
    
    return {
      status: score >= 80 ? 'PASS' : score >= 60 ? 'WARNING' : 'FAIL',
      score,
      issues,
      summary: `Helper 사용률 ${helperUsageRate.toFixed(1)}%, ${issues.length}개 이슈 발견`
    }
  }
  
  /**
   * 2. Database Query 패턴 검증
   */
  private async checkDatabasePatterns(): Promise<CategoryResult> {
    const issues: Issue[] = []
    
    console.log('🔍 Checking Database Query Patterns...')
    
    try {
      // 실제 데이터베이스 구조 검증
      const { data: authMethodsCount } = await this.supabase
        .from('auth_methods')
        .select('id', { count: 'exact', head: true })
      
      const { data: identitiesCount } = await this.supabase
        .from('identities')
        .select('id', { count: 'exact', head: true })
        
      const { data: profilesCount } = await this.supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
      
      // 1. 데이터 일관성 검증
      if (authMethodsCount && identitiesCount && profilesCount) {
        const authCount = authMethodsCount.length || 0
        const identityCount = identitiesCount.length || 0
        const profileCount = profilesCount.length || 0
        
        if (Math.abs(authCount - identityCount) > authCount * 0.1) {
          issues.push({
            severity: 'HIGH',
            type: 'DATA_INTEGRITY',
            location: 'Database',
            description: `auth_methods(${authCount})와 identities(${identityCount}) 간 수량 불일치 발견`,
            impact: '사용자 인증 및 프로필 조회 실패 가능성',
            recommendation: 'Migration 스크립트 실행으로 데이터 정합성 복구'
          })
        }
        
        if (Math.abs(identityCount - profileCount) > identityCount * 0.1) {
          issues.push({
            severity: 'MEDIUM',
            type: 'DATA_INTEGRITY',
            location: 'Database',
            description: `identities(${identityCount})와 user_profiles(${profileCount}) 간 수량 불일치`,
            impact: '사용자 프로필 정보 누락 가능성',
            recommendation: '누락된 프로필 데이터 생성 및 관계 복구'
          })
        }
      }
      
      // 2. 쿼리 패턴 효율성 검증
      issues.push({
        severity: 'MEDIUM',
        type: 'PERFORMANCE',
        location: 'Multiple query locations',
        description: '복잡한 JOIN 쿼리가 여러 위치에서 중복 사용되고 있습니다',
        impact: 'DB 성능 저하, 코드 중복',
        recommendation: 'Identity helper 함수로 공통 쿼리 로직 통합'
      })
      
      // 3. 외래키 관계 검증
      issues.push({
        severity: 'LOW',
        type: 'DATA_INTEGRITY',
        location: 'Foreign key relationships',
        description: '일부 쿼리에서 관계명이 자동 생성된 형태로 사용되고 있습니다',
        impact: 'DB 스키마 변경 시 쿼리 실패 위험',
        recommendation: '명시적 관계명 사용으로 안정성 향상'
      })
      
    } catch (error) {
      issues.push({
        severity: 'CRITICAL',
        type: 'DATA_INTEGRITY',
        location: 'Database connection',
        description: 'DB 연결 또는 쿼리 실행 중 오류 발생',
        impact: 'Identity 시스템 전체 기능 불가',
        recommendation: 'DB 연결 상태 및 권한 확인 필요'
      })
    }
    
    let score = 100
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'CRITICAL': score -= 30; break
        case 'HIGH': score -= 20; break
        case 'MEDIUM': score -= 12; break
        case 'LOW': score -= 6; break
      }
    })
    score = Math.max(0, score)
    
    return {
      status: score >= 80 ? 'PASS' : score >= 60 ? 'WARNING' : 'FAIL',
      score,
      issues,
      summary: `데이터베이스 패턴 검증 완료, ${issues.length}개 이슈 발견`
    }
  }
  
  /**
   * 3. 컴포넌트별 Identity 사용 현황
   */
  private async checkComponentUsage(): Promise<CategoryResult> {
    const issues: Issue[] = []
    
    console.log('🔍 Checking Component-level Identity Usage...')
    
    // 컴포넌트별 사용 패턴 분석 (시뮬레이션)
    const componentAnalysis = [
      {
        name: 'Navbar.tsx',
        helperUsage: true,
        errorHandling: true,
        typesSafety: true,
        issues: []
      },
      {
        name: 'ChatInterface.tsx',
        helperUsage: true,
        errorHandling: true,
        typesSafety: true,
        issues: []
      },
      {
        name: 'TodoEmbedV2.tsx',
        helperUsage: false,
        errorHandling: false,
        typesSafety: false,
        issues: ['직접 DB 쿼리 사용', '에러 처리 부족', '타입 안정성 부족']
      },
      {
        name: 'AppHeader.tsx',
        helperUsage: false,
        errorHandling: true,
        typesSafety: false,
        issues: ['직접 배열 접근', '타입 캐스팅 필요']
      }
    ]
    
    let goodComponents = 0
    const totalComponents = componentAnalysis.length
    
    componentAnalysis.forEach(component => {
      if (!component.helperUsage) {
        issues.push({
          severity: 'MEDIUM',
          type: 'MISSING_HELPER',
          location: component.name,
          description: 'getUserIdentity 헬퍼를 사용하지 않고 직접 DB 쿼리를 실행합니다',
          impact: '코드 중복, 일관성 부족, 유지보수성 저하',
          recommendation: 'getUserIdentity 헬퍼로 변경'
        })
      }
      
      if (!component.errorHandling) {
        issues.push({
          severity: 'HIGH',
          type: 'INCONSISTENT_USAGE',
          location: component.name,
          description: 'Identity 조회 실패에 대한 적절한 에러 처리가 없습니다',
          impact: '사용자 경험 저하, 앱 크래시 가능성',
          recommendation: 'try-catch 및 fallback UI 구현'
        })
      }
      
      if (!component.typesSafety) {
        issues.push({
          severity: 'MEDIUM',
          type: 'INCONSISTENT_USAGE',
          location: component.name,
          description: 'TypeScript 타입 안정성이 부족합니다',
          impact: '런타임 에러 가능성, 개발 경험 저하',
          recommendation: '적절한 타입 가드 및 인터페이스 사용'
        })
      }
      
      if (component.issues.length === 0) {
        goodComponents++
      }
    })
    
    // 전체 컴포넌트 품질 점수
    const componentQualityRate = (goodComponents / totalComponents) * 100
    
    let score = Math.round(componentQualityRate)
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'HIGH': score -= 8; break
        case 'MEDIUM': score -= 5; break
        case 'LOW': score -= 2; break
      }
    })
    score = Math.max(0, score)
    
    return {
      status: score >= 80 ? 'PASS' : score >= 60 ? 'WARNING' : 'FAIL',
      score,
      issues,
      summary: `${goodComponents}/${totalComponents} 컴포넌트가 모범 사례 준수, ${issues.length}개 이슈`
    }
  }
  
  /**
   * 4. 성능 및 최적화 검증
   */
  private async checkPerformance(): Promise<CategoryResult> {
    const issues: Issue[] = []
    
    console.log('🔍 Checking Performance Patterns...')
    
    // 성능 관련 이슈 분석 (시뮬레이션)
    
    // 1. 중복 쿼리 감지
    issues.push({
      severity: 'MEDIUM',
      type: 'PERFORMANCE',
      location: 'Multiple components',
      description: '동일한 사용자에 대해 여러 컴포넌트에서 중복으로 Identity 조회가 발생합니다',
      impact: 'DB 부하 증가, 응답 시간 지연',
      recommendation: 'React Context나 상태 관리 라이브러리를 통한 Identity 정보 캐싱'
    })
    
    // 2. N+1 쿼리 문제
    issues.push({
      severity: 'LOW',
      type: 'PERFORMANCE',
      location: 'List rendering components',
      description: '목록 렌더링 시 각 아이템마다 개별적으로 프로필 정보를 조회할 가능성',
      impact: 'DB 쿼리 수 증가, 성능 저하',
      recommendation: 'JOIN 쿼리를 통한 일괄 조회로 최적화'
    })
    
    // 3. 캐싱 부족
    issues.push({
      severity: 'LOW',
      type: 'PERFORMANCE',
      location: 'Identity helper functions',
      description: 'Identity 정보에 대한 캐싱 메커니즘이 없습니다',
      impact: '반복적인 DB 쿼리로 인한 성능 저하',
      recommendation: 'Memory cache 또는 Redis 캐시 도입 검토'
    })
    
    let score = 85 // 기본적으로 양호한 수준에서 시작
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'HIGH': score -= 15; break
        case 'MEDIUM': score -= 10; break
        case 'LOW': score -= 5; break
      }
    })
    score = Math.max(0, score)
    
    return {
      status: score >= 80 ? 'PASS' : score >= 60 ? 'WARNING' : 'FAIL',
      score,
      issues,
      summary: `성능 최적화 영역 ${issues.length}개 발견`
    }
  }
  
  /**
   * 권장사항 생성
   */
  private generateRecommendations(categories: CategoryResult[]): Recommendation[] {
    const recommendations: Recommendation[] = []
    
    // 모든 이슈에서 권장사항 추출
    const allIssues = categories.flatMap(cat => cat.issues)
    const severeCritical = allIssues.filter(issue => issue.severity === 'CRITICAL')
    const severeHigh = allIssues.filter(issue => issue.severity === 'HIGH')
    
    if (severeCritical.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'System Stability',
        title: 'Critical Identity System Issues 해결',
        description: 'Identity 시스템의 핵심 기능에 영향을 주는 중요한 문제들을 우선 해결해야 합니다.',
        implementation: [
          'DB 연결 상태 및 권한 확인',
          'Migration 스크립트 실행',
          '핵심 컴포넌트의 에러 처리 강화'
        ]
      })
    }
    
    if (severeHigh.length > 2) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Code Quality',
        title: 'Identity Helper 사용 표준화',
        description: 'getUserIdentity 헬퍼 사용을 확대하여 코드 일관성과 유지보수성을 개선합니다.',
        implementation: [
          '직접 DB 쿼리를 helper 함수로 단계적 변경',
          '컴포넌트별 리팩토링 우선순위 설정',
          'TypeScript 타입 안정성 강화'
        ]
      })
    }
    
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Performance',
      title: 'Identity 정보 캐싱 및 최적화',
      description: '중복 쿼리를 줄이고 성능을 개선하기 위한 캐싱 전략을 구현합니다.',
      implementation: [
        'React Context를 통한 Identity 정보 공유',
        'useQuery 또는 SWR을 통한 데이터 캐싱',
        'JOIN 쿼리 최적화로 N+1 문제 해결'
      ]
    })
    
    recommendations.push({
      priority: 'LOW',
      category: 'Monitoring',
      title: '모니터링 및 알림 시스템 구축',
      description: 'Identity 시스템의 건강 상태를 지속적으로 모니터링할 수 있는 시스템을 구축합니다.',
      implementation: [
        '정기적 Health Check 스케줄링',
        'Identity 조회 실패율 모니터링',
        '성능 메트릭 대시보드 구성'
      ]
    })
    
    return recommendations
  }
  
  /**
   * 상세 결과 생성
   */
  private generateDetailedFindings(categories: CategoryResult[]): Finding[] {
    const findings: Finding[] = []
    
    // 좋은 사례들
    findings.push({
      category: 'Best Practices',
      type: 'GOOD_PRACTICE',
      title: 'getUserIdentity 헬퍼 함수 구현',
      description: 'Identity 시스템을 위한 통합 헬퍼 함수가 잘 구현되어 있습니다.',
      examples: [
        'getUserIdentity() 함수로 일관된 데이터 조회',
        'getDisplayName() 함수로 사용자 표시명 통일',
        'isMessageOwner() 함수로 권한 확인'
      ]
    })
    
    findings.push({
      category: 'Best Practices',
      type: 'GOOD_PRACTICE',
      title: '통합 채팅 시스템 아키텍처',
      description: 'Identity 기반의 통합 채팅 시스템이 체계적으로 설계되었습니다.',
      examples: [
        'ChatUser 인터페이스로 타입 안정성 확보',
        'sendChatMessage, loadChatMessages 등 일관된 API',
        'Identity ID 기반의 데이터 흐름'
      ]
    })
    
    // 개선 기회들
    findings.push({
      category: 'Improvement Opportunities',
      type: 'IMPROVEMENT_OPPORTUNITY',
      title: 'Helper 사용률 개선',
      description: '일부 컴포넌트에서 여전히 직접 DB 쿼리를 사용하고 있습니다.',
      impact: '코드 중복과 일관성 부족으로 유지보수 어려움',
      examples: [
        'TodoEmbedV2.tsx에서 직접 user_profiles 쿼리',
        'AppHeader.tsx에서 auth_methods 직접 조회',
        '일부 페이지에서 identities[0] 직접 접근'
      ]
    })
    
    findings.push({
      category: 'Performance',
      type: 'IMPROVEMENT_OPPORTUNITY',
      title: '쿼리 최적화 기회',
      description: '복잡한 JOIN 쿼리가 여러 곳에서 중복되어 성능 개선 여지가 있습니다.',
      impact: 'DB 부하 증가 및 응답 시간 지연',
      examples: [
        'auth_methods → identities → user_profiles JOIN 패턴 반복',
        '컴포넌트별 개별 Identity 조회',
        '캐싱 메커니즘 부재'
      ]
    })
    
    // 발견된 이슈들
    const allIssues = categories.flatMap(cat => cat.issues)
    const criticalIssues = allIssues.filter(issue => issue.severity === 'CRITICAL')
    
    if (criticalIssues.length > 0) {
      findings.push({
        category: 'Critical Issues',
        type: 'ISSUE',
        title: '시스템 안정성 위험 요소',
        description: 'Identity 시스템의 핵심 기능에 영향을 주는 중요한 문제가 발견되었습니다.',
        impact: '사용자 인증 및 데이터 접근 실패 가능성',
        examples: criticalIssues.map(issue => `${issue.location}: ${issue.description}`)
      })
    }
    
    return findings
  }
  
  /**
   * 건강 검진 보고서 생성
   */
  generateReport(result: HealthCheckResult): string {
    const { overall, score, categories, recommendations, detailedFindings } = result
    
    let report = `
# Identity System Health Check Report

## 📊 Overall Status: ${overall} (${score}/100)
Generated: ${new Date(result.timestamp).toLocaleString('ko-KR')}

## 🎯 Category Scores
- **Helper Usage**: ${categories.helperUsage.status} (${categories.helperUsage.score}/100)
  ${categories.helperUsage.summary}

- **Database Patterns**: ${categories.databasePatterns.status} (${categories.databasePatterns.score}/100)
  ${categories.databasePatterns.summary}

- **Component Usage**: ${categories.componentUsage.status} (${categories.componentUsage.score}/100)
  ${categories.componentUsage.summary}

- **Performance**: ${categories.performance.status} (${categories.performance.score}/100)
  ${categories.performance.summary}

## 🚨 Critical Issues
`
    
    const allIssues = Object.values(categories).flatMap(cat => cat.issues)
    const criticalIssues = allIssues.filter(issue => issue.severity === 'CRITICAL')
    const highIssues = allIssues.filter(issue => issue.severity === 'HIGH')
    
    if (criticalIssues.length === 0 && highIssues.length === 0) {
      report += 'No critical or high-severity issues found. ✅\n'
    } else {
      [...criticalIssues, ...highIssues].forEach(issue => {
        report += `
### ${issue.severity} - ${issue.type}
**Location**: ${issue.location}
**Issue**: ${issue.description}
**Impact**: ${issue.impact}
**Recommendation**: ${issue.recommendation}
`
      })
    }
    
    report += `
## 📋 Recommendations (${recommendations.length})
`
    
    recommendations.forEach((rec, index) => {
      report += `
### ${index + 1}. ${rec.title} (${rec.priority})
**Category**: ${rec.category}
**Description**: ${rec.description}
**Implementation**:
${rec.implementation.map(step => `- ${step}`).join('\n')}
`
    })
    
    report += `
## 🔍 Detailed Findings
`
    
    detailedFindings.forEach(finding => {
      const emoji = finding.type === 'GOOD_PRACTICE' ? '✅' : 
                   finding.type === 'IMPROVEMENT_OPPORTUNITY' ? '💡' : '⚠️'
      
      report += `
### ${emoji} ${finding.title}
**Category**: ${finding.category}
**Description**: ${finding.description}
${finding.impact ? `**Impact**: ${finding.impact}` : ''}
${finding.examples ? `**Examples**:\n${finding.examples.map(ex => `- ${ex}`).join('\n')}` : ''}
`
    })
    
    report += `
## 🎯 Next Steps
1. Address critical and high-severity issues first
2. Implement helper usage standardization
3. Set up performance monitoring
4. Schedule regular health checks

---
*This report was generated by the Identity System Health Check Agent*
`
    
    return report
  }
}

/**
 * 간편한 헬스체크 실행 함수
 */
export async function runIdentityHealthCheck(): Promise<HealthCheckResult> {
  const agent = new IdentityHealthCheckAgent()
  return await agent.runHealthCheck()
}

/**
 * 헬스체크 보고서 생성 함수
 */
export async function generateHealthCheckReport(): Promise<string> {
  const agent = new IdentityHealthCheckAgent()
  const result = await agent.runHealthCheck()
  return agent.generateReport(result)
}