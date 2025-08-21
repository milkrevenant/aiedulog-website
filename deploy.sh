#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Aiedulog 배포 스크립트${NC}"
echo "================================"

# 환경 선택
echo -e "${YELLOW}배포 환경을 선택하세요:${NC}"
echo "1) 로컬 테스트 (Docker)"
echo "2) 프로덕션 배포 (AWS Amplify)"
read -p "선택 [1-2]: " choice

case $choice in
    1)
        echo -e "${GREEN}📦 로컬 Docker 환경 시작...${NC}"
        
        # .env 파일 확인
        if [ ! -f .env.local ]; then
            echo -e "${RED}❌ .env.local 파일이 없습니다!${NC}"
            echo "다음 환경변수를 .env.local에 설정하세요:"
            echo "NEXT_PUBLIC_SUPABASE_URL=your_url"
            echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key"
            exit 1
        fi
        
        # Docker Compose 실행
        docker-compose down
        docker-compose build app
        docker-compose up app
        ;;
        
    2)
        echo -e "${GREEN}🔄 프로덕션 배포 준비...${NC}"
        
        # Git 상태 확인
        if [[ -n $(git status -s) ]]; then
            echo -e "${YELLOW}⚠️  커밋되지 않은 변경사항이 있습니다.${NC}"
            read -p "계속하시겠습니까? [y/N]: " confirm
            if [[ $confirm != "y" ]]; then
                echo "배포 취소됨"
                exit 0
            fi
        fi
        
        # 테스트 실행
        echo -e "${GREEN}🧪 테스트 실행...${NC}"
        cd aiedulog
        npm test 2>/dev/null || echo -e "${YELLOW}테스트가 없거나 실패했습니다. 계속 진행합니다.${NC}"
        
        # 빌드 테스트
        echo -e "${GREEN}🔨 빌드 테스트...${NC}"
        npm run build
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 빌드 성공!${NC}"
            
            # Git 커밋 및 푸시
            echo -e "${YELLOW}변경사항을 커밋하고 푸시하시겠습니까? [y/N]:${NC}"
            read -p "" push_confirm
            
            if [[ $push_confirm == "y" ]]; then
                cd ..
                git add .
                read -p "커밋 메시지: " commit_msg
                git commit -m "$commit_msg"
                git push origin main
                
                echo -e "${GREEN}✅ 코드가 푸시되었습니다!${NC}"
                echo -e "${YELLOW}📝 GitHub Actions에서 수동 배포를 트리거하려면:${NC}"
                echo "1. GitHub 레포지토리의 Actions 탭으로 이동"
                echo "2. 'Manual Deploy to AWS Amplify' 워크플로우 선택"
                echo "3. 'Run workflow' 클릭"
                echo "4. 'deploy' 입력 후 실행"
            fi
        else
            echo -e "${RED}❌ 빌드 실패! 오류를 수정하고 다시 시도하세요.${NC}"
            exit 1
        fi
        ;;
        
    *)
        echo -e "${RED}잘못된 선택입니다.${NC}"
        exit 1
        ;;
esac