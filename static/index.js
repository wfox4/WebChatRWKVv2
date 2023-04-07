(() => {
    const messages = {};
    let isReady = false;

    let historybox;

        // Connect to websocket
    const ws = new WebSocket(
        location.protocol.replace("http", "ws") + "//" + location.host + "/ws"
    );

    const saveConversationHistory = (filename, conversationHistory) => {
        localStorage.setItem(filename, JSON.stringify(conversationHistory));
    };

    const renderMessage = (historybox, id, from, message) => {
        if (!message) {
            return;
        }
        messages[id] = message;

        const div = document.createElement("div");
        div.id = id;
        div.className = "message";

        const tname = document.createElement("h4");
        tname.innerText = from;
        div.appendChild(tname);

        const txt = document.createElement("div");
        txt.innerHTML = marked.parse(message);
        txt.className = "messagecontent";
        div.appendChild(txt);

        historybox.appendChild(div);
    };
    const makeId = () =>
        (Date.now().toString(36) + Math.random().toString(36)).replace(".", "");

    // Add a new variable to keep track of the active log filename
    let activeLogFilename = null;

    const switchActiveLog = (historybox, filename) => {
        // Save the current conversation before switching logs
        if (activeLogFilename) {
            const currentConversation = Array.from(historybox.querySelectorAll(".message")).map((messageElement) => {
                const from = messageElement.querySelector("h4").innerText;
                const message = messageElement.querySelector(".messagecontent").innerText;
                return {
                    from,
                    message
                };
            });

            saveConversationHistory(activeLogFilename, currentConversation);
        }

        // Clear the current conversation history

        historybox.innerHTML = "";

        // Load the conversation history from local storage
        const savedConversationHistory = localStorage.getItem(filename);
        const conversationHistory = savedConversationHistory ? JSON.parse(savedConversationHistory) : [];

        conversationHistory.forEach((entry) => {
            renderMessage(historybox, makeId(), entry.from, entry.message);
        });

        // Update the active log filename
        activeLogFilename = filename;
    };



    // Wait until the whole page has loaded
    window.addEventListener("load", () => {
        const conversationLogsElement = document.querySelector("#conversation-logs");
        const chatbox = document.querySelector("#chatbox");
        const chatform = document.querySelector("#chatform");
        historybox = document.querySelector("#history");

        const contextbox = document.getElementById("contextbox");

        contextbox.addEventListener("input", (event) => {
            const context = contextbox.value.trim();
            if (context !== "") {
                sendContext(context);
            }
        });

        async function sendContext(context) {
            const payload = {
                action: "update_context",
                context: context
            };

            await ws.send(JSON.stringify(payload));
        }

        const createConversationLog = (filename) => {
            const logItem = document.createElement("div");
            logItem.className = "log-item";

            const logFilename = document.createElement("span");
            logFilename.className = "log-filename";
            logFilename.innerText = filename;

            logItem.appendChild(logFilename);
            logItem.addEventListener("click", () => {
                switchActiveLog(historybox, filename);
            });

            const editButton = document.createElement("button");
            editButton.className = "log-edit-btn";
            editButton.innerText = "Edit";
            logItem.appendChild(editButton);

            editButton.addEventListener("click", () => {
                const newFilename = prompt("Enter a new name for the log:", filename);
                if (newFilename !== null && newFilename !== "") {
                    logFilename.innerText = newFilename;
                    // Update the file name on the server
                    updateLogFilename(filename, newFilename);
                }
            });

            return logItem;
        };

        const exampleLogs = []; // Replace this with your actual log data

        exampleLogs.forEach((log) => {
            const logItem = createConversationLog(log);
            conversationLogsElement.appendChild(logItem);
        });

        marked.setOptions({
            highlight: function(code, lang) {
                const language = hljs.getLanguage(lang) ? lang : "plaintext";
                return hljs.highlight(code, {
                    language
                }).value;
            },
            langPrefix: "hljs language-",
            breaks: true, // added line break option for markdown
        });

        const renderMessage = (id, from, message) => {
            messages[id] = message;

            const div = document.createElement("div");
            div.id = id;
            div.className = "message";

            const tname = document.createElement("h4");
            tname.innerText = from;
            div.appendChild(tname);

            const txt = document.createElement("div");
            txt.innerHTML = marked.parse(message);
            txt.className = "messagecontent";

            if (from === "User") {
                txt.classList.add("user-message");
            } else {
                txt.classList.add("bot-message");
            }

            div.appendChild(txt);

            historybox.appendChild(div);
        };


        const appendMessage = (id, message) => {
            messages[id] += message;

            let markdown = messages[id];
            // Check for open code blocks and close them
            if ((markdown.match(/```/g) || []).length % 2 !== 0) markdown += "\n```";

            // Append to the p
            const p = document.querySelector("#" + id + " > .messagecontent");
            p.innerHTML = marked.parse(markdown);

            // Scroll the history box
            historybox.scrollTo({
                behavior: "smooth",
                top: historybox.scrollHeight,
                left: 0,
            });
        };




        // Attach event listener
        ws.addEventListener("message", (ev) => {
            data = JSON.parse(ev.data);
            if ("result" in data && "token" in data["result"]) {
                if (data.result.token === null) isReady = true;
                else appendMessage(data.id, data.result.token.replace("<", "&lt;"));
            }
        });
        ws.addEventListener("open", () => {
            isReady = true;
            renderMessage(makeId(), "[system]", "WebSocket connected!");
        });
        ws.addEventListener("close", () => {
            isReady = false;
            renderMessage(makeId(), "[system]", "WebSocket disconnected!");
        });

        let isFirstMessage = true;
        const saveCurrentConversation = () => {
            // Get the current conversation history
            const currentConversation = Array.from(historybox.querySelectorAll(".message")).map((messageElement) => {
                const from = messageElement.querySelector("h4").innerText;
                const message = messageElement.querySelector(".messagecontent").innerText;
                return {
                    from,
                    message
                };
            });

            // Save the current conversation to local storage
            const newLogFilename = "new-log-" + Date.now() + ".txt";
            saveConversationHistory(newLogFilename, currentConversation);

            // Add the new log to the conversation logs list
            const newLogItem = createConversationLog(newLogFilename);
            conversationLogsElement.appendChild(newLogItem);
        };


        const sendMessage = async (message) => {
			isReady = false;

            if (isFirstMessage) {
                saveCurrentConversation();
                isFirstMessage = false;
            }
            // Generate an ID for the response
            respid = makeId();

            // Add message to the page
            renderMessage(makeId(), "User", message);
            renderMessage(respid, "ChatRWKV", "");

            // Send message to server
            ws.send(
                JSON.stringify({
                    jsonrpc: "2.0",
                    method: "chat",
                    params: {
                        text: message,
                    },
                    id: respid,
                })
            );

            // Reset the value of the chatbox
            chatbox.value = "";
            chatform.focus();
            chatform.reset();
        };

        const onSubmit = () => {
            if (!isReady) return;
            console.log()
            sendMessage(chatbox.value.trim());
            chatbox.value = "";
            chatform.focus();
            chatform.reset();
        };

		chatform.addEventListener("submit", (e) => {
			e.preventDefault();
			const message = chatbox.value.trim();
			if (message !== "") {
				sendMessage(message);
				chatbox.value = "";
			}
			chatform.focus();
			chatform.reset();
		});
        chatbox.addEventListener("keydown", (e) => {
            if (e.key == "Enter" && !e.shiftKey) onSubmit();
        });
        const updateLogFilename = (oldName, newName) => {
            // Send a request to your server to update the log filename
            // Implement the server-side logic to handle the update request
        };

        const stopModel = () => {
            // Send a message to the WebSocket to stop the model
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: "stop_model"
                }));
            }
        };
        stopButton.addEventListener("click", stopModel);
        window.stopModel = stopModel;
    });

})();
