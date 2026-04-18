.PHONY: dev dev-backend dev-frontend install install-backend install-frontend test lint clean

# ── Dev ────────────────────────────────────────────────────────────────────

dev:
	@echo "Starting backend + frontend..."
	@make -j2 dev-backend dev-frontend

dev-backend:
	cd backend && uvicorn main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

# ── Install ────────────────────────────────────────────────────────────────

install: install-backend install-frontend

install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

# ── Test ───────────────────────────────────────────────────────────────────

test:
	cd backend && python -m pytest tests/ -v

test-watch:
	cd backend && python -m pytest tests/ -v --tb=short -f

# ── Lint ───────────────────────────────────────────────────────────────────

lint:
	cd backend && python -m ruff check src/ routers/ main.py

# ── Build ──────────────────────────────────────────────────────────────────

build:
	cd frontend && npm run build

# ── Clean ──────────────────────────────────────────────────────────────────

clean:
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find backend -name "*.pyc" -delete 2>/dev/null || true
	rm -rf frontend/dist 2>/dev/null || true
	@echo "Cleaned."
