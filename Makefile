.PHONY: lint test

main: test

test: lint
	npm test

lint:
	grunt jshint
