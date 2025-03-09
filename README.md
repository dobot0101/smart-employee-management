# Smart Employee Management

## 프로젝트 소개
NestJS로 개발한 스마트 직원 관리 시스템입니다. 이 시스템은 기업 내 직원 정보 관리, 출결 관리, 권한 관리 등의 기능을 제공하여 효율적인 인사 관리를 지원합니다.

## 주요 기능

### 사용자 관리
- 다양한 역할 지원: 관리자(ADMIN), 매니저(MANAGER), 일반 직원(EMPLOYEE), 일반 사용자(USER)
- 사용자 등록, 수정, 조회 기능
- 안전한 비밀번호 관리 (bcrypt 해싱)
- 비밀번호 변경 기능

### 인증 및 권한 관리
- JWT 기반 인증 시스템
- 역할 기반 접근 제어 (RBAC)
- 안전한 로그인 및 토큰 관리

### 출결 관리
- 출근/퇴근 기록 관리
- 다양한 출결 상태 지원: 출근(PRESENT), 지각(LATE), 결석(ABSENT), 반차(HALF_DAY)
- 근무 시간 자동 계산
- 출결 통계 및 조회 기능

### 직원 관리
- 관리자 및 매니저의 직원 등록 기능
- 관리자의 전체 직원 목록 조회
- 관리자 및 매니저의 관리 대상 직원 목록 조회
- 관리자의 직원 정보 수정 기능

## 기술 스택

### 백엔드
- **프레임워크**: NestJS
- **언어**: TypeScript
- **데이터베이스**: PostgreSQL
- **ORM**: TypeORM
- **인증**: Passport, JWT
- **API 문서화**: Swagger/OpenAPI

## 아키텍처

이 프로젝트는 NestJS의 모듈식 아키텍처를 활용하여 개발되었습니다:

- **모듈 기반 구조**: 사용자(Users), 인증(Auth), 직원(Employees), 출결(Attendance) 모듈로 구성
- **계층 아키텍처**: 컨트롤러, 서비스, 리포지토리 계층 분리
- **의존성 주입**: 느슨한 결합을 위한 DI 패턴 적용
- **RESTful API**: 표준 HTTP 메서드와 상태 코드 활용

## RBAC(역할 기반 접근 제어) 설명

RBAC(Role-Based Access Control)는 사용자의 역할에 따라 시스템 접근 권한을 관리하는 방법입니다:

- **역할 정의**: 시스템 내에서 ADMIN, MANAGER, EMPLOYEE, USER 역할 정의
- **권한 할당**: 각 역할에 특정 작업이나 리소스에 대한 권한 할당
- **접근 제어**: 사용자의 역할에 따라 시스템 기능 접근 제어

### 구현 방식
- 사용자 인증 시 JWT 토큰에 역할 정보 포함
- 보호된 라우트에 접근 시 JwtAuthGuard와 RolesGuard를 통한 권한 검증
- 예: 
  - 직원 목록 조회: 관리자(ADMIN)만 접근 가능
  - 직원 등록: 관리자(ADMIN)와 매니저(MANAGER)만 접근 가능
  - 직원 정보 수정: 관리자(ADMIN)만 접근 가능

## 데이터 모델

### User 엔티티
- id: 고유 식별자 (UUID)
- email: 이메일 (고유값)
- password: 비밀번호
- name: 이름
- role: 역할 (ADMIN, MANAGER, EMPLOYEE, USER)
- isActive: 활성 상태
- lastLoginAt: 마지막 로그인 시간
- isPasswordChanged: 비밀번호 변경 여부
- createdAt: 생성 시간
- updatedAt: 수정 시간

### Attendance 엔티티
- id: 고유 식별자 (UUID)
- employeeId: 직원 ID (User 엔티티 참조)
- checkInTime: 출근 시간
- checkOutTime: 퇴근 시간
- status: 출결 상태 (PRESENT, LATE, ABSENT, HALF_DAY)
- workHours: 근무 시간
- note: 메모
- createdAt: 생성 시간
- updatedAt: 수정 시간
- employee: User 엔티티와의 관계 (ManyToOne)

## API 엔드포인트

### 인증 API
- 로그인: POST /auth/login
- 관리자 프로필 조회: GET /auth/admin (ADMIN 권한)
- 매니저 프로필 조회: GET /auth/manager (ADMIN, MANAGER 권한)

### 사용자 관리 API
- 관리자 생성: POST /users/admin (ADMIN 권한)

### 직원 관리 API
- 직원 로그인: POST /employees/login
- 직원 등록: POST /employees/register-employee (ADMIN, MANAGER 권한)
- 전체 직원 목록 조회: GET /employees (ADMIN 권한)
- 관리 대상 직원 목록 조회: GET /employees/managed-employees (ADMIN, MANAGER 권한)
- 직원 정보 수정: PATCH /employees/:id (ADMIN 권한)
- 비밀번호 변경: PATCH /employees/change-password

### 출결 관리 API
- 출근 체크인: POST /attendance/check-in
- 퇴근 체크아웃: POST /attendance/check-out
- 내 출퇴근 기록 조회: GET /attendance/me
- 특정 직원의 출퇴근 기록 조회: GET /attendance/employee/:id (ADMIN, MANAGER 권한)
- 출퇴근 통계 조회: GET /attendance/stats (ADMIN, MANAGER 권한)
- 출퇴근 기록 수정: PATCH /attendance/:id (ADMIN 권한)

## 프로젝트 구조

```
src/
├── auth/           # 인증 관련 모듈
├── users/          # 사용자 관리 모듈
├── employees/      # 직원 관리 모듈
├── attendance/     # 출결 관리 모듈
├── common/         # 공통 유틸리티, 상수, 열거형
├── types/          # 타입 정의
└── main.ts         # 애플리케이션 진입점
```

## 설치 및 실행 방법

### Docker를 이용한 실행 (권장)

이 프로젝트는 Docker와 Docker Compose를 사용하여 쉽게 실행할 수 있습니다:

```bash
# 저장소 클론
git clone https://github.com/yourusername/smart-employee-management.git
cd smart-employee-management

# Docker Compose를 사용하여 애플리케이션 실행
docker compose up
```

Docker Compose는 다음 서비스를 자동으로 구성합니다:
- NestJS 애플리케이션 서버
- PostgreSQL 데이터베이스
- 필요한 네트워크 설정

### 로컬 개발 환경 설정 (Docker 없이)

Docker를 사용하지 않고 로컬에서 직접 개발하려면:

```bash
# 저장소 클론
git clone https://github.com/yourusername/smart-employee-management.git
cd smart-employee-management

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```
그리고 PostgreSQL 데이터베이스가 필요합니다. 기본 설정은 다음과 같습니다:
- 호스트: localhost
- 포트: 5432
- 사용자명: postgres
- 비밀번호: postgres
- 데이터베이스명: smart-employee-management