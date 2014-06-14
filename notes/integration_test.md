-- Does caching work?
    * doesn't reprocess unchanged files.
    * doesn't return stale copies of changed files.

-- Error handling.
    * Handles malformed/nonexistent script files from FS gracefully.
    * It returns informative errors for both the caching and non-caching instrumenters.
    * Handles malformed/missing request bodies for `/api/summarize` gracefully.
    * "Graceful" means appropriate HTTP status codes and not dying.

-- File matching.
    * It only instruments the files it should, based on the `match` parameter.
    * It does not instrument other files.
