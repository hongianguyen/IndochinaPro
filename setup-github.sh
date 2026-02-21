#!/bin/bash
# ============================================================
# INDOCHINA TRAVEL PRO — GitHub Setup Script
# Chạy script này SAU KHI đã tạo repo trống trên GitHub
# ============================================================

set -e

echo ""
echo "🧭 Indochina Travel Pro — GitHub Setup"
echo "========================================"
echo ""

# ─── Check git ────────────────────────────────────────────────────────────────
if ! command -v git &> /dev/null; then
  echo "❌ Git chưa được cài. Tải tại: https://git-scm.com"
  exit 1
fi

# ─── Get GitHub info ──────────────────────────────────────────────────────────
read -p "👤 GitHub username của bạn: " GH_USER
read -p "📦 Tên repo (VD: indochina-travel-pro): " REPO_NAME

REPO_URL="https://github.com/${GH_USER}/${REPO_NAME}.git"

echo ""
echo "📡 Sẽ push lên: $REPO_URL"
read -p "✅ Xác nhận? (y/n): " CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "❌ Đã hủy."
  exit 0
fi

# ─── Git init & push ──────────────────────────────────────────────────────────
echo ""
echo "🔧 Khởi tạo Git..."
git init
git add .
git commit -m "🚀 Initial commit — Indochina Travel Pro AI Itinerary Builder

- Next.js 14 App Router
- 5-step Wizard UI (Navy & Gold theme)
- RAG Engine with FAISS vector store
- GPT-4o itinerary generation (7 fields/day)
- PDF Proposal export with @react-pdf/renderer
- Data ingestion dashboard with SSE progress
- Unsplash integration for destination images"

git branch -M main
git remote add origin "$REPO_URL"
git push -u origin main

echo ""
echo "✅ Đã push lên GitHub!"
echo ""
echo "🔑 BƯỚC TIẾP THEO — Thêm Secrets vào GitHub:"
echo "   Vào: https://github.com/${GH_USER}/${REPO_NAME}/settings/secrets/actions"
echo ""
echo "   Thêm các secrets sau:"
echo "   ┌─────────────────────────┬──────────────────────────────┐"
echo "   │ OPENAI_API_KEY          │ sk-your-key-here             │"
echo "   │ UNSPLASH_ACCESS_KEY     │ your-unsplash-key            │"
echo "   │ VERCEL_TOKEN            │ (nếu dùng Vercel deploy)     │"
echo "   │ VERCEL_ORG_ID           │ (nếu dùng Vercel deploy)     │"
echo "   │ VERCEL_PROJECT_ID       │ (nếu dùng Vercel deploy)     │"
echo "   └─────────────────────────┴──────────────────────────────┘"
echo ""
echo "🚀 Để deploy lên Vercel:"
echo "   1. Vào https://vercel.com/new"
echo "   2. Import repo: ${GH_USER}/${REPO_NAME}"
echo "   3. Thêm Environment Variables:"
echo "      OPENAI_API_KEY=sk-..."
echo "      UNSPLASH_ACCESS_KEY=..."
echo "   4. Deploy!"
echo ""
echo "📖 Xem README.md để biết thêm chi tiết"
