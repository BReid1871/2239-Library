const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    // Integration tests share one MySQL database and reset it with
    // TRUNCATE between tests; running test files in parallel would let
    // concurrent files stomp on each other's data.
    fileParallelism: false,
  },
});
