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

const workerURL = "https://loreal.tukovc37.workers.dev/";

let userName = "";

/* Store conversation so the chatbot remembers context */
const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

/* Adds one message to the chat UI */
function addMessage(role, text, latestQuestion = "") {
  const messageEl = document.createElement("div");
  messageEl.classList.add("msg");

  if (role === "user") {
    messageEl.classList.add("user");
    messageEl.textContent = `You: ${text}`;
  } else {
    messageEl.classList.add("ai");

    if (latestQuestion) {
      const questionEl = document.createElement("div");
      questionEl.classList.add("msg-question");
      questionEl.textContent = `You asked: ${latestQuestion}`;
      messageEl.appendChild(questionEl);
    }

    const answerEl = document.createElement("div");
    answerEl.classList.add("msg-answer");
    answerEl.textContent = `L'Oreal Advisor: ${text}`;
    messageEl.appendChild(answerEl);
  }

  chatWindow.appendChild(messageEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Capture a user's name so future replies can stay personal */
function extractName(text) {
  const namePatterns = [
    /\bmy name is\s+([A-Za-z][A-Za-z' -]{0,39})\b/i,
    /\bi am\s+([A-Za-z][A-Za-z' -]{0,39})\b/i,
    /\bi'm\s+([A-Za-z][A-Za-z' -]{0,39})\b/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "";
}

/* Build the message list sent to the worker */
function buildRequestMessages() {
  const requestMessages = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
  ];

  if (userName) {
    requestMessages.push({
      role: "system",
      content: `The user's name is ${userName}. Use it naturally when responding.`,
    });
  }

  for (const message of messages.slice(1)) {
    requestMessages.push(message);
  }

  return requestMessages;
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

  const detectedName = extractName(question);
  if (detectedName) {
    userName = detectedName;
  }

  if (!isLorealBeautyQuestion(question)) {
    addMessage("user", question);
    addMessage("assistant", OFF_TOPIC_REPLY, question);
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

  try {
    const response = await fetch(workerURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: buildRequestMessages(),
      }),
    });

    if (!response.ok) {
      throw new Error("Request failed. Please try again.");
    }

    const data = await response.json();
    const aiReply = data?.choices?.[0]?.message?.content;

    if (!aiReply) {
      throw new Error("The worker returned an unexpected response.");
    }

    // Show assistant reply in the chat and keep it in memory for future turns
    addMessage("assistant", aiReply, question);
    messages.push({
      role: "assistant",
      content: aiReply,
    });
  } catch (error) {
    addMessage(
      "assistant",
      `Sorry, something went wrong: ${error.message}`,
      question,
    );
  }
});
