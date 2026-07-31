<?php

declare(strict_types=1);

// Load helper files.
// response.php gives us requirePost(), readJsonBody(), jsonResponse(), and session handling.
// user.php gives us requireLoggedInUserId() and fetchUserPayload().
// dbconnection.php gives us getPDO().
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/user.php';
require_once __DIR__ . '/../config/dbconnection.php';

try {
    // This endpoint should only accept POST requests.
    requirePost();

    // Start the session so we can know which user is logged in.
    startClimaSession();

    // Get the logged-in user's ID from the session.
    $userId = requireLoggedInUserId();

    // Read JSON sent from recommendations.js.
    $data = readJsonBody();

    // Get weather data sent from JavaScript.
    $weather = $data['weather'] ?? null;

    if (!is_array($weather)) {
        jsonResponse(['error' => 'Weather data is missing.'], 422);
    }

    // Connect to the database.
    $pdo = getPDO();

    // Get the logged-in user's profile and saved preferences.
    $user = fetchUserPayload($pdo, $userId);

    if (!$user) {
        jsonResponse(['error' => 'User profile could not be loaded.'], 404);
    }

    // Prepare the data that will be sent to Python.
    $pythonPayload = [
        'weather' => $weather,
        'user' => $user,
    ];

    // Run the Python recommendation engine.
    $recommendations = runPythonRecommendationEngine($pythonPayload);

    // Return Python's result back to JavaScript.
    jsonResponse([
        'message' => 'Recommendations generated successfully.',
        'recommendations' => $recommendations,
    ]);

} catch (Throwable $error) {
    // Return any server error as JSON.
    jsonResponse(['error' => $error->getMessage()], 500);
}


// Run the Python recommendation engine and return its JSON result.
function runPythonRecommendationEngine(array $payload): array
{
    // Find the Python file.
    $pythonScript = realpath(__DIR__ . '/../python/recommendation_engine.py');

    if (!$pythonScript) {
        jsonResponse(['error' => 'Python recommendation engine file was not found.'], 500);
    }

    // Convert PHP array to JSON so Python can read it.
    $inputJson = json_encode($payload, JSON_UNESCAPED_UNICODE);

    if ($inputJson === false) {
        jsonResponse(['error' => 'Could not prepare data for Python.'], 500);
    }

    // Try python3 first, then python.
    // On Mac, python3 is usually correct.
    $pythonCommands = ['python3', 'python'];

    $lastError = '';

    foreach ($pythonCommands as $pythonCommand) {
        // Build the command safely.
        $command = $pythonCommand . ' ' . escapeshellarg($pythonScript);

        // Tell PHP how to communicate with the Python script.
        $descriptors = [
            0 => ['pipe', 'r'], // Python input
            1 => ['pipe', 'w'], // Python output
            2 => ['pipe', 'w'], // Python error
        ];

        // Start the Python process.
        $process = proc_open($command, $descriptors, $pipes);

        if (!is_resource($process)) {
            $lastError = 'Could not start Python process.';
            continue;
        }

        // Send JSON data to Python.
        fwrite($pipes[0], $inputJson);
        fclose($pipes[0]);

        // Read Python output and errors.
        $output = stream_get_contents($pipes[1]);
        fclose($pipes[1]);

        $errorOutput = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        // Close the Python process and get exit code.
        $exitCode = proc_close($process);

        // If Python ran successfully, decode its JSON response.
        if ($exitCode === 0 && trim($output) !== '') {
            $decoded = json_decode($output, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }

            jsonResponse([
                'error' => 'Python returned invalid JSON.',
                'details' => json_last_error_msg(),
            ], 500);
        }

        // Save the error in case this Python command failed.
        $lastError = trim($errorOutput ?: $output ?: "Python command failed: {$pythonCommand}");
    }

    // If both python3 and python failed, return an error.
    jsonResponse([
        'error' => 'Could not run Python recommendation engine.',
        'details' => $lastError,
    ], 500);
}