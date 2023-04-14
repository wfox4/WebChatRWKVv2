(() => {
    const messages = {};
    let isReady = false;

    // Wait until the whole page has loaded
    window.addEventListener("load", () => {
        const conversationLogsElement = document.querySelector("#conversation-logs");
        const chatbox = document.querySelector("#chatbox");
        const chatform = document.querySelector("#chatform");
        const historybox = document.querySelector("#history");

        const chatmodeToggle = document.querySelector("#chatmode-toggle");
        chatmodeToggle.addEventListener("change", async () => {
            await toggleChatmode();
        });

		async function fetchChatmode() {
			try {
				const response = await fetch("/get_chatmode");
				const data = await response.json();
				chatmodeToggle.checked = data.chatmode;
			} catch (error) {
				console.error("Error fetching chatmode:", error);
			}
		}

		fetchChatmode();

        const removeBobFromEnd = (id) => {
            const p = document.querySelector("#" + id + " > .messagecontent");
            if (p !== null) {
                let text = p.innerText;

                const itemsToRemove = ["Alice:", "Alice: ", "\nAlice:", "\nAlice: ", " 1. A: "]; // Add more items to the list if needed

                for (const item of itemsToRemove) {
                    if (text.startsWith(item)) {
                        text = text.replace(item, "");
                        p.innerText = text;
                        messages[id] = p.innerText;
                        break; // Exit the loop since we've found and removed a matching item
                    }
                }

                if (text.endsWith("Bob:") || text.endsWith("Bob: ")) {
                    text = text.slice(0, -("Bob:".length));
                    p.innerText = text;
                    messages[id] = p.innerText;
                }
            }
        };



        const contextbox = document.getElementById("contextbox");

        const ws = new WebSocket(
            location.protocol.replace("http", "ws") + "//" + location.host + "/ws"
        );

        const saveConversationHistory = (filename, conversationHistory) => {
            localStorage.setItem(filename, JSON.stringify(conversationHistory));
        };

        const renderMessage = (id, from, message) => {
            messages[id] = message;

            console.log("renderMessage", id, from, message);


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


        const switchActiveLog = (filename) => {

            const savedConversationHistory = localStorage.getItem(filename);
            const conversationHistory = savedConversationHistory ? JSON.parse(savedConversationHistory) : [];

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


            conversationHistory.forEach((entry) => {
                renderMessage(makeId(), entry.from, entry.message);
            });

            // Update the active log filename
            activeLogFilename = filename;
        };



        contextbox.addEventListener("input", (event) => {
            const context = contextbox.value.trim();
            sendContext(context);
        });

        async function sendContext(context) {
            const payload = {
                action: "update_context",
                context: context
            };

            await ws.send(JSON.stringify(payload));
        }

        const loadLogsFromLocalStorage = () => {
            const logKeys = Object.keys(localStorage);
            const logs = [];

            logKeys.forEach((key) => {
                if (key.startsWith("new-log-")) {
                    logs.push(key);
                }
            });

            return logs;
        };

        const createConversationLog = (filename) => {
            const logItem = document.createElement("div");
            logItem.className = "log-item";

            const filenameContainer = document.createElement("div");
            filenameContainer.className = "filename-container";

            const logFilename = document.createElement("div");
            logFilename.className = "log-filename";
            logFilename.style.display = "flex";
            logFilename.style.alignItems = "center";
            logFilename.innerText = filename;

            const editButtonContainer = document.createElement("div");
            editButtonContainer.className = "edit-btn-container";

            const editButton = document.createElement("button");
            editButton.className = "log-edit-btn";
            editButton.innerText = "Edit";
            editButtonContainer.appendChild(editButton);

            const deleteButtonContainer = document.createElement("div");
            deleteButtonContainer.className = "delete-btn-container";

            const deleteButton = document.createElement("button");
            deleteButton.className = "log-delete-btn";
            deleteButton.innerHTML = '<img src="trashcan.png">';
            deleteButton.setAttribute("data-filename", filename);
            deleteButtonContainer.appendChild(deleteButton);

            filenameContainer.appendChild(logFilename);
            editButtonContainer.appendChild(editButton);
            deleteButtonContainer.appendChild(deleteButton);

            logItem.appendChild(filenameContainer);
            logItem.appendChild(editButtonContainer);
            logItem.appendChild(deleteButtonContainer);
            logItem.addEventListener("click", () => {
                if (filename !== activeLogFilename) {
                    switchActiveLog(filename);
                }
            });

            editButton.addEventListener("click", () => {
                const newFilename = prompt("Enter a new name for the log:", filename);
                if (newFilename !== null && newFilename !== "") {
                    logFilename.innerText = newFilename;
                    // Update the file name on the server
                    updateLogFilename(filename, newFilename);
                }
            });

            deleteButton.addEventListener("click", () => {
                if (filename === "default-log") {
                    const confirmClear = confirm(`Are you sure you want to clear the default log?`);
                    if (confirmClear) {
                        localStorage.setItem("default-log", JSON.stringify([]));
                        if (activeLogFilename === filename) {
                            historybox.innerHTML = "";
                        }
                    }
                } else {
                    const confirmDelete = confirm(`Are you sure you want to delete ${filename}?`);
                    if (confirmDelete) {
                        localStorage.removeItem(filename);
                        caches.open("conversation-history").then((cache) => {
                            cache.delete(filename);
                        });
                        logItem.remove();
                        console.log(`Deleting file: ${filename}`);
                        if (activeLogFilename === filename) {
                            activeLogFilename = null;
                            historybox.innerHTML = "";
                        }
                    }

                }
            });

            return logItem;
        };



        const exampleLogs = loadLogsFromLocalStorage();


        // Add a default conversation log if no logs exist
        localStorage.setItem("default-log", JSON.stringify([]));
        exampleLogs.push("default-log");


        exampleLogs.reverse().forEach((log) => {
            const logItem = createConversationLog(log);
            conversationLogsElement.appendChild(logItem);
        });


        activeLogFilename = "default-log";
        switchActiveLog(activeLogFilename);

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


        const appendMessage = (id, message) => {
            messages[id] += message;

            let markdown = messages[id];
            // Check for open code blocks and close them
            if ((markdown.match(/```/g) || []).length % 2 !== 0) markdown += "\n```";

            // Append to the p
            const p = document.querySelector("#" + id + " > .messagecontent");
            if (p !== null) {
                p.innerHTML = marked.parse(markdown);


                // Scroll the history box
                historybox.scrollTo({
                    behavior: "smooth",
                    top: historybox.scrollHeight,
                    left: 0,
                });
            }
        };

        async function updateContextBox() {
            // Fetch the updated context from the server, assuming you have an endpoint that returns the current context
            const response = await fetch("/your_context_endpoint");
            const updatedContext = await response.text();

            // Update the textarea with the new context
            const contextBox = document.getElementById("contextbox");
            contextBox.value = updatedContext;
        }

        // Attach event listener
        ws.addEventListener("message", (ev) => {
            data = JSON.parse(ev.data);
            if ("result" in data && "token" in data["result"]) {
                if (data.result.token === null) {
                    isReady = true;
                    if (chatmodeToggle.checked) {
                        removeBobFromEnd(data.id); // Call the removeBobFromEnd function when the message is fully appended
                    }
                } else {
                    appendMessage(data.id, data.result.token.replace("<", "&lt;"));
                }
            } else if ("action" in data && data["action"] === "update_context") {
                if (chatmodeToggle.checked) {
                    updateContextBox();
                }
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
            exampleLogs.push(newLogFilename);
            localStorage.setItem("logs", JSON.stringify(exampleLogs));

            // Add the new log to the conversation logs list
            const newLogItem = createConversationLog(newLogFilename);
            

			if (conversationLogsElement.lastChild) {
				// Insert the new log item before the last item
				conversationLogsElement.insertBefore(newLogItem, conversationLogsElement.lastChild);
			} else {
				// If there are no items in the conversation log, just append the new log item
				conversationLogsElement.appendChild(newLogItem);
			}
        };


        const sendMessage = async (message) => {
            isReady = false;
            // Generate an ID for the response

            const userscontext = await fetch("/currentcontext")
                .then((response) => response.json())
                .then(data => data.userscontext)
                .catch((error) => console.error("Error fetching user context:", error));


            respid = makeId();
            // Add message to the page

            if (userscontext && typeof userscontext === "string" && userscontext !== "") {
                renderMessage(makeId(), "Input", userscontext);
            }
            renderMessage(makeId(), "User", message);

            renderMessage(respid, "ChatRWKV", "");



            // Send message to server
            await ws.send(
                JSON.stringify({
                    jsonrpc: "2.0",
                    method: "chat",
                    params: {
                        text: message,
                    },
                    id: respid,
                })
            );
        };

        const onSubmit = () => {
            if (!isReady) return;
            console.log()
            sendMessage(chatbox.value.trim());
            chatform.reset();
            setTimeout(() => {
                chatbox.value = "";
                chatform.focus();
            }, 0);
        };

        chatform.addEventListener("submit", (e) => {
            e.preventDefault();
            onSubmit();
        });

        chatbox.addEventListener("keydown", (e) => {
            if (e.key == "Enter" && !e.shiftKey) onSubmit();
        });

        const updateLogFilename = (oldName, newName) => {
            // Send a request to your server to update the log filename
            // Implement the server-side logic to handle the update request
        };

        const stopModel = () => {
            fetch("/api/stop_model", {
                    method: "POST",
                })
                .then((response) => response.json())
                .then((data) => {
                    console.log(data); // {"status": "Model stopping"}
                })
                .catch((error) => {
                    console.error("Error:", error);
                });

        };

        if (stopButton) {
            stopButton.addEventListener("click", stopModel);
        }

        const createNewLogButton = document.createElement("button");
        createNewLogButton.innerText = "Create New Log";
        createNewLogButton.style.marginTop = "10px";
        createNewLogButton.addEventListener("click", () => {
            // Save the current conversation and create a new log
            saveCurrentConversation();

            // Switch to the new log
            const newLogFilename = exampleLogs[exampleLogs.length - 1];
            switchActiveLog(newLogFilename);
        });
        conversationLogsElement.appendChild(createNewLogButton);

        async function toggleChatmode() {
            try {
                const response = await fetch("/toggle_chatmode", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to toggle chatmode");
                }

                const data = await response.json();
                console.log("Chatmode updated:", data.chatmode);

            } catch (error) {
                console.error("Error updating chatmode:", error);
            }
        }

    });

})();
