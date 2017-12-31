SRC = $(shell find lib -type f -name "*.js")
TESTS = test/*
REPORTER = spec
TIMEOUT = 5000

test:
	@./node_modules/.bin/mocha \
		--reporter $(REPORTER) --timeout $(TIMEOUT) $(TESTS)

test-cov: lib-cov
	@JSCOV=1 $(MAKE) test REPORTER=html-cov > coverage.html && open coverage.html

lib-cov:
	@rm -rf ./$@
	@jscoverage lib $@

clean:
	rm -rf lib-cov
	rm -f coverage.html

.PHONY: test test-cov
