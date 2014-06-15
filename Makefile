.PHONY: lint test-unit test-integration

main: test-unit

test-unit: lint
	npm test

test-integration:
	mocha -R spec ./integration_tests

lint:
	grunt jshint
