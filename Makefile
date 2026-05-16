# Pronokif — top-level Makefile
#
# Bootstraps a developer environment, runs the same checks the CI will
# enforce, and provides one-liner shortcuts for the most common tasks.
#
# All targets are .PHONY — none of them produce a file matching the name.
# Run `make help` for the full list.

PYTHON ?= python3
VENV   ?= .venv
PIP    := $(VENV)/bin/pip
PY     := $(VENV)/bin/python
PYTEST := $(VENV)/bin/pytest
RUFF   := $(VENV)/bin/ruff
BLACK  := $(VENV)/bin/black
MYPY   := $(VENV)/bin/mypy

.DEFAULT_GOAL := help

# --------------------------------------------------------------------------- #
# Help                                                                        #
# --------------------------------------------------------------------------- #

.PHONY: help
help:  ## Show this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nPronokif — make targets\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

# --------------------------------------------------------------------------- #
# Setup                                                                       #
# --------------------------------------------------------------------------- #

.PHONY: install
install: $(VENV)/.installed  ## Create venv and install backend deps (runtime + dev)

$(VENV)/.installed: backend/requirements.txt backend/requirements-dev.txt
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip wheel
	$(PIP) install -r backend/requirements.txt -r backend/requirements-dev.txt
	@touch $@

.PHONY: install-frontend
install-frontend:  ## Install frontend dependencies
	cd frontend && npm install

.PHONY: bootstrap
bootstrap: install install-frontend  ## Full local setup (backend + frontend)

# --------------------------------------------------------------------------- #
# Tests                                                                       #
# --------------------------------------------------------------------------- #

.PHONY: test
test: install  ## Run backend test suite
	cd backend && ../$(PYTEST) -q

.PHONY: test-cov
test-cov: install  ## Run backend tests with coverage report
	cd backend && ../$(PYTEST) --cov=. --cov-report=term-missing --cov-report=html

.PHONY: test-frontend
test-frontend:  ## Run frontend test suite (added in Sprint 2)
	cd frontend && npm test

# --------------------------------------------------------------------------- #
# Lint & format                                                               #
# --------------------------------------------------------------------------- #

.PHONY: lint
lint: install  ## Run ruff + mypy on the backend
	$(RUFF) check backend/
	$(MYPY) --ignore-missing-imports backend/ || true

.PHONY: format
format: install  ## Format backend with black + ruff --fix
	$(BLACK) backend/
	$(RUFF) check --fix backend/

.PHONY: format-check
format-check: install  ## Verify formatting without modifying files (CI gate)
	$(BLACK) --check backend/
	$(RUFF) check backend/

# --------------------------------------------------------------------------- #
# Security                                                                    #
# --------------------------------------------------------------------------- #

.PHONY: security
security: secrets-scan deps-audit code-scan  ## Run the full security suite

.PHONY: secrets-scan
secrets-scan:  ## Scan working tree + git history for leaked secrets (gitleaks)
	@command -v gitleaks >/dev/null 2>&1 || { echo "gitleaks not installed — brew install gitleaks"; exit 1; }
	gitleaks detect --source . --no-banner

.PHONY: deps-audit
deps-audit: install  ## Audit Python dependencies for known CVEs
	$(VENV)/bin/pip-audit -r backend/requirements.txt -r backend/requirements-dev.txt

.PHONY: code-scan
code-scan: install  ## Static security analysis (bandit) on backend code
	$(VENV)/bin/bandit -q -r backend/ -x backend/tests,backend/.venv,backend/audit_serveur_doublons.md -ll

# --------------------------------------------------------------------------- #
# Run                                                                         #
# --------------------------------------------------------------------------- #

.PHONY: dev-backend
dev-backend: install  ## Start the backend in dev mode (uvicorn --reload)
	cd backend && ../$(VENV)/bin/uvicorn server:app --reload --host 0.0.0.0 --port 8000

.PHONY: dev-frontend
dev-frontend:  ## Start the frontend in dev mode (CRA / Vite)
	cd frontend && npm start

# --------------------------------------------------------------------------- #
# Housekeeping                                                                #
# --------------------------------------------------------------------------- #

.PHONY: clean
clean:  ## Remove caches, builds and the venv
	rm -rf $(VENV) frontend/build frontend/node_modules/.cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true

.PHONY: ci
ci: format-check lint test security  ## What CI will run on every PR
