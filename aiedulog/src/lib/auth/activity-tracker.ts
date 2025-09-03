/**
 * Activity Tracker - 사용자 활동 추적 및 자동 로그아웃 시스템
 * 
 * 기능:
 * - 사용자 활동 감지 및 기록
 * - 1시간 비활성화 시 자동 로그아웃
 * - "로그인 유지" 옵션 지원
 * - 로그아웃 전 경고 표시
 */

export class ActivityTracker {
  private static readonly TIMEOUT = 60 * 60 * 1000 // 1시간 (밀리초)
  private static readonly WARNING_TIME = 5 * 60 * 1000 // 5분 전 경고 (밀리초)
  private static readonly STORAGE_KEY = 'lastActivity'
  private static readonly REMEMBER_KEY = 'rememberMe'
  
  /**
   * 사용자 활동 시간 업데이트
   * "로그인 유지"가 체크되어 있으면 업데이트하지 않음
   */
  static updateActivity(): void {
    if (!this.isRemembered() && typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, Date.now().toString())
    }
  }
  
  /**
   * 세션이 만료되었는지 확인
   * @returns 만료되었으면 true, 아니면 false
   */
  static isExpired(): boolean {
    if (this.isRemembered()) return false
    
    if (typeof window === 'undefined') return false
    
    const lastActivity = localStorage.getItem(this.STORAGE_KEY)
    if (!lastActivity) return false
    
    const timePassed = Date.now() - parseInt(lastActivity)
    return timePassed > this.TIMEOUT
  }
  
  /**
   * 경고를 표시해야 하는지 확인 (만료 5분 전)
   * @returns 경고가 필요하면 true, 아니면 false
   */
  static shouldWarn(): boolean {
    if (this.isRemembered()) return false
    
    if (typeof window === 'undefined') return false
    
    const lastActivity = localStorage.getItem(this.STORAGE_KEY)
    if (!lastActivity) return false
    
    const timePassed = Date.now() - parseInt(lastActivity)
    return timePassed > (this.TIMEOUT - this.WARNING_TIME) && timePassed < this.TIMEOUT
  }
  
  /**
   * 남은 시간 계산 (초 단위)
   * @returns 남은 시간 (초), 만료되었거나 무제한이면 0
   */
  static getRemainingTime(): number {
    if (this.isRemembered()) return 0
    
    if (typeof window === 'undefined') return 0
    
    const lastActivity = localStorage.getItem(this.STORAGE_KEY)
    if (!lastActivity) return 0
    
    const timePassed = Date.now() - parseInt(lastActivity)
    const remaining = Math.max(0, this.TIMEOUT - timePassed)
    return Math.floor(remaining / 1000)
  }
  
  /**
   * "로그인 유지" 설정
   * @param value 로그인 유지 여부
   */
  static setRememberMe(value: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.REMEMBER_KEY, value.toString())
      
      // 로그인 유지가 해제되면 현재 시간으로 활동 시간 업데이트
      if (!value) {
        this.updateActivity()
      }
    }
  }
  
  /**
   * "로그인 유지" 상태 확인
   * @returns 로그인 유지가 설정되어 있으면 true
   */
  static isRemembered(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(this.REMEMBER_KEY) === 'true'
  }
  
  /**
   * 활동 추적 초기화 (로그인 시 호출)
   */
  static initialize(): void {
    if (typeof window !== 'undefined') {
      this.updateActivity()
    }
  }
  
  /**
   * 모든 데이터 정리 (로그아웃 시 호출)
   */
  static clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(this.REMEMBER_KEY)
    }
  }
  
  /**
   * 디버그용 정보 반환
   */
  static getDebugInfo(): {
    isRemembered: boolean
    lastActivity: string | null
    isExpired: boolean
    shouldWarn: boolean
    remainingTime: number
  } {
    return {
      isRemembered: this.isRemembered(),
      lastActivity: typeof window !== 'undefined' ? localStorage.getItem(this.STORAGE_KEY) : null,
      isExpired: this.isExpired(),
      shouldWarn: this.shouldWarn(),
      remainingTime: this.getRemainingTime()
    }
  }
}