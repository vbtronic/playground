.PHONY: dev

PORT ?= 45213

dev:
	python3 -m http.server $(PORT)
