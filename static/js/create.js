(() => {
  const token = localStorage.getItem("token");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  if (!token || !isAdmin) {
    window.location.href = "/login.html";
    return;
  }

  const form = document.getElementById("create-quiz-form");
  const categorySelect = document.getElementById("category");
  if (!form) return;

  // load categories dynamically
  (async () => {
    try {
      const res = await fetch("/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const categories = await res.json();
      categorySelect.innerHTML = categories
        .map(c => `<option value="${c.id}">${c.name}</option>`)
        .join("");
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  })();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const categoryId = parseInt(categorySelect.value);
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();

    try {
      const res = await fetch("/admin/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ categoryId, title, description, autoplay: false }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create quiz");

      window.location.href = "/admin.html";
    } catch (err) {
      alert(err.message);
    }
  });
})();
