const baseUrl = "http://localhost:3000"; // Backend-URL
let token = ""; // JWT-Token speichern

// Registrierung
document.getElementById("register-btn").addEventListener("click", async () => {
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
  
    const response = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
  
    const data = await response.json();
    alert(response.ok ? `Benutzer erstellt: ${JSON.stringify(data)}` : `Fehler: ${data.message}`);
  });
  
  // Login
  document.getElementById("login-btn").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
  
    const response = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  
    const data = await response.json();
    if (response.ok) {
      token = data.token; // JWT speichern
      alert("Login erfolgreich!");
      document.getElementById("data").style.display = "block";
    } else {
      alert(`Login fehlgeschlagen: ${data.message}`);
    }
  });
  

// Daten abrufen
document.getElementById("fetch-data-btn").addEventListener("click", async () => {
    const response = await fetch(`${baseUrl}/api/users`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` },
    });

    const data = await response.json();
    document.getElementById("data-display").innerText = response.ok
        ? JSON.stringify(data, null, 2)
        : `Fehler: ${data}`;
});
