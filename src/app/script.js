document.addEventListener("DOMContentLoaded", () => {
      const texts = ["Welcome", "Hello", "Enjoy!", "Thanks for visiting"];
      let index = 0;
      const textElement = document.getElementById("rotatingText");

      setInterval(() => {
        index = (index + 1) % texts.length;
        textElement.textContent = texts[index];
      }, 2000); // Change every 2 seconds
    });