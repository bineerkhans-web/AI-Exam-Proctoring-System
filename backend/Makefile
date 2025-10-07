.PHONY: help install run test clean docker-build docker-run

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	pip install -r requirements.txt

run: ## Run the application
	python run.py

test: ## Run tests
	pytest tests/ -v

clean: ## Clean up temporary files
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .pytest_cache
	rm -f test.db

docker-build: ## Build Docker image
	docker build -t exam-proctoring-backend .

docker-run: ## Run with Docker Compose
	docker-compose up -d

docker-stop: ## Stop Docker containers
	docker-compose down

init-db: ## Initialize database
	python scripts/init_db.py

migrate: ## Run database migrations
	alembic upgrade head

create-migration: ## Create new migration (usage: make create-migration MESSAGE="description")
	alembic revision --autogenerate -m "$(MESSAGE)"

format: ## Format code with black
	black .

lint: ## Lint code with flake8
	flake8 .

setup-dev: ## Set up development environment
	pip install -r requirements.txt
	cp .env.example .env
	@echo "Please edit .env file with your configuration"
	@echo "Then run 'make init-db' to initialize the database"

logs: ## Show Docker logs
	docker-compose logs -f backend
