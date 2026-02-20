document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // VULNERABILITY: Hardcoded credentials in frontend JavaScript
    // Red team can find these by inspecting the source code
    if (username === "sys_admin" && password === "P@ssw0rd!847") {
        window.location.href = "admin.html";
    } else {
        document.getElementById("message").innerText = "Invalid credentials";
    }
});
