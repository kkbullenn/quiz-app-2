(() => {
  const token = localStorage.getItem("token");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  if (!token || !isAdmin) {
    window.location.href = "/login.html";
    return;
  }

  const form = document.getElementById("create-quiz-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const category = document.getElementById("category").value;
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();

    try {
      const res = await fetch("/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category_id: category, title, description }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create quiz");

      window.location.href = "/admin.html";
    } catch (err) {
      alert(err.message);
    }
  });
})();
