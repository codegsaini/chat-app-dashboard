import { useEffect, useRef, useState } from "react";
import css from "./app.module.css"
import { Sidebar } from './Sidebar'
import axios from "axios";
import io from "socket.io-client";

function App() {
    const endMessageRef = useRef(null);
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState("");
    const [currentTicketInfo, setCurrentTicketInfo] = useState(null);
    const [ticketList, setTicketList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [connectedToChat, setConnectedToSocketChat] = useState(false);
    const [resolved, setResolved] = useState(false);
    
    useEffect(() => {
        getTicketList();
    }, []);

    useEffect(() => {
        if (currentTicketInfo) {
            connectToChat();
            getOlderMessages();
        }
    }, [currentTicketInfo]);

    useEffect(() => {
        socket?.on("connected", async () => {
            setConnectedToSocketChat(true);
        });
        socket?.on("error", async (data) => {
            console.log(data);
        });
        socket?.on("resolved", async (data) => {
            setResolved(true);
        });
        socket?.on("reply", async (data) => {
            onMessageReceive(data);
        });
        return () => {
            socket?.off("connected");
            socket?.off("error");
            socket?.off("resolved");
            socket?.off("reply");
        }
    }, [socket, connectedToChat]);

    const onMessageReceive = (data) => {
        setMessages(prev => [...prev, data]);
        const oldTicketLst = ticketList?.map((ticketInfo) => {
            if (ticketInfo.ticket.id == currentTicketInfo?.ticket?.id) {
                const info = ticketInfo;
                info["lastMessage"] = data.message;
                return info;
            }
            return ticketInfo
        })
        setTicketList(oldTicketLst);
    }

    const emitChat = (message) => {
        const data = {
            uid: "org1",
            receiverId: currentTicketInfo?.user?.id,
            ticketId: currentTicketInfo?.ticket?.id,
            reply: message
        }
        socket?.emit("chat", data);
    }
    const onMessageSend = async (message) => {
        emitChat(message);
    }

    const connectToChat = async () => {
        try {
            setLoading(true);
            const socketIo = io("https://flex-service-dot-calc-397716.el.r.appspot.com", {
                transports: ['websocket'],
            });
            setSocket(socketIo);
            socketIo?.emit("connectChat", { ticketId: currentTicketInfo?.ticket?.id });
        } catch (e) {
            console.log(e);
        } finally {
            if (loading) setLoading(false);
        }
    }

    const getTicketList = async () => {
        try {
            const response = await axios.post("https://flex-service-dot-calc-397716.el.r.appspot.com/api/v1/ticket/list", { orgId: "org1" });
            if (!response) return console.log("Something went wrong");
            setTicketList(response.data);
        } catch(e) {
            console.log(e);
        }
    }

    const getOlderMessages = async () => {
        try {
            const response = await axios.post("https://flex-service-dot-calc-397716.el.r.appspot.com/api/v1/chat/list", { ticketId: currentTicketInfo?.ticket?.id });
            if (!response) return console.log("Something went wrong");
            setMessages(prev => [...response.data, ...prev]);
        } catch(e) {
            console.log(e);
        }
    }

    const sendMessage = () => {
        onMessageSend(reply);
        setReply("");
    }

    const handleKeyDown = (e) => {
        if (e.key == "Enter") {
            sendMessage();
        }
    }

    useEffect(() => {
        endMessageRef?.current?.scrollIntoView({behavior: "smooth"})
    }, [messages])

    const handleTicketSelected = (id) => {
        const ticketInfo = ticketList.find((ticketInfo) => ticketInfo.ticket.id === id);
        if (!ticketInfo) return;
        setCurrentTicketInfo(ticketInfo);
        const isResolved = ticketInfo.ticket.resolved;
        setResolved(isResolved);
    }
    const onResolve = () => {
        socket?.emit("resolve", { ticketId: currentTicketInfo?.ticket?.id });
    }
  return (
    <div className={css.container}>
      <Sidebar
        ticketList={ticketList}
        onChatSelected={(id) => handleTicketSelected(id)}
        currentTicketId={currentTicketInfo?.ticket?.id}
        className={css.sidebar_container}/>
      {
        currentTicketInfo ? (
            <div className={css.content_container}>
                <div className={css.topbar}>
                    <p>{currentTicketInfo?.user?.name}</p>
                    { !resolved && <button onClick={onResolve}>Resolve</button>}
                </div>
                <div className={css.chat_container}>
                    {
                        messages.map((chat, index) => (
                            chat.senderId === "org1" ? (
                                <ChatItemMe index={index} chat={chat}/>
                            ) : (
                                <ChatItem index={index} chat={chat}/>
                            )
                        ))
                    }
                    <div ref={endMessageRef} className={css.dummy_end_message}></div>
                    {
                        resolved && (
                            <p className={css.resolved_message}>Ticket Resolved</p>
                        )
                    }
                </div>
                {
                    !resolved && (
                        <div className={css.reply_input_container}>
                            <input
                                onKeyDown={handleKeyDown}
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                type={"text"}
                                placeholder={"Reply here..."}/>
                        </div>
                    )
                }
            </div>
        ) : (
            <p>Select chat</p>
        )
      }
    </div>
  )
}

const ChatItem = ({chat}) => {
    return (
        <div className={css.chat_item}>
            <img src={"https://static-00.iconduck.com/assets.00/profile-default-icon-1024x1023-4u5mrj2v.png"} alt={"Profile pic"} />
            <div className={css.message_container}>
                <p className={css.username}>Gaurav</p>
                <p className={css.message_text}>{chat?.message}</p>
            </div>
        </div>);
}
const ChatItemMe = ({chat}) => {
    return (
        <div className={[css.chat_item, css.chat_item_me].join(' ')}>
            <div className={css.message_container}>
                <p className={css.message_text}>{chat?.message}</p>
            </div>
        </div>);
}
export default App
