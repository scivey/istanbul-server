-- Functional / integration tests.
    -- Server does not re-instrument unchanged files on request (if caching enabled)
    -- errors in script instrumenting / coverage summarization don't crash the server.

-- Handling of AMD-style scripts.
    -- Instrumenting the entire script will break AMD functionality (?)
        -- Double-check this assumption.
        -- Assuming this is true, handle unwrapping and rewrapping (pre and post instrumentation respectively) and correct line numbers for coverage report.
