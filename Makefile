.PHONY: lint test-unit test-integration test-e2e ci

lint:
	./ci/lint.sh

test-unit:
	./ci/unit.sh

test-integration:
	./ci/integration.sh

test-e2e:
	./ci/e2e.sh

ci: lint test-unit test-integration test-e2e
