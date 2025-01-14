import React, { useState, useEffect, useContext, useRef } from "react";
import { UserContext } from "../context/user.context";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../config/axios.js";
import {
  initializeSocket,
  receiveMessage,
  removeMessage,
  sendMessage,
} from "../config/socket.js";
import Markdown from "markdown-to-jsx";
import hljs from "highlight.js";
import { getWebContainer } from "../config/webContainer.js";

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex gap-1">
    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></span>
    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-300"></span>
  </div>
);

function SyntaxHighlightedCode(props) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && props.className?.includes("lang-") && window.hljs) {
      window.hljs.highlightElement(ref.current);
      ref.current.removeAttribute("data-highlighted");
    }
  }, [props.className, props.children]);

  return <code {...props} ref={ref} />;
}

const Project = () => {
  const location = useLocation();
  const { user } = useContext(UserContext);

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(new Set());
  const [project, setProject] = useState(location.state.project);

  // Chat message + state
  const [isTyping, setIsTyping] = useState(false); // State for typing indicator
  const [message, setMessage] = useState("");
  const messageBox = useRef(null);
  const [messages, setMessages] = useState([]);

  // Files + code editor
  const [fileTree, setFileTree] = useState({});
  const [currentFile, setCurrentFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);

  // WebContainer
  const [webContainer, setWebContainer] = useState(null);
  const [iframeUrl, setIframeUrl] = useState(null);
  const [runProcess, setRunProcess] = useState(null);

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  // Handle adding a collaborator to the project
  function addCollaborators() {
    axios
      .put("/projects/add-user", {
        projectId: location.state.project._id,
        users: Array.from(selectedUserId),
      })
      .then((res) => {
        console.log(res.data);
        setIsModalOpen(false);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  // Send a chat message
  const send = () => {
    if (!message.trim()) return;
    setIsTyping(true); // Start typing indicator before AI responds
    sendMessage("project-message", {
      message,
      sender: user,
    });
    setMessages((prevMessages) => [...prevMessages, { sender: user, message }]);
    setMessage("");
  };

  // Convert AI JSON message to an interactive block
  function WriteAiMessage(message) {
    const messageObject = JSON.parse(message);
    return (
      <div className="overflow-auto bg-slate-950 text-white rounded-sm p-2">
        <Markdown
          children={messageObject.text}
          options={{
            overrides: {
              code: SyntaxHighlightedCode,
            },
          }}
        />
      </div>
    );
  }

  // When selecting a user from the side panel
  const handleUserClick = (id) => {
    setSelectedUserId((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  // Fetch data + set up socket once the component mounts
  useEffect(() => {
    setLoading(true);
    initializeSocket(project._id);

    if (!webContainer) {
      getWebContainer().then((container) => {
        setWebContainer(container);
        console.log("Container started");
      });
    }

    // Message handler from the socket
    const handleProjectMessage = (data) => {
      console.log(data);
      if (data.sender._id === "ai") {
        const aiMsg = JSON.parse(data.message);
        console.log(aiMsg);

        if (webContainer && aiMsg.fileTree) {
          webContainer.mount(aiMsg.fileTree);
        }
        setFileTree(aiMsg.fileTree || {});
        setMessages((prevMessages) => [...prevMessages, data]);
        setIsTyping(false); // Stop typing indicator when AI responds
      } else {
        setMessages((prevMessages) => [...prevMessages, data]);
      }
    };

    receiveMessage("project-message", handleProjectMessage);

    // Fetch project data
    axios
      .get(`/projects/get-project/${location.state.project._id}`)
      .then((res) => {
        console.log(res.data.project);
        setProject(res.data.project);
        setFileTree(res.data.project.fileTree || {});
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });

    // Fetch all users
    axios
      .get("/users/all")
      .then((res) => {
        setUsers(res.data.users);
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });

    return () => {
      removeMessage("project-message", handleProjectMessage);
    };
  }, [location.state.project._id, webContainer]);

  // Save updated file tree to DB
  function saveFileTree(ft) {
    axios
      .put("/projects/update-file-tree", {
        projectId: project._id,
        fileTree: ft,
      })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  // Scroll chat to bottom
  function scrollToBottom() {
    if (messageBox.current) {
      messageBox.current.scrollTop = messageBox.current.scrollHeight;
    }
  }

  return (
    <main className="h-screen w-screen flex bg-slate-100 text-gray-900">
      {/* LEFT SECTION (CHAT + COLLABORATORS) */}
      <section className="relative flex flex-col h-screen w-[380px] bg-slate-800 text-white shadow-md">
        {/* Top bar with "Add collaborator" & "Toggle side panel" */}
        <header className="flex justify-between items-center p-4 w-full bg-slate-900 shadow-sm">
          <button
            className="flex gap-2 items-center px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            <i className="ri-add-fill mr-1"></i>
            <p>Add collaborator</p>
          </button>
          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className="p-2 hover:bg-slate-700 rounded-md transition-colors"
          >
            <i className="ri-group-fill"></i>
          </button>
        </header>

        {/* Chat area */}
        <div className="pt-16 pb-12 flex-grow flex flex-col h-full relative">
          {/* Chat messages */}
          <div
            ref={messageBox}
            className="p-2 flex-grow flex flex-col gap-2 overflow-auto scrollbar-hide"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.sender._id === "ai"
                    ? "max-w-lg"
                    : "max-w-sm"
                } ${msg.sender._id === user._id.toString() ? "ml-auto" : ""} message flex flex-col p-2 bg-slate-700 w-fit rounded-md shadow-sm`}
              >
                <small className="opacity-70 text-xs mb-1">
                  {msg.sender.email}
                </small>
                <div className="text-sm">
                  {msg.sender._id === "ai" ? (
                    WriteAiMessage(msg.message)
                  ) : (
                    <p>{msg.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2">
              <TypingIndicator />
              <span>AI is typing...</span>
            </div>
          )}

          {/* Input field */}
          <div className="absolute bottom-0 left-0 w-full flex">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="p-2 px-4 bg-slate-700 text-white outline-none flex-grow rounded-bl-md"
              type="text"
              placeholder="Enter message"
            />
            <button
              onClick={send}
              className="px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-br-md transition-colors"
            >
              <i className="ri-send-plane-fill"></i>
            </button>
          </div>
        </div>

        {/* Slide-out side panel (collaborators) */}
        <div
          className={`absolute top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-700 shadow-md transition-transform duration-300 ${
            isSidePanelOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <header className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
            <h1 className="font-semibold text-lg">Collaborators</h1>
            <button
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
              className="p-2 hover:bg-slate-700 rounded-md transition-colors"
            >
              <i className="ri-close-fill"></i>
            </button>
          </header>
          <div className="flex flex-col gap-1 overflow-auto p-2">
            {project.users &&
              project.users.map((u) => (
                <div
                  key={u._id}
                  className="p-2 rounded-md flex items-center gap-2 hover:bg-slate-800 cursor-pointer"
                  onClick={() => handleUserClick(u._id)}
                >
                  <div className="w-10 h-10 bg-slate-700 flex items-center justify-center rounded-full relative text-white">
                    <i className="ri-user-fill text-xl absolute"></i>
                  </div>
                  <h1 className="text-sm font-semibold">{u.email}</h1>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* RIGHT SECTION (Explorer + Editor + Iframe) */}
      <section className="flex-grow flex flex-col">
        {/* Top bar (open files + run button) */}
        <div className="flex items-center justify-between p-2 bg-slate-200 border-b border-slate-300">
          <div className="flex space-x-2">
            {openFiles.map((file, index) => (
              <button
                key={index}
                onClick={() => setCurrentFile(file)}
                className={`cursor-pointer px-3 py-1 rounded-md text-sm ${
                  currentFile === file
                    ? "bg-slate-400 text-white"
                    : "bg-slate-300 hover:bg-slate-400"
                }`}
              >
                {file}
              </button>
            ))}
          </div>
          <button
            onClick={async () => {
              await webContainer.mount(fileTree);
              const installProcess = await webContainer.spawn("npm", [
                "install",
              ]);

              installProcess.output.pipeTo(
                new WritableStream({
                  write(chunk) {
                    console.log(chunk);
                  },
                })
              );

              if (runProcess) {
                runProcess.kill();
              }

              let tempRunProcess = await webContainer.spawn("npm", ["start"]);
              tempRunProcess.output.pipeTo(
                new WritableStream({
                  write(chunk) {
                    console.log(chunk);
                  },
                })
              );

              setRunProcess(tempRunProcess);

              webContainer.on("server-ready", (port, url) => {
                console.log(port, url);
                setIframeUrl(url);
              });
            }}
            className="px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors"
          >
            Run
          </button>
        </div>

        {/* Middle: Explorer + Code Editor + Preview */}
        <div className="flex flex-grow overflow-hidden">
          {/* Explorer */}
          <div className="w-48 bg-slate-100 border-r border-slate-200 overflow-y-auto">
            {Object.keys(fileTree).map((file, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentFile(file);
                  setOpenFiles([...new Set([...openFiles, file])]);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-200 transition-colors"
              >
                {file}
              </button>
            ))}
          </div>

          {/* Code Editor */}
          <div className="flex-grow overflow-auto relative bg-slate-50">
            {fileTree[currentFile] && (
              <div className="p-4">
                <pre className="hljs overflow-auto bg-white rounded-md shadow-inner">
                  <code
                    className="hljs text-sm outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const updatedContent = e.target.innerText;
                      const ft = {
                        ...fileTree,
                        [currentFile]: {
                          file: {
                            contents: updatedContent,
                          },
                        },
                      };
                      setFileTree(ft);
                      saveFileTree(ft);
                    }}
                    dangerouslySetInnerHTML={{
                      __html:
                        fileTree[currentFile]?.file?.contents
                          ? hljs.highlight(
                              "javascript",
                              fileTree[currentFile].file.contents
                            ).value
                          : "",
                    }}
                    style={{
                      whiteSpace: "pre-wrap",
                      minHeight: "20rem",
                    }}
                  />
                </pre>
              </div>
            )}
          </div>

          {/* Preview */}
          {iframeUrl && webContainer && (
            <div className="w-1/2 border-l border-slate-300 bg-white flex flex-col">
              <div className="p-2 bg-slate-100 border-b border-slate-200">
                <input
                  type="text"
                  onChange={(e) => setIframeUrl(e.target.value)}
                  value={iframeUrl}
                  className="w-full p-2 bg-slate-50 border rounded-md outline-none"
                />
              </div>
              <iframe src={iframeUrl} className="flex-grow" title="preview" />
            </div>
          )}
        </div>
      </section>

      {/* Modal for adding collaborators */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-md w-96 max-w-full relative shadow-lg">
            <header className="flex justify-between items-center mb-4 pb-2 border-b">
              <h2 className="text-xl font-semibold">Select User</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded hover:bg-gray-100 transition-colors"
              >
                <i className="ri-close-fill"></i>
              </button>
            </header>
            <div className="users-list flex flex-col gap-2 mb-16 max-h-96 overflow-auto">
              {users.map((u) => (
                <div
                  key={u._id}
                  className={`user cursor-pointer hover:bg-slate-100 p-2 flex gap-2 items-center rounded-md ${
                    Array.from(selectedUserId).includes(u._id)
                      ? "bg-slate-100"
                      : ""
                  }`}
                  onClick={() => handleUserClick(u._id)}
                >
                  <div className="aspect-square relative rounded-full w-10 h-10 flex items-center justify-center bg-slate-600 text-white">
                    <i className="ri-user-fill absolute"></i>
                  </div>
                  <h1 className="font-semibold text-sm">{u.email}</h1>
                </div>
              ))}
            </div>
            <button
              onClick={addCollaborators}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
            >
              Add Collaborators
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Project;
