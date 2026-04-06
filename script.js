/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

/* System prompt
   This keeps the assistant focused on L'Oreal topics only. */
const SYSTEM_PROMPT =
  "You are a L'Oreal beauty assistant. Only answer questions related to L'Oreal products, routines, recommendations, ingredients, makeup, skincare, haircare, and fragrance. For any unrelated topic, politely refuse in one short sentence and invite the user to ask about L'Oreal beauty topics.";

const OFF_TOPIC_REPLY =
  "I can only help with L'Oreal beauty topics. Please ask about L'Oreal products, routines, or recommendations.";

/* Store conversation so the chatbot remembers context */
const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

/* Adds one message to the chat UI */
function addMessage(role, text) {
  const messageEl = document.createElement("div");
  messageEl.classList.add("msg");

  if (role === "user") {
    messageEl.classList.add("user");
    messageEl.textContent = `You: ${text}`;
  } else {
    messageEl.classList.add("ai");
    messageEl.textContent = `L'Oreal Advisor: ${text}`;
  }

  chatWindow.appendChild(messageEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Basic topic check to keep answers focused on L'Oreal beauty requests */
function isLorealBeautyQuestion(text) {
  const lowerText = text.toLowerCase();

  const allowedKeywords = [
    "l'oreal",
    "loreal",
    "product",
    "routine",
    "recommend",
    "beauty",
    "makeup",
    "skincare",
    "skin care",
    "haircare",
    "hair care",
    "fragrance",
    "serum",
    "foundation",
    "mascara",
    "shampoo",
    "conditioner",
    "moisturizer",
    "ingredient",
  ];

  return allowedKeywords.some((keyword) => lowerText.includes(keyword));
}

/* First message shown when the page loads */
addMessage(
  "assistant",
  "Hi! Ask me about L'Oreal products, routines, and recommendations.",
);

/* Handle form submit */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = userInput.value.trim();
  if (!question) {
    return;
  }

  if (!isLorealBeautyQuestion(question)) {
    addMessage("user", question);
    addMessage("assistant", OFF_TOPIC_REPLY);
    userInput.value = "";
    return;
  }

  // Show the user's message in the chat window
  addMessage("user", question);

  // Add the user's message to conversation history for the API request
  messages.push({
    role: "user",
    content: question,
  });

  // Clear the input right away for better UX
  userInput.value = "";

  // Use the key from secrets.js if it exists
  if (typeof OPENAI_API_KEY === "undefined" || !OPENAI_API_KEY) {
    addMessage(
      "assistant",
      "Missing API key. Add OPENAI_API_KEY in secrets.js to continue.",
    );
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
      }),
    });

    if (!response.ok) {
      throw new Error(
        "Request failed. Please check your API key and try again.",
      );
    }

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    // Show assistant reply in the chat and keep it in memory for future turns
    addMessage("assistant", aiReply);
    messages.push({
      role: "assistant",
      content: aiReply,
    });
  } catch (error) {
    addMessage("assistant", `Sorry, something went wrong: ${error.message}`);
  }
});
