-- Error handling.
    -- Malformed instrumentation targets.
    -- Malformed `/api/summarize` POST requests.

-- Add caching into the instrumentation middleware (caching already exists; just needs to be integrated.);

-- Functional / integration tests.
    -- Server does not re-instrument unchanged files on request.
    --

-- Handling of AMD-style scripts.
    -- Instrumenting the entire script will break AMD functionality (?)
        -- Double-check this assumption.
        -- Assuming this is true, handle unwrapping and rewrapping (pre and post instrumentation respectively) and correct line numbers for coverage report.
 