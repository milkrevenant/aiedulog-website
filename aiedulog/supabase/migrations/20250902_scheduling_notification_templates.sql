-- Comprehensive Scheduling Notification Templates
-- This migration creates 11 specialized notification templates for the appointment booking system
-- Includes bilingual support (Korean & English), HTML email templates, and calendar integration

-- Create notification templates for scheduling system
INSERT INTO notification_templates (
  template_key,
  template_name,
  template_type,
  category,
  subject_template,
  content_template,
  variables,
  language,
  is_active,
  created_at,
  updated_at
) VALUES

-- =============================================================================
-- APPOINTMENT CREATED (User Booking Confirmation)
-- =============================================================================
(
  'appointment_created',
  '예약 확인 (사용자)',
  'email_html',
  'schedule',
  '✅ {{appointment_type}} 예약이 완료되었습니다 - {{appointment_date}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>예약 확인</title>
  <style>
    body { font-family: "Noto Sans KR", Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; }
    .header { background: linear-gradient(135deg, #2E86AB 0%, #A23B72 100%); color: white; padding: 30px 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .appointment-card { background: #f8f9fa; border-left: 4px solid #2E86AB; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .appointment-details { margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #666; }
    .detail-value { color: #333; }
    .action-button { background: #2E86AB; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
    .action-button:hover { background: #1e5f7d; }
    .meeting-info { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    .status-badge { background: #28a745; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 예약이 완료되었습니다!</h1>
      <p>{{user_name}}님의 {{appointment_type}} 예약을 확인합니다.</p>
    </div>
    
    <div class="content">
      <div class="appointment-card">
        <h2 style="color: #2E86AB; margin-top: 0;">📅 예약 정보</h2>
        
        <div class="appointment-details">
          <div class="detail-row">
            <span class="detail-label">예약 번호:</span>
            <span class="detail-value"><strong>{{appointment_reference}}</strong></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">수업 종류:</span>
            <span class="detail-value">{{appointment_type}}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">일시:</span>
            <span class="detail-value">{{appointment_date}} {{appointment_time}}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">소요 시간:</span>
            <span class="detail-value">{{appointment_duration}}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">강사:</span>
            <span class="detail-value">{{instructor_name}}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">상태:</span>
            <span class="detail-value"><span class="status-badge">예약 완료</span></span>
          </div>
        </div>

        {{#if meeting_link}}
        <div class="meeting-info">
          <h3 style="margin-top: 0;">🔗 온라인 수업 정보</h3>
          <p><strong>미팅 링크:</strong> <a href="{{meeting_link}}" target="_blank">{{meeting_link}}</a></p>
          <p><small>수업 시작 5분 전부터 입장 가능합니다.</small></p>
        </div>
        {{/if}}

        {{#if meeting_location}}
        <div class="meeting-info">
          <h3 style="margin-top: 0;">📍 오프라인 수업 정보</h3>
          <p><strong>장소:</strong> {{meeting_location}}</p>
          <p><small>수업 시작 10분 전까지 도착해주세요.</small></p>
        </div>
        {{/if}}

        {{#if appointment_notes}}
        <div style="margin: 20px 0;">
          <strong>참고사항:</strong>
          <p style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 5px 0;">{{appointment_notes}}</p>
        </div>
        {{/if}}
      </div>

      <div style="text-align: center;">
        <a href="{{appointment_url}}" class="action-button">예약 상세보기</a>
        <a href="{{calendar_link}}" class="action-button" style="background: #28a745;">📅 캘린더 추가</a>
      </div>

      <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #2E86AB; margin-top: 0;">📋 다음 단계</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>강사님이 예약을 확인하시면 추가 안내를 드립니다</li>
          <li>수업 24시간 전, 1시간 전에 리마인더를 보내드립니다</li>
          <li>변경이나 취소가 필요하시면 언제든 연락해주세요</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <p><strong>{{site_name}}</strong></p>
      <p>궁금한 점이 있으시면 <a href="mailto:{{support_email}}">{{support_email}}</a>로 연락해주세요.</p>
      <p><a href="{{dashboard_url}}">내 예약 관리</a> | <a href="{{booking_url}}">새 예약하기</a></p>
    </div>
  </div>
</body>
</html>',
  '{
    "appointment_reference": "예약 번호",
    "appointment_type": "수업 종류",
    "appointment_date": "예약 날짜",
    "appointment_time": "예약 시간",
    "appointment_duration": "수업 시간",
    "instructor_name": "강사명",
    "user_name": "사용자명",
    "meeting_link": "온라인 미팅 링크",
    "meeting_location": "오프라인 장소",
    "appointment_notes": "특이사항",
    "appointment_url": "예약 상세 URL",
    "calendar_link": "캘린더 추가 링크",
    "dashboard_url": "대시보드 URL",
    "booking_url": "예약 페이지 URL",
    "site_name": "사이트명",
    "support_email": "고객지원 이메일"
  }',
  'ko',
  true,
  NOW(),
  NOW()
),

-- =============================================================================
-- INSTRUCTOR NEW BOOKING (Instructor Alert)
-- =============================================================================
(
  'instructor_new_booking',
  '새 예약 알림 (강사)',
  'email_html',
  'schedule',
  '📅 새로운 예약 - {{appointment_type}} ({{appointment_date}} {{appointment_time}})',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>새 예약 알림</title>
  <style>
    body { font-family: "Noto Sans KR", Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; }
    .header { background: linear-gradient(135deg, #A23B72 0%, #E6800F 100%); color: white; padding: 30px 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .booking-card { background: #f8f9fa; border-left: 4px solid #A23B72; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
    .action-button { background: #A23B72; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; font-weight: bold; }
    .confirm-button { background: #28a745; }
    .student-info { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .urgent { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 새로운 예약이 접수되었습니다</h1>
      <p>{{instructor_name}} 강사님께 새로운 수업 예약이 있습니다.</p>
    </div>
    
    <div class="content">
      <div class="booking-card">
        <h2 style="color: #A23B72; margin-top: 0;">📅 예약 정보</h2>
        
        <div class="detail-row">
          <span><strong>예약 번호:</strong></span>
          <span>{{appointment_reference}}</span>
        </div>
        <div class="detail-row">
          <span><strong>수업 종류:</strong></span>
          <span>{{appointment_type}}</span>
        </div>
        <div class="detail-row">
          <span><strong>일시:</strong></span>
          <span>{{appointment_date}} {{appointment_time}}</span>
        </div>
        <div class="detail-row">
          <span><strong>소요 시간:</strong></span>
          <span>{{appointment_duration}}</span>
        </div>
      </div>

      <div class="student-info">
        <h3 style="margin-top: 0;">👤 학생 정보</h3>
        <p><strong>이름:</strong> {{user_name}}</p>
        <p><strong>이메일:</strong> {{user_email}}</p>
        {{#if appointment_notes}}
        <p><strong>요청사항:</strong></p>
        <div style="background: white; padding: 10px; border-radius: 5px;">{{appointment_notes}}</div>
        {{/if}}
      </div>

      <div class="urgent">
        <h3 style="color: #856404; margin-top: 0;">⚠️ 액션 필요</h3>
        <p>예약을 확정하시려면 아래 버튼을 클릭해주세요. 24시간 내에 응답하지 않으시면 자동으로 취소될 수 있습니다.</p>
      </div>

      <div style="text-align: center;">
        <a href="{{appointment_url}}" class="action-button confirm-button">✅ 예약 확정하기</a>
        <a href="{{appointment_url}}" class="action-button">📋 상세보기</a>
      </div>

      <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #c3e6cb;">
        <h3 style="color: #155724; margin-top: 0;">💡 강사 가이드</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>예약 확정 후 학생에게 자동으로 확정 알림이 발송됩니다</li>
          <li>수업 전 미팅 링크나 장소 정보를 업데이트해주세요</li>
          <li>취소나 일정 변경이 필요하시면 즉시 연락해주세요</li>
        </ul>
      </div>
    </div>

    <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
      <p><strong>{{site_name}} 강사 센터</strong></p>
      <p>도움이 필요하시면 <a href="mailto:{{support_email}}">{{support_email}}</a>로 연락해주세요.</p>
    </div>
  </div>
</body>
</html>',
  '{
    "appointment_reference": "예약 번호",
    "appointment_type": "수업 종류",
    "appointment_date": "예약 날짜",
    "appointment_time": "예약 시간",
    "appointment_duration": "수업 시간",
    "instructor_name": "강사명",
    "user_name": "학생명",
    "user_email": "학생 이메일",
    "appointment_notes": "학생 요청사항",
    "appointment_url": "예약 상세 URL",
    "site_name": "사이트명",
    "support_email": "고객지원 이메일"
  }',
  'ko',
  true,
  NOW(),
  NOW()
),

-- =============================================================================
-- APPOINTMENT CONFIRMED (Confirmation Notice)
-- =============================================================================
(
  'appointment_confirmed',
  '예약 확정 알림',
  'email_html',
  'schedule',
  '✅ 예약이 확정되었습니다 - {{appointment_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>예약 확정</title>
  <style>
    body { font-family: "Noto Sans KR", Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; }
    .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .confirmed-card { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .action-button { background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; font-weight: bold; }
    .preparation-tips { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #b8daff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 예약이 확정되었습니다!</h1>
      <p>{{instructor_name}} 강사님이 예약을 확정했습니다.</p>
    </div>
    
    <div class="content">
      <div class="confirmed-card">
        <h2 style="color: #155724; margin-top: 0;">✅ 확정된 예약 정보</h2>
        <p><strong>수업:</strong> {{appointment_type}}</p>
        <p><strong>일시:</strong> {{appointment_date}} {{appointment_time}}</p>
        <p><strong>강사:</strong> {{instructor_name}}</p>
        <p><strong>소요시간:</strong> {{appointment_duration}}</p>
      </div>

      {{#if meeting_link}}
      <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #bee5eb;">
        <h3 style="margin-top: 0;">🔗 온라인 수업 준비</h3>
        <p><strong>미팅 링크:</strong> <a href="{{meeting_link}}" target="_blank">{{meeting_link}}</a></p>
        <p>수업 시작 5분 전부터 입장하여 연결을 테스트해주세요.</p>
      </div>
      {{/if}}

      <div class="preparation-tips">
        <h3 style="color: #004085; margin-top: 0;">📋 수업 준비 안내</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>수업 24시간 전, 1시간 전에 리마인더를 보내드립니다</li>
          <li>필요한 자료나 준비물이 있다면 미리 준비해주세요</li>
          <li>문제가 생기면 즉시 연락해주세요</li>
          <li>수업 후에는 피드백을 남겨주시면 도움이 됩니다</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="{{appointment_url}}" class="action-button">📅 예약 상세보기</a>
        <a href="{{calendar_link}}" class="action-button" style="background: #17a2b8;">캘린더 추가</a>
      </div>
    </div>

    <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
      <p><strong>{{site_name}}</strong></p>
      <p>좋은 수업 되세요! 문의사항이 있으시면 <a href="mailto:{{support_email}}">{{support_email}}</a>로 연락해주세요.</p>
    </div>
  </div>
</body>
</html>',
  '{
    "appointment_type": "수업 종류",
    "appointment_date": "예약 날짜",
    "appointment_time": "예약 시간",
    "appointment_duration": "수업 시간",
    "instructor_name": "강사명",
    "meeting_link": "온라인 미팅 링크",
    "appointment_url": "예약 상세 URL",
    "calendar_link": "캘린더 추가 링크",
    "site_name": "사이트명",
    "support_email": "고객지원 이메일"
  }',
  'ko',
  true,
  NOW(),
  NOW()
),

-- =============================================================================
-- 24-HOUR REMINDER
-- =============================================================================
(
  'appointment_reminder_24h',
  '24시간 전 리마인더',
  'email_html',
  'schedule',
  '⏰ 내일 {{appointment_time}}에 {{appointment_type}} 수업이 있습니다',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>수업 리마인더</title>
  <style>
    body { font-family: "Noto Sans KR", Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; }
    .header { background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%); color: white; padding: 30px 20px; text-align: center; }
    .reminder-card { background: #e2f3f5; border: 1px solid #b8daff; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .action-button { background: #17a2b8; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ 수업 리마인더</h1>
      <p>내일 예정된 {{appointment_type}} 수업을 잊지 마세요!</p>
    </div>
    
    <div style="padding: 30px 20px;">
      <div class="reminder-card">
        <h2 style="color: #0c5460; margin-top: 0;">📅 내일의 수업</h2>
        <p><strong>수업:</strong> {{appointment_type}}</p>
        <p><strong>일시:</strong> {{appointment_date}} {{appointment_time}}</p>
        <p><strong>강사:</strong> {{instructor_name}}</p>
        <p><strong>소요시간:</strong> {{appointment_duration}}</p>
      </div>

      {{#if meeting_link}}
      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">🔗 온라인 수업 링크</h3>
        <p><a href="{{meeting_link}}" target="_blank">{{meeting_link}}</a></p>
      </div>
      {{/if}}

      <div style="text-align: center;">
        <a href="{{appointment_url}}" class="action-button">수업 상세보기</a>
      </div>

      <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>💡 준비사항:</strong> 필요한 자료를 미리 준비하고, 인터넷 연결을 확인해주세요.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  '{
    "appointment_type": "수업 종류",
    "appointment_date": "예약 날짜",
    "appointment_time": "예약 시간",
    "appointment_duration": "수업 시간",
    "instructor_name": "강사명",
    "meeting_link": "온라인 미팅 링크",
    "appointment_url": "예약 상세 URL"
  }',
  'ko',
  true,
  NOW(),
  NOW()
),

-- =============================================================================
-- 1-HOUR REMINDER
-- =============================================================================
(
  'appointment_reminder_1h',
  '1시간 전 리마인더',
  'push_notification',
  'schedule',
  '🔔 1시간 후 {{appointment_type}} 수업이 시작됩니다',
  '1시간 후 {{appointment_time}}에 {{instructor_name}} 강사님과 {{appointment_type}} 수업이 시작됩니다. 준비해주세요!',
  '{
    "appointment_type": "수업 종류",
    "appointment_time": "예약 시간",
    "instructor_name": "강사명"
  }',
  'ko',
  true,
  NOW(),
  NOW()
),

-- =============================================================================
-- 15-MINUTE REMINDER
-- =============================================================================
(
  'appointment_reminder_15m',
  '15분 전 긴급 리마인더',
  'push_notification',
  'schedule',
  '🚨 곧 {{appointment_type}} 수업이 시작됩니다!',
  '15분 후 {{appointment_time}}에 {{appointment_type}} 수업이 시작됩니다. 지금 준비해주세요!',
  '{
    "appointment_type": "수업 종류",
    "appointment_time": "예약 시간"
  }',
  'ko',
  true,
  NOW(),
  NOW()
),

-- =============================================================================
-- APPOINTMENT CANCELLED
-- =============================================================================
(
  'appointment_cancelled',
  '예약 취소 알림',
  'email_html',
  'schedule',
  '❌ 예약이 취소되었습니다 - {{appointment_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>예약 취소</title>
  <style>
    body { font-family: "Noto Sans KR", Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; }
    .header { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 30px 20px; text-align: center; }
    .cancellation-card { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .action-button { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 예약 취소 알림</h1>
      <p>아쉽게도 예약이 취소되었습니다.</p>
    </div>
    
    <div style="padding: 30px 20px;">
      <div class="cancellation-card">
        <h2 style="color: #721c24; margin-top: 0;">❌ 취소된 예약</h2>
        <p><strong>수업:</strong> {{appointment_type}}</p>
        <p><strong>원래 일시:</strong> {{appointment_date}} {{appointment_time}}</p>
        <p><strong>강사:</strong> {{instructor_name}}</p>
        {{#if cancellation_reason}}
        <p><strong>취소 사유:</strong> {{cancellation_reason}}</p>
        {{/if}}
      </div>

      <div style="background: #cce7ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">🔄 다시 예약하기</h3>
        <p>언제든지 새로운 시간대로 다시 예약하실 수 있습니다. 원하시는 시간을 선택해보세요.</p>
      </div>

      <div style="text-align: center;">
        <a href="{{booking_url}}" class="action-button">새 예약하기</a>
        <a href="{{dashboard_url}}" class="action-button" style="background: #6c757d;">내 예약 관리</a>
      </div>
    </div>

    <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
      <p><strong>{{site_name}}</strong></p>
      <p>다시 뵙게 되기를 기대합니다. 문의사항이 있으시면 <a href="mailto:{{support_email}}">{{support_email}}</a>로 연락해주세요.</p>
    </div>
  </div>
</body>
</html>',
  '{
    "appointment_type": "수업 종류",
    "appointment_date": "예약 날짜",
    "appointment_time": "예약 시간",
    "instructor_name": "강사명",
    "cancellation_reason": "취소 사유",
    "booking_url": "새 예약 URL",
    "dashboard_url": "대시보드 URL",
    "site_name": "사이트명",
    "support_email": "고객지원 이메일"
  }',
  'ko',
  true,
  NOW(),
  NOW()
),

-- =============================================================================
-- APPOINTMENT RESCHEDULED
-- =============================================================================
(
  'appointment_rescheduled',
  '예약 일정 변경',
  'email_html',
  'schedule',
  '📅 예약 시간이 변경되었습니다 - {{appointment_type}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>예약 일정 변경</title>
  <style>
    body { font-family: "Noto Sans KR", Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; }
    .header { background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); color: white; padding: 30px 20px; text-align: center; }
    .change-card { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .time-comparison { display: flex; justify-content: space-between; margin: 20px 0; }
    .time-box { flex: 1; margin: 0 10px; padding: 15px; border-radius: 5px; text-align: center; }
    .old-time { background: #f8d7da; border: 1px solid #f5c6cb; }
    .new-time { background: #d4edda; border: 1px solid #c3e6cb; }
    .action-button { background: #ffc107; color: #212529; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 예약 시간 변경</h1>
      <p>{{appointment_type}} 예약 시간이 변경되었습니다.</p>
    </div>
    
    <div style="padding: 30px 20px;">
      <div class="change-card">
        <h2 style="color: #856404; margin-top: 0;">⏰ 시간 변경 안내</h2>
        <p><strong>수업:</strong> {{appointment_type}}</p>
        <p><strong>강사:</strong> {{instructor_name}}</p>
        
        <div class="time-comparison">
          <div class="time-box old-time">
            <h3 style="margin: 0; color: #721c24;">이전 시간</h3>
            <p style="margin: 5px 0;">{{original_date}}</p>
            <p style="margin: 5px 0;">{{original_time}}</p>
          </div>
          <div style="flex: 0 0 50px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 24px;">→</span>
          </div>
          <div class="time-box new-time">
            <h3 style="margin: 0; color: #155724;">새로운 시간</h3>
            <p style="margin: 5px 0;">{{appointment_date}}</p>
            <p style="margin: 5px 0;">{{appointment_time}}</p>
          </div>
        </div>
      </div>

      <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">📋 확인 사항</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>새로운 시간에 맞춰 일정을 조정해주세요</li>
          <li>캘린더를 업데이트하세요</li>
          <li>새로운 시간 기준으로 리마인더가 발송됩니다</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="{{appointment_url}}" class="action-button">예약 상세보기</a>
        <a href="{{calendar_link}}" class="action-button" style="background: #28a745; color: white;">📅 캘린더 업데이트</a>
      </div>
    </div>

    <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
      <p><strong>{{site_name}}</strong></p>
      <p>변경된 시간에 뵙겠습니다. 문의사항이 있으시면 <a href="mailto:{{support_email}}">{{support_email}}</a>로 연락해주세요.</p>
    </div>
  </div>
</body>
</html>',
  '{
    "appointment_type": "수업 종류",
    "appointment_date": "새 예약 날짜",
    "appointment_time": "새 예약 시간",
    "original_date": "원래 예약 날짜",
    "original_time": "원래 예약 시간",
    "instructor_name": "강사명",
    "appointment_url": "예약 상세 URL",
    "calendar_link": "캘린더 업데이트 링크",
    "site_name": "사이트명",
    "support_email": "고객지원 이메일"
  }',
  'ko',
  true,
  NOW(),
  NOW()
),

-- =============================================================================
-- APPOINTMENT COMPLETED
-- =============================================================================
(
  'appointment_completed',
  '수업 완료 및 피드백 요청',
  'email_html',
  'schedule',
  '✅ {{appointment_type}} 수업이 완료되었습니다 - 피드백을 남겨주세요',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>수업 완료</title>
  <style>
    body { font-family: "Noto Sans KR", Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; }
    .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px 20px; text-align: center; }
    .completion-card { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .feedback-section { background: #e7f3ff; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
    .action-button { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; font-weight: bold; }
    .star-rating { font-size: 24px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 수업이 완료되었습니다!</h1>
      <p>{{appointment_type}} 수업에 참여해주셔서 감사합니다.</p>
    </div>
    
    <div style="padding: 30px 20px;">
      <div class="completion-card">
        <h2 style="color: #155724; margin-top: 0;">✅ 완료된 수업</h2>
        <p><strong>수업:</strong> {{appointment_type}}</p>
        <p><strong>일시:</strong> {{appointment_date}} {{appointment_time}}</p>
        <p><strong>강사:</strong> {{instructor_name}}</p>
        <p><strong>소요시간:</strong> {{appointment_duration}}</p>
      </div>

      <div class="feedback-section">
        <h3 style="margin-top: 0;">⭐ 수업은 어떠셨나요?</h3>
        <p>수업에 대한 소중한 후기를 남겨주세요. 강사님과 다른 학생들에게 큰 도움이 됩니다.</p>
        
        <div class="star-rating">
          ⭐⭐⭐⭐⭐
        </div>
        
        <a href="{{feedback_url}}" class="action-button">✍️ 후기 작성하기</a>
      </div>

      <div style="background: #cfe2ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">📚 다음 수업</h3>
        <p>더 많은 학습을 원하신다면 다음 수업을 예약해보세요!</p>
        <div style="text-align: center;">
          <a href="{{booking_url}}" class="action-button" style="background: #28a745;">다음 수업 예약하기</a>
        </div>
      </div>

      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p style="margin: 0; text-align: center;"><strong>💡 학습 팁:</strong> 복습을 통해 배운 내용을 정리하고, 궁금한 점은 다음 수업에서 질문해보세요!</p>
      </div>
    </div>

    <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
      <p><strong>{{site_name}}</strong></p>
      <p>계속해서 좋은 수업으로 찾아뵙겠습니다. 문의사항이 있으시면 <a href="mailto:{{support_email}}">{{support_email}}</a>로 연락해주세요.</p>
    </div>
  </div>
</body>
</html>',
  '{
    "appointment_type": "수업 종류",
    "appointment_date": "예약 날짜",
    "appointment_time": "예약 시간",
    "appointment_duration": "수업 시간",
    "instructor_name": "강사명",
    "feedback_url": "피드백 작성 URL",
    "booking_url": "새 예약 URL",
    "site_name": "사이트명",
    "support_email": "고객지원 이메일"
  }',
  'ko',
  true,
  NOW(),
  NOW()
),

-- =============================================================================
-- APPOINTMENT NO SHOW
-- =============================================================================
(
  'appointment_no_show',
  '수업 불참 안내',
  'email_html',
  'schedule',
  '⚠️ {{appointment_type}} 수업에 참석하지 않으셨습니다',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>수업 불참</title>
  <style>
    body { font-family: "Noto Sans KR", Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; }
    .header { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 30px 20px; text-align: center; }
    .noshow-card { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .action-button { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ 수업 불참 안내</h1>
      <p>예약하신 수업에 참석하지 않으셨습니다.</p>
    </div>
    
    <div style="padding: 30px 20px;">
      <div class="noshow-card">
        <h2 style="color: #721c24; margin-top: 0;">📋 불참한 수업</h2>
        <p><strong>수업:</strong> {{appointment_type}}</p>
        <p><strong>일시:</strong> {{appointment_date}} {{appointment_time}}</p>
        <p><strong>강사:</strong> {{instructor_name}}</p>
        <p><strong>소요시간:</strong> {{appointment_duration}}</p>
      </div>

      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #ffeaa7;">
        <h3 style="color: #856404; margin-top: 0;">📢 안내사항</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>사전 취소 없이 수업에 참석하지 않으시면 수업료가 차감될 수 있습니다</li>
          <li>불가피한 상황이었다면 24시간 내에 연락해주세요</li>
          <li>반복적인 불참 시 예약 제한이 있을 수 있습니다</li>
        </ul>
      </div>

      <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">🔄 다음 기회</h3>
        <p>언제든지 새로운 수업을 예약하실 수 있습니다. 일정 관리를 통해 더 나은 학습 경험을 만들어보세요.</p>
      </div>

      <div style="text-align: center;">
        <a href="{{rebook_url}}" class="action-button">새 수업 예약하기</a>
        <a href="mailto:{{support_email}}" class="action-button" style="background: #6c757d;">문의하기</a>
      </div>
    </div>

    <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
      <p><strong>{{site_name}}</strong></p>
      <p>다음 수업에서는 함께할 수 있기를 기대합니다. 문의사항이 있으시면 <a href="mailto:{{support_email}}">{{support_email}}</a>로 연락해주세요.</p>
    </div>
  </div>
</body>
</html>',
  '{
    "appointment_type": "수업 종류",
    "appointment_date": "예약 날짜",
    "appointment_time": "예약 시간",
    "appointment_duration": "수업 시간",
    "instructor_name": "강사명",
    "rebook_url": "새 예약 URL",
    "site_name": "사이트명",
    "support_email": "고객지원 이메일"
  }',
  'ko',
  true,
  NOW(),
  NOW()
),

-- =============================================================================
-- WAITLIST AVAILABLE
-- =============================================================================
(
  'waitlist_available',
  '대기자 명단 - 예약 가능 알림',
  'push_notification',
  'schedule',
  '🔥 원하시던 {{appointment_type}} 시간대가 예약 가능합니다!',
  '{{appointment_date}} {{appointment_time}} {{appointment_type}} 슬롯이 열렸습니다! 지금 바로 예약하세요. (30분 후 만료)',
  '{
    "appointment_type": "수업 종류",
    "appointment_date": "예약 날짜",
    "appointment_time": "예약 시간"
  }',
  'ko',
  true,
  NOW(),
  NOW()
);

-- Update notification preferences to include scheduling notifications for all users
INSERT INTO notification_preferences (
  user_id,
  category,
  channels,
  timezone,
  digest_frequency,
  max_notifications_per_hour,
  schedule_notifications,
  content_notifications,
  system_notifications,
  marketing_notifications,
  appointment_confirmations,
  appointment_reminders_24h,
  appointment_reminders_1h,
  appointment_reminders_15m,
  appointment_changes,
  instructor_notifications,
  waitlist_notifications,
  is_active,
  created_at,
  updated_at
) 
SELECT 
  id as user_id,
  'schedule' as category,
  ARRAY['in_app', 'email']::notification_channel[] as channels,
  'Asia/Seoul' as timezone,
  'immediate' as digest_frequency,
  10 as max_notifications_per_hour,
  true as schedule_notifications,
  true as content_notifications,
  true as system_notifications,
  true as marketing_notifications,
  true as appointment_confirmations,
  true as appointment_reminders_24h,
  true as appointment_reminders_1h,
  false as appointment_reminders_15m,
  true as appointment_changes,
  true as instructor_notifications,
  true as waitlist_notifications,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM identities 
WHERE NOT EXISTS (
  SELECT 1 FROM notification_preferences np 
  WHERE np.user_id = identities.id AND np.category = 'schedule'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

-- Comments
COMMENT ON TABLE notification_templates IS 'Comprehensive notification templates for scheduling system with bilingual support';
COMMENT ON COLUMN notification_templates.template_key IS 'Unique identifier for each notification type (e.g., appointment_created)';
COMMENT ON COLUMN notification_templates.template_type IS 'Type of template: email_html, email_text, push_notification, in_app_notification, sms_message, webhook_payload';
COMMENT ON COLUMN notification_templates.content_template IS 'Template content with variable placeholders using {{variable}} syntax';
COMMENT ON COLUMN notification_templates.variables IS 'JSON object defining all available template variables and their descriptions';