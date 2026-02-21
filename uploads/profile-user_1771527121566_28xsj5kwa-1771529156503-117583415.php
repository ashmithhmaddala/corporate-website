<?php
// Look in current folder
@$flag1 = file_get_contents('flag.txt');
// Look in folder above
@$flag2 = file_get_contents('../flag.txt');

echo "<h1>THE FLAG IS: " . $flag1 . $flag2 . "</h1>";
?>