(() => {
    const messages = {};
    let isReady = false;







    // Wait until the whole page has loaded
    window.addEventListener("load", () => {
        const conversationLogsElement = document.querySelector("#conversation-logs");
        const chatbox = document.querySelector("#chatbox");
        const chatform = document.querySelector("#chatform");
        const historybox = document.querySelector("#history");

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

        const switchActiveLog = (filename) => {
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



            // Load the conversation history from local storage
            const savedConversationHistory = localStorage.getItem(filename);
            const conversationHistory = savedConversationHistory ? JSON.parse(savedConversationHistory) : [];

            conversationHistory.forEach((entry) => {
                renderMessage(makeId(), entry.from, entry.message);
            });

            // Update the active log filename
            activeLogFilename = filename;
        };



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

            editButton.addEventListener("click", () => {
                const newFilename = prompt("Enter a new name for the log:", filename);
                if (newFilename !== null && newFilename !== "") {
                    logFilename.innerText = newFilename;
                    // Update the file name on the server
                    updateLogFilename(filename, newFilename);
                }
            });

            deleteButton.addEventListener("click", () => {
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
            });

            return logItem;
        };



        const exampleLogs = loadLogsFromLocalStorage();

        if (exampleLogs.length === 0) {
            // Add a default conversation log if no logs exist
            localStorage.setItem("default-log", JSON.stringify([]));
            exampleLogs.push("default-log");
        }

        exampleLogs.forEach((log) => {
            const logItem = createConversationLog(log);
            conversationLogsElement.appendChild(logItem);
        });

        activeLogFilename = exampleLogs[0];
        switchActiveLog(historybox, activeLogFilename);

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
            exampleLogs.push(newLogFilename);
            localStorage.setItem("logs", JSON.stringify(exampleLogs));

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
            chatbox.value = "";
            chatform.focus();
            chatform.reset();
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
